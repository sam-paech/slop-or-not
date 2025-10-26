# wordfreq Port to JavaScript

This is a JavaScript port of the [wordfreq](https://github.com/rspeer/wordfreq) Python library by Robyn Speer, providing word frequency lookups for English.

## Files

- **`js/wordfreq.js`** - Main implementation with `WordfreqEn` class
- **`data/large_en.msgpack.gz`** - English word frequency data (1.4 MB, ~321k words)
- **`test-wordfreq.mjs`** - Test script validating against wordfreq documentation

## Usage

### Node.js

```javascript
import { loadWordfreqEnFromFile } from './js/wordfreq.js';

// Load the data file
const wf = await loadWordfreqEnFromFile('./data/large_en.msgpack.gz');

// Look up word frequencies (Zipf scale: 0-8)
console.log(wf.zipfFrequency('the'));        // 7.73 (very common)
console.log(wf.zipfFrequency('word'));       // 5.26 (common)
console.log(wf.zipfFrequency('frequency')); // 4.36 (moderate)
console.log(wf.zipfFrequency('zipf'));       // 1.49 (rare)
console.log(wf.zipfFrequency('nonexistent')); // 0.00 (not in vocab)

// Handles normalization automatically
console.log(wf.zipfFrequency("it's"));       // 6.33 (normalized)
console.log(wf.zipfFrequency("IT'S"));       // 6.33 (case-insensitive)

// Multi-word phrases (conservative min frequency)
console.log(wf.zipfFrequency('New York'));   // 5.37
```

### Browser (future)

The implementation includes a `loadWordfreqEnFromUrl()` function for browser use. You'll need to:
1. Install `pako` for gzip decompression
2. Serve the `.msgpack.gz` file from your web server
3. Call `loadWordfreqEnFromUrl()` instead

## What is the Zipf Scale?

The Zipf scale is a logarithmic frequency scale where a word with Zipf value X appears 10^X times per billion words:

- **Zipf 7-8**: Extremely common (the, and, is)
- **Zipf 6**: Very common (it's, don't, hello)
- **Zipf 5**: Common (world, word)
- **Zipf 4**: Moderate (frequency, computer)
- **Zipf 3**: Uncommon
- **Zipf 1-2**: Rare
- **Zipf 0**: Not in vocabulary (< 1 per billion words)

## Data Format (cBpack)

The data uses wordfreq's custom "cBpack" format:

- **Gzipped MessagePack array** where each index represents a frequency bin
- **Index i = -i centibels** (negative logarithmic scale)
- **Zipf = (centibels + 900) / 100**
- Words are pre-normalized and sorted alphabetically within each bin
- Precision: ±1% (Zipf scores rounded to 0.01)

Example: Index 128 = -128 cB → Zipf 7.72, contains ["the"]

## Features Implemented

✅ **Core functionality**
- Zipf frequency lookups for single words
- Case normalization (lowercase)
- Quote normalization (curly → straight quotes)
- Multi-word phrases (conservative min-token frequency)
- Out-of-vocabulary handling (returns 0.0)

✅ **Data loading**
- Node.js loader with native zlib
- Browser loader stub (requires pako)
- Format validation (cBpack header check)

## Features NOT Yet Implemented

❌ Numbers (digit aggregation with Benford's law)
❌ Full Unicode normalization (currently basic ASCII-safe)
❌ Exact multi-token combination (using half-harmonic mean)
❌ CJK language support (Jieba/MeCab tokenization)

These can be added if needed. The current implementation covers standard English text.

## Validation

Tested against exact values from wordfreq documentation:

| Word | Expected | Actual | Status |
|------|----------|--------|--------|
| the | 7.73 | 7.73 | ✓ |
| word | 5.26 | 5.26 | ✓ |
| frequency | 4.36 | 4.36 | ✓ |
| zipf | 1.49 | 1.49 | ✓ |

Run tests: `node test-wordfreq.mjs`

## Dependencies

- **`@msgpack/msgpack`** - MessagePack decoder (Node & browser)
- **`node:zlib`** - Gzip decompression (Node.js only)
- **`pako`** - Gzip decompression (browser, not yet installed)

Install: `npm install @msgpack/msgpack`

## License & Attribution

**Code**: Apache License 2.0 (same as original wordfreq)  
**Data**: Creative Commons Attribution-ShareAlike 4.0 (CC-BY-SA 4.0)

### Required Attribution

This port uses data from wordfreq v3.0 by Robyn Speer:

> Robyn Speer. (2022). rspeer/wordfreq: v3.0 (v3.0.2). Zenodo.  
> https://doi.org/10.5281/zenodo.7199437

Data compiled from: Wikipedia, OPUS OpenSubtitles, SUBTLEX, NewsCrawl, GlobalVoices, Google Books Ngrams, OSCAR, Twitter, Reddit.

Full attributions: https://github.com/rspeer/wordfreq#license

**Important**: Per the license terms, do not convert to CSV or strip attribution. Keep as a library with full credits.

## Performance

- **Data file**: 1.4 MB compressed → ~2.6 MB uncompressed
- **Load time**: ~100-200ms (Node.js, first load)
- **Lookup time**: O(1) hash map lookup, ~0.001ms per word
- **Memory**: ~10-15 MB for the word map (321k entries)

## Differences from Python wordfreq

1. **Single language**: This port only includes English (`large_en`). The Python library supports 40+ languages.

2. **Simplified tokenization**: Uses regex word boundaries. Python uses `regex` library with Unicode UAX #29.

3. **Multi-token combination**: Uses conservative `min()` frequency. Python uses half-harmonic mean with penalties.

4. **No number handling**: Doesn't implement Benford's law digit distribution.

5. **No CJK support**: Python uses Jieba (Chinese) and MeCab (Japanese/Korean).

These simplifications are deliberate for a minimal English-only port. They can be added if needed.

## Future Enhancements

If you need any of these, let me know:

- [ ] Browser integration with IndexedDB caching
- [ ] Number frequency estimation (Benford's law)
- [ ] Exact multi-token frequency combination
- [ ] Additional languages (requires more .msgpack.gz files)
- [ ] Full Unicode tokenization (UAX #29)
- [ ] TypeScript type definitions
- [ ] NPM package publication
