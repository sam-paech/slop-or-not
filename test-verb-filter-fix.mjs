#!/usr/bin/env node
// test-verb-filter-fix.mjs - Test the VBG/VBN-before-noun filter

import winkPOS from 'wink-pos-tagger';

const tagger = winkPOS();
const VERB_TAGS = new Set(['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']);
const NOUN_TAGS = new Set(['NN', 'NNS', 'NNP', 'NNPS']);

// Apply the same filter as in pos-tagger.js
function tagWithFilter(text) {
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
        out = token.value;  // Keep original, don't tag as VERB
      } else {
        out = 'VERB';
      }
    }

    result.push(out);
  }

  return { stream: result.join(' '), tagged };
}

// Test cases with ground truth
const testCases = [
  {
    text: "The cat sat on the mat.",
    expectedVerbs: ["sat"],
    description: "Simple past tense"
  },
  {
    text: "She was building a house.",
    expectedVerbs: ["was", "building"],
    description: "Progressive tense (aux + gerund)"
  },
  {
    text: "The building was tall.",
    expectedVerbs: ["was"],
    description: "Gerund as noun"
  },
  {
    text: "The living room has furniture.",
    expectedVerbs: ["has"],
    description: "Gerund as adjective"
  },
  {
    text: "I saw a running tap.",
    expectedVerbs: ["saw"],
    description: "Gerund as adjective (participle)"
  },
  {
    text: "The rusted swing creaked.",
    expectedVerbs: ["creaked"],
    description: "Past participle as adjective"
  },
  {
    text: "They were running and swimming.",
    expectedVerbs: ["were", "running", "swimming"],
    description: "Coordinated gerunds (both are verbs)"
  },
  {
    text: "Swimming is fun.",
    expectedVerbs: ["is"],
    description: "Gerund as subject noun"
  },
  {
    text: "She enjoys swimming.",
    expectedVerbs: ["enjoys", "swimming"],
    description: "Gerund as object (still verbal)"
  },
  {
    text: "The broken window needs fixing.",
    expectedVerbs: ["needs", "fixing"],
    description: "Past participle vs gerund object"
  },
  {
    text: "whispering to the rusted swing sets",
    expectedVerbs: ["whispering"],
    description: "Fragment from your example"
  },
  {
    text: "imagining the gods hiding in shadows",
    expectedVerbs: ["imagining", "hiding"],
    description: "Multiple gerunds (both verbal)"
  },
  // EDGE CASES: Potential false negatives with skip-VBG/VBN-before-noun fix
  {
    text: "I consider running marathons challenging.",
    expectedVerbs: ["consider", "running"],
    description: "EDGE: Gerund object followed by noun (running marathons)"
  },
  {
    text: "She started painting landscapes yesterday.",
    expectedVerbs: ["started", "painting"],
    description: "EDGE: Gerund with object noun (painting landscapes)"
  },
  {
    text: "They keep building houses.",
    expectedVerbs: ["keep", "building"],
    description: "EDGE: Gerund with plural noun object (building houses)"
  },
  {
    text: "He finished writing letters.",
    expectedVerbs: ["finished", "writing"],
    description: "EDGE: Gerund with noun object (writing letters)"
  },
  {
    text: "She imagined visiting Paris.",
    expectedVerbs: ["imagined", "visiting"],
    description: "EDGE: Gerund with proper noun object (visiting Paris)"
  }
];

let totalWords = 0;
let truePositives = 0;
let falsePositives = 0;
let falseNegatives = 0;
let trueNegatives = 0;

console.log('POS TAGGER ACCURACY TEST WITH VBG/VBN FILTER');
console.log('='.repeat(80));

testCases.forEach((testCase, idx) => {
  console.log(`\nTest ${idx + 1}: ${testCase.description}`);
  console.log(`Text: "${testCase.text}"`);
  console.log(`Expected verbs: ${testCase.expectedVerbs.join(', ')}`);

  const { stream, tagged } = tagWithFilter(testCase.text);
  const expectedSet = new Set(testCase.expectedVerbs.map(v => v.toLowerCase()));

  console.log('\nTagging results:');
  const taggedVerbs = [];
  const words = tagged.filter(t => t.tag === 'word');

  words.forEach((token, i) => {
    const word = token.value.toLowerCase();

    // Check if we tagged it as VERB in the stream
    const streamWords = stream.split(/\s+/);
    const streamWord = streamWords[words.slice(0, i).length + tagged.slice(0, tagged.indexOf(token)).filter(t => t.tag !== 'word').length];
    const isTaggedAsVerb = streamWord === 'VERB';

    const shouldBeVerb = expectedSet.has(word);

    totalWords++;

    let status = '';
    if (isTaggedAsVerb && shouldBeVerb) {
      status = '✓ TRUE POSITIVE';
      truePositives++;
      taggedVerbs.push(word);
    } else if (isTaggedAsVerb && !shouldBeVerb) {
      status = '✗ FALSE POSITIVE (tagged as verb but should not be)';
      falsePositives++;
      taggedVerbs.push(word);
    } else if (!isTaggedAsVerb && shouldBeVerb) {
      status = '✗ FALSE NEGATIVE (missed verb)';
      falseNegatives++;
    } else {
      status = '✓ TRUE NEGATIVE';
      trueNegatives++;
    }

    // Show if filter was applied
    const filterApplied = token.pos && (token.pos === 'VBG' || token.pos === 'VBN') && !isTaggedAsVerb;
    const filterNote = filterApplied ? ' [FILTERED]' : '';

    console.log(`  ${token.value}/${token.pos || token.tag} - ${status}${filterNote}`);
  });

  console.log(`Tagged verbs: ${taggedVerbs.join(', ') || 'none'}`);
});

// Calculate metrics
console.log('\n' + '='.repeat(80));
console.log('OVERALL RESULTS');
console.log('='.repeat(80));

const precision = truePositives / (truePositives + falsePositives) || 0;
const recall = truePositives / (truePositives + falseNegatives) || 0;
const f1 = 2 * (precision * recall) / (precision + recall) || 0;
const accuracy = (truePositives + trueNegatives) / totalWords || 0;

console.log(`\nTotal words analyzed: ${totalWords}`);
console.log(`\nConfusion Matrix:`);
console.log(`  True Positives:  ${truePositives} (correctly identified verbs)`);
console.log(`  False Positives: ${falsePositives} (incorrectly tagged as verbs)`);
console.log(`  False Negatives: ${falseNegatives} (missed verbs)`);
console.log(`  True Negatives:  ${trueNegatives} (correctly identified non-verbs)`);

console.log(`\nMetrics:`);
console.log(`  Accuracy:  ${(accuracy * 100).toFixed(1)}%`);
console.log(`  Precision: ${(precision * 100).toFixed(1)}% (of tagged verbs, how many are correct)`);
console.log(`  Recall:    ${(recall * 100).toFixed(1)}% (of actual verbs, how many we found)`);
console.log(`  F1 Score:  ${(f1 * 100).toFixed(1)}%`);

console.log(`\n${'='.repeat(80)}`);
console.log('COMPARISON TO BASELINE');
console.log('='.repeat(80));
console.log('Baseline (before fix):');
console.log('  Precision: 78.8%');
console.log('  Recall:    92.9%');
console.log('  F1 Score:  85.2%');
console.log('  False Positives: 7');
console.log('  False Negatives: 2');
console.log('');
console.log('After fix:');
console.log(`  Precision: ${(precision * 100).toFixed(1)}%`);
console.log(`  Recall:    ${(recall * 100).toFixed(1)}%`);
console.log(`  F1 Score:  ${(f1 * 100).toFixed(1)}%`);
console.log(`  False Positives: ${falsePositives}`);
console.log(`  False Negatives: ${falseNegatives}`);

if (precision > 0.788) {
  console.log('\n✓ Precision improved!');
}
if (recall >= 0.92) {
  console.log('✓ Recall maintained!');
} else if (recall < 0.92) {
  console.log(`⚠️  Recall decreased by ${((0.929 - recall) * 100).toFixed(1)}%`);
}
if (falsePositives < 7) {
  console.log(`✓ False positives reduced by ${7 - falsePositives}`);
}
