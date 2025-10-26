# Regex Greedy Pattern Fixes

## Problems Found

### Issue 1: Using `token.tag` instead of `token.pos`
wink-pos-tagger returns:
```javascript
{ value: 'was', tag: 'word', pos: 'VBD', lemma: 'be' }
```

We were checking `token.tag` (always "word"/"punctuation") instead of `token.pos` (the actual Penn Treebank tag).

**Fixed in:** `js/pos-tagger.js`

### Issue 2: Greedy Regex Patterns Matching Across Multiple Sentences

Two patterns were matching across 4-7 sentences when they should max out at 2:

#### LEMMA_SAME_VERB (Stage 2)
**Before:**
```javascript
/\bVERB\b[^.!?]{5,80}?[.!?;—-]\s*[^.!?]{0,40}?\bVERB\b/gi
```

**Problem:**
- `[^.!?]` matches newlines
- Can match multiple sentence boundaries
- Too permissive in what comes after the first sentence boundary

**After:**
```javascript
/\bVERB\b[^.!?\n]{5,60}?[.!?]\s{0,5}(?:[^.!?\n]{0,30}?\bVERB\b|[Ii]t\s+VERB|[Tt]hey\s+VERB)/gi
```

**Fixes:**
- Added `\n` to exclusion set
- Limited whitespace after sentence boundary to 5 chars
- Require VERB to appear soon after boundary (max 30 chars) OR in specific pronoun pattern
- Reduced max length from 80 to 60

#### RE_NOT_BUT (Stage 1)
**Before:**
```javascript
`(?:(?!\\bbut\\b|[.?!]).)` + `{1,100}?`
```

**Problem:**
- The `.` matches any character including newlines
- Negative lookahead doesn't prevent matching across sentences
- Max length of 100 allowed very long spans

**After:**
```javascript
`[^\\n.?!,;:]{1,80}?`
```

**Fixes:**
- Explicitly exclude newlines and sentence boundaries
- Reduced max length from 100 to 80
- Simpler, more predictable pattern

## Testing

Run analysis and check console for:

```
✓ Pattern RE_NOT_BUT matched X time(s)
  Match: "..." (1 sent)   ← Should be 1-2 sentences max

✓ Pattern LEMMA_SAME_VERB matched X time(s)
  Match: "..." (2 sent)   ← Should be 1-2 sentences max
```

If you see:
```
⚠ Pattern XXX matched 5 sentences!
```

That pattern needs fixing!

## Verb Detection Stats

Added verb percentage tracking to detect over-tagging:

```
Verb tokens found: 143 out of 750 words (19.1%)
Sample verbs: had/VBD, found/VBD, was/VBD, ...
Verb tag distribution: {VBD: 45, VBN: 23, VBG: 34, ...}
```

Typical percentages:
- **15-25%**: Normal for narrative prose
- **>25%**: Suspiciously high, check VERB_TAGS
- **<10%**: Suspiciously low, tagger may not be working

## Files Modified

- [js/regexes-stage2.js](js/regexes-stage2.js#L25-26) - Fixed LEMMA_SAME_VERB
- [js/regexes-stage1.js](js/regexes-stage1.js#L11-17) - Fixed RE_NOT_BUT
- [js/pos-tagger.js](js/pos-tagger.js) - Fixed to use `token.pos`, added verb % tracking
- [js/contrast-detector.js](js/contrast-detector.js) - Added sentence span warnings
