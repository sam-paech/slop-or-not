// contrast-detector.js - Detect "not X, but Y" contrast patterns

import { normalizeText, sentenceSpans } from './utils.js';
import { STAGE1_REGEXES } from './regexes-stage1.js';
import { STAGE2_REGEXES } from './regexes-stage2.js';
import { hasPosTagger, tagStreamWithOffsets } from './pos-tagger.js';

// Binary search helpers
function bisectRight(arr, val) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] <= val) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function bisectLeft(arr, val) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] < val) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function coveredSentenceRange(spans, start, end) {
  if (!spans.length || start >= end) return null;

  const starts = spans.map(s => s[0]);
  const ends = spans.map(s => s[1]);

  const lo = bisectRight(ends, start);
  const hi = bisectLeft(starts, end) - 1;

  if (lo >= spans.length || hi < 0 || lo > hi) {
    return null;
  }

  return [lo, hi];
}

function mergeIntervals(items) {
  if (!items.length) return [];

  const itemsSorted = items.slice().sort((a, b) => {
    if (a.lo !== b.lo) return a.lo - b.lo;
    if (a.hi !== b.hi) return a.hi - b.hi;
    return a.raw_start - b.raw_start;
  });

  const merged = [];
  let cur = { ...itemsSorted[0] };

  for (let i = 1; i < itemsSorted.length; i++) {
    const it = itemsSorted[i];
    if (it.lo <= cur.hi) {
      cur.hi = Math.max(cur.hi, it.hi);
      cur.raw_end = Math.max(cur.raw_end, it.raw_end);
    } else {
      merged.push(cur);
      cur = { ...it };
    }
  }
  merged.push(cur);

  return merged;
}

export function extractContrastMatches(text) {
  console.group('🔎 Contrast Pattern Detection');
  console.log('Input length:', text.length, 'chars');

  const tNorm = normalizeText(text);
  const spans = sentenceSpans(tNorm);
  const candidates = [];

  console.log('Normalized text:', tNorm.substring(0, 200) + (tNorm.length > 200 ? '...' : ''));
  console.log('Sentence spans:', spans.length);

  // Stage 1: Run surface regexes on raw text
  console.log('\n--- Stage 1: Surface Patterns ---');
  let stage1MatchCount = 0;

  for (const [pname, pregex] of Object.entries(STAGE1_REGEXES)) {
    // Use matchAll if regex has 'g' flag, otherwise use single match
    const matches = pregex.global ? Array.from(tNorm.matchAll(pregex)) : (() => {
      const m = tNorm.match(pregex);
      return m ? [m] : [];
    })();

    if (matches.length > 0) {
      console.log(`  ✓ Pattern ${pname} matched ${matches.length} time(s)`);
      stage1MatchCount += matches.length;
    }

    for (const match of matches) {
      const rs = match.index;
      const re = match.index + match[0].length;
      const rng = coveredSentenceRange(spans, rs, re);

      if (rng) {
        const [lo, hi] = rng;
        candidates.push({
          lo,
          hi,
          raw_start: rs,
          raw_end: re,
          pattern_name: `S1_${pname}`,
          match_text: match[0].trim(),
        });
        console.log(`    Match: "${match[0].substring(0, 60).trim()}..."`);
      }
    }
  }

  console.log(`\n📊 Stage1 total matches: ${stage1MatchCount}`);

  // Stage 2: Run POS-based regexes on tagged stream
  if (hasPosTagger() && Object.keys(STAGE2_REGEXES).length > 0) {
    const { stream, pieces } = tagStreamWithOffsets(tNorm, 'verb');

    // DEBUG: Log tagged stream
    console.group('🔍 Stage2 POS Tagging Debug');
    console.log('Original text:', tNorm.substring(0, 200) + (tNorm.length > 200 ? '...' : ''));
    console.log('Tagged stream:', stream.substring(0, 2000) + (stream.length > 200 ? '...' : ''));
    console.log('Number of pieces:', pieces.length);
    console.log('First 10 pieces:', pieces.slice(0, 10));
    console.groupEnd();

    const streamStarts = pieces.map(p => p[0]);
    const streamEnds = pieces.map(p => p[1]);

    function streamToRaw(ss, se) {
      const i = bisectRight(streamEnds, ss);
      const j = bisectLeft(streamStarts, se) - 1;

      if (i >= pieces.length || j < i) {
        return null;
      }

      const rawS = Math.min(...pieces.slice(i, j + 1).map(p => p[2]));
      const rawE = Math.max(...pieces.slice(i, j + 1).map(p => p[3]));
      return [rawS, rawE];
    }

    let stage2MatchCount = 0;
    for (const [pname, pregex] of Object.entries(STAGE2_REGEXES)) {
      // Use matchAll if regex has 'g' flag, otherwise use single match
      const matches = pregex.global ? Array.from(stream.matchAll(pregex)) : (() => {
        const m = stream.match(pregex);
        return m ? [m] : [];
      })();

      if (matches.length > 0) {
        console.log(`  ✓ Pattern ${pname} matched ${matches.length} time(s)`);
        stage2MatchCount += matches.length;
      }

      for (const match of matches) {
        const mapRes = streamToRaw(match.index, match.index + match[0].length);

        if (mapRes) {
          const [rs, re] = mapRes;
          const rng = coveredSentenceRange(spans, rs, re);

          if (rng) {
            const [lo, hi] = rng;
            candidates.push({
              lo,
              hi,
              raw_start: rs,
              raw_end: re,
              pattern_name: `S2_${pname}`,
              match_text: tNorm.substring(rs, re).trim(),
            });
            console.log(`    Match: "${match[0].substring(0, 60)}..."`);
          }
        }
      }
    }
    console.log(`\n📊 Stage2 total matches: ${stage2MatchCount}`);
  }

  // Merge overlapping intervals
  console.log('\n--- Merging & Building Results ---');
  console.log('Candidates before merging:', candidates.length);

  const merged = mergeIntervals(candidates);
  console.log('Candidates after merging:', merged.length);

  // Build results with full sentence spans
  const results = [];
  for (const it of merged) {
    const sLo = it.lo;
    const sHi = it.hi;
    const blockStart = spans[sLo][0];
    const blockEnd = spans[sHi][1];

    const result = {
      sentence: tNorm.substring(blockStart, blockEnd).trim(),
      pattern_name: it.pattern_name,
      match_text: it.match_text,
    };
    results.push(result);

    console.log(`  Result ${results.length}: ${it.pattern_name}`);
    console.log(`    Sentence: "${result.sentence.substring(0, 80)}..."`);
  }

  console.log('\n✅ Final Results:', results.length, 'contrast patterns found');
  console.groupEnd();

  return results;
}

export function scoreText(text) {
  const hits = extractContrastMatches(text);
  const chars = text.length;
  const rate = chars > 0 ? (hits.length * 1000.0 / chars) : 0.0;

  return {
    hits: hits.length,
    chars,
    rate_per_1k: rate,
    matches: hits
  };
}
