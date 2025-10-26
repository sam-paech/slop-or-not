// Debug script to inspect the msgpack structure
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { decode as msgpackDecode } from '@msgpack/msgpack';

async function main() {
  const gz = await readFile('./data/large_en.msgpack.gz');
  console.log('Gzipped size:', gz.length, 'bytes');
  
  const buf = gunzipSync(gz);
  console.log('Uncompressed size:', buf.length, 'bytes');
  
  const data = msgpackDecode(buf);
  console.log('Data type:', typeof data);
  console.log('Is Array?', Array.isArray(data));
  console.log('Is Map?', data instanceof Map);
  
  if (Array.isArray(data)) {
    console.log('Array length:', data.length);
    
    // Show first few entries
    console.log('\nFirst 5 entries:');
    for (let i = 0; i < Math.min(5, data.length); i++) {
      console.log(`[${i}]:`, JSON.stringify(data[i]));
    }
    
    // Look for actual word data
    console.log('\nLooking for word lists...');
    let foundWords = 0;
    for (let i = 0; i < data.length; i++) {
      const entry = data[i];
      if (Array.isArray(entry) && entry.length > 0) {
        console.log(`[${i}]: Array with ${entry.length} items`);
        console.log(`  First 10 items:`, entry.slice(0, 10));
        foundWords++;
        if (foundWords >= 3) break;
      }
    }
    
    // Check entries around index 500 and 700
    console.log('\nSampling indices:');
    for (const idx of [1, 100, 128, 158, 160, 500, 600, 700, 773, 800]) {
      if (idx < data.length) {
        const entry = data[idx];
        if (Array.isArray(entry)) {
          console.log(`[${idx}] (Zipf=${(idx/100).toFixed(2)}): len=${entry.length}, sample:`, entry.slice(0, 5));
        } else {
          console.log(`[${idx}]:`, typeof entry, entry);
        }
      }
    }
    
    // According to wordfreq, higher Zipf = more common
    // Zipf 7-8 = most common (the, and, is)
    // Zipf 1-2 = rare words
    console.log('\n"the" is at index 128 => Zipf 1.28');
    console.log('This means the format is INVERTED from standard Zipf!');
    console.log('We need to convert: actual_zipf = 8.00 - (index/100)');
  }
}

main().catch(console.error);
