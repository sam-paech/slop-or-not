# Debug Guide

## Overview

Comprehensive debug logging has been added to help diagnose contrast pattern detection issues.

## Debug Output Structure

When you click "Analyze", the browser console will show detailed logging:

```
🔎 Contrast Pattern Detection
  Input length: 156 chars
  Normalized text: The silence wasn't empty...
  Sentence spans: 2

--- Stage 1: Surface Patterns ---
  ✓ Pattern RE_NOT_DASH matched 1 time(s)
    Match: "wasn't empty. It wasn't absence; it was"...
  ✓ Pattern RE_PRON_BE_NOT_SEP_BE matched 2 time(s)
    Match: "It wasn't absence; it was pressure"...
    Match: "wasn't empty. It wasn't"...

📊 Stage1 total matches: 3

🔍 Stage2 POS Tagging Debug
  Original text: The silence wasn't empty...
  Tagged stream: The silence VERB n't empty...
  Number of pieces: 45
  First 10 pieces: [[0,3,0,3], [3,4,3,4], ...]

POS Tagger output: 23 tokens
Sample tokens: The/DT silence/NN VERB/VBD n't/RB empty/JJ...

  ✓ Pattern POS_DOESNT_VERB matched 1 time(s)
    Match: "silence VERB n't empty. It VERB"...

📊 Stage2 total matches: 1

--- Merging & Building Results ---
  Candidates before merging: 4
  Candidates after merging: 3

  Result 1: S1_RE_NOT_DASH
    Sentence: "The silence wasn't empty. It wasn't absence; it was pressure."...
  Result 2: S1_RE_PRON_BE_NOT_SEP_BE
    Sentence: "It wasn't absence; it was pressure."...

✅ Final Results: 2 contrast patterns found
```

## Debug Sections

### 1. **Input Processing**
- Input length
- Normalized text (first 200 chars)
- Number of sentence spans detected

### 2. **Stage 1: Surface Patterns**
- Pattern name and match count for each pattern that matched
- The actual matched text (first 60 chars)
- Total Stage1 matches

### 3. **Stage 2: POS Tagging** (if POS tagger loaded)
- Original text vs tagged stream comparison
- Number of token pieces
- Sample piece mappings
- POS tagger token output with tags (e.g., `The/DT silence/NN was/VBD`)
- Pattern matches on tagged stream

### 4. **Merging & Results**
- Candidate count before/after merging
- Each final result with pattern name and sentence
- Total contrast patterns found

## Common Issues & What to Look For

### Issue: No Stage2 patterns detected

**Check:**
1. Is POS tagger loaded? Look for: `✓ POS tagger loaded - Stage2 patterns enabled`
2. Is tagged stream correct? Compare "Original text" vs "Tagged stream"
3. Are verbs being tagged? Look for `VERB` in the tagged stream
4. Are any Stage2 patterns matching? Look for `✓ Pattern POS_...`

**Example of problem:**
```
Tagged stream: The silence wasn't empty...
```
❌ No `VERB` tags - POS tagger not working!

**Example of working:**
```
Tagged stream: The silence VERB n't empty...
```
✅ Verbs are tagged as `VERB`

### Issue: Patterns matching but not showing in results

**Check:**
1. "Candidates before merging" vs "after merging" - are they being merged away?
2. Are sentence spans being calculated correctly?
3. Is `streamToRaw` mapping working? (check piece mappings)

### Issue: Too many/duplicate results

**Check:**
1. Are regexes matching too broadly?
2. Is merging working? (before/after counts should differ if overlaps exist)
3. Look at the actual matched text to see what triggered the match

## Toggling Debug Output

### In Code
Edit `js/debug.js`:
```javascript
export let DEBUG_ENABLED = true;  // Set to false to disable
```

### In Browser Console
```javascript
// Toggle on/off
window.toggleDebug()

// Check current state
console.log(DEBUG_ENABLED)
```

## Useful Console Commands

```javascript
// See all loaded regexes
console.log(STAGE1_REGEXES)
console.log(STAGE2_REGEXES)

// Check if POS tagger is available
console.log(hasPosTagger())

// Manually test a pattern
const text = "It wasn't empty. It was full.";
const matches = text.matchAll(/wasn't.*\./gi);
Array.from(matches)

// Test POS tagging manually
import { tagWithPos } from './js/pos-tagger.js';
tagWithPos("The fish weren't just dying.", 'verb')
```

## Debug Log Color Legend

- 🔎 Main detection group
- ✓ Successful match
- ⚠ Warning (POS tagger unavailable)
- 📊 Statistics/summary
- ✅ Final result
- ❌ Error

## Interpreting Results

### Good Detection
```
📊 Stage1 total matches: 3
📊 Stage2 total matches: 2
Candidates before merging: 5
Candidates after merging: 4
✅ Final Results: 4 contrast patterns found
```

### No Detection (Stage1 only, expected)
```
📊 Stage1 total matches: 0
⚠ POS tagger unavailable
✅ Final Results: 0 contrast patterns found
```

### No Detection (Both stages, unexpected)
```
📊 Stage1 total matches: 0
📊 Stage2 total matches: 0
✅ Final Results: 0 contrast patterns found
```
→ Check if patterns are too strict or text doesn't contain contrasts

### Stage2 Not Running
```
📊 Stage1 total matches: 2
(no Stage2 section)
```
→ POS tagger failed to load, Stage2 disabled

## Performance Notes

Debug logging can produce a lot of console output. For production, set `DEBUG_ENABLED = false` in `debug.js`.

Current debug logging does NOT significantly impact performance - it's safe to leave on during development.
