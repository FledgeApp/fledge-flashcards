// Flashcard deck compiler — shared by the private content pipeline
// (tools/compile/index.js) and the PUBLIC fledge-flashcards repo's
// validator/CI. Keep this file dependency-light (fs + js-yaml only) and free
// of any certificate/question logic so it can be copied verbatim into the
// public repo without leaking private schema.
//
// A flashcard folder is `<root>/<folder>/folder.yaml` + one YAML per deck.
// Deck ids and card ids share a single global namespace — practice stats on
// the client key to the card id, so a collision would cross-link two users'
// progress. `compileFlashcards` enforces uniqueness and returns structured
// errors/warnings rather than throwing, so callers can render them however
// they like (CI annotations, console, etc.).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const ACCENT_TOKENS = new Set(['sky', 'avgas', 'flame', 'heart', 'green']);

function readYaml(p) {
  return yaml.load(fs.readFileSync(p, 'utf8'));
}

/// Compile one folder directory into a `{ id, title, subtitle, order, decks }`
/// record. Pushes any problems onto the shared `errors` array.
function compileFolder(folderDir, errors) {
  const id = path.basename(folderDir);
  const manifestPath = path.join(folderDir, 'folder.yaml');
  const manifest = fs.existsSync(manifestPath) ? (readYaml(manifestPath) || {}) : {};
  const decks = [];

  for (const f of fs.readdirSync(folderDir).sort()) {
    if ((!f.endsWith('.yaml') && !f.endsWith('.yml')) || f === 'folder.yaml') continue;
    const full = path.join(folderDir, f);
    const raw = readYaml(full) || {};
    const deckId = String(raw.id || '').trim();
    if (!deckId) { errors.push(`${full}: missing deck id`); continue; }
    if (!raw.title) { errors.push(`${full}: missing title`); continue; }
    if (!Array.isArray(raw.cards) || raw.cards.length === 0) {
      errors.push(`${full}: deck needs at least one card`); continue;
    }
    const accent = String(raw.accent || 'sky');
    if (!ACCENT_TOKENS.has(accent)) {
      errors.push(`${full}: unknown accent "${accent}" (use one of: ${[...ACCENT_TOKENS].join(', ')})`);
    }

    const cards = [];
    const seenCardIds = new Set();
    for (const [idx, c] of raw.cards.entries()) {
      const prompt = String(c?.prompt || '').trim();
      const promptSubtitle = String(c?.prompt_subtitle || c?.promptSubtitle || '').trim();
      const answer = String(c?.answer || '').trim();
      if (!prompt || !answer) {
        errors.push(`${full}: cards[${idx}] needs prompt and answer`);
        continue;
      }
      const cardId = String(c.id || `${deckId}.${idx + 1}`);
      if (seenCardIds.has(cardId)) {
        errors.push(`${full}: duplicate card id "${cardId}"`);
        continue;
      }
      seenCardIds.add(cardId);
      cards.push({
        id: cardId,
        prompt,
        ...(promptSubtitle ? { promptSubtitle } : {}),
        answer,
        ...(c.detail ? { detail: String(c.detail).trim() } : {}),
      });
    }

    decks.push({
      id: deckId,
      title: String(raw.title),
      subtitle: String(raw.subtitle || ''),
      badge: String(raw.badge || ''),
      accentKey: accent,
      ...(raw.deprecated === true ? { deprecated: true } : {}),
      cards,
    });
  }

  decks.sort((a, b) => a.id.localeCompare(b.id));
  return {
    id,
    title: String(manifest.title || id),
    subtitle: String(manifest.subtitle || ''),
    order: Number(manifest.order ?? 999),
    decks,
  };
}

/// Walk every folder under `flashcardsRoot`, validate, and return the sorted
/// `practiceFolders` array plus any errors/warnings. Never throws on content
/// problems — the caller decides whether to exit non-zero.
function compileFlashcards(flashcardsRoot) {
  const errors = [];
  const warnings = [];
  if (!fs.existsSync(flashcardsRoot)) {
    return { folders: [], errors, warnings };
  }

  const seenDeckIds = new Set();
  const seenCardIds = new Map();
  const folders = fs.readdirSync(flashcardsRoot)
    .map(d => path.join(flashcardsRoot, d))
    .filter(p => fs.statSync(p).isDirectory())
    .map(dir => compileFolder(dir, errors))
    .filter(f => f.decks.length > 0);

  for (const folder of folders) {
    for (const deck of folder.decks) {
      if (seenDeckIds.has(deck.id)) {
        errors.push(`duplicate flashcard deck id "${deck.id}"`);
      }
      seenDeckIds.add(deck.id);
      for (const card of deck.cards) {
        if (seenCardIds.has(card.id)) {
          errors.push(`duplicate flashcard card id "${card.id}" (in decks "${seenCardIds.get(card.id)}" and "${deck.id}")`);
        }
        seenCardIds.set(card.id, deck.id);
      }
    }
  }

  const sorted = folders
    .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title))
    .map(({ order, ...folder }) => folder);

  return { folders: sorted, errors, warnings };
}

/// Stable 12-char hash over a payload — used to version both content.json and
/// the standalone flashcards.json so the client can skip redundant swaps.
function versionTag(payload, isoTimestamp) {
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 12);
  return `${isoTimestamp.slice(0, 19)}Z·${hash}`;
}

module.exports = { compileFlashcards, versionTag, ACCENT_TOKENS };
