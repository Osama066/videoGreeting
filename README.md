# AI Personalized Video Greeting System ($0 Lip-Sync Cost)

An end-to-end personalized AI video greeting platform that completely eliminates commercial lip-sync subscriptions ($1–$4 per video) by leveraging **open-source Wav2Lip GAN deployed on Modal serverless GPU**, **ElevenLabs cloned voice TTS**, **Cloudinary media storage**, and **MongoDB**.

---

## 🎬 Video Demo

<div align="center">
  <video src="example_output.mp4" controls="controls" width="360" style="max-height: 520px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);"></video>
  <p><sub><em>Sample personalized AI video greeting generated with ElevenLabs cloned voice & serverless Wav2Lip GAN</em></sub></p>
  <p><a href="example_output.mp4">▶️ <strong>Watch / Download Demo Video (example_output.mp4)</strong></a></p>
</div>

---

## 🏗️ Architecture

```
┌────────────────────────────────────────┐
│             React Frontend             │
│   (Vite + Dark Glassmorphic Design)    │
└───────────────────┬────────────────────┘
                    │
            ┌───────▼────────┐
            │  Node/Express  │───────────────────────────────────────────┐
            │    Backend     │                                           │
            └───┬────────┬───┘                                           │
                │        │                                               │
       ┌────────┘        └─────────────────┐                             │
       ▼                                   ▼                             ▼
  ElevenLabs                    Modal Serverless GPU                Cloudinary
(Cloned Voice Audio TTS)        (Open-Source Wav2Lip GAN:          (Media Storage & CDN)
                                 $0 Model on Free GPU Credits)
```

---

## 📁 Repository Structure

```
├── modal-wav2lip/          # Python Modal microservice (Wav2Lip GAN serverless GPU worker)
│   ├── app.py              # Modal FastAPI endpoint for lip-sync generation
│   ├── requirements.txt    # Python dependencies
│   └── README.md           # Modal deployment guide
│
├── server/                 # Node.js Express orchestration backend
│   ├── config/             # MongoDB and Cloudinary SDK configurations
│   ├── models/             # MasterVideo, Job, and Config schemas
│   ├── routes/             # /api/jobs and /api/admin endpoints
│   ├── services/           # ElevenLabs, Modal Wav2Lip, and Cloudinary services
│   ├── .env.example        # Environment variables template
│   └── index.js            # Express server entry point
│
└── client/                 # React 18 + Vite frontend
    ├── src/
    │   ├── components/     # Navbar and UI elements
    │   ├── pages/          # HomePage, GreetingPage, AdminPage
    │   ├── index.css       # Custom dark-mode design system & animations
    │   └── App.jsx         # Client routing
    └── vite.config.js      # Vite build & backend API proxy
```

---

## 🚀 Quick Start

### 1. Deploy Modal Lip-Sync Worker ($0 Cost)

```bash
cd modal-wav2lip
modal token new
python -m modal deploy app.py
```
Copy the generated webhook URL (e.g. `https://<username>--ai-greeting-wav2lip-generate.modal.run`).

### 2. Configure Backend Server

```bash
cd ../server
npm install
cp .env.example .env
```

Edit `server/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_cloned_voice_id
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
MODAL_WAV2LIP_ENDPOINT=your_modal_webhook_url
```

Start the backend:
```bash
npm run dev
```

### 3. Start Frontend Client

```bash
cd ../client
npm install
npm run dev
```

Open `http://localhost:5173` (or `http://localhost:5174`) in your browser.

---

## 🔑 Key Features

- **Zero-Cost Lip Sync**: Uses open-source Wav2Lip GAN running on serverless T4/L4 GPU with scale-to-zero when idle.
- **Authentic Voice Cloning**: Integrates ElevenLabs TTS to synthesize personalized greetings using the cloned admin voice.
- **Admin Studio**:
  - Upload talking-head master videos directly to Cloudinary.
  - Set active master video.
  - Edit personalized script templates with dynamic `{name}` token replacement.
  - Search lead records and **Export to CSV**.
- **Real-Time Client Experience**:
  - Live script preview as users type their details.
  - Multi-step progress visualizer tracking audio generation and GPU rendering.
  - Embedded responsive video player with ambient glow.
  - One-click MP4 video download and pre-filled WhatsApp share link.
