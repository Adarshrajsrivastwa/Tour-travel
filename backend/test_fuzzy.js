// Isolated fuzzy match test (no DB needed) — MATCHES onboard.js relaxed algorithm
const term = "Lucknow";
const candidates = [
  { kind: "stop", name: "Buxar", idx: 0 },
  { kind: "stop", name: "Lakhnow", idx: 1 }, // real DB
  { kind: "stop", name: "Lucknow Junction", idx: 2 },
  { kind: "stop", name: "Varanasi", idx: 3 },
  { kind: "stop", name: "Azamghar", idx: 4 }, // real DB
  { kind: "stop", name: "Mau", idx: 5 },
  { kind: "stop", name: "Azamgarh", idx: 6 },
  { kind: "stop", name: "Ayodhya", idx: 7 },
  { kind: "stop", name: "Ayodya", idx: 8 },
];

const FUZZY_MIN_LEN = 4;

// ---- RELAXED LEVENSHTEIN (matches onboard.js current version exactly) ----
const levenshtein = (a, b) => {
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  if (s1 === s2) return 0;

  const isRelaxedPair = (x, y) => {
    if (x === y) return true;
    const key = x < y ? x + "|" + y : y + "|" + x;
    const pairs = [
      "k|kh", "g|gh", "c|ch", "j|jh",
      "t|th", "d|dh", "p|ph", "b|bh",
      "s|sh", "s|ss", "n|nn", "m|mm",
      "a|aa", "i|ee", "u|oo", "e|ai", "o|au",
      "l|ll", "r|rr", "v|w", "y|i",
      "a|e", "a|i", "a|u", "i|y", "n|m",
    ];
    return pairs.includes(key);
  };

  const tokenize = (s) => {
    const out = [];
    let i = 0;
    while (i < s.length) {
      if (i + 1 < s.length && isRelaxedPair(s[i], s[i] + s[i + 1])) {
        out.push(s[i] + s[i + 1]);
        i += 2;
      } else {
        out.push(s[i]);
        i += 1;
      }
    }
    return out;
  };

  const t1 = tokenize(s1);
  const t2 = tokenize(s2);

  const costSub = (tx, ty) => {
    if (tx === ty) return 0;
    if (isRelaxedPair(tx, ty)) return 0;
    if (Math.abs(tx.length - ty.length) >= 1) return 1;
    return 2;
  };

  const n1 = t1.length;
  const n2 = t2.length;
  const dp = Array.from({ length: n1 + 1 }, () => new Array(n2 + 1).fill(0));
  for (let i = 0; i <= n1; i++) dp[i][0] = i;
  for (let j = 0; j <= n2; j++) dp[0][j] = j;
  for (let i = 1; i <= n1; i++) {
    for (let j = 1; j <= n2; j++) {
      const c = costSub(t1[i - 1], t2[j - 1]);
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c);
    }
  }
  return dp[n1][n2];
};

const buildMatchers = (t) => {
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    { regex: new RegExp(`^${escaped}$`, "i"), type: "exact" },
    { regex: new RegExp(escaped, "i"), type: "contains" },
  ];
};
const testMatchers = (name, ms) => {
  if (!name) return null;
  for (const m of ms) if (m.regex.test(name)) return name;
  return null;
};

const findBestFuzzyMatch = (searchTerm, cands, matchers) => {
  const input = (searchTerm || "").trim();
  if (!input) return null;
  const termLower = input.toLowerCase();
  const termTokens = termLower.split(/\s+/).filter(Boolean);

  const distThreshold =
    input.length >= 10 ? 5 : input.length >= 7 ? 4 : input.length >= FUZZY_MIN_LEN ? 1 : 0;

  let best = null;
  const consider = (name, dist, via) => {
    if (!best || dist < best.distance) best = { name, distance: dist, via };
  };

  for (const raw of cands) {
    const name = typeof raw === "string" ? raw : raw.name;
    if (!name) continue;

    if (testMatchers(name, matchers)) { consider(name, 0, "regex"); continue; }

    const nameLower = name.toLowerCase();
    const nameTokens = nameLower.split(/\s+/).filter(Boolean);

    let tokenEqual = false;
    for (const tt of termTokens) for (const nt of nameTokens) if (tt === nt) { tokenEqual = true; break; }
    if (tokenEqual) { consider(name, 0, "token-eq"); continue; }

    let tokenContains = false;
    for (const tt of termTokens) {
      if (tt.length < FUZZY_MIN_LEN) continue;
      for (const nt of nameTokens) {
        if (nt.length < FUZZY_MIN_LEN) continue;
        if (nt.includes(tt) || tt.includes(nt)) { tokenContains = true; break; }
      }
      if (tokenContains) break;
    }
    if (tokenContains) { consider(name, 1, "token-contains"); continue; }

    if (
      termLower.length >= FUZZY_MIN_LEN &&
      nameLower.length >= FUZZY_MIN_LEN &&
      (nameLower.includes(termLower) || termLower.includes(nameLower))
    ) { consider(name, 1, "full-contains"); continue; }

    if (distThreshold > 0 && input.length >= FUZZY_MIN_LEN && name.length >= FUZZY_MIN_LEN) {
      const d = levenshtein(termLower, nameLower);
      if (d <= distThreshold) { consider(name, d, `lev-full-${d}`); continue; }
      let bestPair = Infinity;
      for (const tt of termTokens) {
        if (tt.length < FUZZY_MIN_LEN) continue;
        for (const nt of nameTokens) {
          if (nt.length < FUZZY_MIN_LEN) continue;
          const d2 = levenshtein(tt, nt);
          if (d2 <= distThreshold && d2 < bestPair) bestPair = d2;
        }
      }
      if (isFinite(bestPair)) consider(name, bestPair, `lev-pair-${bestPair}`);
    }
  }
  if (!best) return null;
  if (best.distance > (distThreshold > 0 ? distThreshold : 0)) return null;
  return best;
};

const matchers = buildMatchers(term);
const result = findBestFuzzyMatch(term, candidates, matchers);

console.log("Search term:", term);
console.log("Threshold length:", term.length, "→ dist allowed:",
  term.length >= 10 ? 5 : term.length >= 7 ? 4 : term.length >= FUZZY_MIN_LEN ? 1 : 0);
console.log("\nCandidates with relaxed distances:");
for (const c of candidates) {
  const d = levenshtein(term, c.name);
  console.log(`  "${c.name}" → relaxed-lev=${d}`);
}
console.log("\nBest fuzzy match result:", result);

// Also test Azamgarh to Azamghar
const t2 = "Azamgarh";
console.log("\n--- Search:", t2, "against Azamghar ---");
console.log("  relaxed lev distance:", levenshtein(t2, "Azamghar"));

process.exit(result ? 0 : 1);
