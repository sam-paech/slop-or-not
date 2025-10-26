// Verify our implementation matches Python wordfreq exactly

import { loadWordfreqEnFromFile } from './js/wordfreq.js';

const wf = await loadWordfreqEnFromFile('./data/large_en.msgpack.gz');

console.log('=== Verifying Python Parity ===\n');

// Test cases from Python wordfreq README and documentation
const testCases = [
  { word: 'the', expectedZipf: 7.73 },
  { word: 'word', expectedZipf: 5.26 },
  { word: 'zipf', expectedZipf: 1.49 },
  { word: 'elara', expectedZipf: 1.41 },  // Your Python test
  { word: 'frequency', expectedZipf: 4.36 },
  { word: 'xyznotaword', expectedZipf: 0.0 },
];

console.log('Testing Zipf scores:\n');
let allMatch = true;

for (const { word, expectedZipf } of testCases) {
  const actualZipf = wf.zipfFrequency(word);
  const match = Math.abs(actualZipf - expectedZipf) < 0.01;
  const status = match ? '✓' : '✗';
  
  if (!match) allMatch = false;
  
  console.log(`${status} "${word}": expected=${expectedZipf}, actual=${actualZipf.toFixed(2)}`);
}

console.log(allMatch ? '\n✓ All tests passed! JS matches Python exactly.' : '\n✗ Some tests failed');

// Also test frequency conversion
console.log('\n=== Frequency Conversion ===\n');

for (const word of ['the', 'word', 'elara']) {
  const zipf = wf.zipfFrequency(word);
  const freq = wf.frequency(word);
  const expectedFreq = Math.pow(10, zipf - 9);
  const freqMatch = Math.abs(freq - expectedFreq) < 1e-12;
  
  console.log(`"${word}":`);
  console.log(`  Zipf: ${zipf.toFixed(2)}`);
  console.log(`  Freq: ${freq.toExponential(3)}`);
  console.log(`  Expected: ${expectedFreq.toExponential(3)}`);
  console.log(`  Match: ${freqMatch ? '✓' : '✗'}\n`);
}
