#!/usr/bin/env node
// test-stage2-greedy.mjs - Test Stage2 patterns with POS tagging in Node.js

import { readFileSync } from 'fs';
import winkPOS from 'wink-pos-tagger';
import { normalizeText, sentenceSpans } from './js/utils.js';
import { STAGE2_REGEXES } from './js/regexes-stage2.js';

const tagger = winkPOS();
const VERB_TAGS = new Set(['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']);
const NOUN_TAGS = new Set(['NN', 'NNS', 'NNP', 'NNPS']);

// Apply POS tagging with VBG/VBN filter (same as pos-tagger.js)
function tagWithVerb(text) {
  const tagged = tagger.tagSentence(text);
  const result = [];

  for (let i = 0; i < tagged.length; i++) {
    const token = tagged[i];
    let out = token.value;
    const posTag = token.pos;

    // Check if next token is a noun (for VBG/VBN filtering)
    const nextToken = i < tagged.length - 1 ? tagged[i + 1] : null;
    const nextIsNoun = nextToken && nextToken.pos && NOUN_TAGS.has(nextToken.pos);

    if (posTag && VERB_TAGS.has(posTag)) {
      // Skip VBG/VBN if followed by a noun (likely adjective use)
      if ((posTag === 'VBG' || posTag === 'VBN') && nextIsNoun) {
        out = token.value;
      } else {
        out = 'VERB';
      }
    }

    result.push(out);
  }

  return result.join(' ');
}

function countSentencesInMatch(matchText) {
  const sentences = matchText.match(/[^.!?]+[.!?]/g) || [];
  return Math.max(sentences.length, 1);
}

const text = readFileSync('./data/test.txt', 'utf-8');
const tNorm = normalizeText(text);
const spans = sentenceSpans(tNorm);

console.log('STAGE2 GREEDY PATTERN TEST');
console.log('='.repeat(80));
console.log(`Text length: ${text.length} chars`);
console.log(`Sentences: ${spans.length}`);
console.log('\nTagging text with POS tagger...');

const taggedText = tagWithVerb(tNorm);

console.log('\nSample tagged text (first 200 chars):');
console.log(taggedText.substring(0, 200) + '...');

console.log('\n' + '='.repeat(80));
console.log('Testing Stage2 patterns on tagged text');
console.log('='.repeat(80));

let greedyMatches = 0;
const greedyPatterns = new Map();

for (const [patternName, regex] of Object.entries(STAGE2_REGEXES)) {
  const matches = [...taggedText.matchAll(regex)];

  if (matches.length > 0) {
    console.log(`\n${patternName}: ${matches.length} match(es)`);

    for (const match of matches) {
      const matchText = match[0];
      const sentenceCount = countSentencesInMatch(matchText);

      console.log(`  Match: "${matchText.substring(0, 80)}${matchText.length > 80 ? '...' : ''}"`);
      console.log(`  Sentences in match text: ${sentenceCount}`);

      // Also check the actual span in the original text
      const matchStart = match.index;
      const matchEnd = matchStart + matchText.length;

      // Find which sentence indices this spans
      const starts = spans.map(s => s[0]);
      const ends = spans.map(s => s[1]);

      // Binary search for sentence range
      let lo = 0, hi = ends.length;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (ends[mid] <= matchStart) lo = mid + 1;
        else hi = mid;
      }
      const sentLo = lo;

      lo = 0; hi = starts.length;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (starts[mid] < matchEnd) lo = mid + 1;
        else hi = mid;
      }
      const sentHi = lo - 1;

      const actualSentenceSpan = sentHi >= sentLo ? sentHi - sentLo + 1 : 0;

      if (actualSentenceSpan > 2) {
        console.log(`  ❌ GREEDY: Spans ${actualSentenceSpan} sentences in original text!`);
        const blockStart = spans[sentLo][0];
        const blockEnd = spans[Math.min(sentHi, spans.length - 1)][1];
        console.log(`  Original text: "${tNorm.substring(blockStart, Math.min(blockEnd, blockStart + 200))}..."`);
        greedyMatches++;
        greedyPatterns.set(patternName, (greedyPatterns.get(patternName) || 0) + 1);
      } else if (sentenceCount > 2) {
        console.log(`  ⚠️  Match text has ${sentenceCount} sentences but spans ${actualSentenceSpan} in original`);
      } else {
        console.log(`  ✓ OK: Spans ${actualSentenceSpan} sentence(s)`);
      }
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));

if (greedyMatches === 0) {
  console.log('✓ No greedy patterns detected!');
} else {
  console.log(`❌ Found ${greedyMatches} greedy match(es) across ${greedyPatterns.size} pattern(s):`);
  for (const [pattern, count] of greedyPatterns) {
    console.log(`  ${pattern}: ${count} greedy match(es)`);
  }
}
