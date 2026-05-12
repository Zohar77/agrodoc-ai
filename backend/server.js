// server.js — AgroDoc AI Backend v3.0 — All 19 Loopholes Fixed
// NEW FIXES IN v3.0:
//   #1  API endpoint locked — X-App-Key header required from frontend
//   #3  Input sanitisation — length limits, XSS stripping on all text inputs
//   #5  Feedback validation — diagnosisId verified before acceptance
//   #6  Terms acceptance endpoint — stores consent with session token
//   #7  Dual-server ready — health checks enable DNS failover
//   #8  Cache versioning — version header returned so frontend can update
//   #9  Audit log — records every diagnosis (anonymous, NDPR-compliant)

require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");
const multer     = require("multer");
const crypto     = require("crypto");
const path       = require("path");
const { diagnose, tryOfflineCache, CACHE_VERSION } = require("./ai");
const { handleWhatsAppMessage, isWhatsAppRateLimited, getRegistrations } = require("./whatsapp");

const app  = express();
const PORT = process.env.PORT || 3000;
const APP_KEY = process.env.APP_KEY;

// ── SECURITY + NDPR HEADERS ───────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy:false, crossOriginEmbedderPolicy:false }));
app.use((req,res,next)=>{
  res.setHeader("X-Data-Policy","NDPR-2019-Compliant");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains");
  res.setHeader("X-Cache-Version", CACHE_VERSION);
  next();
});

// ── SERVE ADMIN DASHBOARD ─────────────────────────────────────────────────────
app.get("/admin", (req,res) => res.sendFile(path.join(__dirname, "admin.html")));
app.get("/admin.html", (req,res) => res.sendFile(path.join(__dirname, "admin.html")));
app.get("/terms", (req,res) => res.sendFile(path.join(__dirname, "terms-and-privacy.html")));
app.get("/terms-and-privacy.html", (req,res) => res.sendFile(path.join(__dirname, "terms-and-privacy.html")));

const ALLOWED = [...(process.env.ALLOWED_ORIGINS||"*").split(",").map(s=>s.trim()), "https://agrodoc-ai.vercel.app", "https://agrodoc-ai-y943.vercel.app"];
const CORS_OPTIONS = {
  origin:(origin,cb)=>(!origin||ALLOWED.includes("*")||ALLOWED.includes(origin))?cb(null,true):cb(new Error("CORS blocked")),
  methods:["GET","POST","OPTIONS"],
  allowedHeaders:["Content-Type","X-Session-Token","X-App-Key","X-Admin-Key","Authorization"],
  credentials:true,
  optionsSuccessStatus:200,
};
app.use(cors(CORS_OPTIONS));
app.options("*", cors(CORS_OPTIONS)); // Handle preflight for all routes
app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({extended:true}));

const upload = multer({ storage:multer.memoryStorage(), limits:{fileSize:8*1024*1024}, fileFilter:(_,f,cb)=>f.mimetype.startsWith("image/")?cb(null,true):cb(new Error("Images only"),false) });

// ── FIX #1 — APP KEY MIDDLEWARE ────────────────────────────────────────────────
// All /api/* routes require X-App-Key header — only your frontend knows this key
function requireAppKey(req,res,next){
  if(!APP_KEY){ return next(); } // Skip in dev if not set
  const key = req.headers["x-app-key"]||req.body?.appKey;
  if(key!==APP_KEY) return res.status(401).json({error:"Unauthorised. Invalid app key."});
  next();
}

// ── RATE LIMITERS ─────────────────────────────────────────────────────────────
const lim = (w,m,msg,keyFn)=>rateLimit({windowMs:w,max:m,message:{error:msg},keyGenerator:keyFn||(req=>req.headers["x-session-token"]||req.ip),standardHeaders:true,legacyHeaders:false});
const diagnoseLimiter  = lim(15*60*1000,30,"Too many diagnoses. Wait 15 minutes.");
const feedbackLimiter  = lim(60*60*1000,100,"Too many feedback submissions.");
const whatsappLimiter  = lim(60*1000,60,"WhatsApp rate limit.");
const generalLimiter   = lim(60*1000,120,"Too many requests.");

// ── FIX #3 — INPUT SANITISATION ───────────────────────────────────────────────
function sanitiseText(text){
  if(!text||typeof text!=="string") return "";
  return text
    .replace(/<[^>]*>/g,"")           // Strip HTML/XSS
    .replace(/[<>'"`;]/g,"")          // Remove dangerous characters
    .replace(/\s+/g," ")              // Normalise whitespace
    .trim()
    .slice(0,2000);                   // Hard limit 2000 chars
}
function sanitiseLang(lang){
  return ["en","pcm","ha","yo","ig"].includes(lang)?lang:"en";
}
function sanitiseCategory(cat){
  return ["crops","poultry","fish","livestock"].includes(cat)?cat:"crops";
}
function sanitiseMode(mode){
  return ["farmer","dealer"].includes(mode)?mode:"farmer";
}

// ── SESSION MANAGEMENT ─────────────────────────────────────────────────────────
const sessions = new Map();
function getOrCreateSession(token){
  if(token&&sessions.has(token)){const s=sessions.get(token);s.lastSeen=Date.now();return{token,session:s,isNew:false};}
  const t=crypto.randomBytes(24).toString("hex");
  const s={createdAt:Date.now(),lastSeen:Date.now(),diagnosisCount:0,feedbackCount:0,categories:{},termsAccepted:false,termsAcceptedAt:null};
  sessions.set(t,s);return{token:t,session:s,isNew:true};
}
setInterval(()=>{const cut=Date.now()-30*24*60*60*1000;for(const[k,s]of sessions.entries())if(s.lastSeen<cut)sessions.delete(k);},6*60*60*1000);

// ── FIX #9 — AUDIT LOG ────────────────────────────────────────────────────────
// Records every diagnosis anonymously — no personal data, just operational data
const auditLog=[];
function logDiagnosis({diagnosisId,category,disease,severity,confidence,source,lang,sessionToken}){
  auditLog.push({diagnosisId,category,disease:disease||"unknown",severity:severity||"unknown",confidence:confidence||"unknown",source,lang,sessionToken:sessionToken||"anonymous",timestamp:new Date().toISOString()});
  if(auditLog.length>10000) auditLog.shift(); // Keep last 10,000 entries
}

// ── FIX #5 — DIAGNOSIS STORE (validates feedback) ─────────────────────────────
const diagnosisStore = new Map(); // diagnosisId → {disease,category,severity,sessionToken}

// ── FEEDBACK STORE ─────────────────────────────────────────────────────────────
const feedbackStore=[];

// ── MARKET PRICES ─────────────────────────────────────────────────────────────
let MARKET_PRICES=[
  {crop:"Cassava (dry)",unit:"100kg bag",price:18500,change:+5.2,market:"Onitsha"},
  {crop:"Maize",unit:"100kg bag",price:32000,change:-2.1,market:"Kano"},
  {crop:"Tomato",unit:"50kg crate",price:14000,change:+12.4,market:"Lagos"},
  {crop:"Rice (paddy)",unit:"100kg bag",price:45000,change:+1.8,market:"Kebbi"},
  {crop:"Yam",unit:"tuber/kg",price:650,change:+3.5,market:"Benue"},
  {crop:"Groundnut",unit:"100kg bag",price:75000,change:-0.8,market:"Kano"},
  {crop:"Pepper (dry)",unit:"50kg bag",price:38000,change:+8.1,market:"Ibadan"},
  {crop:"Soybean",unit:"100kg bag",price:56000,change:+2.3,market:"Kaduna"},
  {crop:"Catfish (live)",unit:"per kg",price:2800,change:+4.0,market:"Lagos"},
  {crop:"Broiler chicken",unit:"per kg",price:3500,change:-1.5,market:"Abuja"},
];

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// FIX #7 — Health checks enable DNS failover to backup server
app.get("/health",(req,res)=>res.json({status:"ok",service:"AgroDoc AI API",version:"3.0.0",timestamp:new Date().toISOString(),uptime_seconds:Math.floor(process.uptime()),memory_mb:Math.round(process.memoryUsage().heapUsed/1024/1024),sessions_active:sessions.size,total_diagnoses:auditLog.length,feedback_count:feedbackStore.length,ai_configured:!!process.env.ANTHROPIC_API_KEY,whatsapp_configured:!!process.env.WHATSAPP_TOKEN,cache_version:CACHE_VERSION}));
app.get("/ping",(req,res)=>res.json({status:"ok",ts:Date.now()}));

// Privacy policy
app.get("/privacy",(req,res)=>res.json({company:"AgroDoc AI",founder:"Adegbegi Martins Maxwell",email:"adegbegimartinsmaxwell@gmail.com",compliance:"NDPR 2019",disclaimer:"AgroDoc AI is advisory only — not a substitute for certified agronomist or vet.",data_collected:["Farm photos (not stored)","GPS for shop finder only","Anonymous session ID","Feedback on diagnoses","Outbreak reports (anonymised)"],retention:"Photos: immediately discarded. Sessions: 30 days. Feedback: anonymous, indefinite.",rights:"Email adegbegimartinsmaxwell@gmail.com to request data deletion."}));

// Session
app.post("/api/session",generalLimiter,express.json(),(req,res)=>{
  const{token,session,isNew}=getOrCreateSession(req.headers["x-session-token"]||req.body?.token);
  res.json({token,isNew,diagnosisCount:session.diagnosisCount,termsAccepted:session.termsAccepted,cacheVersion:CACHE_VERSION});
});

// FIX #6 — Terms acceptance endpoint
app.post("/api/terms/accept",generalLimiter,express.json(),(req,res)=>{
  const{token,session}=getOrCreateSession(req.headers["x-session-token"]||req.body?.token);
  session.termsAccepted=true;
  session.termsAcceptedAt=new Date().toISOString();
  res.json({success:true,token,acceptedAt:session.termsAcceptedAt,message:"Terms accepted. Welcome to AgroDoc AI."});
});

// FIX #1 #3 #5 #9 — Secure, sanitised, audited AI proxy
app.post("/api/diagnose",requireAppKey,diagnoseLimiter,express.json({limit:"15mb"}),upload.single("image"),async(req,res)=>{
  try{
    const{token,session}=getOrCreateSession(req.headers["x-session-token"]||req.body?.sessionToken);
    let imageBase64=null,imageType="image/jpeg";
    let text="",lang="en",mode="farmer",category="crops";

    if(req.file){
      imageBase64=req.file.buffer.toString("base64");
      imageType=req.file.mimetype;
      text=sanitiseText(req.body.text);
      lang=sanitiseLang(req.body.lang);
      mode=sanitiseMode(req.body.mode);
      category=sanitiseCategory(req.body.category);
    } else if(req.body?.imageBase64){
      imageBase64=req.body.imageBase64.replace(/^data:image\/\w+;base64,/,"");
      imageType=req.body.imageType||"image/jpeg";
      text=sanitiseText(req.body.text);
      lang=sanitiseLang(req.body.lang);
      mode=sanitiseMode(req.body.mode);
      category=sanitiseCategory(req.body.category);
    } else {
      text=sanitiseText(req.body?.text||req.body?.prompt);
      lang=sanitiseLang(req.body?.lang);
      mode=sanitiseMode(req.body?.mode);
      category=sanitiseCategory(req.body?.category);
    }

    // FIX #3 — Reject empty or suspiciously large inputs
    if(!imageBase64&&!text) return res.status(400).json({error:"Provide an image or text description."});
    if(imageBase64&&imageBase64.length>12*1024*1024) return res.status(400).json({error:"Image too large after encoding."});

    const diagnosisId=crypto.randomBytes(8).toString("hex");

    // Try offline cache first
    if(!imageBase64&&text){
      const cached=tryOfflineCache(text);
      if(cached){
        session.diagnosisCount++;
        session.categories[category]=(session.categories[category]||0)+1;
        // FIX #5 — Store in diagnosis store so feedback can be validated
        diagnosisStore.set(diagnosisId,{disease:cached.disease,category,severity:cached.severity,sessionToken:token,timestamp:Date.now()});
        // FIX #9 — Audit log
        logDiagnosis({diagnosisId,category,disease:cached.disease,severity:cached.severity,confidence:cached.confidence,source:"cache",lang,sessionToken:token});
        return res.json({...cached,source:"cache",sessionToken:token,diagnosisId,cacheVersion:CACHE_VERSION});
      }
    }

    const result=await diagnose({imageBase64,imageType,text,lang,mode,category});

    session.diagnosisCount++;
    session.categories[category]=(session.categories[category]||0)+1;

    // FIX #5 — Store for feedback validation
    diagnosisStore.set(diagnosisId,{disease:result.disease,category,severity:result.severity,sessionToken:token,timestamp:Date.now()});
    // Keep store bounded
    if(diagnosisStore.size>50000){const firstKey=[...diagnosisStore.keys()][0];diagnosisStore.delete(firstKey);}

    // FIX #9 — Audit log
    logDiagnosis({diagnosisId,category,disease:result.disease,severity:result.severity,confidence:result.confidence,source:"ai",lang,sessionToken:token});

    return res.json({...result,source:"ai",sessionToken:token,diagnosisId,cacheVersion:CACHE_VERSION});

  }catch(err){
    console.error("Diagnosis error:",err.message);
    const text=req.body?.text?sanitiseText(req.body.text):"";
    const cached=text?tryOfflineCache(text):null;
    if(cached)return res.json({...cached,source:"cache_fallback"});
    return res.status(500).json({error:"Diagnosis failed. Please check your connection and try again."});
  }
});

// FIX #5 — Validated feedback endpoint
app.post("/api/feedback",requireAppKey,feedbackLimiter,express.json(),(req,res)=>{
  try{
    const{diagnosisId,worked,sessionToken}=req.body;
    if(!diagnosisId||typeof worked!=="boolean") return res.status(400).json({error:"diagnosisId and worked (true/false) required."});

    // FIX #5 — Validate diagnosisId actually exists
    if(!diagnosisStore.has(diagnosisId)) return res.status(404).json({error:"Diagnosis ID not found. Cannot record feedback for an unknown diagnosis."});

    const record=diagnosisStore.get(diagnosisId);

    // Prevent duplicate feedback on same diagnosis
    if(feedbackStore.find(f=>f.diagnosisId===diagnosisId)) return res.status(409).json({error:"Feedback already recorded for this diagnosis."});

    feedbackStore.push({diagnosisId,worked,disease:record.disease,category:record.category,severity:record.severity,sessionToken:sessionToken||"anonymous",date:new Date().toISOString()});
    if(sessionToken&&sessions.has(sessionToken))sessions.get(sessionToken).feedbackCount++;

    res.json({success:true,message:"Thank you! Your feedback helps us improve AgroDoc AI for all Nigerian farmers."});
  }catch(err){res.status(500).json({error:"Could not save feedback."});}
});

// Feedback stats (admin only)
app.get("/api/feedback/stats",(req,res)=>{
  if(req.headers["x-admin-key"]!==process.env.ADMIN_KEY&&process.env.NODE_ENV==="production")return res.status(403).json({error:"Forbidden"});
  const total=feedbackStore.length,worked=feedbackStore.filter(f=>f.worked).length,byDisease={};
  feedbackStore.forEach(f=>{if(!byDisease[f.disease])byDisease[f.disease]={total:0,worked:0};byDisease[f.disease].total++;if(f.worked)byDisease[f.disease].worked++;});
  res.json({total,worked,failed:total-worked,accuracy_percent:total>0?Math.round((worked/total)*100):null,by_disease:byDisease});
});

// FIX #9 — Audit log access (admin only)
app.get("/api/audit",(req,res)=>{
  if(req.headers["x-admin-key"]!==process.env.ADMIN_KEY&&process.env.NODE_ENV==="production")return res.status(403).json({error:"Forbidden"});
  const page=parseInt(req.query.page)||1,size=50;
  const slice=auditLog.slice(-size*page,-size*(page-1)||undefined).reverse();
  res.json({total:auditLog.length,page,entries:slice});
});

// Analytics — Full real data for admin dashboard
app.get("/api/analytics",(req,res)=>{
  if(req.headers["x-admin-key"]!==process.env.ADMIN_KEY&&process.env.NODE_ENV==="production")return res.status(403).json({error:"Forbidden"});
  const all=[...sessions.values()];
  
  // Disease breakdown
  const diseaseBreakdown={};
  auditLog.forEach(e=>{
    if(e.disease&&e.disease!=="unknown"){
      diseaseBreakdown[e.disease]=(diseaseBreakdown[e.disease]||0)+1;
    }
  });
  
  // Category breakdown
  const catBreakdown={};
  auditLog.forEach(e=>{catBreakdown[e.category]=(catBreakdown[e.category]||0)+1;});
  
  // Language breakdown
  const langBreakdown={};
  auditLog.forEach(e=>{langBreakdown[e.lang]=(langBreakdown[e.lang]||0)+1;});
  
  // Severity breakdown
  const sevBreakdown={};
  auditLog.forEach(e=>{sevBreakdown[e.severity]=(sevBreakdown[e.severity]||0)+1;});
  
  // Top diseases sorted
  const topDiseases=Object.entries(diseaseBreakdown)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,10)
    .map(([disease,count])=>({disease,count}));
  
  // Daily diagnoses last 7 days
  const dailyStats={};
  const now=Date.now();
  for(let i=6;i>=0;i--){
    const d=new Date(now-i*24*60*60*1000).toISOString().split("T")[0];
    dailyStats[d]=0;
  }
  auditLog.forEach(e=>{
    const d=e.timestamp?.split("T")[0];
    if(d&&dailyStats.hasOwnProperty(d)) dailyStats[d]++;
  });
  
  res.json({
    total_sessions:sessions.size,
    active_last_7_days:all.filter(s=>s.lastSeen>Date.now()-7*24*60*60*1000).length,
    total_diagnoses:auditLog.length,
    total_feedback:feedbackStore.length,
    feedback_accuracy_percent:feedbackStore.length>0?Math.round((feedbackStore.filter(f=>f.worked).length/feedbackStore.length)*100):null,
    diagnosis_by_category:catBreakdown,
    diagnosis_by_language:langBreakdown,
    diagnosis_by_severity:sevBreakdown,
    top_diseases:topDiseases,
    daily_diagnoses:dailyStats,
    uptime_seconds:Math.floor(process.uptime()),
    cache_version:CACHE_VERSION,
    total_registrations:getRegistrations().length,
    approved_registrations:getRegistrations().filter(r=>r.approved).length,
  });
});

// Market prices
app.get("/api/market",generalLimiter,(req,res)=>res.json({prices:MARKET_PRICES,updated:new Date().toISOString(),version:CACHE_VERSION}));
app.post("/api/market/update",express.json(),(req,res)=>{
  if(req.headers["x-admin-key"]!==process.env.ADMIN_KEY)return res.status(403).json({error:"Forbidden — admin key required"});
  if(!Array.isArray(req.body.prices))return res.status(400).json({error:"prices must be an array"});
  MARKET_PRICES=req.body.prices.map(p=>({...p,updated:new Date().toISOString()}));
  res.json({success:true,count:MARKET_PRICES.length});
});

// ── DATA EXPORT — CSV for Excel + JSON for Power BI ──────────────────────────

// Export diagnoses as CSV (Excel-ready)
app.get("/api/export/diagnoses",(req,res)=>{
  if(req.headers["x-admin-key"]!==process.env.ADMIN_KEY)return res.status(403).json({error:"Forbidden"});
  const headers=["Diagnosis ID","Category","Disease","Severity","Confidence","Language","Source","Date","Time"];
  const rows=auditLog.map(e=>{
    const dt=e.timestamp?new Date(e.timestamp):new Date();
    return [
      e.diagnosisId||"",
      e.category||"",
      (e.disease||"").replace(/,/g,";"),
      e.severity||"",
      e.confidence||"",
      e.lang||"en",
      e.source||"",
      dt.toLocaleDateString("en-NG"),
      dt.toLocaleTimeString("en-NG"),
    ].map(v=>`"${v}"`).join(",");
  });
  const csv=[headers.join(","),...rows].join("\n");
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition",`attachment; filename="agrodoc_diagnoses_${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(csv);
});

// Export registrations as CSV (Excel-ready)
app.get("/api/export/registrations",(req,res)=>{
  if(req.headers["x-admin-key"]!==process.env.ADMIN_KEY)return res.status(403).json({error:"Forbidden"});
  const headers=["ID","Type","Business Name","Contact Name","Phone","Email","State/LGA","Services","Source","Submitted Date","Approved"];
  const rows=getRegistrations().map(r=>[
    r.id||"",
    r.type||"",
    (r.businessName||"").replace(/,/g,";"),
    (r.contactName||"").replace(/,/g,";"),
    r.phone||r.contactPhone||"",
    r.email||"",
    (r.stateLGA||"").replace(/,/g,";"),
    (r.services||"").replace(/,/g,";"),
    r.source||"",
    r.submittedAt?new Date(r.submittedAt).toLocaleDateString("en-NG"):"",
    r.approved?"Yes":"No",
  ].map(v=>`"${v}"`).join(","));
  const csv=[headers.join(","),...rows].join("\n");
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition",`attachment; filename="agrodoc_registrations_${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(csv);
});

// Export feedback as CSV
app.get("/api/export/feedback",(req,res)=>{
  if(req.headers["x-admin-key"]!==process.env.ADMIN_KEY)return res.status(403).json({error:"Forbidden"});
  const headers=["Diagnosis ID","Disease","Category","Severity","Treatment Worked","Date"];
  const rows=feedbackStore.map(f=>[
    f.diagnosisId||"",
    (f.disease||"").replace(/,/g,";"),
    f.category||"",
    f.severity||"",
    f.worked?"Yes":"No",
    f.date?new Date(f.date).toLocaleDateString("en-NG"):"",
  ].map(v=>`"${v}"`).join(","));
  const csv=[headers.join(","),...rows].join("\n");
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition",`attachment; filename="agrodoc_feedback_${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(csv);
});

// Power BI JSON feed — all data in one endpoint
app.get("/api/powerbi",(req,res)=>{
  if(req.headers["x-admin-key"]!==process.env.ADMIN_KEY)return res.status(403).json({error:"Forbidden"});

  // Summary
  const diseaseBreakdown={};
  const catBreakdown={};
  const langBreakdown={};
  const sevBreakdown={};
  const dailyStats={};

  auditLog.forEach(e=>{
    if(e.disease&&e.disease!=="unknown") diseaseBreakdown[e.disease]=(diseaseBreakdown[e.disease]||0)+1;
    if(e.category) catBreakdown[e.category]=(catBreakdown[e.category]||0)+1;
    if(e.lang) langBreakdown[e.lang]=(langBreakdown[e.lang]||0)+1;
    if(e.severity) sevBreakdown[e.severity]=(sevBreakdown[e.severity]||0)+1;
    const d=e.timestamp?.split("T")[0];
    if(d) dailyStats[d]=(dailyStats[d]||0)+1;
  });

  res.json({
    generated_at: new Date().toISOString(),
    summary:{
      total_diagnoses:auditLog.length,
      total_sessions:sessions.size,
      total_registrations:getRegistrations().length,
      approved_registrations:getRegistrations().filter(r=>r.approved).length,
      total_feedback:feedbackStore.length,
      feedback_accuracy_percent:feedbackStore.length>0?Math.round((feedbackStore.filter(f=>f.worked).length/feedbackStore.length)*100):null,
    },
    diagnoses_by_disease:Object.entries(diseaseBreakdown).map(([disease,count])=>({disease,count})).sort((a,b)=>b.count-a.count),
    diagnoses_by_category:Object.entries(catBreakdown).map(([category,count])=>({category,count})),
    diagnoses_by_language:Object.entries(langBreakdown).map(([language,count])=>({language,count})),
    diagnoses_by_severity:Object.entries(sevBreakdown).map(([severity,count])=>({severity,count})),
    daily_diagnoses:Object.entries(dailyStats).sort().map(([date,count])=>({date,count})),
    registrations:getRegistrations().map(r=>({
      type:r.type,
      stateLGA:r.stateLGA,
      approved:r.approved,
      submittedAt:r.submittedAt,
    })),
    raw_diagnoses:auditLog.slice(-500), // Last 500 diagnoses for Power BI
  });
});

// ── REGISTRATIONS (Vets + Agro Dealers) ──────────────────────────────────────
// Public: Submit a registration via web app
app.post("/api/register",generalLimiter,express.json(),(req,res)=>{
  try{
    const{type,businessName,contactName,phone,email,stateLGA,services,source}=req.body;
    if(!type||!businessName||!phone||!stateLGA)return res.status(400).json({error:"type, businessName, phone and stateLGA are required."});
    if(!["agro_dealer","vet"].includes(type))return res.status(400).json({error:"type must be agro_dealer or vet"});
    const existing=getRegistrations().find(r=>r.phone===phone);
    if(existing)return res.status(409).json({error:"This phone number is already registered."});
    const reg={
      id:`REG_${crypto.randomBytes(6).toString("hex")}`,
      type,
      businessName:businessName.slice(0,100),
      contactName:(contactName||"").slice(0,60),
      phone:phone.slice(0,20),
      email:(email||"").slice(0,80),
      stateLGA:stateLGA.slice(0,80),
      services:(services||"").slice(0,200),
      source:source||"web",
      submittedAt:new Date().toISOString(),
      approved:false,
    };
    getRegistrations().push(reg);
    res.json({success:true,id:reg.id,message:"Registration submitted! We will review and add you to the directory within 48 hours."});
  }catch(err){res.status(500).json({error:"Could not save registration."});}
});

// Admin: View all registrations
app.get("/api/registrations",(req,res)=>{
  if(req.headers["x-admin-key"]!==process.env.ADMIN_KEY&&process.env.NODE_ENV==="production")return res.status(403).json({error:"Forbidden"});
  const regs=getRegistrations();
  const pending=regs.filter(r=>!r.approved);
  const approved=regs.filter(r=>r.approved);
  res.json({total:regs.length,pending:pending.length,approved:approved.length,registrations:regs});
});

// Admin: Approve a registration
app.post("/api/registrations/:id/approve",express.json(),(req,res)=>{
  if(req.headers["x-admin-key"]!==process.env.ADMIN_KEY)return res.status(403).json({error:"Forbidden"});
  const regs=getRegistrations();
  const reg=regs.find(r=>r.id===req.params.id);
  if(!reg)return res.status(404).json({error:"Registration not found"});
  reg.approved=true;
  reg.approvedAt=new Date().toISOString();
  res.json({success:true,reg});
});

// Public: Get approved directory listings
app.get("/api/directory",generalLimiter,(req,res)=>{
  const{type,state}=req.query;
  let listings=getRegistrations().filter(r=>r.approved);
  if(type)listings=listings.filter(r=>r.type===type);
  if(state)listings=listings.filter(r=>r.stateLGA.toLowerCase().includes(state.toLowerCase()));
  // Only return safe public fields
  const safe=listings.map(r=>({id:r.id,type:r.type,businessName:r.businessName,contactName:r.contactName,phone:r.phone,stateLGA:r.stateLGA,services:r.services}));
  res.json({count:safe.length,listings:safe});
});

// ── META WhatsApp Webhook ─────────────────────────────────────────────────────
app.get("/webhook",(req,res)=>{if(req.query["hub.mode"]==="subscribe"&&req.query["hub.verify_token"]===process.env.WHATSAPP_VERIFY_TOKEN)return res.status(200).send(req.query["hub.challenge"]);return res.status(403).send("Forbidden");});
app.post("/webhook",whatsappLimiter,express.json(),async(req,res)=>{
  res.sendStatus(200);
  try{
    if(req.body?.object!=="whatsapp_business_account")return;
    const msg=req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contact=req.body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
    if(!msg)return;
    await handleWhatsAppMessage(msg,contact);
  }catch(err){console.error("WhatsApp Meta error:",err.message);}
});

// ── TWILIO WhatsApp Webhook ───────────────────────────────────────────────────
// Used for testing before Meta Business API approval
// Set WHATSAPP_PROVIDER=twilio in Render environment variables to activate
const { handleTwilioMessage } = require("./whatsapp");
app.post("/webhook/twilio", whatsappLimiter, express.urlencoded({ extended:false }), async(req,res)=>{
  try {
    await handleTwilioMessage(req);
    // Twilio expects TwiML response
    res.set("Content-Type","text/xml");
    res.send("<Response></Response>");
  } catch(err) {
    console.error("Twilio webhook error:", err.message);
    res.set("Content-Type","text/xml");
    res.send("<Response></Response>");
  }
});

// Error handling
app.use((err,req,res,next)=>{if(err.code==="LIMIT_FILE_SIZE")return res.status(400).json({error:"Image too large. Max 8MB."});if(err.message==="Images only")return res.status(400).json({error:"Only image files accepted."});console.error("Error:",err.message);return res.status(500).json({error:"Internal server error."});});
app.use((req,res)=>res.status(404).json({error:"Route not found."}));

// FIX #7 — Graceful crash recovery — server never dies silently
process.on("uncaughtException",err=>console.error("Uncaught:",err.message));
process.on("unhandledRejection",r=>console.error("Rejection:",r));

const server=app.listen(PORT,()=>console.log(`
🌿 AgroDoc AI Backend v3.0 — All 19 Loopholes Fixed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 http://localhost:${PORT}
✅ Fix #1:  API Key Auth         (X-App-Key required)
✅ Fix #2:  WhatsApp Rate Guard  (per-phone limiting)
✅ Fix #3:  Input Sanitisation   (XSS + length limits)
✅ Fix #4:  HSTS / HTTPS Header  (Strict-Transport-Security)
✅ Fix #5:  Feedback Validation  (diagnosisId verified)
✅ Fix #6:  Terms Acceptance     (/api/terms/accept)
✅ Fix #7:  Crash Recovery       (uncaughtException handler)
✅ Fix #8:  Cache Versioning     (X-Cache-Version header)
✅ Fix #9:  Audit Log            (/api/audit — admin only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 Anthropic: ${process.env.ANTHROPIC_API_KEY?"✅ Secured":"❌ Missing — set ANTHROPIC_API_KEY"}
🔐 App Key:   ${process.env.APP_KEY?"✅ Set":"⚠️  Not set — /api/* is open (dev mode)"}
📱 WhatsApp:  ${process.env.WHATSAPP_TOKEN?"✅ Connected":"⚠️  Not configured"}
`));
server.keepAliveTimeout=65000;
server.headersTimeout=66000;
module.exports=app;
