// persist.js — keeps your data safe across Render restarts.
// Uses MongoDB Atlas (free M0 tier) when MONGODB_URI is set. Without it, data lives in memory only.
// How it works: each tracked array is loaded from the database at startup (in place),
// then checked every 15 seconds and saved if it changed. A final save runs on shutdown.
let col = null;
const tracked = new Map(); // name -> { arr, last }

async function init() {
  if (!process.env.MONGODB_URI) { console.log("💾 Persistence: MEMORY ONLY — set MONGODB_URI so data survives restarts"); return false; }
  try {
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    col = client.db(process.env.MONGODB_DB || "agrodoc").collection("snapshots");
    console.log("💾 Persistence: MongoDB connected");
    return true;
  } catch (e) { console.error("💾 MongoDB connection FAILED — running in memory only:", e.message); col = null; return false; }
}

// Load saved data into `arr` (in place) and start watching it for changes
async function track(name, arr) {
  let last = JSON.stringify(arr);
  if (col) {
    try {
      const doc = await col.findOne({ _id: name });
      if (doc && Array.isArray(doc.data)) { arr.splice(0, arr.length, ...doc.data); last = JSON.stringify(arr); }
    } catch (e) { console.error(`💾 Load failed for ${name}:`, e.message); }
  }
  tracked.set(name, { arr, last });
}

async function flush() {
  if (!col) return;
  for (const [name, t] of tracked) {
    const now = JSON.stringify(t.arr);
    if (now === t.last) continue;
    try { await col.updateOne({ _id: name }, { $set: { data: t.arr, updatedAt: new Date() } }, { upsert: true }); t.last = now; }
    catch (e) { console.error(`💾 Save failed for ${name}:`, e.message); }
  }
}

function start() {
  if (!col) return;
  setInterval(flush, 15000);
  const bye = async () => { await flush(); process.exit(0); };
  process.on("SIGTERM", bye); process.on("SIGINT", bye);
}

module.exports = { init, track, flush, start, _setCollectionForTest: c => { col = c; } };
