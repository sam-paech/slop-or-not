// Test preprocessing functions for over-represented word analysis

import { mergePossessives, filterNumericWords, lookupFrequency, loadWordfreq } from './js/metrics.js';

await loadWordfreq();

console.log('=== Testing mergePossessives ===\n');

const testCounts1 = new Map([
  ["word", 10],
  ["word's", 5],      // Should merge with "word"
  ["it's", 3],        // Contraction - should NOT merge
  ["dog's", 4],       // Should merge with "dog"
  ["dog", 2],
  ["let's", 2],       // Contraction - should NOT merge
]);

const merged = mergePossessives(testCounts1);
console.log('Input:', Array.from(testCounts1.entries()));
console.log('Output:', Array.from(merged.entries()));
console.log('Expected: word=15, dog=6, it\'s=3, let\'s=2');
console.log();

console.log('=== Testing filterNumericWords ===\n');

const testCounts2 = new Map([
  ["hello", 10],
  ["123", 5],         // 100% digits - should be filtered
  ["abc123", 8],      // 50% digits - should be filtered (>20%)
  ["test1", 6],       // 20% digits - should PASS (not >20%)
  ["x1y2z3", 4],      // 50% digits - should be filtered
]);

const filtered = filterNumericWords(testCounts2);
console.log('Input:', Array.from(testCounts2.entries()));
console.log('Output:', Array.from(filtered.entries()));
console.log('Expected: hello=10, test1=6');
console.log();

console.log('=== Testing lookupFrequency preprocessing ===\n');

// Test that lookupFrequency filters numeric words
const testWords = [
  "the",
  "word",
  "123",          // Should return null
  "abc123def",    // 30% digits - should return null
  "test1",        // 20% digits - should work
  "HELLO",        // Should lowercase
];

for (const word of testWords) {
  const freq = lookupFrequency(word);
  const digitPct = ((word.match(/\d/g) || []).length / word.length * 100).toFixed(0);
  if (freq !== null) {
    console.log(`  "${word}" (${digitPct}% digits): ${freq.toExponential(3)}`);
  } else {
    console.log(`  "${word}" (${digitPct}% digits): null (filtered)`);
  }
}

console.log('\n=== Testing combined preprocessing ===\n');

const rawCounts = new Map([
  ["analysis", 10],
  ["analysis's", 5],
  ["data", 8],
  ["data's", 3],
  ["123test", 2],     // 50% digits - should be filtered
  ["it's", 7],        // Contraction - should NOT merge
  ["that's", 4],
]);

console.log('1. Raw counts:', Array.from(rawCounts.entries()));

const step1 = filterNumericWords(rawCounts);
console.log('2. After filterNumeric:', Array.from(step1.entries()));

const step2 = mergePossessives(step1);
console.log('3. After mergePossessives:', Array.from(step2.entries()));
console.log('   Expected: analysis=15, data=11, it\'s=7, that\'s=4');

console.log('\n=== Frequency lookup (after preprocessing) ===\n');

// lookupFrequency expects already-preprocessed words
const preprocessedWords = ["word", "data", "analysis"];
for (const w of preprocessedWords) {
  const freq = lookupFrequency(w);
  console.log(`  "${w}": ${freq ? freq.toExponential(3) : 'null'}`);
}

console.log('\n=== Complete workflow example ===\n');
console.log('Model text contains: "elara" (character name), "data", possessives, numeric words');

// Simulate counting words in model text
const modelCounts = new Map([
  ["elara", 5],
  ["elara's", 3],
  ["data", 10],
  ["data's", 2],
  ["test123", 4],  // Will be filtered (>20% digits)
  ["zypheron", 6], // Fictional name not in wordfreq
]);

console.log('1. Raw model counts:', Array.from(modelCounts.entries()));

// Apply preprocessing
const filteredFinal = filterNumericWords(modelCounts);
const mergedFinal = mergePossessives(filteredFinal);
console.log('2. After preprocessing:', Array.from(mergedFinal.entries()));

// Now lookup baseline frequencies for comparison
console.log('3. Baseline frequencies and over-representation:');
for (const [word, count] of mergedFinal.entries()) {
  const baselineFreq = lookupFrequency(word);
  const modelTotal = Array.from(mergedFinal.values()).reduce((a, b) => a + b, 0);
  const modelFreq = count / modelTotal;
  
  if (baselineFreq) {
    const ratio = (modelFreq / baselineFreq).toFixed(0);
    console.log(`   "${word}": model=${(modelFreq*100).toFixed(1)}%, baseline=${(baselineFreq*100).toFixed(4)}%, ratio=${ratio}x`);
  } else {
    console.log(`   "${word}": model=${(modelFreq*100).toFixed(1)}%, baseline=N/A (not in wordfreq)`);
  }
}

console.log('\n✓ Preprocessing tests complete!');
