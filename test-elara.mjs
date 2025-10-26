// Test elara lookup
import { loadWordfreqEnFromFile } from './js/wordfreq.js';

const wf = await loadWordfreqEnFromFile('./data/large_en.msgpack.gz');

console.log('Testing "elara" lookup:\n');

const tests = ['elara', 'Elara', 'ELARA'];

for (const word of tests) {
  const zipf = wf.zipfFrequency(word);
  const freq = wf.frequency(word);
  console.log(`"${word}": Zipf=${zipf.toFixed(2)}, freq=${freq.toExponential(3)}`);
}

// Check if it's in the map with different casing
console.log('\nChecking raw map:');
const normalized = 'elara'.toLowerCase();
console.log(`Map has "${normalized}":`, wf.map.has(normalized));

// Check for variations
const variations = ['elara', 'Elara', 'éla', 'ela'];
for (const v of variations) {
  if (wf.map.has(v)) {
    console.log(`Found in map: "${v}" -> Zipf=${wf.map.get(v)}`);
  }
}

// Sample some words starting with 'el' to see what's there
console.log('\nWords starting with "el" in map:');
let count = 0;
for (const [word, zipf] of wf.map.entries()) {
  if (word.startsWith('el')) {
    console.log(`  ${word}: ${zipf.toFixed(2)}`);
    count++;
    if (count >= 20) break;
  }
}
