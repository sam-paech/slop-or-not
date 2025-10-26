#!/usr/bin/env node
// test-actual-bug.mjs - Test with the actual problematic text

import { extractContrastMatches } from './js/contrast-detector.js';

const problematicText = `She'd spent hours there, tracing the cracks in the pavement with her finger, whispering to the rusted swing sets, and imagining the gods hiding in the shadows of the trees.

The sneakers were found in a pile of old sneakers, their colors faded to the point of invisibility. They looked like they'd been tossed into the park by someone who didn't care. Aria picked them up, her fingers brushing against the worn sole. They were warm. Not just warm, but *alive*-a strange, pulsing heat that made her skin tingle. She glanced at the bench, its surface still damp from the rain, and wondered if the sneakers had been left there by a god who'd forgotten to clean them.

She slipped them on, the laces tightening around her ankles like a second skin. The first step was a blur of sound: the crunch of gravel, the creak of the bench, the hum of the sneakers themselves. It wasn't loud, but it was *there*-a low, almost imperceptible vibration that seemed to echo in her bones. She paused, her foot hovering just above the ground, as if the sneakers were holding her back. Then she stepped forward, and the world shifted.`;

console.log('TESTING ACTUAL PROBLEMATIC TEXT');
console.log('='.repeat(80));
console.log('\nRunning extractContrastMatches...\n');

const matches = extractContrastMatches(problematicText);

console.log('\n' + '='.repeat(80));
console.log('RESULTS');
console.log('='.repeat(80));

for (const match of matches) {
  console.log(`\nPattern: ${match.pattern_name}`);
  console.log(`Sentence count: ${match.sentence_count}`);
  console.log(`Match text: "${match.match_text}"`);
  console.log(`Full sentence: "${match.sentence.substring(0, 200)}..."`);

  if (match.sentence_count > 2) {
    console.log(`❌ SPANS ${match.sentence_count} SENTENCES - TOO GREEDY!`);
  }
}
