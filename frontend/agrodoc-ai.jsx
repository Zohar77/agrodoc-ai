//import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — UPDATE BOTH VALUES AFTER YOU DEPLOY ON RENDER
// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Replace with your actual Render URL after deployment
const BACKEND_URL = "https://agrodoc-ai.onrender.com"; // ← CHANGE THIS

// Step 2: Must match APP_KEY in your backend .env file exactly
// This is the shared secret that locks your API — never share it publicly
const APP_KEY = "agrodoc2026secretkey123456789abc"; // ← CHANGE THIS TO MATCH YOUR .env APP_KEY
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const LANGUAGES = {
  en:  { label:"English", code:"en-NG" },
  pcm: { label:"Pidgin",  code:"en-NG" },
  ha:  { label:"Hausa",   code:"ha"    },
  yo:  { label:"Yoruba",  code:"yo"    },
  ig:  { label:"Igbo",    code:"ig"    },
};
const CATEGORIES = [
  { id:"crops",    emoji:"🌿", label:"Crops"    },
  { id:"poultry",  emoji:"🐔", label:"Poultry"  },
  { id:"fish",     emoji:"🐟", label:"Fish"     },
  { id:"livestock",emoji:"🐄", label:"Livestock"},
];
const CAT_COLORS = { crops:"4ade80", poultry:"facc15", fish:"60a5fa", livestock:"fb923c" };
const LANG_PROMPTS = {
  en:"Respond in clear, simple English.",
  pcm:"Respond in Nigerian Pidgin English. Use 'Oga', 'e dey', 'make you', 'quick quick', 'no worry' — friendly like a knowledgeable Nigerian neighbour.",
  ha:"Respond in Hausa language as spoken in Nigeria.",
  yo:"Respond in Yoruba language as spoken in Nigeria.",
  ig:"Respond in Igbo language as spoken in Nigeria.",
};

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────────────────────────────────────
const MARKET_PRICES = [
  { crop:"Cassava (dry)",  unit:"100kg bag", price:18500, change:+5.2,  market:"Onitsha" },
  { crop:"Maize",          unit:"100kg bag", price:32000, change:-2.1,  market:"Kano"    },
  { crop:"Tomato",         unit:"50kg crate",price:14000, change:+12.4, market:"Lagos"   },
  { crop:"Rice (paddy)",   unit:"100kg bag", price:45000, change:+1.8,  market:"Kebbi"   },
  { crop:"Yam",            unit:"tuber/kg",  price:650,   change:+3.5,  market:"Benue"   },
  { crop:"Groundnut",      unit:"100kg bag", price:75000, change:-0.8,  market:"Kano"    },
  { crop:"Pepper (dry)",   unit:"50kg bag",  price:38000, change:+8.1,  market:"Ibadan"  },
  { crop:"Soybean",        unit:"100kg bag", price:56000, change:+2.3,  market:"Kaduna"  },
  { crop:"Catfish (live)", unit:"per kg",    price:2800,  change:+4.0,  market:"Lagos"   },
  { crop:"Broiler chicken",unit:"per kg",    price:3500,  change:-1.5,  market:"Abuja"   },
];
const INPUT_PRICES = [
  { name:"NPK Fertilizer (50kg)", stores:[{ store:"Adekunle Agro", price:32000 },{ store:"GreenField Inputs", price:29500 },{ store:"FarmPlus Store", price:31000 }] },
  { name:"Urea Fertilizer (50kg)", stores:[{ store:"Adekunle Agro", price:26000 },{ store:"GreenField Inputs", price:24800 },{ store:"FarmPlus Store", price:25500 }] },
  { name:"Confidor (Imidacloprid)", stores:[{ store:"Adekunle Agro", price:4500 },{ store:"GreenField Inputs", price:4200 },{ store:"FarmPlus Store", price:4800 }] },
  { name:"Ridomil Gold MZ (1kg)", stores:[{ store:"Adekunle Agro", price:8500 },{ store:"GreenField Inputs", price:7900 },{ store:"FarmPlus Store", price:8200 }] },
  { name:"Lasota ND Vaccine (100 doses)", stores:[{ store:"Adekunle Agro", price:2800 },{ store:"GreenField Inputs", price:2500 },{ store:"FarmPlus Store", price:2600 }] },
  { name:"Karate (250ml)", stores:[{ store:"Adekunle Agro", price:3200 },{ store:"GreenField Inputs", price:2900 },{ store:"FarmPlus Store", price:3100 }] },
  { name:"Terramycin (oxytet) 100g", stores:[{ store:"Adekunle Agro", price:3600 },{ store:"GreenField Inputs", price:3400 },{ store:"FarmPlus Store", price:3800 }] },
  { name:"Dithane M-45 (1kg)", stores:[{ store:"Adekunle Agro", price:5200 },{ store:"GreenField Inputs", price:4800 },{ store:"FarmPlus Store", price:5000 }] },
];
const PLANTING_CALENDAR = {
  cassava:   { plant:["Mar","Apr","Oct","Nov"], harvest:["Sep","Oct","Mar","Apr"], tips:"Plant at start of rains. Use disease-free stems. Ridge or mound." },
  maize:     { plant:["Mar","Apr","Jul","Aug"], harvest:["Jul","Aug","Nov","Dec"], tips:"Plant 75cm × 25cm spacing. Apply top dressing at 3–4 weeks." },
  tomato:    { plant:["Sep","Oct","Jan","Feb"], harvest:["Dec","Jan","Apr","May"], tips:"Nursery first 4–6 weeks. Stake when 30cm tall. Water consistently." },
  rice:      { plant:["May","Jun"],             harvest:["Oct","Nov"],             tips:"Flood field 3 days after germination. Keep 5cm water depth." },
  pepper:    { plant:["Mar","Apr","Sep","Oct"], harvest:["Jul","Aug","Jan","Feb"], tips:"Nursery 6 weeks. Mulch base. Stake tall varieties." },
  yam:       { plant:["Feb","Mar","Apr"],       harvest:["Aug","Sep","Oct"],       tips:"Mound planting. Use 500g setts. Stake vines early." },
  groundnut: { plant:["Apr","May","Jul","Aug"], harvest:["Aug","Sep","Nov","Dec"], tips:"Shell and treat seeds before planting. 45cm × 15cm spacing." },
};
const VETS = [
  { name:"Federal Dept of Veterinary & Pest Control", type:"Government", state:"FCT Abuja", phone:"09-523-4567", speciality:"All livestock & poultry" },
  { name:"NAFDAC Animal Division", type:"Government", state:"Lagos", phone:"01-343-5644", speciality:"Drugs & vaccines approval" },
  { name:"Nigerian Veterinary Medical Association (NVMA)", type:"Association", state:"Nationwide", phone:"08033-NVMA-01", speciality:"Find certified vets nationwide" },
  { name:"IITA Animal Science Unit", type:"Research", state:"Ibadan, Oyo", phone:"02-241-2626", speciality:"Crop-livestock integration" },
  { name:"National Veterinary Research Institute (NVRI)", type:"Research", state:"Vom, Plateau", phone:"073-232-200", speciality:"Disease diagnosis & vaccines" },
  { name:"Federal College of Animal Health", type:"Education", state:"Vom, Plateau", phone:"073-232-198", speciality:"Training & consultancy" },
  { name:"Lagos State Vet Services", type:"Government", state:"Lagos", phone:"01-773-0010", speciality:"Poultry & livestock inspection" },
  { name:"Kano State Vet Services", type:"Government", state:"Kano", phone:"064-642-200", speciality:"Northern livestock, cattle" },
];
const OFFLINE_CACHE = {
  "cassava mosaic":{ category:"crops", disease:"Cassava Mosaic Disease", subject:"Cassava", severity:"severe", description:"Yellow/green mosaic patterns on leaves. Whitefly-transmitted virus. 20–95% yield loss.", treatment:["Remove and destroy all infected plants immediately","Spray Confidor (Imidacloprid) to kill whiteflies","Replant with resistant varieties TME 419 or NR 8082","Keep field weed-free"], pesticide:"Confidor (Imidacloprid)", prevention:"Use certified disease-free cuttings. Plant early.", confidence:"high" },
  "maize streak":{ category:"crops", disease:"Maize Streak Virus", subject:"Maize", severity:"severe", description:"Yellow streaks on leaves. Leafhopper-transmitted. Up to 100% yield loss.", treatment:["Remove severely infected plants","Spray Karate to kill leafhoppers","Replant SAMMAZ 15 or SAMMAZ 27","Plant early before leafhopper season"], pesticide:"Karate (Lambda-cyhalothrin)", prevention:"Early planting. Resistant varieties.", confidence:"high" },
  "tomato blight":{ category:"crops", disease:"Early Blight (Alternaria)", subject:"Tomato", severity:"moderate", description:"Brown target-board spots on lower leaves. Spreads upward in wet weather.", treatment:["Remove infected leaves","Spray Ridomil Gold MZ every 7 days","Stake plants for airflow","Avoid overhead watering"], pesticide:"Ridomil Gold MZ or Funguran OH", prevention:"Rotate crops. Mulch base.", confidence:"high" },
  "rice blast":{ category:"crops", disease:"Rice Blast (Magnaporthe)", subject:"Rice", severity:"severe", description:"Diamond grey lesions on leaves. Can destroy entire panicle.", treatment:["Apply Beam at first signs","Drain field 2–3 days","Reduce nitrogen fertilizer","Monitor weekly"], pesticide:"Beam (Tricyclazole) or Tilt", prevention:"Resistant varieties. Balanced NPK.", confidence:"high" },
  "newcastle":{ category:"poultry", disease:"Newcastle Disease (NCD)", subject:"Chicken/Poultry", severity:"severe", description:"Gasping, twisted neck, green diarrhoea, sudden deaths. Can wipe out a flock in days.", treatment:["Isolate all sick birds immediately","Vaccinate healthy birds with Lasota NOW","Bury or burn dead birds","Disinfect pen with Izal or formalin"], pesticide:"Lasota ND Vaccine + broad-spectrum antibiotics", prevention:"Vaccinate Day 1, Day 14, every 3 months.", confidence:"high", disclaimer:"⚠️ See a vet immediately if losses are high." },
  "gumboro":{ category:"poultry", disease:"Gumboro Disease (IBD)", subject:"Chicken/Poultry", severity:"severe", description:"Ruffled feathers, white watery droppings, hunched birds aged 3–6 weeks.", treatment:["Isolate affected birds","Provide electrolytes in drinking water","Vaccinate healthy chicks with IBD vaccine","Increase warmth in pen"], pesticide:"IBD Vaccine + antibiotics for secondary infections", prevention:"Vaccinate Day 14 and Day 28.", confidence:"high", disclaimer:"⚠️ Consult a vet for vaccine schedule." },
  "columnaris":{ category:"fish", disease:"Columnaris (Saddle Rot)", subject:"Catfish/Tilapia", severity:"severe", description:"White/grey patches on skin and gills. Fish breathe fast at surface. Kills in 24–48 hours.", treatment:["30–50% water change immediately","Add 3–5g salt per litre","Treat with Terramycin in feed or water","Reduce stocking density"], pesticide:"Terramycin (Oxytetracycline) or Potassium Permanganate", prevention:"Good water quality. Don't overcrowd.", confidence:"high", disclaimer:"⚠️ Act fast — Columnaris kills within 24–48 hours." },
  "ppr":{ category:"livestock", disease:"PPR (Peste des Petits Ruminants)", subject:"Goat/Sheep", severity:"severe", description:"High fever, eye/nose discharge, mouth sores, severe diarrhoea. Can kill 80–90% of flock.", treatment:["Isolate sick animals immediately","Vaccinate all healthy animals with PPR vaccine NOW","Antibiotics for secondary infections","Report to state vet — PPR is notifiable"], pesticide:"PPR Vaccine + Oxytetracycline", prevention:"Vaccinate every 3 years. Don't mix unknown animals.", confidence:"high", disclaimer:"⚠️ PPR is notifiable — contact your state vet office immediately." },
};
const INITIAL_OUTBREAKS = [
  { id:1, lat:6.5244,  lng:3.3792,  disease:"Cassava Mosaic",    category:"crops",    reports:12, date:"2026-04-01", state:"Lagos"   },
  { id:2, lat:11.9964, lng:8.5167,  disease:"Newcastle Disease", category:"poultry",  reports:9,  date:"2026-04-03", state:"Kano"    },
  { id:3, lat:7.3775,  lng:3.9470,  disease:"Tomato Blight",     category:"crops",    reports:5,  date:"2026-04-02", state:"Oyo"     },
  { id:4, lat:6.2104,  lng:6.7255,  disease:"Columnaris (Fish)", category:"fish",     reports:7,  date:"2026-04-04", state:"Anambra" },
  { id:5, lat:9.0579,  lng:7.4951,  disease:"Gumboro Disease",   category:"poultry",  reports:4,  date:"2026-04-05", state:"FCT"     },
  { id:6, lat:5.5195,  lng:5.7516,  disease:"Cassava Mosaic",    category:"crops",    reports:8,  date:"2026-04-03", state:"Delta"   },
  { id:7, lat:4.8156,  lng:7.0498,  disease:"PPR (Goats)",       category:"livestock",reports:3,  date:"2026-04-05", state:"Rivers"  },
  { id:8, lat:8.8942,  lng:7.1860,  disease:"Maize Streak",      category:"crops",    reports:6,  date:"2026-04-04", state:"Niger"   },
];
const WMO_CODES = { 0:"☀️ Clear", 1:"🌤 Mostly Clear", 2:"⛅ Partly Cloudy", 3:"☁️ Overcast", 45:"🌫 Foggy", 51:"🌦 Drizzle", 61:"🌧 Rain", 71:"🌨 Snow", 80:"🌧 Showers", 95:"⛈ Thunderstorm" };

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
  function AgroDocAI() {
  const [lang, setLang] = useState("en");
  const [mode, setMode] = useState("farmer");
  const [tab, setTab] = useState("diagnose");
  // Fix #2 — ToS acceptance modal
  const [tosAccepted, setTosAccepted] = useState(() => localStorage.getItem("agrodoc_tos") === "yes");
  // Fix #3 — Registration
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name:"", phone:"", state:"" });
  const [registered, setRegistered] = useState(() => !!localStorage.getItem("agrodoc_uid"));
  // Fix #5 — Feedback
  const [showFeedback, setShowFeedback] = useState(false);
  // Fix #6 — Market price timestamp
  const [priceUpdated] = useState(new Date().toLocaleString("en-NG", { dateStyle:"medium", timeStyle:"short" }));
  const [category, setCategory] = useState("crops");
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [location, setLocation] = useState(null);
  const [shops, setShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [outbreaks, setOutbreaks] = useState(INITIAL_OUTBREAKS);
  const [selectedOutbreak, setSelectedOutbreak] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [toast, setToast] = useState(null);
  // Weather
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState("cassava");
  // Market
  const [marketSearch, setMarketSearch] = useState("");
  const [expandedInput, setExpandedInput] = useState(null);
  // Journal
  const [journal, setJournal] = useState([]);
  const [journalForm, setJournalForm] = useState({ crop:"", action:"", notes:"", date:new Date().toISOString().split("T")[0] });
  const [showJournalForm, setShowJournalForm] = useState(false);
  // Vets
  const [vetSearch, setVetSearch] = useState("");
  // Dealer / Vet registration
  const [showDealerReg, setShowDealerReg]  = useState(false);
  const [dealerRegStep, setDealerRegStep]  = useState("form"); // "form" | "success"
  const [dealerForm, setDealerForm]        = useState({ type:"agro_dealer", businessName:"", contactName:"", phone:"", email:"", stateLGA:"", services:"" });
  const [dealerSubmitting, setDealerSubmitting] = useState(false);
  const [directory, setDirectory]          = useState([]);
  const [dirSearch, setDirSearch]          = useState("");
  const fileRef = useRef();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Fetch approved directory listings from backend
  const fetchDirectory = useCallback(async (type="") => {
    try {
      const url = `${BACKEND_URL}/api/directory${type ? `?type=${type}` : ""}`;
      const res = await fetch(url, { headers:{ "X-App-Key": APP_KEY } });
      if (res.ok) { const data = await res.json(); setDirectory(data.listings || []); }
    } catch {}
  }, []);

  // Submit dealer/vet registration
  const submitDealerReg = async () => {
    const { type, businessName, phone, stateLGA } = dealerForm;
    if (!businessName.trim() || !phone.trim() || !stateLGA.trim()) {
      showToast("⚠️ Please fill in Business Name, Phone and State/LGA");
      return;
    }
    setDealerSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type":"application/json", "X-App-Key": APP_KEY },
        body: JSON.stringify({ ...dealerForm, source:"web" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDealerRegStep("success");
        showToast("✅ Registration submitted!");
      } else {
        showToast(`❌ ${data.error || "Registration failed. Try again."}`);
      }
    } catch {
      showToast("❌ Could not submit. Check your connection.");
    }
    setDealerSubmitting(false);
  };

  useEffect(() => {
    window.addEventListener("online",  () => setIsOffline(false));
    window.addEventListener("offline", () => setIsOffline(true));
  }, []);

  // ── GPS + SHOPS ─────────────────────────────────────────────────────────────
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLocation(loc);
      fetchShops(loc);
      fetchWeather(loc);
    }, () => {}, { timeout:10000 });
  }, []);

  useEffect(() => { if (!location) getLocation(); }, []);

  const calcDistNum = (a,b,c,d) => { const R=6371,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180,x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); };
  const calcDist = (a,b,c,d) => calcDistNum(a,b,c,d).toFixed(1)+"km";
  const fallbackShops = (lat,lng) => [
    { name:"Adekunle Agro Inputs",  address:"Market Road, nearest town", phone:"0803-456-7890", distance:calcDist(lat,lng,lat+0.02,lng+0.01), lat:lat+0.02, lng:lng+0.01 },
    { name:"Farmers Choice Supply", address:"Main Market, your area",    phone:"0812-234-5678", distance:calcDist(lat,lng,lat-0.03,lng+0.02), lat:lat-0.03, lng:lng+0.02 },
    { name:"GreenField Agro Store", address:"Town Centre",               phone:"0701-987-6543", distance:calcDist(lat,lng,lat+0.05,lng-0.02), lat:lat+0.05, lng:lng-0.02 },
  ];

  const fetchShops = (loc) => {
    setShopsLoading(true);
    const { lat, lng } = loc;
    const q = `[out:json][timeout:15];(node["shop"="agrarian"](around:15000,${lat},${lng});node["shop"="farm"](around:15000,${lat},${lng});node["amenity"="marketplace"](around:8000,${lat},${lng}););out body;`;
    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => {
        const found = (data.elements||[]).slice(0,10).map(el=>({ name:el.tags?.name||"Agro Store", address:[el.tags?.["addr:street"],el.tags?.["addr:city"]].filter(Boolean).join(", ")||"Nearby", phone:el.tags?.phone||null, distance:calcDist(lat,lng,el.lat,el.lon), distNum:calcDistNum(lat,lng,el.lat,el.lon), lat:el.lat, lng:el.lon })).sort((a,b)=>a.distNum-b.distNum);
        setShops(found.length > 0 ? found : fallbackShops(lat,lng));
      }).catch(() => setShops(fallbackShops(lat,lng))).finally(() => setShopsLoading(false));
  };

  // ── WEATHER (Open-Meteo, free, no API key) ──────────────────────────────────
  const fetchWeather = async (loc) => {
    setWeatherLoading(true);
    try {
      const { lat, lng } = loc;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&current_weather=true&timezone=Africa%2FLagos&forecast_days=7`;
      const res = await fetch(url);
      const data = await res.json();
      setWeather(data);
    } catch { setWeather(null); }
    setWeatherLoading(false);
  };

  // ── AI DIAGNOSIS ────────────────────────────────────────────────────────────
  // FIX #3 — get or create a stable user ID (stored locally, no login required)
  const getUserId = () => {
    let uid = localStorage.getItem("agrodoc_uid");
    if (!uid) { uid = "u_" + Math.random().toString(36).slice(2, 10); localStorage.setItem("agrodoc_uid", uid); }
    return uid;
  };

  // FIX #5 — send feedback to backend when farmer taps "Did it work?"
  const sendFeedback = async (worked) => {
    if (!result) return;
    try {
      await fetch(`${BACKEND_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId(), disease: result.disease, category: result.category || category, worked, notes: "" }),
      });
      showToast(worked ? "✅ Thank you! Great to hear it worked." : "📝 Noted. We'll use this to improve AgroDoc AI.");
      setShowFeedback(false);
    } catch { /* silent fail — feedback is best effort */ }
  };

  // FIX #1 — diagnose via secure BACKEND PROXY (API key never exposed in browser)
  const diagnose = useCallback(async () => {
    if (!imageBase64 && !text.trim()) return;
    setLoading(true); setResult(null); setShowFeedback(false);

    // Offline cache first (free, instant)
    if (isOffline && text.trim()) {
      const key = Object.keys(OFFLINE_CACHE).find(k => text.toLowerCase().includes(k.split(" ")[0]));
      if (key) { const c={...OFFLINE_CACHE[key],date:new Date().toLocaleDateString(),image,lang,offline:true}; setResult(c); setHistory(p=>[c,...p.slice(0,19)]); setLoading(false); return; }
    }

    try {
      // Build form data — multipart so we can send both image and text safely
      const form = new FormData();
      if (imageBase64) {
        const blob = await fetch(`data:image/jpeg;base64,${imageBase64}`).then(r => r.blob());
        form.append("image", blob, "farm.jpg");
      }
      form.append("text",     text.trim() || `Analyse this ${category} for disease or health issue.`);
      form.append("lang",     lang);
      form.append("mode",     mode);
      form.append("category", category);

      const res = await fetch(`${BACKEND_URL}/api/diagnose`, {
        method:  "POST",
        headers: {
          "X-Session-Token": getUserId(),  // Fix #3 — anonymous session tracking
          "X-App-Key":       APP_KEY,      // Fix #1 — locks endpoint to your app only
        },
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const parsed = await res.json();
      const entry  = { ...parsed, date: new Date().toLocaleDateString(), image, lang, category };
      setResult(entry);
      setHistory(p => [entry, ...p.slice(0, 19)]);
      // Show feedback prompt after 3 seconds
      setTimeout(() => setShowFeedback(true), 3000);
    } catch (err) {
      console.error("Diagnosis error:", err.message);
      // Local cache fallback
      const key = text && Object.keys(OFFLINE_CACHE).find(k => text.toLowerCase().includes(k.split(" ")[0]));
      if (key) { const c={...OFFLINE_CACHE[key],date:new Date().toLocaleDateString(),image,lang,offline:true}; setResult(c); setHistory(p=>[c,...p.slice(0,19)]); }
      else setResult({ disease:"Connection Error", description: isOffline ? "You are offline. Type a disease name for cached results." : "Could not reach server. Please check your connection and try again.", treatment:[], pesticide:"", prevention:"", confidence:"low", subject:"", severity:"mild", disclaimer:"", category });
    }
    setLoading(false);
  }, [imageBase64, text, lang, mode, image, isOffline, category]);

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const speak = () => {
    if (!result) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance([result.disease, result.description, ...(result.treatment||[])].join(". "));
    utt.lang = LANGUAGES[lang].code; utt.rate = 0.88;
    utt.onend = () => setSpeaking(false);
    setSpeaking(true); window.speechSynthesis.speak(utt);
  };

  // ── WHATSAPP ────────────────────────────────────────────────────────────────
  const shareWhatsApp = () => {
    if (!result) return;
    const msg = `🌿 *AgroDoc AI Diagnosis*\n\n🐾 *${result.subject}*\n🦠 *Disease:* ${result.disease}\n⚠️ *Severity:* ${(result.severity||"").toUpperCase()}\n\n${result.whatsappSummary||result.description}\n\n💊 *Treatment:* ${(result.treatment||[]).slice(0,2).join(" ➜ ")}\n\n_Diagnosed by AgroDoc AI — agrodoc.ng_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
    showToast("✅ Opening WhatsApp...");
  };

  // ── FILE HANDLER ─────────────────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return;
    const img = new Image(), canvas = document.createElement("canvas");
    img.onload = () => { const s=Math.min(1,900/img.width); canvas.width=img.width*s; canvas.height=img.height*s; canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height); const c=canvas.toDataURL("image/jpeg",0.82); setImage(c); setImageBase64(c.split(",")[1]); };
    img.src = URL.createObjectURL(file);
  };

  // ── HELPERS ──────────────────────────────────────────────────────────────────
  const sevColor = (s) => ({ mild:"4ade80", moderate:"facc15", severe:"f87171" }[s]||"4ade80");
  const subjectEmoji = (cat="",subj="") => { const s=subj.toLowerCase(); if(cat==="poultry")return"🐔"; if(cat==="fish")return"🐟"; if(cat==="livestock")return s.includes("goat")||s.includes("sheep")?"🐐":s.includes("pig")?"🐖":"🐄"; if(s.includes("maize")||s.includes("corn"))return"🌽"; if(s.includes("tomato"))return"🍅"; if(s.includes("cassava"))return"🥔"; if(s.includes("rice"))return"🌾"; if(s.includes("pepper"))return"🌶️"; if(s.includes("yam"))return"🍠"; return"🌿"; };
  const addJournalEntry = () => {
    if (!journalForm.crop || !journalForm.action) return;
    setJournal(p => [{ ...journalForm, id:Date.now() }, ...p.slice(0,49)]);
    setJournalForm({ crop:"", action:"", notes:"", date:new Date().toISOString().split("T")[0] });
    setShowJournalForm(false);
    showToast("📒 Entry saved!");
  };

  // ── NIGERIA MAP ──────────────────────────────────────────────────────────────
  const NigeriaMap = () => {
    const W=340,H=255, toX=lng=>((lng-2.7)/(15-2.7))*(W-40)+20, toY=lat=>H-((lat-4.2)/(14-4.2))*(H-40)-20;
    const maxR=Math.max(...outbreaks.map(o=>o.reports),1);
    return (
      <svg width={W} height={H} style={{ background:"rgba(0,0,0,.25)", borderRadius:14, border:"1px solid rgba(45,106,79,.35)", display:"block", margin:"0 auto" }}>
        <path d="M62,236 L42,196 L32,156 L42,116 L62,86 L92,66 L122,56 L162,51 L202,54 L232,61 L262,71 L292,86 L312,106 L317,136 L312,166 L297,196 L272,216 L242,231 L202,238 L162,241 L122,238 Z" fill="rgba(45,106,79,.18)" stroke="rgba(45,106,79,.55)" strokeWidth="1.5"/>
        {outbreaks.map(o=>{ const x=toX(o.lng),y=toY(o.lat),r=5+(o.reports/maxR)*14,c=CAT_COLORS[o.category]||"4ade80",sel=selectedOutbreak?.id===o.id; return(
          <g key={o.id} onClick={()=>setSelectedOutbreak(sel?null:o)} style={{ cursor:"pointer" }}>
            <circle cx={x} cy={y} r={r+5} fill={`#${c}`} opacity=".1"><animate attributeName="r" values={`${r+4};${r+9};${r+4}`} dur="2.5s" repeatCount="indefinite"/></circle>
            <circle cx={x} cy={y} r={r} fill={`#${c}`} opacity={sel?1:.72} stroke={sel?"#fff":"none"} strokeWidth="2"/>
            <text x={x} y={y+4} textAnchor="middle" fontSize="9" fill="#0a1a0f" fontWeight="bold">{o.reports}</text>
          </g>);
        })}
        {location&&<><circle cx={toX(location.lng)} cy={toY(location.lat)} r={7} fill="#60a5fa" stroke="#fff" strokeWidth="2"/><text x={toX(location.lng)} y={toY(location.lat)-11} textAnchor="middle" fontSize="8" fill="#93c5fd" fontWeight="bold">YOU</text></>}
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  const tabs = [
    { id:"diagnose", icon:"🔬", label:"Diagnose" },
    { id:"weather",  icon:"🌤", label:"Weather"  },
    { id:"market",   icon:"💰", label:"Market"   },
    { id:"journal",  icon:"📒", label:"Journal"  },
    { id:"find",     icon:"📍", label:"Find"     },
  ];

  return (
    <div style={{ fontFamily:"'Outfit',sans-serif", minHeight:"100vh", background:"linear-gradient(160deg,#07130a 0%,#0d2818 55%,#071a10 100%)", color:"#e8f5e9", paddingBottom:70 }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#2d6a4f}
        .lb{background:transparent;border:1px solid #2d6a4f;color:#a7f3d0;padding:3px 8px;border-radius:20px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:11px;transition:all .2s}
        .lb.on{background:#2d6a4f;color:#fff}
        .uz{border:2px dashed #2d6a4f;border-radius:14px;padding:22px;text-align:center;cursor:pointer;transition:all .3s;background:rgba(45,106,79,.07)}
        .uz:hover{border-color:#4ade80;background:rgba(74,222,128,.08)}
        .pbtn{background:linear-gradient(135deg,#16a34a,#4ade80);color:#0a1a0f;border:none;padding:13px;border-radius:12px;font-weight:900;font-size:15px;cursor:pointer;width:100%;font-family:'Outfit',sans-serif;transition:all .2s}
        .pbtn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(74,222,128,.35)}
        .pbtn:disabled{opacity:.45;cursor:not-allowed}
        .sbtn{background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.35);color:#4ade80;padding:7px 12px;border-radius:8px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12px;font-weight:700;transition:all .2s;display:flex;align-items:center;gap:4px}
        .sbtn:hover{background:rgba(74,222,128,.18)}
        .sbtn.wa{border-color:rgba(37,211,102,.45);color:#25d366;background:rgba(37,211,102,.07)}
        .card{background:rgba(255,255,255,.04);border:1px solid rgba(45,106,79,.3);border-radius:14px;padding:15px;margin-bottom:12px}
        .ta{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(45,106,79,.4);border-radius:10px;padding:11px;color:#e8f5e9;font-family:'Outfit',sans-serif;font-size:14px;resize:none;outline:none}
        .ta:focus{border-color:#4ade80}
        .inp{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(45,106,79,.4);border-radius:10px;padding:10px 12px;color:#e8f5e9;font-family:'Outfit',sans-serif;font-size:13px;outline:none}
        .inp:focus{border-color:#4ade80}
        .catbtn{flex:1;padding:8px 4px;border:1px solid rgba(45,106,79,.3);background:transparent;color:#6b9e7e;border-radius:10px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;transition:all .2s;text-align:center}
        .catbtn.on{color:#0a1a0f;border-color:transparent}
        .mt{display:flex;background:rgba(255,255,255,.04);border-radius:10px;padding:3px;border:1px solid rgba(45,106,79,.3)}
        .mb{flex:1;padding:6px;border:none;background:transparent;color:#6b9e7e;border-radius:7px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12px;font-weight:700;transition:all .2s}
        .mb.on{background:#2d6a4f;color:#fff}
        .pulse{animation:pulse 1.4s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        .step{display:flex;gap:9px;align-items:flex-start;margin-bottom:7px}
        .sn{background:#2d6a4f;color:#4ade80;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;margin-top:2px}
        .hi{display:flex;gap:9px;align-items:center;padding:10px;background:rgba(255,255,255,.02);border:1px solid rgba(45,106,79,.2);border-radius:11px;margin-bottom:8px;cursor:pointer;transition:all .2s}
        .hi:hover{background:rgba(45,106,79,.15)}
        .sbadge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em}
        @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fi .3s ease forwards}
        .toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#166534;color:#dcfce7;padding:9px 20px;border-radius:20px;font-weight:700;font-size:13px;z-index:999;white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,.4);animation:fi .25s ease}
        .bnav{position:fixed;bottom:0;left:0;right:0;background:#0d2818;border-top:1px solid rgba(45,106,79,.4);display:flex;max-width:480px;margin:0 auto;z-index:100}
        .ntab{flex:1;padding:10px 4px 8px;border:none;background:transparent;color:#4b7a5e;cursor:pointer;font-family:'Outfit',sans-serif;font-size:10px;font-weight:700;text-align:center;transition:all .2s}
        .ntab.on{color:#4ade80}
        .ntab span{display:block;font-size:19px;margin-bottom:2px}
        .disclaimer{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.35);border-radius:9px;padding:9px;margin-bottom:9px;font-size:12px;color:#fca5a5}
        .sectitle{font-size:10px;color:#4b7a5e;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;font-family:'Space Mono',monospace}
        .popup{background:#0d2818;border:1px solid rgba(45,106,79,.5);border-radius:11px;padding:12px;margin-top:9px}
        select.inp option{background:#0d2818;color:#e8f5e9}
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      {/* HEADER */}
      <div style={{ padding:"13px 15px 0", maxWidth:480, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:9 }}>
          <div>
            <div style={{ fontSize:19, fontWeight:900, color:"#4ade80", letterSpacing:"-0.02em" }}>🌿 AgroDoc AI</div>
            <div style={{ fontSize:10, color:"#6b9e7e", fontFamily:"'Space Mono',monospace" }}>Your AI Farm Doctor</div>
          </div>
          <div style={{ display:"flex", gap:3, flexWrap:"wrap", justifyContent:"flex-end", maxWidth:215 }}>
            {Object.entries(LANGUAGES).map(([k,v])=>(
              <button key={k} className={`lb ${lang===k?"on":""}`} onClick={()=>setLang(k)}>{v.label}</button>
            ))}
          </div>
        </div>
        {isOffline && <div style={{ background:"rgba(251,146,60,.1)", border:"1px solid rgba(251,146,60,.4)", borderRadius:8, padding:"6px 11px", fontSize:11, color:"#fb923c", marginBottom:9 }}>📵 Offline — cached results available</div>}
        <div className="mt" style={{ marginBottom:13 }}>
          <button className={`mb ${mode==="farmer"?"on":""}`} onClick={()=>setMode("farmer")}>🌾 Farmer</button>
          <button className={`mb ${mode==="dealer"?"on":""}`} onClick={()=>setMode("dealer")}>🏪 Dealer/Vet</button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding:"0 15px", maxWidth:480, margin:"0 auto" }}>

        {/* ══ DIAGNOSE TAB ══════════════════════════════════════════════════════ */}
        {tab==="diagnose" && (
          <div className="fi">
            <div className="sectitle">What are you diagnosing?</div>
            <div style={{ display:"flex", gap:6, marginBottom:13 }}>
              {CATEGORIES.map(c=>(
                <button key={c.id} className={`catbtn ${category===c.id?"on":""}`}
                  style={category===c.id?{ background:`#${CAT_COLORS[c.id]}`, color:"#0a1a0f" }:{}}
                  onClick={()=>{ setCategory(c.id); setResult(null); }}>
                  {c.emoji}<br/><span style={{ fontSize:10 }}>{c.label}</span>
                </button>
              ))}
            </div>

            <div className="uz" onClick={()=>fileRef.current.click()} style={{ marginBottom:11 }}>
              {image
                ? <img src={image} alt="subject" style={{ width:"100%", maxHeight:175, objectFit:"cover", borderRadius:10 }}/>
                : <><div style={{ fontSize:32, marginBottom:5 }}>📷</div><div style={{ color:"#a7f3d0", fontWeight:600, fontSize:13 }}>Tap to upload photo</div><div style={{ fontSize:10, color:"#4b7a5e", marginTop:3 }}>{CATEGORIES.find(c=>c.id===category)?.emoji} {CATEGORIES.find(c=>c.id===category)?.label}</div></>
              }
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])}/>
            </div>
            <div style={{ textAlign:"center", color:"#4b7a5e", fontSize:10, marginBottom:8, fontFamily:"'Space Mono',monospace" }}>— or describe symptoms —</div>
            <textarea className="ta" rows={3} placeholder="Describe what you see..." value={text} onChange={e=>setText(e.target.value)} style={{ marginBottom:12 }}/>
            <button className="pbtn" onClick={diagnose} disabled={loading||(!imageBase64&&!text.trim())}>
              {loading ? <span className="pulse">Analysing...</span> : "🔬 Diagnose Now"}
            </button>

            {result && (
              <div className="card fi" style={{ marginTop:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:800, color:"#4ade80", marginBottom:3 }}>{subjectEmoji(result.category||category, result.subject)} {result.disease}</div>
                    {result.subject && <div style={{ fontSize:10, color:"#6b9e7e", fontFamily:"'Space Mono',monospace" }}>{result.subject}{result.confidence?` · ${result.confidence}`:""}</div>}
                  </div>
                  <span className="sbadge" style={{ background:`#${sevColor(result.severity)}22`, color:`#${sevColor(result.severity)}`, border:`1px solid #${sevColor(result.severity)}` }}>{result.severity}</span>
                </div>
                <p style={{ fontSize:13, color:"#b7e4c7", lineHeight:1.6, marginBottom:12 }}>{result.description}</p>
                {result.treatment?.length>0&&<div style={{ marginBottom:10 }}>
                  <div className="sectitle">💊 Treatment Steps</div>
                  {result.treatment.map((s,i)=><div key={i} className="step"><div className="sn">{i+1}</div><div style={{ fontSize:12, color:"#b7e4c7", lineHeight:1.5 }}>{s}</div></div>)}
                </div>}
                {result.pesticide&&result.pesticide!=="N/A"&&<div style={{ background:"rgba(250,204,21,.07)", border:"1px solid rgba(250,204,21,.3)", borderRadius:9, padding:9, marginBottom:9 }}>
                  <div className="sectitle">⚗️ RECOMMENDED PRODUCT</div>
                  <div style={{ fontSize:12, color:"#fef08a" }}>{result.pesticide}</div>
                </div>}
                {result.disclaimer&&<div className="disclaimer">⚠️ {result.disclaimer}</div>}
                {result.prevention&&<div style={{ fontSize:12, color:"#86efac", marginBottom:10, paddingTop:8, borderTop:"1px solid rgba(45,106,79,.2)" }}><span style={{ fontWeight:700 }}>🛡 Prevention: </span>{result.prevention}</div>}
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <button className="sbtn" onClick={speaking?()=>{window.speechSynthesis.cancel();setSpeaking(false);}:speak}>{speaking?"⏹ Stop":"🔊 Listen"}</button>
                  <button className="sbtn wa" onClick={shareWhatsApp}>📱 Share</button>
                  <button className="sbtn" style={{ borderColor:"rgba(107,158,126,.35)", color:"#6b9e7e" }} onClick={()=>{ if(result&&location)setOutbreaks(p=>[{id:Date.now(),lat:location.lat+(Math.random()-.5)*.06,lng:location.lng+(Math.random()-.5)*.06,disease:result.disease,category:result.category||category,reports:1,date:new Date().toISOString().split("T")[0],state:"Your Area"},...p]); showToast("📍 Outbreak reported!"); }}>📍 Report</button>
                  <button className="sbtn" style={{ borderColor:"rgba(107,158,126,.35)", color:"#6b9e7e" }} onClick={()=>{setResult(null);setImage(null);setImageBase64(null);setText("");}}>🔄 New</button>
                </div>
              </div>
            )}

            {history.length>0&&!result&&(
              <div style={{ marginTop:16 }}>
                <div className="sectitle">Recent Diagnoses</div>
                {history.slice(0,5).map((h,i)=>(
                  <div key={i} className="hi" onClick={()=>{ setResult(h); setImage(h.image||null); setCategory(h.category||"crops"); }}>
                    {h.image?<img src={h.image} alt="" style={{ width:40,height:40,borderRadius:7,objectFit:"cover",flexShrink:0 }}/>:<div style={{ width:40,height:40,borderRadius:7,background:`#${CAT_COLORS[h.category||"crops"]}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{subjectEmoji(h.category||"crops",h.subject)}</div>}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, color:"#4ade80", fontSize:12, marginBottom:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{h.disease}</div>
                      <div style={{ fontSize:10, color:"#6b9e7e" }}>{h.subject} · {h.date}</div>
                    </div>
                    <span className="sbadge" style={{ background:`#${sevColor(h.severity)}22`, color:`#${sevColor(h.severity)}`, fontSize:9 }}>{h.severity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ WEATHER TAB ══════════════════════════════════════════════════════ */}
        {tab==="weather" && (
          <div className="fi">
            <div className="sectitle">Weather & Planting Guide</div>
            {!location&&<div style={{ textAlign:"center", padding:30 }}><div style={{ fontSize:30, marginBottom:8 }}>📍</div><div style={{ color:"#6b9e7e", fontSize:13, marginBottom:14 }}>Enable location for your local weather</div><button className="pbtn" onClick={getLocation} style={{ maxWidth:200 }}>Enable Location</button></div>}
            {weatherLoading&&<div style={{ textAlign:"center", color:"#6b9e7e", padding:20 }}><span className="pulse">🌤 Loading weather...</span></div>}
            {weather?.current_weather&&(
              <>
                <div className="card" style={{ textAlign:"center" }}>
                  <div style={{ fontSize:36, marginBottom:4 }}>{WMO_CODES[weather.current_weather.weathercode]?.split(" ")[0]||"🌤"}</div>
                  <div style={{ fontSize:32, fontWeight:800, color:"#4ade80" }}>{Math.round(weather.current_weather.temperature)}°C</div>
                  <div style={{ fontSize:12, color:"#6b9e7e", marginTop:3 }}>{WMO_CODES[weather.current_weather.weathercode]||"Current weather"} · Wind {Math.round(weather.current_weather.windspeed)} km/h</div>
                </div>
                <div className="sectitle" style={{ marginTop:4 }}>7-Day Forecast</div>
                <div style={{ display:"flex", gap:7, overflowX:"auto", paddingBottom:6, marginBottom:14 }}>
                  {(weather.daily?.time||[]).map((day,i)=>{
                    const code = weather.daily.weathercode[i];
                    const rain = weather.daily.precipitation_sum[i];
                    return(
                      <div key={i} style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(45,106,79,.25)", borderRadius:10, padding:"9px 10px", textAlign:"center", minWidth:70, flexShrink:0 }}>
                        <div style={{ fontSize:10, color:"#6b9e7e", marginBottom:4 }}>{new Date(day).toLocaleDateString("en",{weekday:"short"})}</div>
                        <div style={{ fontSize:20 }}>{WMO_CODES[code]?.split(" ")[0]||"🌤"}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#4ade80", marginTop:3 }}>{Math.round(weather.daily.temperature_2m_max[i])}°</div>
                        <div style={{ fontSize:10, color:"#6b9e7e" }}>{Math.round(weather.daily.temperature_2m_min[i])}°</div>
                        {rain>0&&<div style={{ fontSize:9, color:"#60a5fa", marginTop:2 }}>{rain.toFixed(1)}mm</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="sectitle">Planting Calendar</div>
            <select className="inp" value={selectedCrop} onChange={e=>setSelectedCrop(e.target.value)} style={{ marginBottom:10 }}>
              {Object.keys(PLANTING_CALENDAR).map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
            {PLANTING_CALENDAR[selectedCrop]&&(
              <div className="card">
                <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                  <div style={{ flex:1, background:"rgba(74,222,128,.07)", border:"1px solid rgba(74,222,128,.25)", borderRadius:9, padding:10 }}>
                    <div className="sectitle">🌱 PLANT</div>
                    <div style={{ fontSize:13, color:"#4ade80", fontWeight:700 }}>{PLANTING_CALENDAR[selectedCrop].plant.join(" · ")}</div>
                  </div>
                  <div style={{ flex:1, background:"rgba(250,204,21,.07)", border:"1px solid rgba(250,204,21,.25)", borderRadius:9, padding:10 }}>
                    <div className="sectitle">🌾 HARVEST</div>
                    <div style={{ fontSize:13, color:"#facc15", fontWeight:700 }}>{PLANTING_CALENDAR[selectedCrop].harvest.join(" · ")}</div>
                  </div>
                </div>
                <div style={{ fontSize:12, color:"#86efac", lineHeight:1.55 }}>💡 {PLANTING_CALENDAR[selectedCrop].tips}</div>
              </div>
            )}
          </div>
        )}

        {/* ══ MARKET TAB ═══════════════════════════════════════════════════════ */}
        {tab==="market" && (
          <div className="fi">
            <div className="sectitle">Market Prices (₦) — Updated Today</div>
            <input className="inp" placeholder="Search crop or product..." value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} style={{ marginBottom:12 }}/>

            <div className="sectitle">Commodity Prices</div>
            {MARKET_PRICES.filter(m=>m.crop.toLowerCase().includes(marketSearch.toLowerCase())||marketSearch==="").map((m,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(45,106,79,.2)", borderRadius:10, marginBottom:7 }}>
                <div>
                  <div style={{ fontWeight:700, color:"#e8f5e9", fontSize:13 }}>{m.crop}</div>
                  <div style={{ fontSize:10, color:"#6b9e7e" }}>{m.unit} · {m.market} market</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:800, color:"#4ade80", fontSize:14 }}>₦{m.price.toLocaleString()}</div>
                  <div style={{ fontSize:10, color: m.change>0?"#4ade80":"#f87171", fontWeight:700 }}>{m.change>0?"▲":"▼"} {Math.abs(m.change)}%</div>
                </div>
              </div>
            ))}

            <div className="sectitle" style={{ marginTop:16 }}>Input Price Comparison</div>
            <div style={{ fontSize:11, color:"#4b7a5e", marginBottom:10 }}>💡 Tap any input to compare prices across stores</div>
            {INPUT_PRICES.filter(m=>m.name.toLowerCase().includes(marketSearch.toLowerCase())||marketSearch==="").map((item,i)=>{
              const best = item.stores.reduce((a,b)=>a.price<b.price?a:b);
              const isOpen = expandedInput===i;
              return(
                <div key={i} style={{ background:"rgba(255,255,255,.03)", border:`1px solid ${isOpen?"rgba(74,222,128,.4)":"rgba(45,106,79,.2)"}`, borderRadius:10, marginBottom:7, overflow:"hidden" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", cursor:"pointer" }} onClick={()=>setExpandedInput(isOpen?null:i)}>
                    <div>
                      <div style={{ fontWeight:700, color:"#e8f5e9", fontSize:12 }}>{item.name}</div>
                      <div style={{ fontSize:10, color:"#4ade80" }}>Best: ₦{best.price.toLocaleString()} @ {best.store}</div>
                    </div>
                    <div style={{ fontSize:18, color:"#4b7a5e" }}>{isOpen?"▲":"▼"}</div>
                  </div>
                  {isOpen&&<div style={{ padding:"0 12px 10px", borderTop:"1px solid rgba(45,106,79,.2)" }}>
                    {item.stores.map((s,j)=>(
                      <div key={j} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:j<item.stores.length-1?"1px solid rgba(45,106,79,.1)":"none" }}>
                        <div style={{ fontSize:12, color:"#b7e4c7" }}>{s.store}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:s.price===best.price?"#4ade80":"#e8f5e9" }}>₦{s.price.toLocaleString()}{s.price===best.price?" ✓":""}</div>
                      </div>
                    ))}
                  </div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ JOURNAL TAB ══════════════════════════════════════════════════════ */}
        {tab==="journal" && (
          <div className="fi">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div className="sectitle" style={{ marginBottom:0 }}>Farm Journal</div>
              <button className="sbtn" onClick={()=>setShowJournalForm(p=>!p)}>+ Add Entry</button>
            </div>

            {showJournalForm&&(
              <div className="card fi" style={{ marginBottom:14 }}>
                <div className="sectitle">New Entry</div>
                <input className="inp" placeholder="Crop or animal (e.g. Cassava, Broilers)" value={journalForm.crop} onChange={e=>setJournalForm(p=>({...p,crop:e.target.value}))} style={{ marginBottom:8 }}/>
                <select className="inp" value={journalForm.action} onChange={e=>setJournalForm(p=>({...p,action:e.target.value}))} style={{ marginBottom:8 }}>
                  <option value="">Select activity...</option>
                  {["Planting","Fertilizer applied","Pesticide sprayed","Irrigation","Weeding","Harvesting","Vaccination","Medication given","Fed animals","Sold produce","Bought inputs","Disease observed","Vet visit","Other"].map(a=><option key={a} value={a}>{a}</option>)}
                </select>
                <input className="inp" type="date" value={journalForm.date} onChange={e=>setJournalForm(p=>({...p,date:e.target.value}))} style={{ marginBottom:8 }}/>
                <textarea className="ta" rows={2} placeholder="Notes (optional)..." value={journalForm.notes} onChange={e=>setJournalForm(p=>({...p,notes:e.target.value}))} style={{ marginBottom:10 }}/>
                <div style={{ display:"flex", gap:8 }}>
                  <button className="pbtn" onClick={addJournalEntry} style={{ flex:1 }}>Save Entry</button>
                  <button className="sbtn" onClick={()=>setShowJournalForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            {journal.length===0
              ?<div style={{ textAlign:"center", color:"#4b7a5e", padding:"50px 20px", fontStyle:"italic" }}>No entries yet. Tap "+ Add Entry" to start your farm record.</div>
              :journal.map((e,i)=>(
                <div key={e.id} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(45,106,79,.2)", borderRadius:11, padding:"11px 13px", marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontWeight:700, color:"#4ade80", fontSize:13 }}>{e.crop}</div>
                      <div style={{ fontSize:12, color:"#86efac", marginTop:2 }}>{e.action}</div>
                    </div>
                    <div style={{ fontSize:10, color:"#6b9e7e", fontFamily:"'Space Mono',monospace" }}>{e.date}</div>
                  </div>
                  {e.notes&&<div style={{ fontSize:11, color:"#6b9e7e", marginTop:6, paddingTop:6, borderTop:"1px solid rgba(45,106,79,.15)" }}>{e.notes}</div>}
                </div>
              ))
            }

            {journal.length>0&&(
              <div style={{ marginTop:14 }}>
                <div className="sectitle">Summary</div>
                <div style={{ display:"flex", gap:8 }}>
                  {[["📋",journal.length,"Total entries"],["🌿",[...new Set(journal.map(e=>e.crop))].length,"Crops tracked"],["📅",journal.filter(e=>e.date===new Date().toISOString().split("T")[0]).length,"Today"]].map(([ic,n,l])=>(
                    <div key={l} style={{ flex:1, background:"rgba(255,255,255,.03)", border:"1px solid rgba(45,106,79,.2)", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                      <div style={{ fontSize:20 }}>{ic}</div>
                      <div style={{ fontWeight:800, color:"#4ade80", fontSize:18 }}>{n}</div>
                      <div style={{ fontSize:10, color:"#6b9e7e" }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ FIND TAB ═════════════════════════════════════════════════════════ */}
        {tab==="find" && (
          <div className="fi">

            {/* ── REGISTER CTA ────────────────────────────────────────────── */}
            <div style={{ background:"rgba(240,180,41,.08)", border:"1px solid rgba(240,180,41,.35)", borderRadius:13, padding:"12px 14px", marginBottom:14 }}>
              <div style={{ fontWeight:800, color:"#f0b429", fontSize:14, marginBottom:4 }}>🏪 Are you an Agro Dealer or Vet?</div>
              <div style={{ fontSize:12, color:"#b7e4c7", marginBottom:10, lineHeight:1.55 }}>Join the AgroDoc AI directory — farmers in your area will find you when they need products or a vet visit.</div>
              <button className="pbtn" style={{ background:"linear-gradient(135deg,#b45309,#f0b429)", color:"#1a0a00", fontSize:13, padding:"9px" }}
                onClick={()=>{ setShowDealerReg(p=>!p); setDealerRegStep("form"); }}>
                {showDealerReg ? "✕ Close" : "📋 Register My Business — Free"}
              </button>
            </div>

            {/* ── REGISTRATION FORM ────────────────────────────────────────── */}
            {showDealerReg && dealerRegStep === "form" && (
              <div className="card fi" style={{ marginBottom:14, border:"1px solid rgba(240,180,41,.3)" }}>
                <div className="sectitle" style={{ color:"#f0b429", marginBottom:10 }}>Business Registration</div>

                {/* Type */}
                <div className="sectitle" style={{ marginBottom:6 }}>I am a:</div>
                <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                  {[["agro_dealer","🏪 Agro Dealer"],["vet","🐄 Vet / Extension Worker"]].map(([val,lbl])=>(
                    <button key={val} onClick={()=>setDealerForm(p=>({...p,type:val}))}
                      style={{ flex:1, padding:"8px 6px", border:`1px solid ${dealerForm.type===val?"#f0b429":"rgba(45,106,79,.3)"}`, background:dealerForm.type===val?"rgba(240,180,41,.12)":"transparent", color:dealerForm.type===val?"#f0b429":"#6b9e7e", borderRadius:9, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"'Outfit',sans-serif" }}>
                      {lbl}
                    </button>
                  ))}
                </div>

                {/* Fields */}
                {[
                  ["businessName","Business / Shop Name *","e.g. Emeka Agro Supplies"],
                  ["contactName","Your Full Name","e.g. Emeka Johnson"],
                  ["phone","Phone Number Farmers Can Call *","e.g. 08012345678"],
                  ["email","Email Address (optional)","e.g. emeka@shop.com"],
                  ["stateLGA","State and LGA *","e.g. Lagos — Ikeja"],
                ].map(([field, label, ph]) => (
                  <div key={field} style={{ marginBottom:10 }}>
                    <div style={{ fontSize:11, color:"#6b9e7e", marginBottom:4, fontWeight:700 }}>{label}</div>
                    <input className="inp" placeholder={ph} value={dealerForm[field]}
                      onChange={e=>setDealerForm(p=>({...p,[field]:e.target.value}))}/>
                  </div>
                ))}

                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:"#6b9e7e", marginBottom:4, fontWeight:700 }}>
                    {dealerForm.type==="vet" ? "Animals You Treat *" : "Products You Sell *"}
                  </div>
                  <textarea className="ta" rows={2}
                    placeholder={dealerForm.type==="vet" ? "e.g. Poultry, goats, cattle, fish" : "e.g. Fertilizers, pesticides, vaccines, feeds"}
                    value={dealerForm.services}
                    onChange={e=>setDealerForm(p=>({...p,services:e.target.value}))}
                    style={{ marginBottom:0 }}/>
                </div>

                <div style={{ fontSize:11, color:"#4b7a5e", marginBottom:10, lineHeight:1.5 }}>
                  🔒 Your information is reviewed within 48 hours before being listed. We never share your data without consent.
                </div>

                <button className="pbtn" onClick={submitDealerReg} disabled={dealerSubmitting}
                  style={{ background:"linear-gradient(135deg,#b45309,#f0b429)", color:"#1a0a00" }}>
                  {dealerSubmitting ? <span className="pulse">Submitting...</span> : "✅ Submit Registration"}
                </button>
              </div>
            )}

            {/* ── SUCCESS STATE ─────────────────────────────────────────────── */}
            {showDealerReg && dealerRegStep === "success" && (
              <div className="card fi" style={{ marginBottom:14, border:"1px solid rgba(74,222,128,.35)", textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🎉</div>
                <div style={{ fontWeight:800, color:"#4ade80", fontSize:15, marginBottom:6 }}>Registration Submitted!</div>
                <div style={{ fontSize:12, color:"#86efac", lineHeight:1.6 }}>
                  We will review your listing within 48 hours and add you to the directory. Farmers in your area will then be able to find you.
                </div>
                <button className="sbtn" style={{ margin:"12px auto 0", display:"block" }}
                  onClick={()=>{ setShowDealerReg(false); setDealerRegStep("form"); setDealerForm({ type:"agro_dealer", businessName:"", contactName:"", phone:"", email:"", stateLGA:"", services:"" }); }}>
                  ✕ Close
                </button>
              </div>
            )}

            {/* ── NEARBY SHOPS ─────────────────────────────────────────────── */}
            <div className="sectitle">Nearby Agro-Input Shops</div>
            {!location&&<div style={{ textAlign:"center", padding:20 }}><button className="pbtn" onClick={getLocation} style={{ maxWidth:200 }}>Enable Location</button></div>}
            {shopsLoading&&<div style={{ color:"#6b9e7e", fontSize:12, marginBottom:10 }}><span className="pulse">🔍 Searching nearby shops...</span></div>}
            {shops.map((s,i)=>(
              <div key={i} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(45,106,79,.2)", borderRadius:11, padding:12, marginBottom:9 }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <div style={{ fontWeight:700, color:"#4ade80", fontSize:13, marginBottom:3 }}>{s.name}</div>
                  <div style={{ fontSize:10, color:"#4ade80", background:"rgba(74,222,128,.1)", padding:"2px 7px", borderRadius:9 }}>{s.distance}</div>
                </div>
                <div style={{ fontSize:11, color:"#86efac", marginBottom:4 }}>📍 {s.address}</div>
                {s.phone?<a href={`tel:${s.phone}`} style={{ fontSize:11, color:"#6b9e7e", textDecoration:"none", display:"block", marginBottom:4 }}>📞 {s.phone}</a>:<div style={{ fontSize:10, color:"#4b7a5e", fontStyle:"italic", marginBottom:4 }}>No phone listed</div>}
                {s.lat&&s.lng&&<a href={`https://maps.google.com/?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer" style={{ fontSize:11, color:"#60a5fa", textDecoration:"none" }}>🗺 Open in Maps</a>}
              </div>
            ))}

            {/* ── APPROVED DIRECTORY ────────────────────────────────────────── */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16, marginBottom:8 }}>
              <div className="sectitle" style={{ marginBottom:0 }}>Agro Dealers & Vets Directory</div>
              <div style={{ display:"flex", gap:5 }}>
                {["","agro_dealer","vet"].map((t,i)=>(
                  <button key={i} className="sbtn" style={{ fontSize:10, padding:"4px 8px" }}
                    onClick={()=>fetchDirectory(t)}>
                    {t===""?"All":t==="agro_dealer"?"Dealers":"Vets"}
                  </button>
                ))}
              </div>
            </div>
            <input className="inp" placeholder="Search name or state..." value={dirSearch} onChange={e=>setDirSearch(e.target.value)} style={{ marginBottom:8 }}/>

            {directory.length === 0 ? (
              <div style={{ textAlign:"center", color:"#4b7a5e", padding:"20px 0", fontSize:12, fontStyle:"italic" }}>
                No approved listings yet — be the first to register above!<br/>
                <button className="sbtn" style={{ margin:"10px auto 0", display:"block", fontSize:11 }} onClick={()=>fetchDirectory("")}>🔄 Refresh Directory</button>
              </div>
            ) : (
              directory.filter(d=>
                d.businessName.toLowerCase().includes(dirSearch.toLowerCase()) ||
                d.stateLGA.toLowerCase().includes(dirSearch.toLowerCase()) ||
                dirSearch===""
              ).map((d,i)=>(
                <div key={i} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(45,106,79,.2)", borderRadius:11, padding:12, marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ fontWeight:700, color:"#4ade80", fontSize:13, flex:1, marginRight:8 }}>{d.businessName}</div>
                    <span style={{ fontSize:9, background: d.type==="vet"?"rgba(96,165,250,.15)":"rgba(240,180,41,.12)", color:d.type==="vet"?"#60a5fa":"#f0b429", padding:"2px 7px", borderRadius:8, whiteSpace:"nowrap", fontWeight:700 }}>
                      {d.type==="vet"?"🐄 Vet":"🏪 Dealer"}
                    </span>
                  </div>
                  {d.contactName&&<div style={{ fontSize:11, color:"#b7e4c7", marginTop:3 }}>👤 {d.contactName}</div>}
                  <div style={{ fontSize:11, color:"#86efac", marginTop:3 }}>📍 {d.stateLGA}</div>
                  <div style={{ fontSize:11, color:"#6b9e7e", marginTop:2 }}>🛒 {d.services}</div>
                  <a href={`tel:${d.phone}`} style={{ fontSize:12, color:"#60a5fa", textDecoration:"none", display:"block", marginTop:5, fontWeight:700 }}>📞 {d.phone}</a>
                </div>
              ))
            )}

            {/* ── VET NATIONAL CONTACTS ─────────────────────────────────────── */}
            <div className="sectitle" style={{ marginTop:16 }}>National Vet & Extension Contacts</div>
            <input className="inp" placeholder="Search by name or state..." value={vetSearch} onChange={e=>setVetSearch(e.target.value)} style={{ marginBottom:10 }}/>
            {VETS.filter(v=>v.name.toLowerCase().includes(vetSearch.toLowerCase())||v.state.toLowerCase().includes(vetSearch.toLowerCase())||vetSearch==="").map((v,i)=>(
              <div key={i} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(45,106,79,.2)", borderRadius:11, padding:12, marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ fontWeight:700, color:"#4ade80", fontSize:13, flex:1, marginRight:8 }}>{v.name}</div>
                  <span style={{ fontSize:9, background:"rgba(74,222,128,.1)", color:"#4ade80", padding:"2px 7px", borderRadius:8, whiteSpace:"nowrap", fontWeight:700 }}>{v.type}</span>
                </div>
                <div style={{ fontSize:11, color:"#86efac", marginTop:3 }}>📍 {v.state}</div>
                <div style={{ fontSize:11, color:"#6b9e7e", marginTop:2 }}>🐄 {v.speciality}</div>
                <a href={`tel:${v.phone}`} style={{ fontSize:11, color:"#60a5fa", textDecoration:"none", display:"block", marginTop:4 }}>📞 {v.phone}</a>
              </div>
            ))}

            {/* ── OUTBREAK MAP ──────────────────────────────────────────────── */}
            <div className="sectitle" style={{ marginTop:16 }}>Disease Outbreak Map</div>
            <div style={{ fontSize:10, color:"#6b9e7e", marginBottom:8, textAlign:"center" }}>Community disease reports — tap a dot for details</div>
            <NigeriaMap/>
            <div style={{ display:"flex", gap:10, margin:"9px 0 12px", justifyContent:"center", flexWrap:"wrap" }}>
              {Object.entries(CAT_COLORS).map(([cat,c])=>(
                <div key={cat} style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:8, height:8, borderRadius:"50%", background:`#${c}` }}/><span style={{ fontSize:10, color:"#6b9e7e", textTransform:"capitalize" }}>{cat}</span></div>
              ))}
            </div>
            {selectedOutbreak&&(
              <div className="popup fi">
                <div style={{ fontWeight:800, color:"#4ade80", marginBottom:3 }}>{selectedOutbreak.disease}</div>
                <div style={{ fontSize:12, color:"#86efac" }}>{selectedOutbreak.category} · {selectedOutbreak.state}</div>
                <div style={{ fontSize:11, color:"#6b9e7e", marginTop:2 }}>📊 {selectedOutbreak.reports} reports · {selectedOutbreak.date}</div>
                <button style={{ marginTop:7, fontSize:11, background:"none", border:"1px solid rgba(45,106,79,.4)", color:"#6b9e7e", padding:"4px 10px", borderRadius:6, cursor:"pointer" }} onClick={()=>setSelectedOutbreak(null)}>✕ Close</button>
              </div>
            )}
            <div style={{ marginTop:8 }}>
              {outbreaks.slice(0,6).map(o=>(
                <div key={o.id} onClick={()=>setSelectedOutbreak(o===selectedOutbreak?null:o)} style={{ display:"flex", gap:9, alignItems:"center", padding:"7px 0", borderBottom:"1px solid rgba(45,106,79,.13)", cursor:"pointer" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:`#${CAT_COLORS[o.category]||"4ade80"}`, flexShrink:0 }}/>
                  <div style={{ flex:1 }}><div style={{ fontSize:12, color:"#b7e4c7", fontWeight:600 }}>{o.disease}</div><div style={{ fontSize:10, color:"#6b9e7e" }}>{o.category} · {o.state} · {o.date}</div></div>
                  <div style={{ fontSize:10, color:"#6b9e7e", fontFamily:"'Space Mono',monospace" }}>{o.reports}×</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <nav className="bnav">
        {tabs.map(tb=>(
          <button key={tb.id} className={`ntab ${tab===tb.id?"on":""}`} onClick={()=>setTab(tb.id)}>
            <span>{tb.icon}</span>{tb.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
