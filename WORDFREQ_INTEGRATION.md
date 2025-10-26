# Wordfreq Integration

This project now uses [wordfreq](https://github.com/rspeer/wordfreq) for word frequency lookups instead of SUBTLEX. This provides more accurate and comprehensive word frequency data based on a wide variety of corpora.

## What Changed

1. **New Module**: `js/wordfreq.js` - A JavaScript port of the Python wordfreq library
2. **Updated**: `js/metrics.js` - Now uses wordfreq instead of SUBTLEX, with preprocessing functions
3. **Data File**: `data/large_en.msgpack.gz` - English word frequency data (≈1.5 MB, 321k words)

## API

### wordfreq.js

```javascript
import { loadWordfreqEnFromFile, loadWordfreqEnFromUrl, WordfreqEn } from './js/wordfreq.js';

// Load data (Node.js)
const wf = await loadWordfreqEnFromFile('./data/large_en.msgpack.gz');

// Load data (Browser)
const wf = await loadWordfreqEnFromUrl('./data/large_en.msgpack.gz');

// Get Zipf frequency (log scale, 0-8, where higher = more common)
const zipf = wf.zipfFrequency('the');  // 7.73
const zipf2 = wf.zipfFrequency('word');  // 5.26

// Get frequency as proportion (0-1)
const freq = wf.frequency('the');  // 0.0537 (5.37% of all words, or ~54 per 1000)
const freq2 = wf.frequency('word');  // 0.000182 (0.018%, or ~0.18 per 1000)

// Out-of-vocabulary words return 0
const oov = wf.zipfFrequency('xyzabc');  // 0.0
```

### metrics.js

```javascript
import { 
  loadWordfreq, 
  lookupZipf, 
  lookupFrequency,
  mergePossessives,
  filterNumericWords 
} from './js/metrics.js';

// Load wordfreq
await loadWordfreq();

// Lookup functions now use wordfreq
const zipf = lookupZipf('hello');  // 4.72
const freq = lookupFrequency('hello');  // 0.0000525 (proportion)

// For over-represented word analysis, preprocess model text counts:
const modelCounts = new Map([
  ['elara', 10],
  ["elara's", 5],  // Will merge with 'elara'
  ['data', 20],
  ['test123', 3]   // Will be filtered (>20% digits)
]);

const filtered = filterNumericWords(modelCounts);  // Removes test123
const merged = mergePossessives(filtered);  // elara: 15, data: 20

// Then compare to baseline
const total = Array.from(merged.values()).reduce((a,b) => a+b, 0);
for (const [word, count] of merged.entries()) {
  const modelFreq = count / total;
  const baselineFreq = lookupFrequency(word);
  const ratio = modelFreq / baselineFreq;
  console.log(`${word}: ${ratio}x over-represented`);
}
```

## Zipf Frequency Scale

The Zipf scale is logarithmic (base 10) and ranges from 0 to ~8:

- **7-8**: Extremely common (the, and, is, to)
- **6-7**: Very common (hello, world, computer)
- **5-6**: Common (frequency, algorithm)
- **4-5**: Moderately common (zipf, algorithmic)
- **3-4**: Uncommon
- **2-3**: Rare
- **1-2**: Very rare
- **0**: Out of vocabulary

## Frequency Conversion

```
frequency_proportion = 10^(zipf - 9)
frequency_per_1000 = frequency_proportion * 1000
```

Examples:
- Zipf 7.73 ("the") → 0.0537 proportion → ~54 per 1000 words
- Zipf 5.26 ("word") → 0.000182 proportion → ~0.18 per 1000 words
- Zipf 4.36 ("frequency") → 0.0000229 proportion → ~0.023 per 1000 words

## Preprocessing Functions

To match the Python implementation, use these preprocessing steps when analyzing model text:

### `filterNumericWords(wordCounts)`
Filters out words where >20% of characters are digits (e.g., "test123", "abc99def")

### `mergePossessives(wordCounts)`
Merges possessive forms with base words:
- "word" + "word's" → "word"
- Preserves contractions: "it's", "let's", "that's", etc.

**Usage pattern:**
1. Count words in your model's output
2. Apply `filterNumericWords()` to remove numeric tokens
3. Apply `mergePossessives()` to merge "elara" + "elara's" → "elara"
4. Use `lookupFrequency()` to get baseline frequencies
5. Compare model frequency / baseline frequency for over-representation ratio

## Data Attribution

The wordfreq data is used under the Creative Commons Attribution-ShareAlike 4.0 license.

**Data Sources** (from wordfreq):
- OpenSubtitles
- Wikipedia
- Twitter
- Google Books
- Common Crawl
- And more...

See [wordfreq's data sources](https://github.com/rspeer/wordfreq#sources-and-supported-languages) for full attribution.

**Code License**: Apache 2.0 (both original wordfreq Python code and this JavaScript port)

## Browser Compatibility

The browser loader uses:
- Native `DecompressionStream` API for gzip decompression (Chrome 80+, Firefox 102+, Safari 16.4+, Edge 80+)
- CDN version of `@msgpack/msgpack` (loaded dynamically via ES modules)

For older browsers, you would need to include polyfills.

## Dependencies

**Node.js:**
- `@msgpack/msgpack`: For decoding the compressed data format
- Native Node.js `zlib` for gzip decompression

**Browser:**
- `@msgpack/msgpack` (loaded from CDN: https://cdn.jsdelivr.net/npm/@msgpack/msgpack@3.0.0-beta2/+esm)
- Native `DecompressionStream` API for gzip decompression

## Testing

```bash
# Test wordfreq implementation
node test-wordfreq.mjs

# Test metrics.js integration
node test-metrics-wordfreq.mjs

# Test full leaderboard generation
node generate-leaderboard.mjs
```
