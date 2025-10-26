// pos-tagger.js - POS tagging utilities using wink-pos-tagger

let winkPOS = null;

export async function initPosTagger() {
  // Try multiple CDN sources in order
  const cdnUrls = [
    { url: 'https://esm.sh/wink-pos-tagger@2.2.2', type: 'esm' },
    { url: 'https://cdn.skypack.dev/wink-pos-tagger@2.2.2', type: 'esm' },
    { url: 'https://unpkg.com/wink-pos-tagger@2.2.2/dist/wink-pos-tagger.min.js', type: 'umd' },
    { url: 'https://cdn.jsdelivr.net/npm/wink-pos-tagger@2.2.2/dist/wink-pos-tagger.min.js', type: 'umd' },
  ];

  let lastError = null;

  for (const { url, type } of cdnUrls) {
    try {
      console.log(`Attempting to load wink-pos-tagger from: ${url} (${type})`);

      if (type === 'esm') {
        // ESM import
        const module = await import(url);
        // Try different export patterns
        if (module.default) {
          winkPOS = typeof module.default === 'function' ? module.default() : module.default;
        } else if (module.winkPOS) {
          winkPOS = typeof module.winkPOS === 'function' ? module.winkPOS() : module.winkPOS;
        } else {
          throw new Error('Could not find winkPOS export in module');
        }
      } else {
        // UMD/script tag approach
        await loadScript(url);
        if (window.winkPOS) {
          winkPOS = typeof window.winkPOS === 'function' ? window.winkPOS() : window.winkPOS;
        } else {
          throw new Error('winkPOS not found in window after loading script');
        }
      }

      // Verify it's initialized
      if (!winkPOS || typeof winkPOS.tagSentence !== 'function') {
        throw new Error('winkPOS loaded but tagSentence method not found');
      }

      console.log('✓ wink-pos-tagger loaded successfully from:', url);
      return true;
    } catch (e) {
      console.warn(`Failed to load from ${url}:`, e.message);
      lastError = e;
    }
  }

  // All CDN sources failed
  const errorMsg = `Failed to load wink-pos-tagger from all ${cdnUrls.length} CDN sources. Stage2 contrast patterns will be disabled. Last error: ${lastError?.message || lastError}`;
  console.error(errorMsg);
  console.error('Tried CDNs:', cdnUrls.map(c => c.url).join(', '));
  throw new Error(errorMsg);
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

export function hasPosTagger() {
  return winkPOS !== null;
}

// Map wink-pos tags to our simplified tags
const VERB_TAGS = new Set(['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']);
const NOUN_TAGS = new Set(['NN', 'NNS', 'NNP', 'NNPS']);
const ADJ_TAGS = new Set(['JJ', 'JJR', 'JJS']);
const ADV_TAGS = new Set(['RB', 'RBR', 'RBS']);

export function tagWithPos(text, posType = 'verb') {
  if (!winkPOS) return text;

  const tagged = winkPOS.tagSentence(text);
  const result = [];

  for (const token of tagged) {
    let out = token.value;
    const tag = token.tag;

    if (posType === 'verb' && VERB_TAGS.has(tag)) {
      out = 'VERB';
    } else if (posType === 'noun' && NOUN_TAGS.has(tag)) {
      out = 'NOUN';
    } else if (posType === 'adj' && ADJ_TAGS.has(tag)) {
      out = 'ADJ';
    } else if (posType === 'adv' && ADV_TAGS.has(tag)) {
      out = 'ADV';
    } else if (posType === 'all') {
      if (VERB_TAGS.has(tag)) out = 'VERB';
      else if (NOUN_TAGS.has(tag)) out = 'NOUN';
      else if (ADJ_TAGS.has(tag)) out = 'ADJ';
      else if (ADV_TAGS.has(tag)) out = 'ADV';
    }

    result.push(out);
  }

  return result.join(' ');
}

export function tagStreamWithOffsets(text, posType = 'verb') {
  if (!winkPOS) {
    console.warn('⚠ tagStreamWithOffsets called but POS tagger not available');
    return { stream: text, pieces: [[0, text.length, 0, text.length]] };
  }

  if (typeof winkPOS.tagSentence !== 'function') {
    console.error('❌ winkPOS exists but tagSentence is not a function!', winkPOS);
    return { stream: text, pieces: [[0, text.length, 0, text.length]] };
  }

  const tagged = winkPOS.tagSentence(text);

  if (!Array.isArray(tagged)) {
    console.error('❌ tagSentence did not return an array!', typeof tagged, tagged);
    return { stream: text, pieces: [[0, text.length, 0, text.length]] };
  }
  console.log('POS Tagger output:', tagged.length, 'tokens');
  console.log('Sample tokens:', tagged.slice(0, 10).map(t => `${t.value}/${t.tag}`).join(' '));

  // Debug: Check if we're finding any verbs
  const verbTokens = tagged.filter(t => VERB_TAGS.has(t.tag));
  console.log('Verb tokens found:', verbTokens.length);
  if (verbTokens.length > 0) {
    console.log('Sample verbs:', verbTokens.slice(0, 5).map(t => `${t.value}/${t.tag}`).join(', '));
  } else {
    console.warn('⚠ No verb tokens found! Tag set:', Array.from(new Set(tagged.map(t => t.tag))).join(', '));
  }

  const parts = [];
  const pieces = [];
  let streamPos = 0;
  let rawPos = 0;

  for (let i = 0; i < tagged.length; i++) {
    const token = tagged[i];
    const tag = token.tag;
    const value = token.value;

    // Find token in original text
    const tokenStart = text.indexOf(value, rawPos);
    if (tokenStart === -1) {
      // Fallback if we can't find it
      rawPos += value.length;
      continue;
    }

    // Map token to POS tag if applicable
    let out = value;
    if (posType === 'verb' && VERB_TAGS.has(tag)) {
      out = 'VERB';
    } else if (posType === 'noun' && NOUN_TAGS.has(tag)) {
      out = 'NOUN';
    } else if (posType === 'adj' && ADJ_TAGS.has(tag)) {
      out = 'ADJ';
    } else if (posType === 'adv' && ADV_TAGS.has(tag)) {
      out = 'ADV';
    } else if (posType === 'all') {
      if (VERB_TAGS.has(tag)) out = 'VERB';
      else if (NOUN_TAGS.has(tag)) out = 'NOUN';
      else if (ADJ_TAGS.has(tag)) out = 'ADJ';
      else if (ADV_TAGS.has(tag)) out = 'ADV';
    }

    parts.push(out);
    const outLen = out.length;
    pieces.push([streamPos, streamPos + outLen, tokenStart, tokenStart + value.length]);
    streamPos += outLen;
    rawPos = tokenStart + value.length;

    // Add space between tokens (except last)
    if (i < tagged.length - 1) {
      // Check if there's whitespace in original
      const nextToken = tagged[i + 1];
      const nextPos = text.indexOf(nextToken.value, rawPos);
      if (nextPos > rawPos) {
        const whitespace = text.substring(rawPos, nextPos);
        parts.push(whitespace);
        pieces.push([streamPos, streamPos + whitespace.length, rawPos, nextPos]);
        streamPos += whitespace.length;
        rawPos = nextPos;
      } else {
        // Add single space
        parts.push(' ');
        pieces.push([streamPos, streamPos + 1, rawPos, rawPos]);
        streamPos += 1;
      }
    }
  }

  return {
    stream: parts.join(''),
    pieces: pieces
  };
}
