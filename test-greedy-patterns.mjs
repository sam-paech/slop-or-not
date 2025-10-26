#!/usr/bin/env node
// test-greedy-patterns.mjs - Test for patterns matching >2 sentences

import * as stage2 from './js/regexes-stage2.js';

// Test cases that should NOT match (or should only match within 1-2 sentences)
const testCases = [
  {
    text: `The sea doesn't react. It whispers. The wind blows. Birds fly. Trees sway.`,
    description: "5 sentences - should only match first 2",
    expectedMaxSentences: 2
  },
  {
    text: `They were not just dying. They were speaking. The moon rose. Stars appeared. Night fell. Dawn came.`,
    description: "6 sentences - should only match first 2",
    expectedMaxSentences: 2
  },
  {
    text: `The fish VERB slowly. VERB carefully. VERB quietly. VERB loudly.`,
    description: "4 VERB sentences - LEMMA_SAME_VERB should not match different verbs",
    expectedMaxSentences: 2
  },
  {
    text: `He walked to the store. She ran to school. They drove home. We flew away.`,
    description: "4 different verb sentences - should not match at all",
    expectedMaxSentences: 0
  },
  {
    text: `The pattern VERB in the first sentence. Then VERB in the second. Then VERB in the third. Then VERB in the fourth.`,
    description: "4 VERB sentences - should not span all 4",
    expectedMaxSentences: 2
  },
];

// Helper to count sentences in a match
function countSentences(text) {
  const sentences = text.match(/[^.!?]+[.!?]/g) || [];
  return sentences.length;
}

console.log('GREEDY PATTERN TEST');
console.log('='.repeat(80));
console.log('Testing Stage2 regexes for patterns matching >2 sentences\n');

let totalIssues = 0;

// Test each regex pattern
for (const [patternName, regex] of Object.entries(stage2)) {
  if (!patternName.startsWith('RE_')) continue;

  console.log(`\nTesting ${patternName}:`);
  console.log('-'.repeat(80));

  let patternHasIssues = false;

  for (const testCase of testCases) {
    const matches = [...testCase.text.matchAll(regex)];

    if (matches.length > 0) {
      for (const match of matches) {
        const matchText = match[0];
        const sentenceCount = countSentences(matchText);

        if (sentenceCount > testCase.expectedMaxSentences) {
          console.log(`  ❌ GREEDY MATCH in: "${testCase.description}"`);
          console.log(`     Matched ${sentenceCount} sentences (expected max ${testCase.expectedMaxSentences})`);
          console.log(`     Match: "${matchText.substring(0, 100)}${matchText.length > 100 ? '...' : ''}"`);
          patternHasIssues = true;
          totalIssues++;
        }
      }
    }
  }

  if (!patternHasIssues) {
    console.log(`  ✓ No greedy matches detected`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));

if (totalIssues === 0) {
  console.log('✓ No greedy patterns detected!');
} else {
  console.log(`❌ Found ${totalIssues} greedy pattern issue(s)`);
  console.log('\nThese patterns need to be fixed to avoid matching across >2 sentences.');
}

console.log('\n' + '='.repeat(80));
console.log('KNOWN BUGS TO INVESTIGATE');
console.log('='.repeat(80));
console.log('\n1. RE_LEMMA_SAME_VERB bug:');
console.log('   Python: Uses capture group \\1 to match SAME lemma appearing twice');
console.log('   JavaScript: Matches ANY two VERBs (different bug!)');
console.log('   Fix: Need to implement lemma tracking or use specific verb list');
console.log('\n   Example issue:');
console.log('   Text: "He SPEAK softly. She LISTEN carefully."');
console.log('   Python: No match (different verbs)');
console.log('   JavaScript: MATCHES (any VERB + any VERB) ❌');

// Test the specific LEMMA_SAME_VERB bug
console.log('\n2. Testing RE_LEMMA_SAME_VERB specifically:');
const lemmaTests = [
  {
    text: "He SPEAK softly. She LISTEN carefully.",
    shouldMatch: false,
    reason: "Different verbs - should not match"
  },
  {
    text: "He SPEAK softly. She SPEAK loudly.",
    shouldMatch: true,
    reason: "Same verb SPEAK - should match"
  },
  {
    text: "They VERB quickly. Birds VERB slowly. Fish VERB fast. Trees VERB.",
    shouldMatch: false,
    reason: "Should not match across 4 sentences"
  }
];

for (const test of lemmaTests) {
  const matches = [...test.text.matchAll(stage2.RE_LEMMA_SAME_VERB)];
  const didMatch = matches.length > 0;
  const status = didMatch === test.shouldMatch ? '✓' : '❌';

  console.log(`\n   ${status} "${test.text}"`);
  console.log(`      Expected: ${test.shouldMatch ? 'MATCH' : 'NO MATCH'} - ${test.reason}`);
  console.log(`      Got: ${didMatch ? 'MATCH' : 'NO MATCH'}`);

  if (matches.length > 0) {
    matches.forEach(m => {
      const sentCount = countSentences(m[0]);
      console.log(`      Matched: "${m[0]}" (${sentCount} sentence${sentCount > 1 ? 's' : ''})`);
    });
  }
}
