// utils.js - Text normalization and tokenization utilities

export function normalizeQuotes(s) {
  // Single quotes: ' ' ‛ ‚ ′ ʼ ＇ `
  s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u02BC\uFF07`]/g, "'");
  // Double quotes: " " „ ‟ ″ « » ＂
  s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB\uFF02]/g, '"');
  return s;
}

export function normalizeText(text) {
  const replacements = {
    '\u201c': '"', '\u201d': '"',  // " "
    '\u2018': "'", '\u2019': "'",  // ' '
    '\u2014': '-', '\u2013': '-'   // — –
  };
  for (const [old, newChar] of Object.entries(replacements)) {
    text = text.replace(new RegExp(old, 'g'), newChar);
  }
  return text;
}

export function wordsOnlyLower(s) {
  const txt = normalizeQuotes(s.toLowerCase());
  const toks = txt.match(/[a-z']+/g) || [];
  // Strip leading/trailing apostrophes from each token
  return toks.map(t => t.replace(/^'+|'+$/g, '')).filter(t => t.length > 0);
}

export function alphaTokens(tokens) {
  return tokens.filter(t => /^[a-z]+(?:'[a-z]+)?$/.test(t));
}

export function sentenceSpans(text) {
  const spans = [];
  const sentSplit = /[^.!?]*[.!?]/gs;
  let lastEnd = 0;
  let match;

  while ((match = sentSplit.exec(text)) !== null) {
    spans.push([match.index, match.index + match[0].length]);
    lastEnd = match.index + match[0].length;
  }

  if (lastEnd < text.length) {
    spans.push([lastEnd, text.length]);
  }

  return spans;
}

export function countItems(arr) {
  const m = new Map();
  for (const x of arr) {
    m.set(x, (m.get(x) || 0) + 1);
  }
  return m;
}

export function topKEntries(objOrMap, k, keyTransform = x => x) {
  const arr = Array.isArray(objOrMap) ? objOrMap.slice()
    : objOrMap instanceof Map ? Array.from(objOrMap.entries())
    : Object.entries(objOrMap);
  arr.sort((a, b) => b[1] - a[1]);
  return arr.slice(0, k).map(([w, v]) => [keyTransform(w), v]);
}
