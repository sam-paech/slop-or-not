// metrics.js - Core text analysis metrics

import { wordsOnlyLower, alphaTokens, countItems } from './utils.js';

const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","than","as","of","to","in","on","for",
  "with","by","at","from","that","this","these","those","is","am","are","was","were",
  "be","been","being","it","its","it's","i","you","he","she","they","we","me","him",
  "her","them","us","my","your","his","their","our","yours","hers","theirs","ours",
  "not","no","so","do","does","did","doing","have","has","had","having","will","would",
  "can","could","should","may","might","must","there","here","up","down","out","over",
  "under","again","further","then","once","about","into","through","during","before",
  "after","above","below","between","own","same","other","very","just"
]);

const FUNCTION_WORDS = new Set([
  "i","you","he","she","it","we","they","me","him","her","us","them",
  "this","that","these","those","there","here","who","whom","whose","which",
  "what","when","where","why","how"
]);

const SUBTLEX_N = 51_000_000;
const ZIPF_K = Math.log10(1e9) - Math.log10(SUBTLEX_N);

let zipfMap = new Map();
let humanBigramFreq = new Map();
let humanTrigramFreq = new Map();
let slopWords = new Set();
let slopBigrams = new Set();
let slopTrigrams = new Set();

export function lookupZipf(word) {
  // 1) exact
  let z = zipfMap.get(word);
  if (z) return z;

  // 2) possessive strip: dog's -> dog
  if (word.endsWith("'s")) {
    const base = word.slice(0, -2);
    z = zipfMap.get(base);
    if (z) return z;
  }

  // 3) decontract common clitics
  const m = word.match(/^([a-z]+)('(re|ve|ll|d|m))$/) || word.match(/^([a-z]+)(n't)$/i);
  if (m) {
    const base = m[1];
    if (FUNCTION_WORDS.has(base)) return null;

    const clitic = m[2].toLowerCase();
    z = zipfMap.get(base);
    if (z) return z;

    const auxMap = { "n't":"not", "'re":"are", "'ve":"have", "'ll":"will", "'d":"would", "'m":"am" };
    const aux = auxMap[clitic];
    if (aux) {
      z = zipfMap.get(aux);
      if (z) return z;
    }
  }

  // 4) apostrophe-stripped fallback
  const noApos = word.replace(/'/g, "");
  if (noApos !== word) {
    z = zipfMap.get(noApos);
    if (z) return z;
  }

  return null;
}

export async function loadSUBTLEX() {
  const url = "https://cdn.jsdelivr.net/npm/subtlex-word-frequencies/index.json";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SUBTLEX fetch failed ${res.status}`);
  const data = await res.json();

  if (Array.isArray(data)) {
    for (const row of data) {
      if (Array.isArray(row) && row.length >= 2) {
        const w = String(row[0]).toLowerCase();
        const c = Number(row[1]) || 0;
        if (c > 0) zipfMap.set(w, Math.log10(c) + ZIPF_K);
      } else if (row && typeof row === 'object' && 'word' in row && 'count' in row) {
        const w = String(row.word).toLowerCase();
        const c = Number(row.count) || 0;
        if (c > 0) zipfMap.set(w, Math.log10(c) + ZIPF_K);
      }
    }
  } else if (data && typeof data === 'object') {
    for (const [w, c] of Object.entries(data)) {
      const cnt = Number(c) || 0;
      if (cnt > 0) zipfMap.set(w.toLowerCase(), Math.log10(cnt) + ZIPF_K);
    }
  }

  if (zipfMap.size === 0) throw new Error("SUBTLEX parsed but empty.");
}

export async function loadHumanProfile() {
  const res = await fetch("./data/human_writing_profile.json");
  if (!res.ok) throw new Error("human_writing_profile.json missing");
  const j = await res.json();
  const hp = j["human-authored"] || j["human"] || j;

  function norm(list, targetMap) {
    if (!Array.isArray(list)) return;
    let total = 0;
    for (const it of list) {
      const f = Number(it.frequency) || 0;
      total += f;
    }
    if (total <= 0) return;
    for (const it of list) {
      const toks = String(it.ngram || "").toLowerCase().match(/[a-z]+/g);
      if (!toks || toks.length < 2) continue;
      targetMap.set(toks.join(" "), (Number(it.frequency)||0)/total);
    }
  }

  norm(hp.top_bigrams || hp.bigrams || [], humanBigramFreq);
  norm(hp.top_trigrams || hp.trigrams || [], humanTrigramFreq);
}

export async function loadSlopSets() {
  async function loadSet(path, outSet) {
    const r = await fetch(path);
    if (!r.ok) return;
    const a = await r.json();
    if (!Array.isArray(a)) return;
    for (const item of a) {
      if (!item || !item.length) continue;
      const phrase = String(item[0]).toLowerCase().match(/[a-z]+(?:\s+[a-z]+)*/g);
      if (phrase) outSet.add(phrase[0]);
    }
  }

  await loadSet("./data/slop_list.json", slopWords);
  await loadSet("./data/slop_list_bigrams.json", slopBigrams);
  await loadSet("./data/slop_list_trigrams.json", slopTrigrams);
}

export function computeSlopIndex(tokens) {
  const n = tokens.length || 0;
  if (!n) return 0;

  let wordHits = 0, biHits = 0, triHits = 0;

  if (slopWords.size) {
    for (const t of tokens) if (slopWords.has(t)) wordHits++;
  }

  if (slopBigrams.size && n >= 2) {
    for (let i = 0; i < n - 1; i++) {
      const bg = tokens[i] + " " + tokens[i + 1];
      if (slopBigrams.has(bg)) biHits++;
    }
  }

  if (slopTrigrams.size && n >= 3) {
    for (let i = 0; i < n - 2; i++) {
      const tg = tokens[i] + " " + tokens[i + 1] + " " + tokens[i + 2];
      if (slopTrigrams.has(tg)) triHits++;
    }
  }

  const totalScore = wordHits + 2 * biHits + 8 * triHits;
  return (totalScore / n) * 1000;
}

export function contentTokens(tokens) {
  return tokens.filter(t => /^[a-z]+(?:'[a-z]+)?$/.test(t) && !STOPWORDS.has(t));
}

export function makeNgrams(tokens, n) {
  const out = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    out.push(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

export function rankOveruseWithCounts(ngrams, humanFreqMap, topK = 40) {
  if (!ngrams.length) return [];
  const counts = countItems(ngrams);
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0) || 1;

  let minHuman = Infinity;
  for (const v of humanFreqMap.values()) if (v > 0 && v < minHuman) minHuman = v;
  if (!isFinite(minHuman)) minHuman = 1e-12;

  const rows = [];
  for (const [ng, cnt] of counts.entries()) {
    const model_f = cnt / total;
    const human_f = humanFreqMap.get(ng) ?? minHuman;
    const ratio = model_f / (human_f + 1e-12);
    rows.push([ng, ratio, cnt]);
  }
  rows.sort((a, b) => b[1] - a[1]);
  return rows.slice(0, topK);
}

export function extractRepeatedPhrases(text, trigramList, maxOut = 1000) {
  if (!trigramList.length) return [];
  const phrases = new Map();
  const lx = text;

  for (const [tg] of trigramList.slice(0, 300)) {
    const rx = new RegExp(`\\b${tg.replace(/\s+/g, '\\s+')}\\b`, "gi");
    const matches = lx.match(rx);
    if (matches && matches.length) {
      const exacts = matches.map(m => m.trim());
      for (const ex of exacts) phrases.set(ex, (phrases.get(ex) || 0) + 1);
    }
  }

  const arr = Array.from(phrases.entries()).sort((a, b) => b[1] - a[1]).slice(0, maxOut);
  return arr;
}

export { humanBigramFreq, humanTrigramFreq };
