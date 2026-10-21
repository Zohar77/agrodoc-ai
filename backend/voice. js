// voice.js — AgroDoc AI Voice Note Generator
// Uses Google Text-to-Speech API to generate audio for WhatsApp voice notes
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Language codes for Google TTS
const LANG_CODES = {
  en:  { languageCode:"en-NG", name:"en-NG-Standard-A", gender:"FEMALE" },
  pcm: { languageCode:"en-NG", name:"en-NG-Standard-A", gender:"FEMALE" },
  ha:  { languageCode:"ha-NG", name:"ha-NG-Standard-A", gender:"MALE"   },
  yo:  { languageCode:"yo-NG", name:"yo-NG-Standard-A", gender:"FEMALE" },
  ig:  { languageCode:"ig-NG", name:"ig-NG-Standard-A", gender:"FEMALE" },
};

// Fallback to en-NG if specific language not available
const FALLBACK = { languageCode:"en-NG", name:"en-NG-Standard-A", gender:"FEMALE" };

async function generateVoiceNote(text, lang="en") {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    console.log("Google TTS API key not set — skipping voice note");
    return null;
  }

  const voiceConfig = LANG_CODES[lang] || FALLBACK;

  // Truncate text to 3000 chars for TTS (keeps it concise)
  const cleanText = text
    .replace(/[*_~`]/g, "") // Remove markdown
    .replace(/\n\n/g, ". ")
    .replace(/\n/g, ". ")
    .slice(0, 3000);

  try {
    const response = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        input: { text: cleanText },
        voice: {
          languageCode: voiceConfig.languageCode,
          name: voiceConfig.name,
          ssmlGender: voiceConfig.gender,
        },
        audioConfig: {
          audioEncoding: "OGG_OPUS", // WhatsApp uses OGG format
          speakingRate: 0.9,         // Slightly slower for clarity
          pitch: 0,
          effectsProfileId: ["handset-class-device"], // Optimized for phone speakers
        },
      },
      { timeout: 15000 }
    );

    // Save to temp file
    const audioContent = response.data.audioContent;
    const tmpFile = path.join(os.tmpdir(), `agrodoc_voice_${Date.now()}.ogg`);
    fs.writeFileSync(tmpFile, Buffer.from(audioContent, "base64"));

    console.log(`✅ Voice note generated: ${lang} (${tmpFile})`);
    return tmpFile;
  } catch (err) {
    // If specific language fails, try English fallback
    if (lang !== "en") {
      console.log(`⚠️ TTS failed for ${lang}, falling back to English`);
      return generateVoiceNote(text, "en");
    }
    console.error("Google TTS error:", err.response?.data || err.message);
    return null;
  }
}

// Build a concise voice summary from diagnosis result
function buildVoiceSummary(result, lang="en") {
  const intros = {
    en:  "AgroDoc AI Farm Doctor.",
    pcm: "AgroDoc AI Farm Doctor.",
    ha:  "AgroDoc AI likitan gona.",
    yo:  "AgroDoc AI dokita oko.",
    ig:  "AgroDoc AI dọkịta ubi.",
  };

  const severityWords = {
    en:  { severe:"URGENT — SEVERE", moderate:"MODERATE", mild:"MILD" },
    pcm: { severe:"URGENT — E SERIOUS", moderate:"E DEY MODERATE", mild:"E SMALL SMALL" },
    ha:  { severe:"GAGGAWA — YA TSANANTA", moderate:"YA MATSAKAITA", mild:"YA KARANTA" },
    yo:  { severe:"KIAKIA — O LEWU", moderate:"O JẸJẸ", mild:"O FẸRẸFẸRẸ" },
    ig:  { severe:"ỌSỊỊSỌ — Ọ DỊ IKE", moderate:"Ọ DỊ N'ETITI", mild:"Ọ DỊ NTAKỊRỊ" },
  };

  const sev = (severityWords[lang] || severityWords.en)[result.severity] || "";
  const intro = intros[lang] || intros.en;

  let summary = `${intro}\n\n`;
  summary += `${result.disease}. ${sev}.\n\n`;
  summary += `${result.description}\n\n`;

  if (result.treatment?.length > 0) {
    summary += result.treatment.slice(0, 3).join(". ") + ".\n\n";
  }

  if (result.pesticide && result.pesticide !== "N/A") {
    summary += result.pesticide + ".\n\n";
  }

  summary += result.disclaimer || "";

  return summary;
}

// Send voice note via WhatsApp
async function sendWhatsAppVoiceNote(phone, audioFilePath, token, phoneNumberId) {
  try {
    // Step 1: Upload media to WhatsApp
    const FormData = require("form-data");
    const form = new FormData();
    form.append("file", fs.createReadStream(audioFilePath), {
      contentType: "audio/ogg; codecs=opus",
      filename: "diagnosis.ogg",
    });
    form.append("messaging_product", "whatsapp");
    form.append("type", "audio/ogg");

    const uploadRes = await axios.post(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/media`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000,
      }
    );

    const mediaId = uploadRes.data.id;
    console.log(`✅ Media uploaded: ${mediaId}`);

    // Step 2: Send audio message
    await axios.post(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone,
        type: "audio",
        audio: { id: mediaId },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Clean up temp file
    fs.unlinkSync(audioFilePath);
    console.log(`✅ Voice note sent to ${phone}`);
    return true;
  } catch (err) {
    console.error("Voice note send error:", err.response?.data || err.message);
    return false;
  }
}

module.exports = { generateVoiceNote, buildVoiceSummary, sendWhatsAppVoiceNote };
