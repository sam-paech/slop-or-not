// wordfreq-en.js
// Port of wordfreq for English word frequency lookups
// Based on https://github.com/rspeer/wordfreq by Robyn Speer
//
// Original Python library: https://github.com/rspeer/wordfreq
// Citation: Robyn Speer. (2022). rspeer/wordfreq: v3.0 (v3.0.2). Zenodo.
//           https://doi.org/10.5281/zenodo.7199437
//
// License:
// - Code: Apache License 2.0 (matches original wordfreq code license)
// - Data: Creative Commons Attribution-ShareAlike 4.0 (CC-BY-SA 4.0)
//         https://creativecommons.org/licenses/by-sa/4.0/
//
// Data sources (as documented in wordfreq README):
// - Wikipedia, OPUS OpenSubtitles, SUBTLEX, NewsCrawl, GlobalVoices,
//   Google Books Ngrams, OSCAR, Twitter, Reddit
// - See https://github.com/rspeer/wordfreq#sources-and-supported-languages
//   for full attribution of all data sources

// --- Basic English normalization ---
function uncurlQuotes(s) {
  // Curly → straight quotes
  return s
    .replaceAll('\u2018', "'").replaceAll('\u2019', "'")
    .replaceAll('\u201C', '"').replaceAll('\u201D', '"');
}

function normalizeWord_en(s) {
  // Lowercase, uncurl quotes, trim
  return uncurlQuotes(s).toLocaleLowerCase('en').trim();
}

// Light tokenizer for multi-token inputs
// Matches sequences of letters/digits with internal ' or - kept
const WORD_RE = /[A-Za-z0-9]+(?:[''-][A-Za-z0-9]+)*/g;

// Combine multi-token Zipf via min (conservative estimate)
function combineZipfSimple(tokens, getZipf) {
  if (tokens.length === 0) return 0.0;
  let z = Infinity;
  for (const t of tokens) z = Math.min(z, getZipf(t));
  return Number.isFinite(z) ? z : 0.0;
}

export class WordfreqEn {
  constructor(map, minZipf = 0.0) {
    this.map = map;        // Map<string, number> word -> zipf
    this.minZipf = minZipf; // default for OOV
  }

  zipfFrequency(input) {
    if (!input || typeof input !== 'string') return 0.0;
    const text = normalizeWord_en(input);

    // If the input is a phrase, combine token Zipfs
    const tokens = text.match(WORD_RE) ?? [];
    if (tokens.length > 1) {
      return combineZipfSimple(tokens, (w) => this.map.get(w) ?? this.minZipf);
    }

    // Single token path
    return this.map.get(text) ?? this.minZipf;
  }

  // Return frequency as a proportion (0-1)
  // Zipf = log10(freq_per_billion) => freq_per_billion = 10^zipf
  // freq_proportion = freq_per_billion / 1e9 = 10^(zipf - 9)
  frequency(input) {
    const zipf = this.zipfFrequency(input);
    if (zipf <= 0) return 0.0;
    return Math.pow(10, zipf - 9);
  }
}

// Node.js loader
export async function loadWordfreqEnFromFile(pathToMsgpackGz) {
  const { readFile } = await import('node:fs/promises');
  const { gunzipSync } = await import('node:zlib');
  const { decode: msgpackDecode } = await import('@msgpack/msgpack');

  const gz = await readFile(pathToMsgpackGz);
  const buf = gunzipSync(gz);
  const data = msgpackDecode(buf);

  // Validate header
  const header = data[0];
  if (!header || header.format !== 'cB' || header.version !== 1) {
    throw new Error(`Unexpected format: ${JSON.stringify(header)}`);
  }

  // data is cBpack format: array where index i represents -i centibels
  // Zipf = (cB + 900) / 100, where cB = -index
  // So: Zipf = (-index + 900) / 100 = (900 - index) / 100
  const bins = data.slice(1); // Skip header
  const map = new Map();
  let minZipf = Infinity;
  let maxZipf = -Infinity;

  for (let i = 0; i < bins.length; i++) {
    const words = bins[i];
    if (Array.isArray(words) && words.length > 0) {
      const cB = -i; // centibels (negative)
      const zipf = (cB + 900) / 100.0;
      if (zipf < minZipf) minZipf = zipf;
      if (zipf > maxZipf) maxZipf = zipf;
      
      for (const w of words) {
        map.set(w, zipf);
      }
    }
  }

  return new WordfreqEn(map, 0.0); // OOV default is 0.0
}

// Browser loader
export async function loadWordfreqEnFromUrl(url) {
  // Use CDN version of msgpack for browser
  const msgpack = await import('https://cdn.jsdelivr.net/npm/@msgpack/msgpack@3.0.0-beta2/+esm');
  const msgpackDecode = msgpack.decode;

  const response = await fetch(url);
  const gz = await response.arrayBuffer();
  
  // Use browser's DecompressionStream
  const stream = new Response(gz).body.pipeThrough(new DecompressionStream('gzip'));
  const decompressed = await new Response(stream).arrayBuffer();
  const buf = new Uint8Array(decompressed);
  
  const data = msgpackDecode(buf);

  // Validate header
  const header = data[0];
  if (!header || header.format !== 'cB' || header.version !== 1) {
    throw new Error(`Unexpected format: ${JSON.stringify(header)}`);
  }

  // data is cBpack format: array where index i represents -i centibels
  // Zipf = (cB + 900) / 100, where cB = -index
  const bins = data.slice(1); // Skip header
  const map = new Map();
  let minZipf = Infinity;
  let maxZipf = -Infinity;

  for (let i = 0; i < bins.length; i++) {
    const words = bins[i];
    if (Array.isArray(words) && words.length > 0) {
      const cB = -i; // centibels (negative)
      const zipf = (cB + 900) / 100.0;
      if (zipf < minZipf) minZipf = zipf;
      if (zipf > maxZipf) maxZipf = zipf;
      
      for (const w of words) {
        map.set(w, zipf);
      }
    }
  }

  return new WordfreqEn(map, 0.0); // OOV default is 0.0
}
