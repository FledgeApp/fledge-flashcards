#!/usr/bin/env node
// Compile every deck under ../flashcards into a single published artifact:
//
//   { "version": "<ISO>·<hash>", "practiceFolders": [ ... ] }
//
// This is the exact shape the Fledge iOS app fetches at runtime. Written to
// dist/flashcards.json. Run: `npm run build`. Exits non-zero on schema errors.

const fs = require('fs');
const path = require('path');
const { compileFlashcards, versionTag } = require('./flashcards');

const FLASHCARDS_ROOT = path.join(__dirname, '..', 'flashcards');
const OUT_PATH = path.join(__dirname, '..', 'dist', 'flashcards.json');

const { folders, errors } = compileFlashcards(FLASHCARDS_ROOT);

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const payload = { practiceFolders: folders };
const bundle = { version: versionTag(payload, new Date().toISOString()), ...payload };

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(bundle, null, 2) + '\n');

const deckCount = folders.reduce((s, f) => s + f.decks.length, 0);
const cardCount = folders.reduce((s, f) => s + f.decks.reduce((d, deck) => d + deck.cards.length, 0), 0);
console.log(`✓ Wrote ${OUT_PATH}`);
console.log(`  ${bundle.version}`);
console.log(`  ${folders.length} folder(s), ${deckCount} deck(s), ${cardCount} card(s)`);
