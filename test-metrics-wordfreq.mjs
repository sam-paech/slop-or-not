// Test metrics.js with wordfreq integration
import { loadWordfreq, lookupZipf, lookupFrequency } from './js/metrics.js';

async function main() {
  console.log('Loading wordfreq via metrics.js...');
  await loadWordfreq();
  console.log('✓ Loaded\n');
  
  console.log('=== Testing lookupZipf ===');
  const testWords = ['the', 'word', 'frequency', 'xyzabc'];
  
  for (const word of testWords) {
    const zipf = lookupZipf(word);
    const freq = lookupFrequency(word);
    if (zipf !== null) {
      console.log(`  "${word}": Zipf=${zipf.toFixed(2)}, freq/1000=${freq.toFixed(4)}`);
    } else {
      console.log(`  "${word}": null (OOV)`);
    }
  }
  
  console.log('\n✓ Tests complete!');
}

main().catch(console.error);
