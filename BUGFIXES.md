# Bug Fixes

## 2024-10-26: Infinite Loop and Memory Issues

### Problem
The application would freeze, consume excessive memory, and pin CPU when analyzing text due to an infinite loop in regex matching.

### Root Cause
1. **Missing Global Flag**: All regex patterns were missing the `g` (global) flag
2. **Incorrect Loop Pattern**: Used `.exec()` in while loops without global flag, causing infinite loops
3. **Unicode Encoding**: JavaScript source files had literal Unicode characters that could cause parsing errors

### Fixes Applied

#### 1. Fixed Regex Loop Pattern ([contrast-detector.js](js/contrast-detector.js))
Changed from dangerous `.exec()` while loop pattern to safe `matchAll()` or single `.match()`:

**Before (infinite loop):**
```javascript
while ((match = pregex.exec(tNorm)) !== null) {
  // Process match
  if (match.index === pregex.lastIndex) {
    pregex.lastIndex++;  // Doesn't work without global flag!
  }
}
```

**After (safe):**
```javascript
const matches = pregex.global ? Array.from(tNorm.matchAll(pregex)) : (() => {
  const m = tNorm.match(pregex);
  return m ? [m] : [];
})();

for (const match of matches) {
  // Process match
}
```

#### 2. Added Global Flag to All Regexes
- **Stage 1 regexes** ([regexes-stage1.js](js/regexes-stage1.js)): Changed all flags from `'i'` to `'gi'`
- **Stage 2 regexes** ([regexes-stage2.js](js/regexes-stage2.js)): Changed all flags from `/i` to `/gi` or `/` to `/g`

#### 3. Fixed Unicode Encoding ([utils.js](js/utils.js))
Replaced literal Unicode characters with escape sequences to prevent encoding issues:

**Before:**
```javascript
const replacements = {
  '"': '"', '"': '"',  // Literal Unicode
  ''': "'", ''': "'",
  '—': '-', '–': '-'
};
```

**After:**
```javascript
const replacements = {
  '\u201c': '"', '\u201d': '"',  // " "
  '\u2018': "'", '\u2019': "'",  // ' '
  '\u2014': '-', '\u2013': '-'   // — –
};
```

### Testing
After these fixes:
- ✅ No more infinite loops
- ✅ No excessive memory consumption
- ✅ Fast analysis even on large texts
- ✅ Consistent cross-browser behavior

### Files Modified
- `js/contrast-detector.js` - Fixed loop pattern
- `js/regexes-stage1.js` - Added global flag to 10 patterns
- `js/regexes-stage2.js` - Added global flag to 35 patterns
- `js/utils.js` - Fixed Unicode encoding
