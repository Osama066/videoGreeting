import os
import shutil
import subprocess
import tempfile
import urllib.request
from typing import Optional
import modal
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Modal Container Image Definition
# ---------------------------------------------------------------------------
# Pre-bakes dependencies, clones Wav2Lip, and downloads model checkpoints
# so cold-starts are as fast as possible.
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "ffmpeg", "libgl1-mesa-glx", "libglib2.0-0", "curl")
    .pip_install(
        "torch==2.1.2",
        "torchvision==0.16.2",
        "torchaudio==2.1.2",
        "numpy==1.23.5",
        "scipy==1.11.4",
        "opencv-python==4.8.1.78",
        "tqdm",
        "numba==0.58.1",
        "librosa==0.9.2",
        "fastapi==0.110.0",
        "pydantic==2.6.4",
        "requests==2.31.0",
        "cloudinary==1.38.0",
    )
    .run_commands(
        # 1. Clone official Wav2Lip repository
        "git clone https://github.com/Rudrabha/Wav2Lip.git /Wav2Lip",
        # 2. Create directory for face detection & checkpoints
        "mkdir -p /Wav2Lip/face_detection/detection/sfd",
        "mkdir -p /Wav2Lip/checkpoints",
        # 3. Download S3FD Face Detection weights
        "curl -L -o /Wav2Lip/face_detection/detection/sfd/s3fd.pth https://huggingface.co/camenduru/Wav2Lip/resolve/main/face_detection/detection/sfd/s3fd.pth",
        # 4. Download Pre-trained Wav2Lip GAN weights (High-fidelity lip sync)
        "curl -L -o /Wav2Lip/checkpoints/wav2lip_gan.pth https://huggingface.co/camenduru/Wav2Lip/resolve/main/checkpoints/wav2lip_gan.pth",
    )
)

app = modal.App("ai-greeting-wav2lip")


class LipSyncRequest(BaseModel):
    video_url: str
    audio_url: str
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    pads: Optional[str] = "0 10 0 0"  # default padding [top, bottom, left, right]
    resize_factor: Optional[int] = 1
    cloudinary_cloud_name: Optional[str] = None
    cloudinary_upload_preset: Optional[str] = None
    cloudinary_api_key: Optional[str] = None
    cloudinary_api_secret: Optional[str] = None
    cloudinary_folder: Optional[str] = "voice"


def download_file(url: str, destination: str):
    """Downloads remote asset to local temporary destination with standard User-Agent."""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
    )
    with urllib.request.urlopen(req) as response, open(destination, "wb") as out_file:
        shutil.copyfileobj(response, out_file)


@app.function(
    image=image,
    gpu="T4",
    timeout=600,
    scaledown_window=120,
)
@modal.fastapi_endpoint(method="POST")
def generate(req: LipSyncRequest):
    """
    Generates lip-synced video using Wav2Lip GAN on serverless GPU.
    Supports both:
    1. Name-Slot Mode: Slices video to [start_time, end_time], animates only that snippet,
       and stitches back into original video for crystal-clear quality and 10x faster rendering.
    2. Full Script Mode: Animates the entire video.
    """
    if not req.video_url or not req.audio_url:
        raise HTTPException(status_code=400, detail="video_url and audio_url are required.")

    work_dir = tempfile.mkdtemp(prefix="wav2lip_")
    input_video = os.path.join(work_dir, "input_video.mp4")
    input_audio = os.path.join(work_dir, "input_audio.mp3")
    output_video = os.path.join(work_dir, "synced_output.mp4")

    try:
        # Step 1: Download master video and synthesized ElevenLabs audio
        download_file(req.video_url, input_video)
        download_file(req.audio_url, input_audio)

        if not os.path.exists(input_video) or os.path.getsize(input_video) == 0:
            raise HTTPException(status_code=400, detail="Failed to download master video.")

        if not os.path.exists(input_audio) or os.path.getsize(input_audio) == 0:
            raise HTTPException(status_code=400, detail="Failed to download input audio.")

        # Step 2: Determine if this is Name-Slot Mode (subclip) or Full Video Mode
        pads_args = req.pads.split() if req.pads else ["0", "10", "0", "0"]
        is_name_slot = (
            req.start_time is not None
            and req.end_time is not None
            and req.end_time > req.start_time
        )

        if is_name_slot:
            print(f"[Modal] Running Name-Slot Mode from {req.start_time}s to {req.end_time}s")
            subclip_input = os.path.join(work_dir, "subclip_raw.mp4")
            subclip_synced = os.path.join(work_dir, "subclip_synced.mp4")
            part1_file = os.path.join(work_dir, "part1.mp4")
            part3_file = os.path.join(work_dir, "part3.mp4")

            # Cut slot subclip to lip-sync
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-ss", str(req.start_time),
                    "-to", str(req.end_time),
                    "-i", input_video,
                    "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p",
                    "-an",
                    subclip_input,
                ],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            # Run Wav2Lip inference ONLY on the small slot subclip (~48 frames)
            cmd = [
                "python",
                "/Wav2Lip/inference.py",
                "--checkpoint_path",
                "/Wav2Lip/checkpoints/wav2lip_gan.pth",
                "--face",
                subclip_input,
                "--audio",
                input_audio,
                "--outfile",
                subclip_synced,
                "--pads",
                *pads_args,
                "--resize_factor",
                str(req.resize_factor or 1),
                "--nosmooth",
            ]

            result = subprocess.run(
                cmd,
                cwd="/Wav2Lip",
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            if result.returncode != 0 or not os.path.exists(subclip_synced):
                error_details = result.stderr[-1000:] if result.stderr else "Unknown error"
                raise HTTPException(
                    status_code=500,
                    detail=f"Wav2Lip slot inference failed: {error_details}",
                )

            # Re-encode subclip with standardized audio stream
            subclip_synced_clean = os.path.join(work_dir, "subclip_clean.mp4")
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", subclip_synced,
                    "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
                    subclip_synced_clean,
                ],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            concat_files = []

            # Part 1 (Before name slot)
            if req.start_time > 0.05:
                subprocess.run(
                    [
                        "ffmpeg", "-y",
                        "-ss", "0",
                        "-to", str(req.start_time),
                        "-i", input_video,
                        "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p",
                        "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
                        part1_file,
                    ],
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                concat_files.append(part1_file)

            # Part 2 (Synced Name Slot)
            concat_files.append(subclip_synced_clean)

            # Part 3 (After name slot to end of video)
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-ss", str(req.end_time),
                    "-i", input_video,
                    "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
                    part3_file,
                ],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            concat_files.append(part3_file)

            # Concat demuxer list
            concat_list_path = os.path.join(work_dir, "concat.txt")
            with open(concat_list_path, "w") as f:
                for path in concat_files:
                    f.write(f"file '{path}'\n")

            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-f", "concat",
                    "-safe", "0",
                    "-i", concat_list_path,
                    "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
                    output_video,
                ],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

        else:
            # Full Video Mode: Run inference on whole video
            print("[Modal] Running Full Video Mode...")
            cmd = [
                "python",
                "/Wav2Lip/inference.py",
                "--checkpoint_path",
                "/Wav2Lip/checkpoints/wav2lip_gan.pth",
                "--face",
                input_video,
                "--audio",
                input_audio,
                "--outfile",
                output_video,
                "--pads",
                *pads_args,
                "--resize_factor",
                str(req.resize_factor or 1),
                "--nosmooth",
            ]

            result = subprocess.run(
                cmd,
                cwd="/Wav2Lip",
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            if result.returncode != 0 or not os.path.exists(output_video):
                error_details = result.stderr[-1000:] if result.stderr else "Unknown error"
                raise HTTPException(
                    status_code=500,
                    detail=f"Wav2Lip inference failed: {error_details}",
                )

        # Step 3: Optional direct upload to Cloudinary
        cloud_name = req.cloudinary_cloud_name or os.environ.get("CLOUDINARY_CLOUD_NAME")
        upload_preset = req.cloudinary_upload_preset or os.environ.get("CLOUDINARY_UPLOAD_PRESET")
        api_key = req.cloudinary_api_key or os.environ.get("CLOUDINARY_API_KEY")
        api_secret = req.cloudinary_api_secret or os.environ.get("CLOUDINARY_API_SECRET")

        if cloud_name and (upload_preset or (api_key and api_secret)):
            import cloudinary
            import cloudinary.uploader

            cfg = {"cloud_name": cloud_name, "secure": True}
            if api_key and api_secret:
                cfg["api_key"] = api_key
                cfg["api_secret"] = api_secret
            cloudinary.config(**cfg)

            upload_kwargs = {
                "resource_type": "video",
                "folder": req.cloudinary_folder or "voice",
            }
            if upload_preset:
                upload_kwargs["upload_preset"] = upload_preset
                if not (api_key and api_secret):
                    upload_kwargs["unsigned"] = True

            upload_result = cloudinary.uploader.upload(
                output_video,
                **upload_kwargs,
            )

            return {
                "success": True,
                "video_url": upload_result.get("secure_url"),
                "public_id": upload_result.get("public_id"),
                "duration": upload_result.get("duration"),
            }

        # Step 4: Return video stream if no Cloudinary credentials given
        with open(output_video, "rb") as f:
            video_bytes = f.read()

        return Response(
            content=video_bytes,
            media_type="video/mp4",
            headers={"Content-Disposition": 'attachment; filename="greeting_synced.mp4"'},
        )

    finally:
        shutil.rmtree(work_dir, ignore_errors=True)
