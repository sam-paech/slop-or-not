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
      if (!winkPOS) {
        throw new Error('winkPOS is null after loading');
      }

      // Debug: Log the actual API
      console.log('winkPOS object:', winkPOS);
      console.log('winkPOS methods:', Object.keys(winkPOS));

      if (typeof winkPOS.tagSentence !== 'function') {
        console.error('Available methods:', Object.getOwnPropertyNames(winkPOS));
        console.error('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(winkPOS)));
        throw new Error('winkPOS loaded but tagSentence method not found');
      }

      console.log('✓ wink-pos-tagger loaded successfully from:', url);

      // Test it works
      const testResult = winkPOS.tagSentence("The cat sat.");
      console.log('✓ Test tagging result:', testResult);

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

  for (let i = 0; i < tagged.length; i++) {
    const token = tagged[i];
    let out = token.value;
    const posTag = token.pos;  // Use 'pos' field, not 'tag'

    // Check if next token is a noun (for VBG/VBN filtering)
    const nextToken = i < tagged.length - 1 ? tagged[i + 1] : null;
    const nextIsNoun = nextToken && nextToken.pos && NOUN_TAGS.has(nextToken.pos);

    if (posTag) {
      if (posType === 'verb' && VERB_TAGS.has(posTag)) {
        // Skip VBG/VBN if followed by a noun (likely adjective use)
        if ((posTag === 'VBG' || posTag === 'VBN') && nextIsNoun) {
          out = token.value;
        } else {
          out = 'VERB';
        }
      } else if (posType === 'noun' && NOUN_TAGS.has(posTag)) {
        out = 'NOUN';
      } else if (posType === 'adj' && ADJ_TAGS.has(posTag)) {
        out = 'ADJ';
      } else if (posType === 'adv' && ADV_TAGS.has(posTag)) {
        out = 'ADV';
      } else if (posType === 'all') {
        if (VERB_TAGS.has(posTag)) {
          // Apply same VBG/VBN filter for 'all' mode
          if ((posTag === 'VBG' || posTag === 'VBN') && nextIsNoun) {
            out = token.value;
          } else {
            out = 'VERB';
          }
        } else if (NOUN_TAGS.has(posTag)) out = 'NOUN';
        else if (ADJ_TAGS.has(posTag)) out = 'ADJ';
        else if (ADV_TAGS.has(posTag)) out = 'ADV';
      }
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

  // Debug: Check if we're finding any verbs using the 'pos' field
  const verbTokens = tagged.filter(t => t.pos && VERB_TAGS.has(t.pos));
  const totalWords = tagged.filter(t => t.tag === 'word').length;
  const verbPercentage = totalWords > 0 ? ((verbTokens.length / totalWords) * 100).toFixed(1) : 0;

  console.log(`Verb tokens found: ${verbTokens.length} out of ${totalWords} words (${verbPercentage}%)`);
  if (verbTokens.length > 0) {
    console.log('Sample verbs:', verbTokens.slice(0, 10).map(t => `${t.value}/${t.pos}`).join(', '));

    // Show POS tag distribution
    const posDistribution = {};
    verbTokens.forEach(t => {
      posDistribution[t.pos] = (posDistribution[t.pos] || 0) + 1;
    });
    console.log('Verb tag distribution:', posDistribution);

    if (verbPercentage > 25) {
      console.warn(`⚠ Suspiciously high verb percentage (${verbPercentage}%)! Check VERB_TAGS.`);
    }
  } else {
    console.warn('⚠ No verb tokens found!');
    console.log('Tag field values:', Array.from(new Set(tagged.map(t => t.tag))).join(', '));
    console.log('POS field values (first 20):', Array.from(new Set(tagged.slice(0, 20).map(t => t.pos).filter(Boolean))).join(', '));
  }

  const parts = [];
  const pieces = [];
  let streamPos = 0;
  let rawPos = 0;

  for (let i = 0; i < tagged.length; i++) {
    const token = tagged[i];
    const posTag = token.pos;  // Use 'pos' field, not 'tag'
    const value = token.value;

    // Find token in original text
    const tokenStart = text.indexOf(value, rawPos);
    if (tokenStart === -1) {
      // Fallback if we can't find it
      rawPos += value.length;
      continue;
    }

    // Check if next token is a noun (for VBG/VBN filtering)
    const nextToken = i < tagged.length - 1 ? tagged[i + 1] : null;
    const nextIsNoun = nextToken && nextToken.pos && NOUN_TAGS.has(nextToken.pos);

    // Map token to POS tag if applicable
    let out = value;
    if (posTag) {
      if (posType === 'verb' && VERB_TAGS.has(posTag)) {
        // Skip VBG/VBN if followed by a noun (likely adjective use)
        if ((posTag === 'VBG' || posTag === 'VBN') && nextIsNoun) {
          // Don't tag as VERB - keep original value
          out = value;
        } else {
          out = 'VERB';
        }
      } else if (posType === 'noun' && NOUN_TAGS.has(posTag)) {
        out = 'NOUN';
      } else if (posType === 'adj' && ADJ_TAGS.has(posTag)) {
        out = 'ADJ';
      } else if (posType === 'adv' && ADV_TAGS.has(posTag)) {
        out = 'ADV';
      } else if (posType === 'all') {
        if (VERB_TAGS.has(posTag)) {
          // Apply same VBG/VBN filter for 'all' mode
          if ((posTag === 'VBG' || posTag === 'VBN') && nextIsNoun) {
            out = value;
          } else {
            out = 'VERB';
          }
        } else if (NOUN_TAGS.has(posTag)) out = 'NOUN';
        else if (ADJ_TAGS.has(posTag)) out = 'ADJ';
        else if (ADV_TAGS.has(posTag)) out = 'ADV';
      }
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
