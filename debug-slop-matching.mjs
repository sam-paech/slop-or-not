#!/usr/bin/env node
// debug-slop-matching.mjs - Debug why slop matching returns 0

import { readFileSync } from 'fs';

// Load slop list
console.log('Loading slop list...');
const slopListRaw = JSON.parse(readFileSync('./data/slop_list.json', 'utf-8'));
const slopList = new Set(slopListRaw.map(item => Array.isArray(item) ? item[0] : item));
console.log(`Slop list loaded: ${slopList.size} words`);
console.log('Sample words:', Array.from(slopList).slice(0, 10));

// Tokenize text into words
function tokenize(text) {
  return text.toLowerCase().match(/\b[a-z]+\b/g) || [];
}

// Calculate slop matches per 1k words
function calculateSlopMatches(text) {
  const words = tokenize(text);
  const totalWords = words.length;

  console.log(`\nTotal words: ${totalWords}`);

  if (totalWords === 0) return 0;

  let matches = 0;
  const matchedWords = [];

  for (const word of words) {
    if (slopList.has(word)) {
      matches++;
      if (matchedWords.length < 20) {
        matchedWords.push(word);
      }
    }
  }

  console.log(`Matches found: ${matches}`);
  console.log(`Sample matched words:`, matchedWords.slice(0, 20));

  const rate = (matches / totalWords) * 1000;
  console.log(`Rate per 1k words: ${rate.toFixed(2)}`);

  return rate;
}

// Test with a sample result file
console.log('\n' + '='.repeat(80));
console.log('Testing with claude-sonnet-4-5.json');
console.log('='.repeat(80));

const data = JSON.parse(readFileSync('./results/claude-sonnet-4-5.json', 'utf-8'));
const modelKey = Object.keys(data)[0];
const modelData = data[modelKey];

const validSamples = modelData.samples.filter(s => s.output && s.output.length > 300);
console.log(`Valid samples: ${validSamples.length}`);

const concatenatedText = validSamples.map(s => s.output).join('\n\n');
console.log(`Total text length: ${concatenatedText.length} chars`);

// Show first 500 chars
console.log('\nFirst 500 chars of text:');
console.log(concatenatedText.substring(0, 500));
console.log('...\n');

const result = calculateSlopMatches(concatenatedText);

console.log('\n' + '='.repeat(80));
console.log(`RESULT: ${result.toFixed(2)} slop matches per 1k words`);
console.log('='.repeat(80));

// Let's also manually check if some common slop words appear
console.log('\nManual spot check for common slop words:');
const testWords = ['delve', 'realm', 'tapestry', 'intricate', 'nuance', 'leverage', 'landscape'];
for (const word of testWords) {
  const regex = new RegExp(`\\b${word}\\b`, 'gi');
  const matches = concatenatedText.match(regex);
  console.log(`  "${word}": ${matches ? matches.length : 0} occurrences (in slop list: ${slopList.has(word)})`);
}
