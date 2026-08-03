require("dotenv").config();
const mongoose = require("mongoose");
const Route = require("./src/models/Route");
const OnboardSchedule = require("./src/models/OnboardSchedule");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bus_booking_system";
console.log("MONGODB_URI loaded:", MONGODB_URI.substring(0, 40), "...");

(async () => {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("✅ DB connected\n");

  // ========= 1) ALL ACTIVE ROUTES =========
  const allRoutes = await Route.find({}).lean();
  console.log(`\n========== ALL ROUTES (total: ${allRoutes.length}) ==========`);
  allRoutes.forEach((r, i) => {
    const names = [r.startPoint, ...(r.stops || []).map(s => s.name)].join(" → ");
    console.log(`[${i}] _id=${r._id} name="${r.name}" status=${r.status} isActive=${r.isActive}`);
    console.log(`    Stops: ${names}`);
  });

  // ========= 2) ROUTES WITH BUXAR OR LUCKNOW =========
  const rx = /buxar|lucknow/i;
  const candidateRoutes = allRoutes.filter(r => {
    const stops = [r.startPoint, ...(r.stops || []).map(s => s.name || "")].join(" ");
    return rx.test(stops);
  });
  console.log(`\n\n========== ROUTES CONTAINING Buxar / Lucknow (n=${candidateRoutes.length}) ==========`);
  candidateRoutes.forEach((r, i) => {
    console.log(`\n[${i}] _id=${r._id}`);
    console.log(`    name:        ${r.name}`);
    console.log(`    startPoint:  ${r.startPoint}`);
    console.log(`    status:      ${r.status}`);
    console.log(`    isActive:    ${r.isActive}`);
    (r.stops || []).forEach((s, idx) => {
      console.log(`    stop[${idx}] name="${s.name}" distanceFromPrev=${s.distanceFromPrev} durationFromPrev=${s.durationFromPrev}`);
    });
  });

  // ========= 3) ONBOARD SCHEDULES FOR 2026-08-04 (±2 day window) =========
  const dMin = new Date(2026, 7, 2);  // Aug 2 local
  const dMax = new Date(2026, 7, 7);  // Aug 7 local
  const scheds = await OnboardSchedule.find({
    date: { $gte: dMin, $lte: dMax }
  }).populate("routeId", "name startPoint stops status isActive").lean();

  console.log(`\n\n========== ONBOARD SCHEDULES around 2026-08-04 (n=${scheds.length}) ==========`);
  scheds.forEach((s, i) => {
    const d = new Date(s.date);
    const ymdLocal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const r = s.routeId || {};
    const routeName = r.name || "N/A";
    const routeSP = r.startPoint || "N/A";
    const routeStatus = r.status;
    const routeIsActive = r.isActive;
    console.log(`\n[${i}] _id=${s._id}`);
    console.log(`    routeName:         ${s.routeName}`);
    console.log(`    routeId._id:       ${s.routeId ? s.routeId._id : "N/A"}`);
    console.log(`    route ref name/sp: ${routeName} / startPoint="${routeSP}" status=${routeStatus} isActive=${routeIsActive}`);
    console.log(`    busName:           ${s.busName}`);
    console.log(`    date:              ${s.date}  (typeof=${typeof s.date}  constructor.name=${s.date && s.date.constructor ? s.date.constructor.name : "null"})`);
    console.log(`    date ISO:          ${d.toISOString()}`);
    console.log(`    date LOCAL YMD:    ${ymdLocal}`);
    console.log(`    time:              ${s.time}`);
    console.log(`    status:            ${s.status}`);
    console.log(`    isActive:          ${s.isActive}`);
    if (r.stops && r.stops.length) {
      const stopNames = r.stops.map(x => x.name).join(" | ");
      console.log(`    route stops:       [${stopNames}]`);
    }
  });

  mongoose.disconnect();
})().catch(e => {
  console.error("ERROR:", e);
  process.exit(1);
});
