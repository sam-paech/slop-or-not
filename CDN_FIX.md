# CDN Loading Fix & Graceful Degradation

## Problem
The POS tagger (wink-pos-tagger) was failing to load from CDN with a silent failure, preventing Stage2 contrast patterns from working.

## Issues Fixed

### 1. **Silent Failure** ❌ → **Loud Failure with Graceful Degradation** ✅

**Before:**
- CDN failures were logged to console only
- App appeared to work but Stage2 patterns were silently disabled
- No user feedback about missing functionality

**After:**
- CDN failures throw errors with detailed messages
- Main app catches the error and continues with Stage1 patterns only
- Clear user feedback about degraded functionality
- Status line shows: "ready (Stage1 patterns only - POS tagger unavailable)"
- Warning message displayed in errors section

### 2. **Single CDN Source** ❌ → **Multiple Fallback CDNs** ✅

**Before:**
```javascript
await import('https://cdn.jsdelivr.net/npm/wink-pos-tagger@3.0.2/+esm')
```

**After:**
```javascript
const cdnUrls = [
  { url: 'https://esm.sh/wink-pos-tagger@2.2.2', type: 'esm' },
  { url: 'https://cdn.skypack.dev/wink-pos-tagger@2.2.2', type: 'esm' },
  { url: 'https://unpkg.com/wink-pos-tagger@2.2.2/dist/wink-pos-tagger.min.js', type: 'umd' },
  { url: 'https://cdn.jsdelivr.net/npm/wink-pos-tagger@2.2.2/dist/wink-pos-tagger.min.js', type: 'umd' },
];
```

### 3. **No Module Format Support** ❌ → **Multiple Module Formats** ✅

Now supports:
- **ESM** (ES Modules) - `import` syntax
- **UMD** (Universal Module Definition) - `<script>` tag injection

### 4. **Vague Error Messages** ❌ → **Detailed Debugging Info** ✅

**Before:**
```
wink-pos-tagger failed to load, Stage2 patterns will be skipped
```

**After:**
```
Failed to load wink-pos-tagger from all 4 CDN sources.
Stage2 contrast patterns will be disabled.
Last error: [detailed error message]
Tried CDNs: [list of all attempted URLs]
```

### 5. **No Version Fallback** ❌ → **Stable Version** ✅

- Changed from v3.0.2 (newer, potentially unstable) to v2.2.2 (stable, widely cached)
- Better CDN cache hit rates
- More reliable loading

## User Experience Improvements

### Critical Errors (SUBTLEX, data files)
```
Status: "CRITICAL ERROR"
Message: "❌ [error details]

The application cannot function without this component. Please check:
1. Your internet connection
2. Browser console for details
3. Whether CDN services are accessible"

Button: DISABLED
```

### Non-Critical Errors (POS tagger)
```
Status: "ready (Stage1 patterns only - POS tagger unavailable)"
Message: "⚠ Note: POS tagger could not be loaded.
Stage2 contrast patterns are disabled, but Stage1 patterns will still work."

Button: ENABLED
```

## Architecture

```
Init Flow:
├─ Load POS Tagger (optional)
│  ├─ Try esm.sh
│  ├─ Try cdn.skypack.dev
│  ├─ Try unpkg.com
│  ├─ Try cdn.jsdelivr.net
│  └─ If all fail: continue with warning
├─ Load SUBTLEX (required)
│  └─ If fails: CRITICAL ERROR
└─ Load Data Files (required)
   └─ If fails: CRITICAL ERROR
```

## Testing

To test CDN fallback behavior:
1. Block one CDN in browser DevTools → should try next CDN
2. Block all CDNs → should show warning but allow Stage1 patterns
3. Block SUBTLEX CDN → should show critical error and disable app

## Files Modified

- [js/pos-tagger.js](js/pos-tagger.js) - Multi-CDN loading with fallbacks
- [slop-or-not.html](slop-or-not.html) - Graceful error handling in init()
