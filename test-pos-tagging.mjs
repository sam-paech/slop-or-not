#!/usr/bin/env node
// test-pos-tagging.mjs - Test POS tagging to find false positives

import winkPOS from 'wink-pos-tagger';

const tagger = winkPOS();

// Penn Treebank verb tags
const VERB_TAGS = new Set(['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']);

function analyzeText(text, label) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${label}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Text: "${text}"\n`);

  const tagged = tagger.tagSentence(text);

  // Count words and verbs
  const words = tagged.filter(t => t.tag === 'word');
  const verbs = tagged.filter(t => t.pos && VERB_TAGS.has(t.pos));
  const verbPercentage = words.length > 0 ? ((verbs.length / words.length) * 100).toFixed(1) : 0;

  console.log(`Total words: ${words.length}`);
  console.log(`Verb tokens: ${verbs.length} (${verbPercentage}%)`);

  // Show all tagged tokens
  console.log(`\nAll tokens:`);
  tagged.forEach((t, i) => {
    const display = t.pos ? `${t.value}/${t.pos}` : `${t.value}/${t.tag}`;
    if (t.pos && VERB_TAGS.has(t.pos)) {
      console.log(`  [${i}] ${display} ← VERB`);
    } else {
      console.log(`  [${i}] ${display}`);
    }
  });

  // Verb distribution
  if (verbs.length > 0) {
    const distribution = {};
    verbs.forEach(v => {
      distribution[v.pos] = (distribution[v.pos] || 0) + 1;
    });
    console.log(`\nVerb POS distribution:`, distribution);
  }

  // Flag suspicious cases
  const issues = [];

  if (verbPercentage > 30) {
    issues.push(`⚠️  Very high verb percentage (${verbPercentage}%)`);
  }

  // Check for common false positives
  const gerunds = verbs.filter(v => v.pos === 'VBG' && v.value.endsWith('ing'));
  if (gerunds.length > verbs.length * 0.5) {
    issues.push(`⚠️  High number of gerunds (${gerunds.length}/${verbs.length}) - may be nouns/adjectives`);
  }

  if (issues.length > 0) {
    console.log(`\n⚠️  ISSUES DETECTED:`);
    issues.forEach(issue => console.log(`  ${issue}`));
  }

  return { words: words.length, verbs: verbs.length, percentage: verbPercentage, tagged };
}

// Test cases
console.log('POS TAGGING ANALYSIS');
console.log('Looking for false positives in verb detection\n');

// Test 1: Simple sentence
analyzeText(
  'The cat sat on the mat.',
  'Simple sentence (baseline)'
);

// Test 2: From your problematic output
analyzeText(
  'whispering to the rusted swing sets, and imagining the gods hiding in the shadows of the trees.',
  'Fragment with multiple -ing words'
);

// Test 3: Another from your output
analyzeText(
  'She had always found the park a strange place.',
  'Past tense verbs'
);

// Test 4: The problematic match
analyzeText(
  'picked them up, her fingers brushing against the worn sole.',
  'Mix of verbs and gerunds'
);

// Test 5: Expected false positives - gerunds as nouns/adjectives
analyzeText(
  'The building was interesting. Swimming is fun. The living room has a running tap.',
  'Gerunds as nouns/adjectives (should NOT be tagged as verbs)'
);

// Test 6: Progressive tenses (should be verbs)
analyzeText(
  'She was whispering. They were imagining. He is building.',
  'Progressive tenses (SHOULD be verbs)'
);

// Summary and recommendations
console.log(`\n${'='.repeat(80)}`);
console.log('SUMMARY');
console.log(`${'='.repeat(80)}`);
console.log(`\nExpected verb percentage in normal prose: 15-25%`);
console.log(`If consistently seeing >30%, likely false positives`);
console.log(`\nCommon false positives:`);
console.log(`  - Gerunds used as nouns (VBG): "swimming", "building", "living"`);
console.log(`  - Gerunds used as adjectives (VBG): "running water", "living room"`);
console.log(`  - Past participles as adjectives (VBN): "rusted", "worn", "broken"`);
console.log(`\nWink-pos-tagger may over-tag gerunds and participles as verbs.`);
