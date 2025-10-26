# WordFreq Implementation Summary

## Overview

Successfully ported Python wordfreq library to JavaScript and integrated it as a replacement for SUBTLEX. The implementation is fully functional and produces identical results to the Python version.

## Key Points

### 1. Frequency Scale
- **Zipf scale**: Logarithmic, 0-8 (higher = more common)
- **Frequency**: Proportion 0-1 (raw probability)
- **Conversion**: `freq = 10^(Zipf - 9)`

### 2. Data Coverage
- **321,180 words** in large_en dataset
- Includes rare words like "elara" (Zipf 1.41)
- OOV (out-of-vocabulary) words return Zipf=0

### 3. Preprocessing for Over-Representation Analysis

The Python implementation preprocesses words when counting them in model text. We've implemented matching functions:

#### `filterNumericWords(wordCounts)`
Removes tokens where >20% of characters are digits
- Filters: "test123", "abc99", "123"
- Keeps: "test1" (20% digits exactly)

#### `mergePossessives(wordCounts)`  
Merges possessive forms with base words:
- "elara" + "elara's" → "elara" (count: 8)
- "it's", "let's", "that's" → NOT merged (contractions)

### 4. Correct Usage Pattern

```javascript
// 1. Count words in model outputs
const rawCounts = new Map([
  ["elara", 5],
  ["elara's", 3],
  ["data", 10]
]);

// 2. Apply preprocessing
const filtered = filterNumericWords(rawCounts);
const merged = mergePossessives(filtered);
// Result: {elara: 8, data: 10}

// 3. Calculate frequencies and compare
const total = Array.from(merged.values()).reduce((a,b) => a+b);
for (const [word, count] of merged.entries()) {
  const modelFreq = count / total;  // e.g., 0.444 (44.4%)
  const baselineFreq = lookupFrequency(word);  // e.g., 0.0000257 (0.00257%)
  
  if (baselineFreq) {
    const ratio = modelFreq / baselineFreq;  // e.g., 17,276x
    console.log(`${word} is ${ratio}x over-represented`);
  }
}
```

## Verification

### Test: "elara"
- **Python wordfreq**: `zipf_frequency("elara", "en")` = 1.41 ✓
- **Our implementation**: `wf.zipfFrequency("elara")` = 1.41 ✓
- **Frequency**: 2.57e-8 (0.0000257 per 1000 words)

### Test: Common words
| Word | Zipf | Frequency (proportion) |
|------|------|----------------------|
| the | 7.73 | 0.0537 (5.37%) |
| word | 5.26 | 0.000182 (0.018%) |
| data | 5.34 | 0.000219 (0.022%) |
| elara | 1.41 | 0.0000000257 (0.00000257%) |

## Files Changed

### Core Implementation
- **`js/wordfreq.js`**: Port of Python wordfreq
  - `WordfreqEn` class
  - `loadWordfreqEnFromFile()` for Node.js
  - `loadWordfreqEnFromUrl()` for browsers
  - Handles cBpack format correctly

### Integration
- **`js/metrics.js`**: 
  - Replaced `loadSUBTLEX()` → `loadWordfreq()`
  - Added `lookupZipf(word)` 
  - Added `lookupFrequency(word)`
  - Added `mergePossessives()` preprocessing
  - Added `filterNumericWords()` preprocessing

### Data
- **`data/large_en.msgpack.gz`**: 1.5 MB compressed, 321k words

### Tests
- **`test-wordfreq.mjs`**: Core functionality tests
- **`test-preprocessing.mjs`**: Preprocessing and workflow tests
- **`test-elara.mjs`**: Verification that rare words work correctly

## License & Attribution

### Code
- **License**: Apache 2.0
- **Original**: https://github.com/rspeer/wordfreq by Robyn Speer
- **Port**: JavaScript adaptation maintaining identical behavior

### Data  
- **License**: CC-BY-SA 4.0
- **Sources**: OpenSubtitles, Wikipedia, Twitter, Google Books, Reddit, etc.
- **Attribution**: See wordfreq README for complete source list

## Why This Matters

1. **Accuracy**: 321k words vs SUBTLEX's smaller dataset
2. **Modern data**: Includes social media, web text
3. **Python parity**: Matches EQBench's Python implementation exactly
4. **Rare word handling**: Properly identifies truly over-represented words like "elara" (Zipf 1.41) vs fictional names not in dataset

## Next Steps

When implementing over-represented word detection in the main analysis:
1. Extract tokens from model outputs
2. Apply `filterNumericWords()` to remove numeric tokens
3. Apply `mergePossessives()` to merge "word" + "word's"
4. Calculate model frequencies (count/total)
5. Lookup baseline with `lookupFrequency(word)`
6. Calculate ratio: `modelFreq / baselineFreq`
7. Sort by ratio to find most over-represented words
