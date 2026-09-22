const axios = require('axios');
const { uploadBuffer, isCloudinaryConfigured } = require('../config/cloudinary');

/**
 * Generates speech audio using ElevenLabs TTS with the specified cloned voice.
 * @param {string} text - The personalized greeting text.
 * @returns {Promise<string>} Public URL of the uploaded audio file.
 */
const generateClonedSpeech = async (text) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    console.warn('[ElevenLabs] API Key or Voice ID missing in server/.env. Using placeholder audio for local testing.');
    // Return a working placeholder audio URL for testing
    return 'https://actions.google.com/sounds/v1/speech/hello_there.ogg';
  }

  try {
    console.log(`[ElevenLabs] Synthesizing speech for text: "${text.substring(0, 60)}..."`);
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 30000,
      }
    );

    const audioBuffer = Buffer.from(response.data);

    if (isCloudinaryConfigured()) {
      console.log('[Cloudinary] Uploading synthesized audio...');
      const uploadResult = await uploadBuffer(audioBuffer, {
        resource_type: 'video', // Cloudinary handles audio files under the video resource type
        folder: 'ai_greetings/audio',
        format: 'mp3',
      });
      console.log(`[Cloudinary] Audio uploaded successfully: ${uploadResult.secure_url}`);
      return uploadResult.secure_url;
    } else {
      // If Cloudinary is not yet configured, generate data URI
      console.warn('[Cloudinary] Cloudinary not configured, returning data URI for audio');
      return `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
    }
  } catch (error) {
    const errorMsg =
      error.response && error.response.data
        ? Buffer.isBuffer(error.response.data)
          ? error.response.data.toString()
          : JSON.stringify(error.response.data)
        : error.message;
    console.error('[ElevenLabs] Speech synthesis failed:', errorMsg);
    throw new Error(`ElevenLabs TTS Error: ${errorMsg}`);
  }
};

module.exports = {
  generateClonedSpeech,
};
