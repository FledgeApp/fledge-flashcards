const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const VALID_DECK_STATUSES = new Set(['active', 'deprecated', 'retired']);
const VALID_CARD_STATUSES = new Set(['active', 'retired']);

function readJson(filePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    errors.push(`${filePath}: could not read JSON (${err.message})`);
    return null;
  }
}

function readYaml(filePath, errors) {
  try {
    return yaml.load(fs.readFileSync(filePath, 'utf8')) || {};
  } catch (err) {
    errors.push(`${filePath}: could not read YAML (${err.message})`);
    return null;
  }
}

function scanFlashcards(repoRoot, errors) {
  const flashcardsRoot = path.join(repoRoot, 'flashcards');
  const decks = new Map();
  const cards = new Map();

  if (!fs.existsSync(flashcardsRoot)) {
    errors.push(`${flashcardsRoot}: missing flashcards directory`);
    return { decks, cards };
  }

  for (const folder of fs.readdirSync(flashcardsRoot).sort()) {
    const folderPath = path.join(flashcardsRoot, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    for (const file of fs.readdirSync(folderPath).sort()) {
      if ((!file.endsWith('.yaml') && !file.endsWith('.yml')) || file === 'folder.yaml') continue;

      const fullPath = path.join(folderPath, file);
      const relativePath = path.relative(repoRoot, fullPath);
      const raw = readYaml(fullPath, errors);
      if (!raw) continue;

      const deckId = String(raw.id || '').trim();
      if (!deckId) continue;
      decks.set(deckId, { path: relativePath, cardIds: new Set(), deprecated: raw.deprecated === true });

      for (const [idx, card] of (raw.cards || []).entries()) {
        const cardId = String(card?.id || '').trim();
        if (!cardId) {
          errors.push(`${relativePath}: cards[${idx}] needs an explicit id so registry/ids.json can protect it`);
          continue;
        }
        cards.set(cardId, { deck_id: deckId, path: relativePath });
        decks.get(deckId).cardIds.add(cardId);
      }
    }
  }

  return { decks, cards };
}

function validateRegistryEntry(kind, id, entry, errors) {
  const validStatuses = kind === 'deck' ? VALID_DECK_STATUSES : VALID_CARD_STATUSES;
  if (!entry || typeof entry !== 'object') {
    errors.push(`registry ${kind} "${id}" must be an object`);
    return;
  }
  if (!validStatuses.has(entry.status)) {
    errors.push(`registry ${kind} "${id}" has invalid status "${entry.status}" (use one of: ${[...validStatuses].join(', ')})`);
  }
  if (entry.status === 'deprecated') {
    if (!entry.deprecated_at) errors.push(`registry ${kind} "${id}" is deprecated but missing deprecated_at`);
    if (!entry.reason) errors.push(`registry ${kind} "${id}" is deprecated but missing reason`);
  }
  if (entry.status === 'retired') {
    if (!entry.retired_at) errors.push(`registry ${kind} "${id}" is retired but missing retired_at`);
    if (!entry.reason) errors.push(`registry ${kind} "${id}" is retired but missing reason`);
  }
}

function validateIdRegistry({
  repoRoot = path.resolve(__dirname, '..'),
  registryPath = path.join(repoRoot, 'registry', 'ids.json'),
} = {}) {
  const errors = [];
  const warnings = [];
  const registry = readJson(registryPath, errors);
  if (!registry) return { errors, warnings };

  if (registry.schema_version !== 1) {
    errors.push(`${registryPath}: schema_version must be 1`);
  }

  const registeredDecks = registry.decks || {};
  const registeredCards = registry.cards || {};
  const current = scanFlashcards(repoRoot, errors);

  for (const [deckId, entry] of Object.entries(registeredDecks)) {
    validateRegistryEntry('deck', deckId, entry, errors);
    const currentDeck = current.decks.get(deckId);
    if (entry.status === 'active') {
      if (!currentDeck) {
        errors.push(`active deck id "${deckId}" is missing from flashcards; mark it retired instead of deleting it`);
      } else if (entry.path && entry.path !== currentDeck.path) {
        errors.push(`active deck id "${deckId}" moved from "${entry.path}" to "${currentDeck.path}"; update registry/ids.json if this move is intentional`);
      } else if (currentDeck.deprecated) {
        errors.push(`active deck id "${deckId}" has deprecated: true in YAML; mark it deprecated in registry/ids.json`);
      }
    }
    if (entry.status === 'deprecated') {
      if (!currentDeck) {
        errors.push(`deprecated deck id "${deckId}" is missing from flashcards; mark it retired if it should disappear entirely`);
      } else if (entry.path && entry.path !== currentDeck.path) {
        errors.push(`deprecated deck id "${deckId}" moved from "${entry.path}" to "${currentDeck.path}"; update registry/ids.json if this move is intentional`);
      } else if (!currentDeck.deprecated) {
        errors.push(`deprecated deck id "${deckId}" must set deprecated: true in its deck YAML`);
      }
    }
    if (entry.status === 'retired' && currentDeck) {
      errors.push(`retired deck id "${deckId}" is still present at ${currentDeck.path}`);
    }
  }

  for (const [deckId, currentDeck] of current.decks.entries()) {
    const entry = registeredDecks[deckId];
    if (!entry) {
      errors.push(`new deck id "${deckId}" at ${currentDeck.path} is not registered in registry/ids.json`);
    } else if (entry.status === 'retired') {
      errors.push(`deck id "${deckId}" at ${currentDeck.path} reuses a retired id`);
    } else if (currentDeck.deprecated && entry.status !== 'deprecated') {
      errors.push(`deck id "${deckId}" at ${currentDeck.path} has deprecated: true but registry status is "${entry.status}"`);
    }
  }

  for (const [cardId, entry] of Object.entries(registeredCards)) {
    validateRegistryEntry('card', cardId, entry, errors);
    const currentCard = current.cards.get(cardId);
    if (entry.status === 'active') {
      if (!entry.deck_id) {
        errors.push(`active card id "${cardId}" is missing deck_id in registry/ids.json`);
      }
      if (!currentCard) {
        errors.push(`active card id "${cardId}" is missing from flashcards; mark it retired instead of deleting it`);
      } else if (entry.deck_id !== currentCard.deck_id) {
        errors.push(`card id "${cardId}" moved from deck "${entry.deck_id}" to "${currentCard.deck_id}"; create a new card id for a different deck`);
      }
    }
    if (entry.status === 'retired' && currentCard) {
      errors.push(`retired card id "${cardId}" is still present in deck "${currentCard.deck_id}"`);
    }
  }

  for (const [cardId, currentCard] of current.cards.entries()) {
    const entry = registeredCards[cardId];
    if (!entry) {
      errors.push(`new card id "${cardId}" in deck "${currentCard.deck_id}" is not registered in registry/ids.json`);
    } else if (entry.status === 'retired') {
      errors.push(`card id "${cardId}" in deck "${currentCard.deck_id}" reuses a retired id`);
    }
  }

  return { errors, warnings };
}

module.exports = { validateIdRegistry };
