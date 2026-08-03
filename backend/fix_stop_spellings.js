require("dotenv").config();
const mongoose = require("mongoose");
const Route = require("./src/models/Route");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bus_booking_system";

const SPELLING_FIXES = [
  { from: /\bLakhnow\b/gi, to: "Lucknow" },
  { from: /\bLuknow\b/gi, to: "Lucknow" },
  { from: /\bLucknoww\b/gi, to: "Lucknow" },
  { from: /\bAzamghar\b/gi, to: "Azamgarh" },
  { from: /\bAzamgar\b/gi, to: "Azamgarh" },
  { from: /\bAyodya\b/gi, to: "Ayodhya" },
  { from: /\bBuxarr\b/gi, to: "Buxar" },
  { from: /\bVaransi\b/gi, to: "Varanasi" },
  { from: /\bMauu\b/gi, to: "Mau" },
];

const fixString = (str) => {
  if (typeof str !== "string") return str;
  let s = str;
  for (const rule of SPELLING_FIXES) {
    s = s.replace(rule.from, rule.to);
  }
  return s;
};

(async () => {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("✅ DB connected");

  const routes = await Route.find({});
  let totalUpdates = 0;

  for (const route of routes) {
    let changed = false;

    // Fix startPoint
    const newStart = fixString(route.startPoint);
    if (newStart !== route.startPoint) {
      console.log(`  [startPoint] "${route.startPoint}" -> "${newStart}"`);
      route.startPoint = newStart;
      changed = true;
    }

    // Fix route name (based on fixed start + last stop)
    if (route.stops && route.stops.length > 0) {
      const lastStop = route.stops[route.stops.length - 1];
      const lastFixed = fixString(lastStop.name);
      const expectedName = `${newStart || route.startPoint}-${lastFixed}`;
      if (expectedName !== route.name) {
        console.log(`  [name]       "${route.name}" -> "${expectedName}"`);
        route.name = expectedName;
        changed = true;
      }

      // Fix each stop name
      for (let i = 0; i < route.stops.length; i++) {
        const fixed = fixString(route.stops[i].name);
        if (fixed !== route.stops[i].name) {
          console.log(`  [stop[${i}]]  "${route.stops[i].name}" -> "${fixed}"`);
          route.stops[i].name = fixed;
          changed = true;
        }
      }
    }

    if (changed) {
      await route.save();
      totalUpdates++;
      console.log(`💾 Route "${route._id}" saved successfully.`);
    }
  }

  console.log(`\n✅ DONE. Updated ${totalUpdates}/${routes.length} routes.`);
  mongoose.disconnect();
})().catch(e => {
  console.error("ERROR:", e);
  process.exit(1);
});
