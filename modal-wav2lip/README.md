# Modal Wav2Lip Serverless Microservice ($0 Lip Sync)

This service deploys open-source [Wav2Lip GAN](https://github.com/Rudrabha/Wav2Lip) on [Modal](https://modal.com) serverless GPU (T4 / L4). It runs on demand and scales to zero when idle, fitting entirely within Modal's $30/month free compute allocation.

---

## Prerequisites

1. **Modal Account**: Sign up at [modal.com](https://modal.com) if you haven't already.
2. **Authenticate Modal CLI**:
   ```bash
   modal token new
   ```
   Follow the prompt in your browser to log in and save credentials.

---

## Deploying to Modal

From the `modal-wav2lip` directory:

```bash
cd modal-wav2lip
python -m modal deploy app.py
```

Upon successful deployment, Modal will output your live HTTPS endpoint, for example:
```
✓ Created web endpoint: https://<your-username>--ai-greeting-wav2lip-generate.modal.run
```

Copy this URL and set it as `MODAL_WAV2LIP_ENDPOINT` in `server/.env`.

---

## Endpoint API

### `POST /generate`
Accepts a JSON body with links to the master video and ElevenLabs generated voice:

```json
{
  "video_url": "https://res.cloudinary.com/.../master_sample.mp4",
  "audio_url": "https://res.cloudinary.com/.../voice_osama.mp3",
  "pads": "0 10 0 0",
  "cloudinary_cloud_name": "your_cloud_name",
  "cloudinary_api_key": "your_api_key",
  "cloudinary_api_secret": "your_api_secret"
}
```

#### Response (When Cloudinary credentials provided)
```json
{
  "success": true,
  "video_url": "https://res.cloudinary.com/.../greeting_synced.mp4",
  "public_id": "ai_greetings/generated_videos/xyz",
  "duration": 18.5
}
```

#### Response (Without Cloudinary credentials)
Returns raw binary `video/mp4` data stream with `Content-Disposition: attachment`.
