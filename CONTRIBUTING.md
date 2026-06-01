# Contributing a deck

Thanks for helping pilots study! Here's the whole flow.

## 1. Set up

```sh
npm install
```

## 2. Create or edit a deck

- Pick a folder under `flashcards/` (or make a new one with a `folder.yaml`).
- Add a `<deck>.yaml`. Copy `flashcards/cessna-172-systems/electrical.yaml` as
  a template and read [`SCHEMA.md`](SCHEMA.md).
- **Id rules (important):** deck and card ids are globally unique across the
  whole repo and permanent once shipped. Prefix them so they don't collide
  with other contributions — e.g. `c172-elec-voltage`, `wb-arm-cg`.
- Add new deck and card ids to [`registry/ids.json`](registry/ids.json).
  CI fails if a live id appears in YAML without a matching active registry
  entry, or if an active registry entry disappears from YAML.

## Editing and retiring shipped content

The app stores user libraries by `deck.id` and practice stats by `card.id`, so
ids are append-only.

- **Fix a typo, wrong answer, stale wording, or changed regulation:** edit the
  existing card in place and keep the same id. The user was studying the same
  concept, so their history should stay attached.
- **Split one card into several cards, or replace it with a substantially new
  concept:** mark the old card id as `retired` in `registry/ids.json`, remove
  it from YAML, and add new card ids for the new cards.
- **Remove a deck:** mark the deck id as `retired`, retire every card id that
  belonged to it, and remove the deck YAML. Existing users simply stop seeing
  that deck after the next catalog refresh; old stats remain historical data.
- **Never reuse a retired id.** Retired ids stay in the registry forever.

Retired entries must include `retired_at` (`YYYY-MM-DD`) and a short `reason`.
Optional `replacement_deck_id` / `replacement_card_id` fields are useful when
there is a clear successor.

## 3. Validate locally

```sh
npm run validate
```

This runs the same compiler the Fledge app uses. Fix any reported errors —
the exact same check gates your PR in CI.

Want to see the published artifact your deck produces?

```sh
npm run build      # writes dist/flashcards.json
```

## 4. Open a pull request

- Keep a PR focused (one deck or one folder is ideal).
- CI runs `npm run validate`. A green check is required to merge.
- A maintainer reviews for accuracy (decks teach real procedures — correctness
  matters) and merges.

## 5. What happens after merge

On merge to `main`, CI compiles the catalog and publishes it to the Fledge
CDN. The app fetches the new catalog on next launch — no app update needed.

## Content quality bar

- Prompts and answers should be **correct and current** (cite the FAR/AIM,
  POH, or AFM section in `detail` when useful).
- Keep prompts short; put nuance in `answer`/`detail`.
- Aircraft-specific decks should name the make/model in the folder title.
- Don't paste copyrighted material verbatim — paraphrase.
