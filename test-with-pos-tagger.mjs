#!/usr/bin/env node
// test-with-pos-tagger.mjs - Test with POS tagger enabled

import { readFileSync } from 'fs';
import { initPosTagger, hasPosTagger } from './js/pos-tagger.js';
import { extractContrastMatches } from './js/contrast-detector.js';

const text = readFileSync('./data/test.txt', 'utf-8');

console.log('TESTING WITH POS TAGGER');
console.log('='.repeat(80));

// Try to init POS tagger (will fail in Node.js since it needs browser APIs)
try {
  await initPosTagger();
  console.log('✓ POS tagger initialized');
} catch (e) {
  console.log('✗ POS tagger failed to initialize (expected in Node.js)');
  console.log(`  Error: ${e.message}`);
}

console.log(`Has POS tagger: ${hasPosTagger()}`);
console.log('\nRunning extractContrastMatches...\n');

const matches = extractContrastMatches(text);

console.log('\n' + '='.repeat(80));
console.log('RESULTS');
console.log('='.repeat(80));

let greedyCount = 0;
const greedyPatterns = new Set();

for (const match of matches) {
  if (match.sentence_count > 2) {
    console.log(`\n❌ GREEDY: ${match.pattern_name}`);
    console.log(`   Spans: ${match.sentence_count} sentences`);
    console.log(`   Match text: "${match.match_text}"`);
    console.log(`   Full (first 200): "${match.sentence.substring(0, 200)}..."`);
    greedyCount++;
    greedyPatterns.add(match.pattern_name);
  }
}

if (greedyCount === 0) {
  console.log('\n✓ No greedy matches found!');
  console.log('\nThis suggests the issue only occurs when:');
  console.log('  1. POS tagger is loaded (Stage2 patterns active)');
  console.log('  2. Running in browser environment');
  console.log('\nThe greedy patterns you saw were likely Stage2 patterns.');
} else {
  console.log(`\n❌ Found ${greedyCount} greedy matches across ${greedyPatterns.size} patterns:`);
  for (const pattern of greedyPatterns) {
    console.log(`  - ${pattern}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('Total matches: ', matches.length);
console.log('='.repeat(80));
