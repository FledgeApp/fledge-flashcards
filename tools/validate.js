#!/usr/bin/env node
// Validate every flashcard deck under ../flashcards. Exits non-zero on any
// schema error so CI can gate pull requests. Run: `npm run validate`.
//
// This uses the SAME compiler the Fledge app repo uses (tools/flashcards.js is
// kept byte-identical), so a green check here guarantees the deck compiles
// into the published catalog.

const path = require('path');
const { compileFlashcards } = require('./flashcards');

const FLASHCARDS_ROOT = path.join(__dirname, '..', 'flashcards');

const { folders, errors, warnings } = compileFlashcards(FLASHCARDS_ROOT);

for (const w of warnings) console.warn(`  ! ${w}`);

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const deckCount = folders.reduce((s, f) => s + f.decks.length, 0);
const cardCount = folders.reduce((s, f) => s + f.decks.reduce((d, deck) => d + deck.cards.length, 0), 0);
console.log(`✓ ${folders.length} folder(s), ${deckCount} deck(s), ${cardCount} card(s) — all valid`);
