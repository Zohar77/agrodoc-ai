// whatsapp.js — AgroDoc AI WhatsApp Bot v5.0
// NEW: Voice note replies in all 5 languages
// NEW: Vet/dealer registration via WhatsApp
// FIX #2: Per-phone rate limiting retained

const axios  = require("axios");
const fs     = require("fs");
const path   = require("path");
const { execSync } = require("child_process");
const { diagnose, tryOfflineCache } = require("./ai");

const WHATSAPP_API = "https://graph.facebook.com/v19.0";

// ── PER-PHONE RATE LIMITING ───────────────────────────────────────────────────
const phoneRateLimits = new Map();
function isRateLimited(phone) {
  const now = Date.now();
  if (!phoneRateLimits.has(phone)) phoneRateLimits.set(phone, { count:0, resetAt:now+60*60*1000 });
  const lim = phoneRateLimits.get(phone);
  if (now > lim.resetAt) { lim.count = 0; lim.resetAt = now+60*60*1000; }
  if (lim.count >= 10) return true;
  lim.count++;
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [k,v] of phoneRateLimits.entries()) if (now > v.resetAt+60*60*1000) phoneRateLimits.delete(k);
}, 60*60*1000);

// ── SESSION STATE ─────────────────────────────────────────────────────────────
const sessions = new Map();
function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, {
      status:         "new",
      name:           null,
      farm:           null,
      lang:           "en",
      lastActivity:   Date.now(),
      diagnosisCount: 0,
      lastDiagnosis:  null,   // Store last result for voice replay
      regStep:        null,   // Track registration flow
      regData:        {},     // Collect registration data
    });
  }
  const s = sessions.get(phone);
  s.lastActivity = Date.now();
  return s;
}
setInterval(() => {
  const cut = Date.now() - 30*24*60*60*1000;
  for (const [k,s] of sessions.entries()) if (s.lastActivity < cut) sessions.delete(k);
}, 6*60*60*1000);

// ── REGISTRATION STORE (in-memory, backed to JSON file) ──────────────────────
const REG_FILE = path.join(__dirname, "registrations.json");
let registrations = [];
try { registrations = JSON.parse(fs.readFileSync(REG_FILE, "utf8")); } catch {}
function saveRegistrations() {
  try { fs.writeFileSync(REG_FILE, JSON.stringify(registrations, null, 2)); } catch {}
}

// ── LANGUAGE DETECTION ────────────────────────────────────────────────────────
function detectLang(text = "") {
  const l = text.toLowerCase();
  if (["ina","yaya","gona","manomi","abokina"].some(w => l.includes(w))) return "ha";
  if (["irugbin","arun","bawo","jowo","agbe"].some(w => l.includes(w)))   return "yo";
  if (["ọka","ọrịa","ugbo","biko","nne"].some(w => l.includes(w)))        return "ig";
  if (["abeg","oga","dey","wetin","make i","na so"].some(w => l.includes(w))) return "pcm";
  return "en";
}

function parseFarmType(text = "") {
  const l = text.toLowerCase().trim();
  if (l==="1"||l.includes("crop")||l.includes("cassava")||l.includes("maize")||l.includes("tomato")) return "crops";
  if (l==="2"||l.includes("poultry")||l.includes("chicken")||l.includes("fowl")) return "poultry";
  if (l==="3"||l.includes("fish")||l.includes("catfish")||l.includes("pond"))    return "fish";
  if (l==="4"||l.includes("livestock")||l.includes("cattle")||l.includes("goat")) return "livestock";
  if (l==="5"||l.includes("mix")||l.includes("all"))                              return "mixed";
  return null;
}

function extractName(text = "") {
  return text.replace(/my name is /gi,"").replace(/i am /gi,"").replace(/na me be /gi,"")
    .replace(/sunana /gi,"").replace(/[^a-zA-ZÀ-ÿ\s]/g,"").trim().split(" ")[0] || text.trim();
}

// ── TTS VOICE NOTE GENERATION ─────────────────────────────────────────────────
// Uses Google Translate TTS (free, no key needed)
// Supports: en, ha, yo, ig (Pidgin uses English voice)
const TTS_LANGS = { en:"en", pcm:"en", ha:"ha", yo:"yo", ig:"ig" };

async function generateVoiceNote(text, lang = "en") {
  const ttsLang = TTS_LANGS[lang] || "en";
  // Limit text to avoid URL limits
  const shortText = text.slice(0, 500);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(shortText)}&tl=${ttsLang}&client=tw-ob`;

  try {
    // Download MP3 from Google TTS
    const mp3Path = path.join("/tmp", `agrodoc_voice_${Date.now()}.mp3`);
    const oggPath = mp3Path.replace(".mp3", ".ogg");

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        "Referer":    "https://translate.google.com/",
      },
      timeout: 10000,
    });

    fs.writeFileSync(mp3Path, Buffer.from(response.data));

    // Convert MP3 → OGG Opus (WhatsApp voice note format)
    execSync(`ffmpeg -i "${mp3Path}" -c:a libopus -b:a 32k -vbr on -application voip "${oggPath}" -y 2>/dev/null`);

    // Clean up MP3
    try { fs.unlinkSync(mp3Path); } catch {}

    return oggPath;
  } catch (err) {
    console.error("TTS generation error:", err.message);
    return null;
  }
}

async function sendVoiceNote(to, audioPath, lang = "en") {
  try {
    // Step 1: Upload audio to WhatsApp
    const audioData = fs.readFileSync(audioPath);
    const uploadRes = await axios.post(
      `${WHATSAPP_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`,
      (() => {
        const FormData = require("form-data");
        const form = new FormData();
        form.append("file", audioData, { filename:"voice.ogg", contentType:"audio/ogg" });
        form.append("messaging_product", "whatsapp");
        form.append("type", "audio/ogg");
        return form;
      })(),
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "multipart/form-data" } }
    );

    const mediaId = uploadRes.data.id;

    // Step 2: Send as voice note (ptt = push-to-talk = voice note)
    await axios.post(
      `${WHATSAPP_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      { messaging_product:"whatsapp", to, type:"audio", audio:{ id:mediaId } },
      { headers: { Authorization:`Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type":"application/json" } }
    );

    // Clean up audio file
    try { fs.unlinkSync(audioPath); } catch {}
    return true;
  } catch (err) {
    console.error("Voice note send error:", err.message);
    try { fs.unlinkSync(audioPath); } catch {}
    return false;
  }
}

// ── SEND TEXT MESSAGE ─────────────────────────────────────────────────────────
async function sendMessage(to, text) {
  try {
    await axios.post(
      `${WHATSAPP_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      { messaging_product:"whatsapp", to, type:"text", text:{ body:text, preview_url:false } },
      { headers: { Authorization:`Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type":"application/json" } }
    );
  } catch (err) { console.error(`Send error to ${to}:`, err.message); }
}

// ── DOWNLOAD MEDIA ────────────────────────────────────────────────────────────
async function downloadMedia(mediaId) {
  const r = await axios.get(`${WHATSAPP_API}/${mediaId}`, { headers:{ Authorization:`Bearer ${process.env.WHATSAPP_TOKEN}` } });
  const f = await axios.get(r.data.url, { headers:{ Authorization:`Bearer ${process.env.WHATSAPP_TOKEN}` }, responseType:"arraybuffer" });
  return { base64:Buffer.from(f.data).toString("base64"), mimeType:r.data.mime_type||"image/jpeg" };
}

// ── FORMAT DIAGNOSIS REPLY ────────────────────────────────────────────────────
function formatReply(result, session) {
  const name = session.name;
  const sevEmoji = { mild:"🟡", moderate:"🟠", severe:"🔴" }[result.severity] || "🟡";
  const catEmoji = { crops:"🌿", poultry:"🐔", fish:"🐟", livestock:"🐄" }[result.category] || "🌿";
  const lines = [
    `${catEmoji} *${name ? name+"'s " : ""}Farm Diagnosis*\n`,
    `🦠 *Disease:* ${result.disease}`,
    `${sevEmoji} *Severity:* ${(result.severity||"").toUpperCase()}`,
    `🌾 *${result.subject}*\n`,
    `📋 *What is happening:*`,
    result.description,
    `\n💊 *Treatment:*`,
    ...(result.treatment||[]).map((s,i) => `${i+1}. ${s}`),
  ];
  if (result.pesticide && result.pesticide !== "N/A") lines.push(`\n⚗️ *Product:* ${result.pesticide}`);
  if (result.prevention) lines.push(`\n🛡 *Prevention:* ${result.prevention}`);
  if (result.disclaimer) lines.push(`\n${result.disclaimer}`);
  lines.push(`\n_Diagnosed by AgroDoc AI 🌿_`);
  lines.push(`\n💡 _Type *voice* to hear this diagnosis spoken aloud_`);
  return lines.join("\n");
}

// Format a short spoken version for voice notes
function formatForVoice(result, lang = "en") {
  const intros = {
    en:  `AgroDoc AI Farm Diagnosis. `,
    pcm: `AgroDoc AI diagnosis. `,
    ha:  `AgroDoc AI ganewar cuta. `,
    yo:  `AgroDoc AI iwadii arun. `,
    ig:  `AgroDoc AI nchọpụta ọrịa. `,
  };
  const severity = {
    en:  { mild:`Mild condition.`, moderate:`Moderate condition.`, severe:`Severe — act immediately.` },
    pcm: { mild:`E no too serious.`, moderate:`E serious small.`, severe:`E very serious — do something now!` },
    ha:  { mild:`Yanayin mai sauƙi.`, moderate:`Matsakaiciyar matsala.`, severe:`Matsala mai tsanani — yi aiki yanzu.` },
    yo:  { mild:`Ipele irẹlẹ.`, moderate:`Ìpele àárọ̀.`, severe:`Ipele to lekoko — ṣe ohun kan bayi.` },
    ig:  { mild:`Ọ bụ nke dị mfe.`, moderate:`Ọ dị serious nkebiite.`, severe:`Ọ dị egwu — mee ihe ugbu a.` },
  };
  const l = lang in intros ? lang : "en";
  const sev = severity[l][(result.severity||"mild")] || severity[l].mild;
  const treatment = (result.treatment||[]).slice(0,3).join(". ");
  return `${intros[l]}${result.disease}. ${sev} ${result.description} ${treatment}`;
}

// ── REGISTRATION MESSAGES ─────────────────────────────────────────────────────
const REG_START = {
  en:  `🏪 *Register on AgroDoc AI*\n\nJoin our directory so farmers can find you!\n\nAre you a:\n*1* 🏪 Agro dealer / input seller\n*2* 🐄 Veterinarian / vet extension worker\n\nType 1 or 2 to begin`,
  pcm: `🏪 *Register for AgroDoc AI*\n\nFarmers fit find you for our directory!\n\nYou be:\n*1* 🏪 Agro dealer\n*2* 🐄 Vet doctor\n\nType 1 or 2`,
  ha:  `🏪 *Yi rajista a AgroDoc AI*\n\nKunara kanku a cikin jagorarmu!\n\nKuna:\n*1* 🏪 Dillali na kayan gona\n*2* 🐄 Likitan dabbobi\n\nRubuta 1 ko 2`,
  yo:  `🏪 *Forukọsilẹ fun AgroDoc AI*\n\nJẹ ki awọn agbẹ ri ọ!\n\nO jẹ:\n*1* 🏪 Olutaja agbe\n*2* 🐄 Oníṣègùn ẹranko\n\nKọ 1 tabi 2`,
  ig:  `🏪 *Debanye aha gị na AgroDoc AI*\n\nKee ka ndị ọrụ ugbo chọta gị!\n\nO bụ gị:\n*1* 🏪 Onye ahịa ọrụ ugbo\n*2* 🐄 Dọkịta ụlọ ọgwụ anụmanụ\n\nDee 1 ma ọ bụ 2`,
};

// ── MESSAGES ──────────────────────────────────────────────────────────────────
const WELCOME = {
  en:  `🌿 *Welcome to AgroDoc AI — Your AI Farm Doctor!*\n\nI diagnose diseases on your crops, poultry, fish, and livestock in seconds.\n\n*What is your first name?* 😊\n_(Type your name or send a voice note)_`,
  pcm: `🌿 *Welcome to AgroDoc AI!*\n\nI be your AI Farm Doctor — I fit diagnose disease for your farm quick quick.\n\n*Wetin be your name?* 😊\n_(Type am or send voice note)_`,
  ha:  `🌿 *Barka da zuwa AgroDoc AI!*\n\n*Menene sunanka?* 😊`,
  yo:  `🌿 *Ẹ káàbọ̀ sí AgroDoc AI!*\n\n*Kí ni orúkọ rẹ?* 😊`,
  ig:  `🌿 *Nnọọ na AgroDoc AI!*\n\n*Kedu aha gị?* 😊`,
};
const ASK_FARM = {
  en:  (n) => `Nice to meet you, *${n}!* 👋\n\nWhat type of farm do you run?\n\n*1* 🌿 Crops\n*2* 🐔 Poultry\n*3* 🐟 Fish\n*4* 🐄 Livestock\n*5* 🌾 Mixed farm`,
  pcm: (n) => `E don do *${n}!* 👋\n\nWetin kind farm you get?\n\n*1* 🌿 Crops\n*2* 🐔 Fowl\n*3* 🐟 Fish\n*4* 🐄 Animal\n*5* 🌾 Mix-mix`,
  ha:  (n) => `Sannu *${n}!* 👋\n\n*1* 🌿 Amfanin gona\n*2* 🐔 Kaji\n*3* 🐟 Kifi\n*4* 🐄 Dabbobi\n*5* 🌾 Nau'i da yawa`,
  yo:  (n) => `Ẹ káàbọ̀ *${n}!* 👋\n\n*1* 🌿 Irugbin\n*2* 🐔 Adìẹ\n*3* 🐟 Ẹja\n*4* 🐄 Ẹran\n*5* 🌾 Irú pupọ`,
  ig:  (n) => `Nnọọ *${n}!* 👋\n\n*1* 🌿 Ọka\n*2* 🐔 Ọkụkọ\n*3* 🐟 Azụ\n*4* 🐄 Anụ ọhịa\n*5* 🌾 Ọtụtụ ụdị`,
};
const REG_DONE = {
  en:  (n, f) => `✅ *You're all set, ${n}!*\n\nYour farm type: *${f}*\n\n📷 Send a photo of a sick crop or animal\n✍️ Or type what you see\n🎤 Send a voice note\n💡 Type *voice* after any diagnosis to hear it spoken\n💼 Type *register* to list your business in our directory\n\nWhat's the problem on your farm today? 🌾`,
  pcm: (n, f) => `✅ *${n}, you don set!*\n\nYour farm: *${f}*\n\n📷 Send photo\n✍️ Type wetin you see\n🎤 Send voice note\n💡 Type *voice* to hear diagnosis\n💼 Type *register* to list your business\n\nWetin happen? 🌾`,
  ha:  (n, f) => `✅ *${n}, kun shirya!*\n\nGonarka: *${f}*\n\nAika hoto ko rubuta bayani.\nRubuta *voice* don jin ganewar.\nRubuta *register* don rajista.`,
  yo:  (n, f) => `✅ *${n}, o ti ṣetan!*\n\nOko rẹ: *${f}*\n\nFi fọto ranṣẹ tabi kọ awọn aami aisan.\nKọ *voice* lati gbọ iwadii.\nKọ *register* lati forukọsilẹ.`,
  ig:  (n, f) => `✅ *${n}, ị dị njikere!*\n\nUgbo gị: *${f}*\n\nZiga foto ma ọ bụ dee ihe ị na-ahụ.\nDee *voice* iji nụ nchọpụta.\nDee *register* iji debanye aha gị.`,
};
const ANALYSING = {
  en:  (n) => `🔬 Analysing${n ? ` ${n}` : ""}... Please wait a moment.`,
  pcm: (n) => `🔬 E dey check${n ? ` ${n}` : ""}... Wait small abeg.`,
  ha:  (n) => `🔬 Ana nazari${n ? ` ${n}` : ""}... Jira.`,
  yo:  (n) => `🔬 N ṣe itupalẹ${n ? ` ${n}` : ""}... Duro.`,
  ig:  (n) => `🔬 Na-enyocha${n ? ` ${n}` : ""}... Chere.`,
};
const VOICE_GENERATING = {
  en:"🔊 Generating voice note in your language... Please wait.",
  pcm:"🔊 E dey prepare voice note for you... Wait small.",
  ha:"🔊 Ana shirya sauti... Jira.",
  yo:"🔊 N ṣe agbohun... Duro.",
  ig:"🔊 Na-emepụta olu... Chere.",
};
const VOICE_FAILED = {
  en:"⚠️ Could not generate voice note right now. Here is the text diagnosis again:",
  pcm:"⚠️ Voice note no work now. E don give you text diagnosis again:",
  ha:"⚠️ Ba za a iya yin sauti yanzu ba. Ga ganewar rubutu:",
  yo:"⚠️ Ko le ṣe agbohun bayi. Eyi ni iwadii ọrọ:",
  ig:"⚠️ Enweghị ike imepụta olu ugbu a. Nke a bụ nchọpụta ederede:",
};
const ERROR_MSG = {
  en:"❌ Sorry, I could not analyse that. Try again or type a description of the symptoms.",
  pcm:"❌ E no work. Try again or type wetin you see.",
  ha:"❌ Yi hakuri. Sake gwadawa.",
  yo:"❌ Má bínú. Gbiyanju lẹẹkansi.",
  ig:"❌ Ndo. Nwaa ọzọ.",
};
const RATE_LIMIT = {
  en:  (n) => `⚠️ ${n||"You"} have sent too many messages this hour. Please wait 1 hour.`,
  pcm: (n) => `⚠️ ${n||"You"} don send too many messages. Wait one hour.`,
  ha:  (n) => `⚠️ ${n||""} kun aika sakonni da yawa. Jira awa.`,
  yo:  (n) => `⚠️ ${n||""} ti fi ọpọlọpọ ranṣẹ. Duro wakati 1.`,
  ig:  (n) => `⚠️ ${n||""} ezitela ozi ọtụtụ. Chere awa 1.`,
};

function farmLabel(farm, lang="en") {
  const labels = {
    crops:    { en:"Crops 🌿", pcm:"Crops 🌿", ha:"Amfanin gona 🌿", yo:"Irugbin 🌿", ig:"Ọka 🌿" },
    poultry:  { en:"Poultry 🐔", pcm:"Fowl 🐔", ha:"Kaji 🐔", yo:"Adìẹ 🐔", ig:"Ọkụkọ 🐔" },
    fish:     { en:"Fish 🐟", pcm:"Fish 🐟", ha:"Kifi 🐟", yo:"Ẹja 🐟", ig:"Azụ 🐟" },
    livestock:{ en:"Livestock 🐄", pcm:"Animals 🐄", ha:"Dabbobi 🐄", yo:"Ẹran 🐄", ig:"Anụ ọhịa 🐄" },
    mixed:    { en:"Mixed farm 🌾", pcm:"Mix-mix 🌾", ha:"Noma da yawa 🌾", yo:"Orisirisi 🌾", ig:"Ọtụtụ ụdị 🌾" },
  };
  return (labels[farm]||labels.crops)[lang]||(labels[farm]||labels.crops).en;
}

// ════════════════════════════════════════════════════════════════════════════
// REGISTRATION FLOW HANDLER
// ════════════════════════════════════════════════════════════════════════════
async function handleRegistration(phone, text, session) {
  const lang = session.lang;
  const step = session.regStep;
  const data = session.regData;

  // Start registration
  if (!step) {
    session.regStep = "type";
    await sendMessage(phone, REG_START[lang] || REG_START.en);
    return;
  }

  // Step 1: Business type
  if (step === "type") {
    const t = text.trim();
    if (t === "1" || t.toLowerCase().includes("agro") || t.toLowerCase().includes("dealer") || t.toLowerCase().includes("seller")) {
      data.type = "agro_dealer";
    } else if (t === "2" || t.toLowerCase().includes("vet")) {
      data.type = "vet";
    } else {
      const retry = { en:"Please type 1 for Agro Dealer or 2 for Vet.", pcm:"Type 1 for Agro dealer or 2 for Vet abeg.", ha:"Rubuta 1 ko 2.", yo:"Kọ 1 tabi 2.", ig:"Dee 1 ma ọ bụ 2." };
      await sendMessage(phone, retry[lang]||retry.en);
      return;
    }
    session.regStep = "business_name";
    const q = { en:"What is your *business name*?", pcm:"Wetin be your *business name*?", ha:"Menene *sunan kasuwancin ku*?", yo:"Kí ni *orúkọ iṣowo* rẹ?", ig:"Gịnị bụ *aha azụmaahia gị*?" };
    await sendMessage(phone, q[lang]||q.en);
    return;
  }

  // Step 2: Business name
  if (step === "business_name") {
    data.businessName = text.trim();
    session.regStep = "phone";
    const q = { en:"What is your *phone number*? (the one farmers can call)", pcm:"Wetin be your *phone number*?", ha:"Menene *lambar wayar* ku?", yo:"Kí ni *nọmba foonu* rẹ?", ig:"Gịnị bụ *nọmba ekwe* gị?" };
    await sendMessage(phone, q[lang]||q.en);
    return;
  }

  // Step 3: Phone
  if (step === "phone") {
    data.phone = text.trim();
    session.regStep = "state";
    const q = { en:"Which *state and LGA* are you located in? (e.g. Lagos — Ikeja)", pcm:"Which *state and LGA* you dey?", ha:"Wane *jiha da LGA* kuke ciki?", yo:"Ìpínlẹ̀ àti *LGA* wo ni o wà?", ig:"*Steeti na LGA* ole ị nọ?" };
    await sendMessage(phone, q[lang]||q.en);
    return;
  }

  // Step 4: State/LGA
  if (step === "state") {
    data.stateLGA = text.trim();
    session.regStep = "services";
    const q = {
      en:  data.type==="vet"
        ? "What *animals do you treat*? (e.g. poultry, cattle, goats, fish)"
        : "What *products do you sell*? (e.g. fertilizer, pesticides, vaccines, feeds)",
      pcm: data.type==="vet" ? "Which *animals you treat*?" : "Which *products you sell*?",
      ha:  data.type==="vet" ? "*Wane dabbobin* kuke yi wa magani?" : "*Wane kayan* kuke sayarwa?",
      yo:  data.type==="vet" ? "*Ẹran* wo ni o tọju?" : "*Awọn ọja* wo ni o ta?",
      ig:  data.type==="vet" ? "*Anụmanụ* ole i na-agwọ?" : "*Ngwa* ole i na-ere?",
    };
    await sendMessage(phone, q[lang]||q.en);
    return;
  }

  // Step 5: Services → Complete registration
  if (step === "services") {
    data.services = text.trim();
    session.regStep = null;

    const reg = {
      id:          `REG_${Date.now()}`,
      phone,
      type:        data.type,
      businessName:data.businessName,
      contactPhone:data.phone,
      stateLGA:    data.stateLGA,
      services:    data.services,
      name:        session.name || "Unknown",
      lang,
      submittedAt: new Date().toISOString(),
      approved:    false,
    };
    registrations.push(reg);
    saveRegistrations();
    session.regData = {};

    const done = {
      en:  `✅ *Registration submitted, ${session.name||""}!*\n\n*Business:* ${data.businessName}\n*Location:* ${data.stateLGA}\n*Services:* ${data.services}\n\nWe will review and add you to the AgroDoc AI directory within 48 hours. Farmers in your area will be able to find you.\n\nThank you for joining AgroDoc AI! 🌿`,
      pcm: `✅ *${session.name||"You"} don register!*\n\n*Business:* ${data.businessName}\n*Location:* ${data.stateLGA}\n\nWe go check am and add you within 48 hours. Farmers go fit find you.\n\nThank you! 🌿`,
      ha:  `✅ *An karɓi rajista!*\n\n*Kasuwanci:* ${data.businessName}\n*Wuri:* ${data.stateLGA}\n\nZa mu sake dubawa a cikin awanni 48. Manoma za su iya samun ku.\n\nNa gode! 🌿`,
      yo:  `✅ *A ti gba iforukọsilẹ rẹ!*\n\n*Iṣowo:* ${data.businessName}\n*Ipo:* ${data.stateLGA}\n\nA yoo ṣe atunyẹwo laarin awọn wakati 48.\n\nE se! 🌿`,
      ig:  `✅ *Edebanyelara ihe ọ bụla gị!*\n\n*Azụmaahia:* ${data.businessName}\n*Ọnọdụ:* ${data.stateLGA}\n\nA ga-atụle ma tinye gị n'ime awa 48.\n\nDaalu! 🌿`,
    };
    await sendMessage(phone, done[lang]||done.en);
    return;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN MESSAGE HANDLER
// ════════════════════════════════════════════════════════════════════════════
async function handleWhatsAppMessage(message, contact) {
  const phone   = message.from;
  const msgType = message.type;
  const session = getSession(phone);
  const textContent = message.text?.body?.trim() || message.image?.caption?.trim() || "";

  // Auto-detect language on first contact
  if (session.status === "new" || !session.lang) {
    const detected = detectLang(textContent);
    if (detected !== "en") session.lang = detected;
  }
  const lang = session.lang;
  const name = session.name;

  // ── GLOBAL LANGUAGE SWITCH ───────────────────────────────────────────────
  if (msgType === "text") {
    const low = textContent.toLowerCase();
    const langMap = { hausa:"ha", ha:"ha", yoruba:"yo", yo:"yo", igbo:"ig", ig:"ig", english:"en", en:"en", pidgin:"pcm", pcm:"pcm" };
    if (langMap[low]) {
      session.lang = langMap[low];
      const confirmations = { en:"✅ Switched to English!", pcm:"✅ E don change to Pidgin!", ha:"✅ An canza zuwa Hausa!", yo:"✅ Yípadà sí Yorùbá!", ig:"✅ Agbanwela na Igbo!" };
      await sendMessage(phone, confirmations[session.lang]);
      return;
    }

    // ── VOICE COMMAND — replay last diagnosis as voice note ────────────────
    if (low === "voice" || low === "send voice" || low === "hear it") {
      if (!session.lastDiagnosis) {
        const nodiag = { en:"You have not received a diagnosis yet. Send a photo or describe your crop/animal symptoms first.", pcm:"You never receive diagnosis yet. Send photo or describe wetin you see first.", ha:"Ba ka sami ganewar cuta tukuna. Aika hoto da farko.", yo:"O ko ti gba iwadii sibẹsibẹ. Fi fọto ranṣẹ ni akọkọ.", ig:"Onweghị nchọpụta ọ bụla ka ị natara. Ziga foto na mbụ." };
        await sendMessage(phone, nodiag[lang]||nodiag.en);
        return;
      }
      await sendMessage(phone, VOICE_GENERATING[lang]||VOICE_GENERATING.en);
      const spokenText = formatForVoice(session.lastDiagnosis, lang);
      const audioPath  = await generateVoiceNote(spokenText, lang);
      if (audioPath) {
        const sent = await sendVoiceNote(phone, audioPath, lang);
        if (!sent) {
          await sendMessage(phone, (VOICE_FAILED[lang]||VOICE_FAILED.en) + "\n\n" + formatReply(session.lastDiagnosis, session));
        }
      } else {
        await sendMessage(phone, (VOICE_FAILED[lang]||VOICE_FAILED.en) + "\n\n" + formatReply(session.lastDiagnosis, session));
      }
      return;
    }

    // ── REGISTER COMMAND ───────────────────────────────────────────────────
    if (low === "register" || low === "list my business" || low === "join directory") {
      // If currently in registration flow, handle it
      if (session.regStep) {
        await handleRegistration(phone, textContent, session);
        return;
      }
      await handleRegistration(phone, textContent, session);
      return;
    }

    // If in registration flow, continue it
    if (session.regStep) {
      await handleRegistration(phone, textContent, session);
      return;
    }

    // ── HELP ────────────────────────────────────────────────────────────────
    if (["hi","hello","help","start","hey"].some(w => low.includes(w)) && session.status === "registered") {
      const helpMsg = {
        en:  `🌿 *AgroDoc AI — Quick Guide*\n\n📷 *Diagnose:* Send a photo of sick crop/animal\n✍️ *Describe:* Type what you see\n🔊 *Voice:* Type *voice* after a diagnosis to hear it\n💼 *Register:* Type *register* to list your business\n\n*Change language:* hausa · yoruba · igbo · pidgin · english`,
        pcm: `🌿 *AgroDoc AI — Quick Guide*\n\n📷 Send photo of sick crop/animal\n✍️ Type wetin you see\n🔊 Type *voice* to hear diagnosis\n💼 Type *register* to list your business`,
        ha:  `🌿 *AgroDoc AI*\n\n📷 Aika hoto\n✍️ Rubuta bayani\n🔊 Rubuta *voice* don jin ganewar\n💼 Rubuta *register* don rajista`,
        yo:  `🌿 *AgroDoc AI*\n\n📷 Fi fọto ranṣẹ\n✍️ Kọ awọn aami aisan\n🔊 Kọ *voice* lati gbọ\n💼 Kọ *register* lati forukọsilẹ`,
        ig:  `🌿 *AgroDoc AI*\n\n📷 Ziga foto\n✍️ Dee ihe ị na-ahụ\n🔊 Dee *voice* iji nụ\n💼 Dee *register* iji debanye aha`,
      };
      await sendMessage(phone, helpMsg[lang]||helpMsg.en);
      return;
    }

    // Skip registration
    if (["skip","just diagnose"].some(w => low.includes(w)) && session.status !== "registered") {
      session.status = "registered";
      const skipMsg = { en:"👋 No problem! Send a photo or describe your farm problem.\n\n💡 Tip: Type *voice* after any diagnosis to hear it spoken.", pcm:"👋 No wahala! Send photo or type wetin you see.", ha:"👋 Babu matsala! Aika hoto ko rubuta bayani.", yo:"👋 Ko sí ìṣòro! Fi fọto ranṣẹ.", ig:"👋 Ọ dịghị nsogbu! Ziga foto." };
      await sendMessage(phone, skipMsg[lang]||skipMsg.en);
      return;
    }
  }

  // ── REGISTRATION STATE MACHINE ────────────────────────────────────────────
  if (session.status === "new") {
    session.status = "awaiting_name";
    await sendMessage(phone, WELCOME[lang]||WELCOME.en);
    return;
  }
  if (session.status === "awaiting_name") {
    if (msgType === "audio") { const q={en:"🎤 Thanks! Also please *type your name* so I can save it.",pcm:"🎤 Thanks! Abeg *type your name* too.",ha:"🎤 Na gode! Rubuta *sunanka* kuma.",yo:"🎤 E se! Kọ *orúkọ* rẹ pẹlu.",ig:"🎤 Daalu! Dee *aha gị* kwa."};await sendMessage(phone,q[lang]||q.en);return;}
    if (msgType==="text"&&textContent.length>0){const n=extractName(textContent);if(n&&n.length>=2&&n.length<=30){session.name=n.charAt(0).toUpperCase()+n.slice(1).toLowerCase();session.status="awaiting_farm";await sendMessage(phone,(ASK_FARM[lang]||ASK_FARM.en)(session.name));}else{const r={en:"What is your *first name*? (e.g. *Emeka*)",pcm:"Wetin be your *name*? (e.g. *Emeka*)",ha:"*Sunanka* mene ne?",yo:"*Orúkọ* rẹ nko?",ig:"*Aha gị* bụ gịnị?"};await sendMessage(phone,r[lang]||r.en);}
    }return;
  }
  if (session.status === "awaiting_farm") {
    if (msgType==="audio"){const q={en:`🎤 Thanks ${session.name}! Please also type the *farm type number* (1–5).`,pcm:`🎤 Thanks! Type the number (1–5) abeg.`,ha:"🎤 Rubuta lambar (1–5).",yo:"🎤 Kọ nọmba (1–5).",ig:"🎤 Dee nọmba (1–5)."};await sendMessage(phone,q[lang]||q.en);return;}
    if (msgType==="text"){const ft=parseFarmType(textContent);if(ft){session.farm=ft;session.status="registered";await sendMessage(phone,(REG_DONE[lang]||REG_DONE.en)(session.name,farmLabel(ft,lang)));}else{const r={en:`I didn't catch that ${session.name}. Type a number:\n\n*1* 🌿 Crops\n*2* 🐔 Poultry\n*3* 🐟 Fish\n*4* 🐄 Livestock\n*5* 🌾 Mixed`,pcm:`Type number ${session.name}:\n*1* 🌿 *2* 🐔 *3* 🐟 *4* 🐄 *5* 🌾`,ha:"Rubuta lambar (1–5).",yo:"Kọ nọmba (1–5).",ig:"Dee nọmba (1–5)."};await sendMessage(phone,r[lang]||r.en);}
    }return;
  }

  // ── REGISTERED FARMER — NORMAL FLOW ──────────────────────────────────────
  if (msgType==="image"||msgType==="audio"||(msgType==="text"&&textContent.length>10)) {
    if (isRateLimited(phone)){await sendMessage(phone,(RATE_LIMIT[lang]||RATE_LIMIT.en)(name));return;}
  }

  // Text diagnosis
  if (msgType === "text" && textContent.length > 2) {
    const cached = tryOfflineCache(textContent);
    if (cached) {
      session.lastDiagnosis = cached;
      await sendMessage(phone, formatReply(cached, session) + "\n\n_⚡ Quick result — send a photo for full AI analysis_");
      session.diagnosisCount++;
      return;
    }
    await sendMessage(phone, (ANALYSING[lang]||ANALYSING.en)(name));
    try {
      const category = session.farm==="mixed"?"crops":(session.farm||"crops");
      const result = await diagnose({ text:textContent, lang, mode:"farmer", category });
      session.lastDiagnosis = result;
      await sendMessage(phone, formatReply(result, session));
      session.diagnosisCount++;
    } catch { await sendMessage(phone, ERROR_MSG[lang]||ERROR_MSG.en); }
    return;
  }

  // Image diagnosis
  if (msgType === "image") {
    const mediaId = message.image?.id;
    const caption = message.image?.caption?.trim()||"";
    await sendMessage(phone, (ANALYSING[lang]||ANALYSING.en)(name));
    try {
      const { base64, mimeType } = await downloadMedia(mediaId);
      const category = session.farm==="mixed"?"crops":(session.farm||"crops");
      const result = await diagnose({ imageBase64:base64, imageType:mimeType, text:caption||undefined, lang, mode:"farmer", category });
      session.lastDiagnosis = result;
      await sendMessage(phone, formatReply(result, session));
      session.diagnosisCount++;
    } catch {
      const cached = caption ? tryOfflineCache(caption) : null;
      if (cached) { session.lastDiagnosis = cached; await sendMessage(phone, formatReply(cached, session)+"_⚡ Offline_"); }
      else await sendMessage(phone, ERROR_MSG[lang]||ERROR_MSG.en);
    }
    return;
  }

  // Voice note (during normal conversation)
  if (msgType === "audio") {
    const voicePrompt = {
      en:`🎤 ${name?`Thanks ${name}!`:"Thanks!"} I heard your voice note.\n\nTo diagnose, please *send a photo* or *type* what you see.\n\nExample: _"yellow leaves on my cassava"_\n\n💡 After a diagnosis, type *voice* to hear it spoken back.`,
      pcm:`🎤 ${name?`${name} thanks!`:"Thanks!"} I hear your voice.\n\nAbeg *send photo* or *type* wetin you see.\n\nAfter diagnosis, type *voice* to hear am.`,
      ha:`🎤 Na gode! Aika hoto ko rubuta bayani. Bayan ganewar, rubuta *voice* don jin ta.`,
      yo:`🎤 E se! Fi fọto ranṣẹ tabi kọ ohun ti o rii. Lẹhin iwadii, kọ *voice* lati gbọ.`,
      ig:`🎤 Daalu! Ziga foto ma ọ bụ dee ihe ị na-ahụ. Mgbe nchọpụta gasịrị, dee *voice* iji nụ.`,
    };
    await sendMessage(phone, voicePrompt[lang]||voicePrompt.en);
    return;
  }

  // Unsupported
  if (["document","sticker","video"].includes(msgType)) {
    const unsup = { en:"📷 Please send a *photo* or *type* your symptoms.", pcm:"📷 Send *photo* or *type* wetin you see.", ha:"📷 Aika *hoto* ko *rubuta* bayani.", yo:"📷 Fi *fọto* ranṣẹ tabi *kọ* awọn aami.", ig:"📷 Ziga *foto* ma ọ bụ *dee* ihe." };
    await sendMessage(phone, unsup[lang]||unsup.en);
  }
}

module.exports = { handleWhatsAppMessage, isWhatsAppRateLimited: isRateLimited, getRegistrations: () => registrations };
