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
# Pre-bakes dependencies, clones Wav2Lip, CodeFormer, and GFPGAN v1.4,
# downloading all model checkpoints during image build for fast cold-starts.
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
        "cython",
    )
    .pip_install(
        "facexlib>=0.2.5",
        "basicsr>=1.4.2",
        "gfpgan==1.3.8",
        extra_options="--no-build-isolation",
    )
    .run_commands(
        # 1. Clone official Wav2Lip repository & download checkpoints
        "git clone https://github.com/Rudrabha/Wav2Lip.git /Wav2Lip",
        "mkdir -p /Wav2Lip/face_detection/detection/sfd",
        "mkdir -p /Wav2Lip/checkpoints",
        "curl -L -o /Wav2Lip/face_detection/detection/sfd/s3fd.pth https://huggingface.co/camenduru/Wav2Lip/resolve/main/face_detection/detection/sfd/s3fd.pth",
        "curl -L -o /Wav2Lip/checkpoints/wav2lip_gan.pth https://huggingface.co/camenduru/Wav2Lip/resolve/main/checkpoints/wav2lip_gan.pth",

        # 2. Clone official CodeFormer repository & download checkpoints
        "git clone https://github.com/sczhou/CodeFormer.git /CodeFormer",
        "mkdir -p /CodeFormer/weights/CodeFormer",
        "mkdir -p /CodeFormer/weights/facelib",
        "curl -L -o /CodeFormer/weights/CodeFormer/codeformer.pth https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/codeformer.pth",
        "curl -L -o /CodeFormer/weights/facelib/yolov5l-face.pth https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/yolov5l-face.pth",
        "curl -L -o /CodeFormer/weights/facelib/parsing_parsenet.pth https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/parsing_parsenet.pth",
        "curl -L -o /CodeFormer/weights/facelib/detection_Resnet50_Final.pth https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/detection_Resnet50_Final.pth",

        # 3. GFPGAN v1.4 checkpoint & facexlib cache
        "mkdir -p /root/.cache/facexlib/weights",
        "curl -L -o /Wav2Lip/checkpoints/GFPGANv1.4.pth https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth",
        "curl -L -o /root/.cache/facexlib/weights/detection_Resnet50_Final.pth https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth",
        "curl -L -o /root/.cache/facexlib/weights/parsing_parsenet.pth https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth",
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
    enable_hd_restoration: Optional[bool] = True
    restorer_type: Optional[str] = "codeformer"  # "codeformer" | "gfpgan"
    fidelity: Optional[float] = 0.7  # 0.7 balance for CodeFormer (0.0=max enhance, 1.0=max identity)
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


def restore_face_hd(input_video_path: str, output_video_path: str, restorer_type: str = "codeformer", fidelity: float = 0.7):
    """
    Restores crisp 1080p facial features (teeth, lips, skin) using CodeFormer or GFPGAN.
    """
    if restorer_type == "codeformer":
        print(f"[HD Restoration] Running CodeFormer (Fidelity w={fidelity})...")
        out_dir = os.path.dirname(output_video_path)
        cmd = [
            "python",
            "/CodeFormer/inference_codeformer.py",
            "--video_path", input_video_path,
            "--w", str(fidelity),
            "--has_aligned", "False",
            "--bg_upsampler", "None",
            "-o", out_dir,
        ]
        res = subprocess.run(cmd, cwd="/CodeFormer", stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        # Check generated file in results folder
        result_vid = os.path.join(out_dir, os.path.splitext(os.path.basename(input_video_path))[0] + "_0.7.mp4")
        if not os.path.exists(result_vid):
            # Check any mp4 in output directory
            candidates = [os.path.join(out_dir, f) for f in os.listdir(out_dir) if f.endswith(".mp4") and f != os.path.basename(input_video_path)]
            if candidates:
                result_vid = candidates[-1]

        if os.path.exists(result_vid):
            # Remux enhanced video with audio from input_video_path
            subprocess.run([
                "ffmpeg", "-y",
                "-i", result_vid,
                "-i", input_video_path,
                "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p",
                "-map", "0:v:0",
                "-map", "1:a:0?",
                "-c:a", "aac", "-b:a", "192k",
                output_video_path,
            ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            return

        print(f"[CodeFormer] Warning: CodeFormer script output not found ({res.stderr[:200]}), falling back to GFPGAN...")

    # GFPGAN Fallback / Selected Restorer
    print("[HD Restoration] Running GFPGAN v1.4...")
    import cv2
    try:
        from gfpgan import GFPGANer
        restorer = GFPGANer(
            model_path="/Wav2Lip/checkpoints/GFPGANv1.4.pth",
            upscale=1,
            arch="clean",
            channel_multiplier=2,
            bg_upsampler=None,
            device="cuda",
        )
    except Exception as e:
        print(f"[GFPGAN] Warning: Failed to initialize GFPGAN ({e}), using standard output.")
        shutil.copy(input_video_path, output_video_path)
        return

    cap = cv2.VideoCapture(input_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    temp_frames_vid = input_video_path + ".gfpgan_raw.mp4"
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(temp_frames_vid, fourcc, fps, (width, height))

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        try:
            _, _, restored_face = restorer.enhance(
                frame,
                has_aligned=False,
                only_center_face=True,
                paste_back=True,
                weight=0.5,
            )
            out.write(restored_face)
        except Exception:
            out.write(frame)

    cap.release()
    out.release()

    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", temp_frames_vid,
            "-i", input_video_path,
            "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p",
            "-map", "0:v:0",
            "-map", "1:a:0?",
            "-c:a", "aac", "-b:a", "192k",
            output_video_path,
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    if os.path.exists(temp_frames_vid):
        os.remove(temp_frames_vid)


@app.function(
    image=image,
    gpu="T4",
    timeout=600,
    scaledown_window=120,
)
@modal.fastapi_endpoint(method="POST")
def generate(req: LipSyncRequest):
    """
    Generates lip-synced video using Wav2Lip GAN + CodeFormer / GFPGAN HD Face Restoration.
    Supports both:
    1. Name-Slot Mode: Slices video to [start_time, end_time], animates only that snippet,
       restores teeth/lips to 1080p HD, and stitches back into original video.
    2. Full Script Mode: Animates and restores the entire video.
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

        # Standardize audio to 16kHz mono WAV for Wav2Lip
        audio_wav = os.path.join(work_dir, "audio_16k.wav")
        subprocess.run(
            ["ffmpeg", "-y", "-i", input_audio, "-ar", "16000", "-ac", "1", audio_wav],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        # Step 2: Determine if this is Name-Slot Mode (subclip) or Full Video Mode
        pads_args = req.pads.split() if req.pads else ["0", "10", "0", "0"]
        is_name_slot = (
            req.start_time is not None
            and req.end_time is not None
            and req.end_time > req.start_time
        )

        restorer = req.restorer_type or "codeformer"
        fidelity = req.fidelity if req.fidelity is not None else 0.7

        if is_name_slot:
            print(f"[Modal] Running Name-Slot Mode from {req.start_time}s to {req.end_time}s")
            subclip_input = os.path.join(work_dir, "subclip_raw.mp4")
            subclip_synced = os.path.join(work_dir, "subclip_synced.mp4")
            subclip_hd = os.path.join(work_dir, "subclip_hd.mp4")
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
                audio_wav,
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

            # Step 2b: Apply CodeFormer / GFPGAN HD Face & Teeth Restoration on the slot
            if req.enable_hd_restoration is not False:
                restore_face_hd(subclip_synced, subclip_hd, restorer_type=restorer, fidelity=fidelity)
            else:
                shutil.copy(subclip_synced, subclip_hd)

            # Re-encode subclip with standardized audio stream
            subclip_synced_clean = os.path.join(work_dir, "subclip_clean.mp4")
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", subclip_hd,
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

            # Part 2 (Synced & Restored Name Slot)
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
            raw_full_video = os.path.join(work_dir, "raw_full_synced.mp4")
            cmd = [
                "python",
                "/Wav2Lip/inference.py",
                "--checkpoint_path",
                "/Wav2Lip/checkpoints/wav2lip_gan.pth",
                "--face",
                input_video,
                "--audio",
                audio_wav,
                "--outfile",
                raw_full_video,
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

            if result.returncode != 0 or not os.path.exists(raw_full_video):
                error_details = result.stderr[-1000:] if result.stderr else "Unknown error"
                raise HTTPException(
                    status_code=500,
                    detail=f"Wav2Lip inference failed: {error_details}",
                )

            # Apply CodeFormer / GFPGAN HD Face & Teeth Restoration on full video
            if req.enable_hd_restoration is not False:
                restore_face_hd(raw_full_video, output_video, restorer_type=restorer, fidelity=fidelity)
            else:
                shutil.copy(raw_full_video, output_video)

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
