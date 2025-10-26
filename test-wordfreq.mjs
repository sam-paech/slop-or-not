// test-wordfreq.mjs
// Test script for wordfreq port

import { loadWordfreqEnFromFile } from './js/wordfreq.js';

async function main() {
  console.log('Loading wordfreq data...');
  const wf = await loadWordfreqEnFromFile('./data/large_en.msgpack.gz');
  
  console.log('\n=== Testing single words ===');
  
  // Test against exact values from wordfreq README
  const testWords = [
    { word: 'the', expected: 7.73 },
    { word: 'word', expected: 5.26 },
    { word: 'frequency', expected: 4.36 },
    { word: 'zipf', expected: 1.49 },
    { word: 'and', expected: null },  // Just check it's high
    { word: 'is', expected: null },
    { word: 'hello', expected: null },
    { word: 'world', expected: null },
    { word: 'xyzabc', expected: 0.0 },  // OOV
  ];
  
  for (const { word, expected } of testWords) {
    const zipf = wf.zipfFrequency(word);
    const freq = wf.frequency(word);
    const match = expected !== null ? (zipf === expected ? '✓' : `✗ (expected ${expected})`) : '';
    console.log(`  "${word}": Zipf=${zipf.toFixed(2)}, freq/1000=${freq.toFixed(4)} ${match}`.trim());
  }
  
  console.log('\n=== Testing contractions & quotes ===');
  
  // Test quote normalization
  const quoteTests = [
    "it's",
    "it's",    // curly apostrophe
    "don't",
    "won't",
  ];
  
  for (const word of quoteTests) {
    const score = wf.zipfFrequency(word);
    console.log(`  "${word}": ${score.toFixed(2)}`);
  }
  
  console.log('\n=== Testing phrases (multi-token) ===');
  
  const phrases = [
    'New York',
    'hello world',
    'the quick brown fox',
  ];
  
  for (const phrase of phrases) {
    const score = wf.zipfFrequency(phrase);
    console.log(`  "${phrase}": ${score.toFixed(2)}`);
  }
  
  console.log('\n=== Testing case normalization ===');
  
  const caseTests = [
    'THE',
    'The',
    'the',
    'HELLO',
    'Hello',
  ];
  
  for (const word of caseTests) {
    const score = wf.zipfFrequency(word);
    console.log(`  "${word}": ${score.toFixed(2)}`);
  }
  
  console.log('\n=== Map stats ===');
  console.log(`  Total words in map: ${wf.map.size}`);
  console.log(`  Min Zipf (OOV default): ${wf.minZipf}`);
  
  // Find highest and lowest Zipf scores
  let maxZipf = -Infinity;
  let minZipf = Infinity;
  let maxWord = '';
  let minWord = '';
  
  for (const [word, zipf] of wf.map.entries()) {
    if (zipf > maxZipf) {
      maxZipf = zipf;
      maxWord = word;
    }
    if (zipf < minZipf) {
      minZipf = zipf;
      minWord = word;
    }
  }
  
  console.log(`  Highest Zipf: ${maxZipf.toFixed(2)} ("${maxWord}")`);
  console.log(`  Lowest Zipf: ${minZipf.toFixed(2)} (e.g., "${minWord}")`);
  
  console.log('\n✓ Tests complete!');
}

main().catch(console.error);
