#!/usr/bin/env node
// test-verb-filtering.mjs - Test strategies to filter false positive verbs

import winkPOS from 'wink-pos-tagger';

const tagger = winkPOS();

const VERB_TAGS = new Set(['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']);

function testFilteringStrategy(text, label) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(label);
  console.log(`${'='.repeat(80)}`);
  console.log(`Text: "${text}"\n`);

  const tagged = tagger.tagSentence(text);

  // Strategy 1: Only tag VBG/VBN as VERB if preceded by auxiliary
  console.log('Strategy 1: VBG/VBN only after auxiliaries (was, were, is, are, has, have, had)');
  const auxiliaries = new Set(['was', 'were', 'is', 'are', 'am', 'has', 'have', 'had', 'been', 'being']);

  tagged.forEach((t, i) => {
    const prevToken = i > 0 ? tagged[i - 1] : null;
    const isAuxPreceded = prevToken && auxiliaries.has(prevToken.value.toLowerCase());

    let shouldTag = false;
    if (t.pos && VERB_TAGS.has(t.pos)) {
      if (t.pos === 'VBG' || t.pos === 'VBN') {
        shouldTag = isAuxPreceded;
      } else {
        shouldTag = true;  // VB, VBD, VBP, VBZ are always verbs
      }
    }

    if (shouldTag) {
      console.log(`  ✓ ${t.value}/${t.pos} → VERB` + (isAuxPreceded ? ' (after auxiliary)' : ''));
    } else if (t.pos && VERB_TAGS.has(t.pos)) {
      console.log(`  ✗ ${t.value}/${t.pos} → SKIP (no auxiliary before it)`);
    }
  });

  // Strategy 2: Only core verb forms (exclude VBG/VBN entirely)
  console.log('\nStrategy 2: Exclude VBG/VBN entirely (only VB, VBD, VBP, VBZ)');
  const coreVerbTags = new Set(['VB', 'VBD', 'VBP', 'VBZ']);

  tagged.forEach(t => {
    if (t.pos && coreVerbTags.has(t.pos)) {
      console.log(`  ✓ ${t.value}/${t.pos} → VERB`);
    } else if (t.pos && VERB_TAGS.has(t.pos)) {
      console.log(`  ✗ ${t.value}/${t.pos} → SKIP (participle/gerund)`);
    }
  });

  // Strategy 3: Check if followed by a noun (likely adjective use)
  console.log('\nStrategy 3: VBG/VBN + lookahead for noun (if followed by noun, skip)');
  const nounTags = new Set(['NN', 'NNS', 'NNP', 'NNPS']);

  tagged.forEach((t, i) => {
    const nextToken = i < tagged.length - 1 ? tagged[i + 1] : null;
    const followedByNoun = nextToken && nounTags.has(nextToken.pos);

    let shouldTag = false;
    if (t.pos && VERB_TAGS.has(t.pos)) {
      if (t.pos === 'VBG' || t.pos === 'VBN') {
        shouldTag = !followedByNoun;  // Skip if followed by noun
      } else {
        shouldTag = true;
      }
    }

    if (shouldTag) {
      console.log(`  ✓ ${t.value}/${t.pos} → VERB`);
    } else if (t.pos && VERB_TAGS.has(t.pos)) {
      console.log(`  ✗ ${t.value}/${t.pos} → SKIP (followed by noun: ${nextToken?.value})`);
    }
  });
}

// Test cases
testFilteringStrategy(
  'The building was interesting.',
  'TEST 1: Gerund as noun (building)'
);

testFilteringStrategy(
  'She was building a house.',
  'TEST 2: Gerund as verb (was building)'
);

testFilteringStrategy(
  'The living room has a running tap.',
  'TEST 3: Gerunds as adjectives (living room, running tap)'
);

testFilteringStrategy(
  'They were running and swimming.',
  'TEST 4: Gerunds as verbs (were running, swimming)'
);

testFilteringStrategy(
  'The rusted swing sets creaked.',
  'TEST 5: Past participle as adjective (rusted)'
);

console.log(`\n${'='.repeat(80)}`);
console.log('RECOMMENDATION');
console.log(`${'='.repeat(80)}`);
console.log(`\nBest strategy: Combination of #1 and #3`);
console.log(`  - VBG/VBN only if preceded by auxiliary (was/were/is/are/has/have/had)`);
console.log(`  - OR if VBG/VBN is NOT followed by a noun`);
console.log(`  - Always include VB, VBD, VBP, VBZ (core verb forms)`);
