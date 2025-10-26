#!/usr/bin/env node
// test-sentence-spanning.mjs - Test patterns with actual problematic text

import * as stage1 from './js/regexes-stage1.js';
import * as stage2 from './js/regexes-stage2.js';
import winkPOS from 'wink-pos-tagger';

const tagger = winkPOS();
const VERB_TAGS = new Set(['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']);
const NOUN_TAGS = new Set(['NN', 'NNS', 'NNP', 'NNPS']);

// Apply POS tagging like in pos-tagger.js
function tagWithVerb(text) {
  const tagged = tagger.tagSentence(text);
  const result = [];

  for (let i = 0; i < tagged.length; i++) {
    const token = tagged[i];
    let out = token.value;
    const posTag = token.pos;

    // Check if next token is a noun (for VBG/VBN filtering)
    const nextToken = i < tagged.length - 1 ? tagged[i + 1] : null;
    const nextIsNoun = nextToken && nextToken.pos && NOUN_TAGS.has(nextToken.pos);

    if (posTag && VERB_TAGS.has(posTag)) {
      // Skip VBG/VBN if followed by a noun (likely adjective use)
      if ((posTag === 'VBG' || posTag === 'VBN') && nextIsNoun) {
        out = token.value;
      } else {
        out = 'VERB';
      }
    }

    result.push(out);
  }

  return result.join(' ');
}

// Count sentences in text
function countSentences(text) {
  const sentences = text.match(/[^.!?]+[.!?]/g) || [];
  return sentences.length;
}

// Test cases with actual problematic patterns
const testCases = [
  {
    text: `"The silence doesn't just exist," Marcus said, his voice steady despite the growing unease. "It listens."`,
    description: "Quote with dialogue attribution - should not span across attribution",
    maxAllowedSentences: 2
  },
  {
    text: `The patterns weren't random artifacts of decay. They were intentional. Deliberate. A message written in the language of absence.`,
    description: "Multiple short sentences - should not match all 4",
    maxAllowedSentences: 2
  },
  {
    text: `She walked slowly to the door. He ran quickly down the hall. They drove carefully through town. We flew safely to Paris.`,
    description: "4 different verb sentences - should match at most 2",
    maxAllowedSentences: 2
  },
  {
    text: `The fish were dying in patterns. Schools of them, arranged in configurations that shouldn't be possible. Geometric shapes that spoke of intention. Design. Purpose.`,
    description: "Multiple sentence fragment - max 2 sentences per match",
    maxAllowedSentences: 2
  },
  {
    text: `It wasn't noise. It was signal. Communication. Language.`,
    description: "Short fragments with 'It was' - should match but not all 4 sentences",
    maxAllowedSentences: 2
  },
  {
    text: `"You're not just observing," she said quietly. "You're being tested."`,
    description: "Dialogue with attribution - should not include attribution in match",
    maxAllowedSentences: 2
  },
  {
    text: `The silence spoke in the spaces between heartbeats. It whispered in moments of stillness. It called from the depths. It waited.`,
    description: "4 sentences starting with 'It' + verb - should not match all 4",
    maxAllowedSentences: 2
  }
];

console.log('SENTENCE SPANNING TEST');
console.log('='.repeat(80));
console.log('Testing for matches that span >2 sentences\n');

let totalViolations = 0;
const violationsByPattern = new Map();

// Test Stage1 (surface patterns)
console.log('\n' + '='.repeat(80));
console.log('STAGE 1 - SURFACE PATTERNS');
console.log('='.repeat(80));

for (const [patternName, regex] of Object.entries(stage1)) {
  if (!patternName.startsWith('RE_')) continue;

  for (const testCase of testCases) {
    const matches = [...testCase.text.matchAll(regex)];

    for (const match of matches) {
      const matchText = match[0];
      const sentenceCount = countSentences(matchText);

      if (sentenceCount > testCase.maxAllowedSentences) {
        console.log(`\n❌ ${patternName}`);
        console.log(`   Test: ${testCase.description}`);
        console.log(`   Matched ${sentenceCount} sentences (max allowed: ${testCase.maxAllowedSentences})`);
        console.log(`   Text: "${testCase.text}"`);
        console.log(`   Match: "${matchText}"`);

        totalViolations++;
        violationsByPattern.set(patternName, (violationsByPattern.get(patternName) || 0) + 1);
      }
    }
  }
}

// Test Stage2 (POS patterns)
console.log('\n' + '='.repeat(80));
console.log('STAGE 2 - POS-TAGGED PATTERNS');
console.log('='.repeat(80));

for (const testCase of testCases) {
  const taggedText = tagWithVerb(testCase.text);

  for (const [patternName, regex] of Object.entries(stage2)) {
    if (!patternName.startsWith('RE_')) continue;

    const matches = [...taggedText.matchAll(regex)];

    for (const match of matches) {
      const matchText = match[0];
      const sentenceCount = countSentences(matchText);

      if (sentenceCount > testCase.maxAllowedSentences) {
        console.log(`\n❌ ${patternName}`);
        console.log(`   Test: ${testCase.description}`);
        console.log(`   Matched ${sentenceCount} sentences (max allowed: ${testCase.maxAllowedSentences})`);
        console.log(`   Original: "${testCase.text}"`);
        console.log(`   Tagged: "${taggedText}"`);
        console.log(`   Match: "${matchText}"`);

        totalViolations++;
        violationsByPattern.set(patternName, (violationsByPattern.get(patternName) || 0) + 1);
      }
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));

if (totalViolations === 0) {
  console.log('✓ No sentence-spanning violations detected!');
} else {
  console.log(`\n❌ Found ${totalViolations} violation(s) across ${violationsByPattern.size} pattern(s)`);
  console.log('\nViolations by pattern:');

  const sorted = [...violationsByPattern.entries()].sort((a, b) => b[1] - a[1]);
  for (const [pattern, count] of sorted) {
    console.log(`  ${pattern}: ${count} violation(s)`);
  }

  console.log('\nThese patterns need to be fixed to avoid matching across >2 sentences.');
}

console.log('\n' + '='.repeat(80));
console.log('NEXT STEPS');
console.log('='.repeat(80));
console.log('1. Identify the exact regex causing each violation');
console.log('2. Compare with Python implementation to find differences');
console.log('3. Add targeted fixes (e.g., sentence boundary constraints)');
console.log('4. Re-run tests to verify fixes');
