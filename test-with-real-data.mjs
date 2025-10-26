#!/usr/bin/env node
// test-with-real-data.mjs - Test with actual data/test.txt

import { readFileSync } from 'fs';
import { extractContrastMatches } from './js/contrast-detector.js';

const text = readFileSync('./data/test.txt', 'utf-8');

console.log('TESTING WITH data/test.txt');
console.log('='.repeat(80));
console.log(`Text length: ${text.length} chars`);
console.log('\nRunning extractContrastMatches...\n');

const matches = extractContrastMatches(text);

console.log('\n' + '='.repeat(80));
console.log('RESULTS SUMMARY');
console.log('='.repeat(80));

let greedyCount = 0;

for (const match of matches) {
  console.log(`\nPattern: ${match.pattern_name}`);
  console.log(`Sentence count: ${match.sentence_count}`);
  console.log(`Match text: "${match.match_text}"`);

  if (match.sentence_count > 2) {
    console.log(`❌ GREEDY: SPANS ${match.sentence_count} SENTENCES!`);
    console.log(`Full sentence block (first 300 chars):`);
    console.log(`"${match.sentence.substring(0, 300)}..."`);
    greedyCount++;
  } else {
    console.log(`✓ OK: ${match.sentence_count} sentence(s)`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`Total matches: ${matches.length}`);
console.log(`Greedy matches (>2 sentences): ${greedyCount}`);
console.log('='.repeat(80));
