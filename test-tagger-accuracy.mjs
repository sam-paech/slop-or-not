#!/usr/bin/env node
// test-tagger-accuracy.mjs - Measure POS tagger accuracy against ground truth

import winkPOS from 'wink-pos-tagger';

const tagger = winkPOS();
const VERB_TAGS = new Set(['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']);

// Test cases with ground truth: which words SHOULD be tagged as verbs
const testCases = [
  {
    text: "The cat sat on the mat.",
    expectedVerbs: ["sat"],  // Only this is a verb
    description: "Simple past tense"
  },
  {
    text: "She was building a house.",
    expectedVerbs: ["was", "building"],  // Progressive: was + gerund
    description: "Progressive tense (aux + gerund)"
  },
  {
    text: "The building was tall.",
    expectedVerbs: ["was"],  // "building" is a NOUN here
    description: "Gerund as noun"
  },
  {
    text: "The living room has furniture.",
    expectedVerbs: ["has"],  // "living" is ADJECTIVE
    description: "Gerund as adjective"
  },
  {
    text: "I saw a running tap.",
    expectedVerbs: ["saw"],  // "running" is ADJECTIVE
    description: "Gerund as adjective (participle)"
  },
  {
    text: "The rusted swing creaked.",
    expectedVerbs: ["creaked"],  // "rusted" is ADJECTIVE
    description: "Past participle as adjective"
  },
  {
    text: "They were running and swimming.",
    expectedVerbs: ["were", "running", "swimming"],  // Coordinated gerunds after aux
    description: "Coordinated gerunds (both are verbs)"
  },
  {
    text: "Swimming is fun.",
    expectedVerbs: ["is"],  // "Swimming" is NOUN (subject)
    description: "Gerund as subject noun"
  },
  {
    text: "She enjoys swimming.",
    expectedVerbs: ["enjoys", "swimming"],  // "enjoys" verb, "swimming" is its object (gerund as verb form)
    description: "Gerund as object (still verbal)"
  },
  {
    text: "The broken window needs fixing.",
    expectedVerbs: ["needs", "fixing"],  // "broken" is ADJ, "fixing" is gerund object
    description: "Past participle vs gerund object"
  },
  {
    text: "whispering to the rusted swing sets",
    expectedVerbs: ["whispering"],  // Fragment: "whispering" is verb, "rusted" is adj
    description: "Fragment from your example"
  },
  {
    text: "imagining the gods hiding in shadows",
    expectedVerbs: ["imagining", "hiding"],  // Both gerunds are verbal
    description: "Multiple gerunds (both verbal)"
  },
  // EDGE CASES: Potential false negatives with skip-VBG/VBN-before-noun fix
  {
    text: "I consider running marathons challenging.",
    expectedVerbs: ["consider", "running"],  // "running marathons" is gerund phrase object
    description: "EDGE: Gerund object followed by noun (running marathons)"
  },
  {
    text: "She started painting landscapes yesterday.",
    expectedVerbs: ["started", "painting"],  // "painting landscapes" is gerund phrase object
    description: "EDGE: Gerund with object noun (painting landscapes)"
  },
  {
    text: "They keep building houses.",
    expectedVerbs: ["keep", "building"],  // "building houses" is gerund phrase object
    description: "EDGE: Gerund with plural noun object (building houses)"
  },
  {
    text: "He finished writing letters.",
    expectedVerbs: ["finished", "writing"],  // "writing letters" is gerund phrase
    description: "EDGE: Gerund with noun object (writing letters)"
  },
  {
    text: "She imagined visiting Paris.",
    expectedVerbs: ["imagined", "visiting"],  // "visiting Paris" is gerund phrase
    description: "EDGE: Gerund with proper noun object (visiting Paris)"
  }
];

let totalWords = 0;
let truePositives = 0;   // Correctly identified as verb
let falsePositives = 0;  // Incorrectly identified as verb
let falseNegatives = 0;  // Missed verbs
let trueNegatives = 0;   // Correctly identified as non-verb

console.log('POS TAGGER ACCURACY TEST');
console.log('=' .repeat(80));

testCases.forEach((testCase, idx) => {
  console.log(`\nTest ${idx + 1}: ${testCase.description}`);
  console.log(`Text: "${testCase.text}"`);
  console.log(`Expected verbs: ${testCase.expectedVerbs.join(', ')}`);

  const tagged = tagger.tagSentence(testCase.text);
  const expectedSet = new Set(testCase.expectedVerbs.map(v => v.toLowerCase()));

  console.log('\nTagging results:');
  const taggedVerbs = [];
  const words = tagged.filter(t => t.tag === 'word');

  words.forEach(token => {
    const word = token.value.toLowerCase();
    const isTaggedAsVerb = token.pos && VERB_TAGS.has(token.pos);
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

    console.log(`  ${token.value}/${token.pos || token.tag} - ${status}`);
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

if (falsePositives > 0) {
  console.log(`\n⚠️  HIGH FALSE POSITIVE RATE: ${falsePositives} words incorrectly tagged as verbs`);
  console.log(`This will cause Stage2 patterns to over-match.`);
}

console.log(`\n${'='.repeat(80)}`);
console.log('INTERPRETATION');
console.log('='.repeat(80));
console.log(`Expected behavior for our use case:`);
console.log(`  - Precision should be >90% (few false positives)`);
console.log(`  - Recall can be lower (missing some verbs is OK)`);
console.log(`  - False positives are worse than false negatives for pattern matching`);
