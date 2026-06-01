# Fledge Flashcards

Community-contributed flashcard decks for the **Fledge** pilot-training app.
Open a pull request to add or improve a deck (e.g. a Cessna 172 systems set, a
weight-and-balance drill, an airspace refresher) and — once merged — it ships
to everyone without an app update.

## How it works

```
flashcards/<folder>/folder.yaml     # folder display metadata
flashcards/<folder>/<deck>.yaml     # a deck: title, badge, accent, cards
        │
        ▼  (CI on merge to main)
   npm run build  →  dist/flashcards.json   →  published to the Fledge CDN
        │
        ▼  (at runtime)
   The Fledge app fetches flashcards.json, caches it, and shows your deck.
```

- **Every pull request is validated in CI** with the exact compiler the app
  uses (`tools/flashcards.js`). A green check means your deck will compile.
- **Deck and card IDs are permanent.** CI also checks
  [`registry/ids.json`](registry/ids.json), which prevents accidental deletion,
  rename, or reuse of IDs that users may already have in their library or stats.
- **Merges to `main` publish** the compiled catalog to the CDN. The app picks
  it up on next launch (or when it regains connectivity).

## Add a deck

1. Read [`SCHEMA.md`](SCHEMA.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).
2. Copy `flashcards/cessna-172-systems/electrical.yaml` as a starting point.
3. Register your new deck/card ids in [`registry/ids.json`](registry/ids.json).
4. Validate locally:
   ```sh
   npm install
   npm run validate
   ```
5. Open a PR. CI re-runs `validate`; a maintainer reviews and merges.

## License

Deck content is contributed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
By opening a PR you agree your contribution may be redistributed in the app.
