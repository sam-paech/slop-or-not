#!/usr/bin/env node
// test-not-but-bug.mjs - Test the RE_NOT_BUT pattern specifically

import { RE_NOT_BUT } from './js/regexes-stage1.js';

// Test cases from the actual errors
const testCases = [
  {
    text: `Not just warm, but *alive*-a strange, pulsing heat that made her skin tingle. She glanced at the bench, its surface still damp from the rain, and wondered if the sneakers had been left there by a god who'd forgotten to clean them.`,
    description: "Should match 'Not just warm, but *alive*' (1 sentence max)",
    expectedSentences: 1
  },
  {
    text: `The sneakers had a strange way of making her feel *connected*-not to the gods, but to something else. She remembered the way her grandfather used to talk about the gods, his voice cracking with age and a kind of quiet reverence. "They're not so different from us," he'd say, "just older, more powerful, and less patient." Aria didn't know if that was a joke or a truth, but the sneakers made her feel like she was on the edge of something.`,
    description: "Should match 'not to the gods, but to something else' (1 sentence)",
    expectedSentences: 1
  },
  {
    text: `It was not cold, but warm. The sun shone.`,
    description: "Simple case - should match only first sentence",
    expectedSentences: 1
  },
  {
    text: `She was not happy, but sad. Then she left. Later she returned. Finally she smiled.`,
    description: "Should match only first sentence, not span 4 sentences",
    expectedSentences: 1
  }
];

function countSentences(text) {
  const sentences = text.match(/[^.!?]+[.!?]/g) || [];
  return sentences.length;
}

console.log('RE_NOT_BUT PATTERN TEST');
console.log('='.repeat(80));
console.log('\nCurrent regex pattern:');
console.log(RE_NOT_BUT.source);
console.log('\n' + '='.repeat(80));

let totalErrors = 0;

for (const testCase of testCases) {
  console.log(`\nTest: ${testCase.description}`);
  console.log(`Text: "${testCase.text.substring(0, 100)}${testCase.text.length > 100 ? '...' : ''}"`);

  const matches = [...testCase.text.matchAll(RE_NOT_BUT)];

  if (matches.length === 0) {
    console.log('  ❌ NO MATCH (expected to match!)');
    totalErrors++;
  } else {
    for (const match of matches) {
      const matchText = match[0];
      const sentenceCount = countSentences(matchText);

      console.log(`  Match: "${matchText}"`);
      console.log(`  Sentences in match: ${sentenceCount}`);

      if (sentenceCount > testCase.expectedSentences) {
        console.log(`  ❌ ERROR: Matched ${sentenceCount} sentences (expected max ${testCase.expectedSentences})`);
        totalErrors++;
      } else {
        console.log(`  ✓ OK: Within ${testCase.expectedSentences} sentence(s)`);
      }
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('DIAGNOSIS');
console.log('='.repeat(80));

console.log('\nThe bug is in this part of the regex:');
console.log('  `(?:(?!\\\\bbut\\\\b|[.?!]).)` + `{1,100}?` +');
console.log('\nProblem: The quantifier {1,100}? is OUTSIDE the group!');
console.log('This means it only applies to the last `.` character, not the whole pattern.');
console.log('\nThe pattern should be:');
console.log('  `(?:(?!\\\\bbut\\\\b|[.?!]).){1,100}?` +');
console.log('         ^-- quantifier inside the group --^');
console.log('\nWithout this fix, the pattern can match across many sentences because');
console.log('the negative lookahead only applies to a single character, not the whole span.');

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total errors: ${totalErrors}`);
