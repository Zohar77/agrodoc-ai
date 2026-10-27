// marketplace.js — AgroDoc AI Marketplace Engine
// Handles produce listings, buyer registrations, orders and commissions

const crypto = require("crypto");

// ── IN-MEMORY STORES ──────────────────────────────────────────────────────────
const listings   = []; // Farmer produce listings
const buyers     = []; // Registered buyers
const orders     = []; // Orders placed
const COMMISSION = 0.02; // 2% commission on transactions

// ── PRODUCE CATEGORIES ────────────────────────────────────────────────────────
const PRODUCE_CATS = ["cassava","maize","rice","yam","tomato","pepper","groundnut",
  "soybean","plantain","cocoa","catfish","tilapia","broiler","palm oil",
  "ginger","onion","sorghum","cowpea","other"];

// ── LISTINGS ──────────────────────────────────────────────────────────────────
function createListing({ farmerPhone, farmerName, produce, quantity, unit, pricePerUnit, state, lga, harvestDate, notes }) {
  const listing = {
    id: "LST_" + crypto.randomBytes(6).toString("hex"),
    farmerPhone, farmerName,
    produce: produce.toLowerCase(),
    quantity: Number(quantity),
    unit: unit || "kg",
    pricePerUnit: Number(pricePerUnit),
    totalValue: Number(quantity) * Number(pricePerUnit),
    state, lga,
    harvestDate: harvestDate || null,
    notes: notes || "",
    status: "available", // available | reserved | sold
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30*24*60*60*1000).toISOString(), // 30 days
    views: 0,
    interestedBuyers: [],
  };
  listings.push(listing);
  return listing;
}

function getListings({ produce, state, status = "available" } = {}) {
  return listings.filter(l => {
    if (status && l.status !== status) return false;
    if (produce && !l.produce.includes(produce.toLowerCase())) return false;
    if (state && l.state.toLowerCase() !== state.toLowerCase()) return false;
    if (new Date(l.expiresAt) < new Date()) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getListing(id) {
  return listings.find(l => l.id === id);
}

function updateListing(id, updates) {
  const listing = listings.find(l => l.id === id);
  if (!listing) return null;
  Object.assign(listing, updates);
  return listing;
}

// ── BUYERS ────────────────────────────────────────────────────────────────────
function registerBuyer({ businessName, contactName, phone, email, state, produces, paymentMethod }) {
  const existing = buyers.find(b => b.phone === phone);
  if (existing) return { existing: true, buyer: existing };
  const buyer = {
    id: "BYR_" + crypto.randomBytes(6).toString("hex"),
    businessName, contactName, phone, email,
    state,
    produces: produces || [], // What they buy
    paymentMethod: paymentMethod || "bank_transfer",
    verified: false,
    monthlyFee: 3000, // ₦3,000/month listing fee
    subscriptionActive: false,
    registeredAt: new Date().toISOString(),
    totalOrders: 0,
    totalSpent: 0,
  };
  buyers.push(buyer);
  return { existing: false, buyer };
}

function getBuyers({ produce, state } = {}) {
  return buyers.filter(b => {
    if (produce && !b.produces.some(p => p.toLowerCase().includes(produce.toLowerCase()))) return false;
    if (state && b.state.toLowerCase() !== state.toLowerCase()) return false;
    return true;
  });
}

function getBuyer(id) {
  return buyers.find(b => b.id === id || b.phone === id);
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
function createOrder({ listingId, buyerId, quantity, agreedPrice, notes }) {
  const listing = getListing(listingId);
  const buyer = getBuyer(buyerId);
  if (!listing || !buyer) return null;
  if (listing.status !== "available") return null;

  const totalAmount = Number(quantity) * Number(agreedPrice);
  const commission = Math.round(totalAmount * COMMISSION);

  const order = {
    id: "ORD_" + crypto.randomBytes(6).toString("hex"),
    listingId, buyerId,
    farmerPhone: listing.farmerPhone,
    farmerName: listing.farmerName,
    buyerName: buyer.businessName,
    buyerPhone: buyer.phone,
    produce: listing.produce,
    quantity: Number(quantity),
    unit: listing.unit,
    agreedPrice: Number(agreedPrice),
    totalAmount,
    commission,
    farmerReceives: totalAmount - commission,
    notes: notes || "",
    status: "pending", // pending | confirmed | delivered | completed | cancelled
    paymentStatus: "unpaid", // unpaid | paid | refunded
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.push(order);
  // Reserve the listing
  updateListing(listingId, { status:"reserved" });
  // Update buyer stats
  buyer.totalOrders++;
  return order;
}

function getOrders({ farmerPhone, buyerId, status } = {}) {
  return orders.filter(o => {
    if (farmerPhone && o.farmerPhone !== farmerPhone) return false;
    if (buyerId && o.buyerId !== buyerId) return false;
    if (status && o.status !== status) return false;
    return true;
  });
}

function updateOrder(id, updates) {
  const order = orders.find(o => o.id === id);
  if (!order) return null;
  Object.assign(order, updates, { updatedAt: new Date().toISOString() });
  // If completed — update listing to sold
  if (updates.status === "completed") {
    updateListing(order.listingId, { status: "sold" });
    const buyer = getBuyer(order.buyerId);
    if (buyer) buyer.totalSpent += order.totalAmount;
  }
  // If cancelled — restore listing to available
  if (updates.status === "cancelled") {
    updateListing(order.listingId, { status: "available" });
  }
  return order;
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function getMarketplaceStats() {
  const totalRevenue = orders.filter(o => o.status === "completed").reduce((s,o) => s+o.totalAmount, 0);
  const totalCommission = orders.filter(o => o.status === "completed").reduce((s,o) => s+o.commission, 0);
  const topProduce = {};
  listings.forEach(l => { topProduce[l.produce] = (topProduce[l.produce]||0)+1; });
  return {
    total_listings: listings.length,
    active_listings: listings.filter(l=>l.status==="available").length,
    total_buyers: buyers.length,
    total_orders: orders.length,
    completed_orders: orders.filter(o=>o.status==="completed").length,
    total_transaction_value: totalRevenue,
    total_commission_earned: totalCommission,
    top_produce: Object.entries(topProduce).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([p,c])=>({produce:p,count:c})),
  };
}

// ── WHATSAPP PRODUCE LISTING FLOW ─────────────────────────────────────────────
// Handles the WhatsApp conversation for farmers listing produce
const listingFlows = new Map(); // phone -> listing in progress

function startListingFlow(phone, farmerName) {
  listingFlows.set(phone, { step: "produce", farmerName, farmerPhone: phone });
  return `🌾 *List Your Produce for Sale*\n\nWhat do you want to sell?\nType the crop or animal product name:\n\n_Example: cassava, maize, tomato, catfish, broiler_`;
}

function handleListingFlow(phone, message) {
  const flow = listingFlows.get(phone);
  if (!flow) return null;

  const msg = message.trim().toLowerCase();

  if (flow.step === "produce") {
    flow.produce = message.trim();
    flow.step = "quantity";
    listingFlows.set(phone, flow);
    return `✅ ${flow.produce}\n\nHow many do you have to sell?\nType the quantity and unit:\n\n_Example: 10 bags, 500 kg, 20 crates_`;
  }

  if (flow.step === "quantity") {
    flow.quantityText = message.trim();
    // Parse quantity
    const num = parseFloat(message);
    flow.quantity = isNaN(num) ? 1 : num;
    flow.unit = message.toLowerCase().includes("bag") ? "bags" :
                message.toLowerCase().includes("crate") ? "crates" :
                message.toLowerCase().includes("kg") ? "kg" : "units";
    flow.step = "price";
    listingFlows.set(phone, flow);
    return `✅ ${flow.quantityText}\n\nWhat is your price per ${flow.unit}?\nType the amount in Naira:\n\n_Example: 35000_`;
  }

  if (flow.step === "price") {
    const price = parseFloat(message.replace(/[₦,]/g, ""));
    if (isNaN(price) || price <= 0) return "❌ Please enter a valid price in Naira. Example: 35000";
    flow.pricePerUnit = price;
    flow.step = "location";
    listingFlows.set(phone, flow);
    return `✅ ₦${price.toLocaleString()} per ${flow.unit}\n\nWhat is your state and LGA?\n\n_Example: FCT — Gwagwalada_`;
  }

  if (flow.step === "location") {
    flow.locationText = message.trim();
    const parts = message.split(/[-—,]/);
    flow.state = parts[0]?.trim() || message;
    flow.lga = parts[1]?.trim() || "";
    flow.step = "confirm";
    listingFlows.set(phone, flow);

    const total = flow.quantity * flow.pricePerUnit;
    return `📋 *Review Your Listing*\n\n🌾 Produce: ${flow.produce}\n📦 Quantity: ${flow.quantityText}\n💰 Price: ₦${flow.pricePerUnit.toLocaleString()} per ${flow.unit}\n💵 Total Value: ₦${total.toLocaleString()}\n📍 Location: ${flow.locationText}\n\nType *YES* to publish your listing or *NO* to cancel.`;
  }

  if (flow.step === "confirm") {
    if (msg === "yes" || msg === "y") {
      const listing = createListing({
        farmerPhone: flow.farmerPhone,
        farmerName: flow.farmerName,
        produce: flow.produce,
        quantity: flow.quantity,
        unit: flow.unit,
        pricePerUnit: flow.pricePerUnit,
        state: flow.state,
        lga: flow.lga,
      });
      listingFlows.delete(phone);

      // Find matching buyers
      const matchedBuyers = getBuyers({ produce: flow.produce, state: flow.state });
      let reply = `✅ *Listing Published!*\n\nYour ${flow.produce} is now live on AgroDoc AI marketplace.\nListing ID: ${listing.id}\n\n`;

      if (matchedBuyers.length > 0) {
        reply += `📞 *Buyers looking for ${flow.produce} near you:*\n\n`;
        matchedBuyers.slice(0, 3).forEach((b, i) => {
          reply += `${i+1}. *${b.businessName}*\n   📍 ${b.state}\n   📞 ${b.phone}\n\n`;
        });
        reply += `_Call them directly to negotiate and arrange delivery._`;
      } else {
        reply += `_We will notify you when a buyer is interested in your listing._`;
      }
      return reply;
    } else {
      listingFlows.delete(phone);
      return "❌ Listing cancelled. Type *SELL* anytime to list your produce.";
    }
  }

  return null;
}

function isInListingFlow(phone) {
  return listingFlows.has(phone);
}

function cancelListingFlow(phone) {
  listingFlows.delete(phone);
}

module.exports = {
  createListing, getListings, getListing, updateListing,
  registerBuyer, getBuyers, getBuyer,
  createOrder, getOrders, updateOrder,
  getMarketplaceStats, PRODUCE_CATS,
  startListingFlow, handleListingFlow, isInListingFlow, cancelListingFlow,
};
