#!/usr/bin/env node
// generate-leaderboard.mjs - Generate leaderboard from results/*.json

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  loadWordfreq,
  loadHumanProfile,
  loadSlopSets,
  computeSlopIndex,
  contentTokens,
  makeNgrams,
  rankOveruseWithCounts,
  lookupFrequency,
  mergePossessives,
  filterNumericWords,
  humanBigramFreq,
  humanTrigramFreq
} from './js/metrics.js';
import { wordsOnlyLower, alphaTokens, countItems } from './js/utils.js';
import { extractContrastMatches } from './js/contrast-detector.js';

// Patch global fetch to support local file paths for Node.js
const originalFetch = global.fetch;
global.fetch = async function(url, ...args) {
  if (url.startsWith('./') || url.startsWith('../')) {
    // Local file path
    const content = readFileSync(url, 'utf-8');
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(content),
      text: async () => content
    };
  }
  return originalFetch(url, ...args);
};

// Disable contrast detector console logging
const originalConsoleGroup = console.group;
const originalConsoleGroupEnd = console.groupEnd;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function disableLogging() {
  console.group = () => {};
  console.groupEnd = () => {};
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
}

function enableLogging() {
  console.group = originalConsoleGroup;
  console.groupEnd = originalConsoleGroupEnd;
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}

// Calculate lexical diversity metrics using MATTR (Moving-Average Type-Token Ratio)
// MATTR-500: calculate TTR for each 500-token window and average them
// This controls for text length, making it more reliable than simple TTR
function calculateLexicalDiversity(tokens) {
  const totalWords = tokens.length;
  const windowSize = 500;

  if (totalWords === 0) {
    return {
      mattr_500: 0,
      type_token_ratio: 0,
      unique_words: 0,
      total_words: 0
    };
  }

  const uniqueWords = new Set(tokens);
  const simpleTTR = uniqueWords.size / totalWords;

  // Calculate MATTR-500 if we have enough tokens
  let mattr = 0;
  if (totalWords >= windowSize) {
    let sumTTR = 0;
    let windowCount = 0;

    // Slide a window of size windowSize through the token array
    for (let i = 0; i <= totalWords - windowSize; i++) {
      const windowTokens = tokens.slice(i, i + windowSize);
      const windowUnique = new Set(windowTokens);
      const windowTTR = windowUnique.size / windowSize;
      sumTTR += windowTTR;
      windowCount++;
    }

    mattr = sumTTR / windowCount;
  } else {
    // If text is shorter than window size, fall back to simple TTR
    mattr = simpleTTR;
  }

  return {
    mattr_500: mattr,
    type_token_ratio: simpleTTR,
    unique_words: uniqueWords.size,
    total_words: totalWords
  };
}

// Calculate metrics for a text sample
function calculateMetrics(text) {
  const toks0 = wordsOnlyLower(text);
  const toks = alphaTokens(toks0);
  const nWords = toks.length;

  if (nWords === 0) {
    return null;
  }

  // Slop index (using existing function)
  const slopIndex = computeSlopIndex(toks);

  // Repetition score (using existing function)
  const toksContent = contentTokens(toks);
  const bigs = makeNgrams(toksContent, 2);
  const tris = makeNgrams(toksContent, 3);

  const topBCounts = rankOveruseWithCounts(bigs, humanBigramFreq, 40);
  const topTCounts = rankOveruseWithCounts(tris, humanTrigramFreq, 40);

  const top_bigram_count = topBCounts.reduce((s, r) => s + r[2], 0);
  const top_trigram_count = topTCounts.reduce((s, r) => s + r[2], 0);
  const content_word_count = toksContent.length;

  const repetitionScore = content_word_count > 0
    ? ((top_bigram_count + top_trigram_count) / content_word_count) * 1000
    : 0;

  // Contrast patterns (using existing function)
  disableLogging();
  const contrastResult = extractContrastMatches(text);
  enableLogging();

  const chars = text.length;
  const contrastRate = chars > 0 ? (contrastResult.length / chars) * 1000 : 0;

  // Save up to 100 not-x-but-y patterns for display
  const contrastMatches = contrastResult.slice(0, 100).map(m => ({
    pattern_name: m.pattern_name,
    sentence: m.sentence,
    match_text: m.match_text,
    sentence_count: m.sentence_count
  }));

  // Lexical diversity
  const lexicalDiversity = calculateLexicalDiversity(toks);

  // Top over-represented words vs wordfreq baseline (matching HTML implementation)
  // Apply preprocessing like HTML implementation
  let wordCounts = countItems(toksContent);
  wordCounts = filterNumericWords(wordCounts);
  wordCounts = mergePossessives(wordCounts);
  
  const totalWords = Array.from(wordCounts.values()).reduce((a, b) => a + b, 0);
  const wordOverrep = [];
  
  for (const [w, cnt] of wordCounts.entries()) {
    const baselineFreq = lookupFrequency(w); // proportion (0-1)
    if (!baselineFreq) continue;
    
    const modelFreq = cnt / totalWords; // proportion (0-1)
    const ratio = modelFreq / baselineFreq;
    
    // Only show words that are significantly over-represented
    if (ratio > 1.5 && cnt >= 2) {
      wordOverrep.push({ word: w, ratio: ratio, count: cnt });
    }
  }
  wordOverrep.sort((a, b) => b.ratio - a.ratio);

  // Top over-represented bigrams and trigrams (using existing function)
  const topBigrams = topBCounts.slice(0, 100).map(([phrase, ratio, count]) => ({
    phrase,
    ratio,
    count
  }));

  const topTrigrams = topTCounts.slice(0, 100).map(([phrase, ratio, count]) => ({
    phrase,
    ratio,
    count
  }));

  return {
    slop_list_matches_per_1k_words: slopIndex,
    ngram_repetition_score: repetitionScore,
    not_x_but_y_per_1k_chars: contrastRate,
    lexical_diversity: lexicalDiversity,
    top_over_represented: {
      words: wordOverrep.slice(0, 100),
      bigrams: topBigrams,
      trigrams: topTrigrams
    },
    contrast_matches: contrastMatches
  };
}

// Process a single model's results
function processModel(data) {
  const modelKey = Object.keys(data)[0];
  const modelData = data[modelKey];

  console.log(`\nProcessing ${modelKey}...`);

  // Filter samples > 300 chars and concatenate
  const validSamples = modelData.samples.filter(s => s.output && s.output.length > 300);
  console.log(`  Valid samples (>300 chars): ${validSamples.length} / ${modelData.samples.length}`);

  if (validSamples.length === 0) {
    console.log(`  ⚠️  No valid samples, skipping`);
    return null;
  }

  const concatenatedText = validSamples.map(s => s.output).join('\n\n');
  console.log(`  Total text length: ${concatenatedText.length} chars`);

  // Calculate all metrics
  console.log(`  Calculating metrics...`);

  const metrics = calculateMetrics(concatenatedText);

  if (!metrics) {
    console.log(`  ⚠️  Failed to calculate metrics, skipping`);
    return null;
  }

  console.log(`  ✓ Metrics calculated`);
  console.log(`    Slop index: ${metrics.slop_list_matches_per_1k_words.toFixed(2)}`);
  console.log(`    Repetition: ${metrics.ngram_repetition_score.toFixed(2)}`);
  console.log(`    Contrast: ${metrics.not_x_but_y_per_1k_chars.toFixed(2)}`);
  console.log(`    Lexical diversity (MATTR-500): ${metrics.lexical_diversity.mattr_500.toFixed(4)}`);

  return {
    model: modelKey,
    test_model: modelData.test_model,
    sample_count: validSamples.length,
    total_chars: concatenatedText.length,
    started_at: modelData.started_at,
    completed_at: modelData.completed_at,
    metrics: {
      slop_list_matches_per_1k_words: metrics.slop_list_matches_per_1k_words,
      ngram_repetition_score: metrics.ngram_repetition_score,
      not_x_but_y_per_1k_chars: metrics.not_x_but_y_per_1k_chars,
      lexical_diversity: metrics.lexical_diversity
    },
    top_over_represented: metrics.top_over_represented,
    contrast_matches: metrics.contrast_matches
  };
}

// Process human baseline from human_writing_samples/*.txt
function processHumanBaseline() {
  console.log('\nProcessing human baseline...');

  const humanDir = './human_writing_samples';
  const files = readdirSync(humanDir).filter(f => f.endsWith('.txt'));

  if (files.length === 0) {
    console.log('  ⚠️  No .txt files found in human_writing_samples/, skipping');
    return null;
  }

  console.log(`  Found ${files.length} human writing sample(s)`);

  // Concatenate all human samples
  const allText = files.map(f => {
    const filePath = join(humanDir, f);
    return readFileSync(filePath, 'utf-8');
  }).join('\n\n');

  console.log(`  Total text length: ${allText.length} chars`);

  if (allText.length === 0) {
    console.log(`  ⚠️  No text content, skipping`);
    return null;
  }

  // Calculate all metrics
  console.log(`  Calculating metrics...`);

  const metrics = calculateMetrics(allText);

  if (!metrics) {
    console.log(`  ⚠️  Failed to calculate metrics, skipping`);
    return null;
  }

  console.log(`  ✓ Metrics calculated`);
  console.log(`    Slop index: ${metrics.slop_list_matches_per_1k_words.toFixed(2)}`);
  console.log(`    Repetition: ${metrics.ngram_repetition_score.toFixed(2)}`);
  console.log(`    Contrast: ${metrics.not_x_but_y_per_1k_chars.toFixed(2)}`);
  console.log(`    Lexical diversity (MATTR-500): ${metrics.lexical_diversity.mattr_500.toFixed(4)}`);

  return {
    model: 'human-baseline',
    test_model: 'human-baseline',
    sample_count: files.length,
    total_chars: allText.length,
    started_at: null,
    completed_at: null,
    metrics: {
      slop_list_matches_per_1k_words: metrics.slop_list_matches_per_1k_words,
      ngram_repetition_score: metrics.ngram_repetition_score,
      not_x_but_y_per_1k_chars: metrics.not_x_but_y_per_1k_chars,
      lexical_diversity: metrics.lexical_diversity
    },
    top_over_represented: metrics.top_over_represented,
    contrast_matches: metrics.contrast_matches
  };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const forceRecalc = args.includes('--force');
  const forceRecalcHuman = args.includes('--force-recalc-human');

  console.log('LEADERBOARD GENERATOR');
  console.log('='.repeat(80));
  if (forceRecalc) {
    console.log('Running with --force: will recalculate all models');
  }
  if (forceRecalcHuman) {
    console.log('Running with --force-recalc-human: will recalculate human baseline');
  }

  // Load dependencies
  console.log('\nLoading dependencies...');
  try {
    await loadWordfreq();
    console.log('  ✓ wordfreq loaded');
  } catch (err) {
    console.error('  ✗ Failed to load wordfreq:', err.message);
    throw new Error('wordfreq is required for word frequency analysis');
  }

  try {
    await loadHumanProfile();
    console.log('  ✓ Human profile loaded');
  } catch (err) {
    console.error('  ✗ Failed to load human profile:', err.message);
    throw new Error('Human profile is required for n-gram analysis');
  }

  try {
    await loadSlopSets();
    console.log('  ✓ Slop sets loaded');
  } catch (err) {
    console.error('  ✗ Failed to load slop sets:', err.message);
    throw new Error('Slop sets are required for slop detection');
  }

  // Load existing leaderboard if it exists
  const outputPath = './data/leaderboard_results.json';
  let existingResults = {};
  try {
    const existing = JSON.parse(readFileSync(outputPath, 'utf-8'));
    if (existing.results) {
      for (const result of existing.results) {
        existingResults[result.model] = result;
      }
    }
    console.log(`\nLoaded existing leaderboard with ${Object.keys(existingResults).length} model(s)`);
  } catch (err) {
    console.log('\nNo existing leaderboard found, will create new one');
  }

  const resultsDir = './results';
  const files = readdirSync(resultsDir).filter(f => f.endsWith('.json'));

  console.log(`\nFound ${files.length} result files in ${resultsDir}/`);

  const leaderboard = [];

  for (const file of files) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Processing ${file}...`);

    try {
      const filePath = join(resultsDir, file);
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      const modelKey = Object.keys(data)[0];

      // Check if already computed
      if (!forceRecalc && existingResults[modelKey]) {
        console.log(`  ✓ Already computed, using cached result (use --force to recalculate)`);
        leaderboard.push(existingResults[modelKey]);
        continue;
      }

      const result = processModel(data);
      if (result) {
        leaderboard.push(result);
      }
    } catch (err) {
      console.error(`  ✗ Error processing ${file}:`, err.message);
    }
  }

  // Process human baseline
  console.log(`\n${'='.repeat(80)}`);
  if (!forceRecalcHuman && existingResults['human-baseline']) {
    console.log('Human baseline already computed, using cached result (use --force-recalc-human to recalculate)');
    leaderboard.push(existingResults['human-baseline']);
  } else {
    const humanResult = processHumanBaseline();
    if (humanResult) {
      leaderboard.push(humanResult);
    }
  }

  // Sort leaderboard by slop index (ascending = better)
  leaderboard.sort((a, b) => a.metrics.slop_list_matches_per_1k_words - b.metrics.slop_list_matches_per_1k_words);

  // Write results
  writeFileSync(outputPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    model_count: leaderboard.length,
    results: leaderboard
  }, null, 2));

  console.log(`\n${'='.repeat(80)}`);
  console.log('LEADERBOARD GENERATED');
  console.log('='.repeat(80));
  console.log(`\nResults written to: ${outputPath}`);
  console.log(`Models processed: ${leaderboard.length}`);

  console.log('\nTop 10 models (by slop index, lower is better):');
  for (let i = 0; i < Math.min(10, leaderboard.length); i++) {
    const model = leaderboard[i];
    console.log(`  ${i + 1}. ${model.model}`);
    console.log(`     Slop: ${model.metrics.slop_list_matches_per_1k_words.toFixed(2)} | Rep: ${model.metrics.ngram_repetition_score.toFixed(2)} | Contrast: ${model.metrics.not_x_but_y_per_1k_chars.toFixed(2)} | MATTR-500: ${model.metrics.lexical_diversity.mattr_500.toFixed(4)}`);
  }

  console.log('\n✓ Done!');
}

main().catch(err => {
  console.error('\n❌ FATAL ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
