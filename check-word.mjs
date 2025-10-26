// Check what index specific words are at
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { decode as msgpackDecode } from '@msgpack/msgpack';

async function main() {
  const gz = await readFile('./data/large_en.msgpack.gz');
  const buf = gunzipSync(gz);
  const bins = msgpackDecode(buf);

  const wordsToFind = ['the', 'and', 'is', 'hello', 'world', 'rare', 'computer'];
  
  console.log('Finding words...\n');
  
  for (const targetWord of wordsToFind) {
    for (let i = 0; i < bins.length; i++) {
      const words = bins[i];
      if (Array.isArray(words) && words.includes(targetWord)) {
        console.log(`"${targetWord}" at index ${i}`);
        console.log(`  Raw: ${i/100}`);
        console.log(`  If inverted from 8: ${(8.0 - i/100).toFixed(2)}`);
        console.log(`  Expected Zipf for "${targetWord}": ~${getExpectedZipf(targetWord)}`);
        console.log();
        break;
      }
    }
  }
}

function getExpectedZipf(word) {
  // Expected Zipf scores from wordfreq
  const expected = {
    'the': '7.73',
    'and': '7.50',
    'is': '7.06',
    'hello': '4.5-5.0',
    'world': '5.0-5.5',
    'computer': '4.0-4.5',
    'rare': '4.0-4.5'
  };
  return expected[word] || '?';
}

main().catch(console.error);
