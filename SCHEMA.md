# Deck schema

A flashcard **folder** is a directory under `flashcards/`. It holds a
`folder.yaml` (display metadata) plus one YAML file per **deck**.

```
flashcards/
  cessna-172-systems/
    folder.yaml
    electrical.yaml
    fuel.yaml
```

## `folder.yaml`

```yaml
title: "Cessna 172 Systems"      # shown as the folder/catalog group name
subtitle: "Type-specific systems, limitations, and memory items."
order: 50                         # lower sorts first in the catalog
```

The folder's directory name is its stable id — don't rename it once shipped.

## `<deck>.yaml`

```yaml
id: c172-electrical               # stable, globally unique deck id (never reuse)
title: "C172 Electrical System"
subtitle: "Buses, alternator, battery, and failures."
badge: "ELEC"                     # short chip label (2–5 chars reads best)
accent: flame                     # one of: sky | avgas | flame | heart | green
deprecated: true                  # optional; hide from new adds, keep for existing users
cards:
  - id: c172-elec-voltage         # stable, globally unique card id
    prompt: "C172 electrical system voltage"
    answer: "28-volt DC system."
    detail: "Optional longer note shown on the back of the card."
```

### Rules the validator enforces (CI fails otherwise)

- **Deck `id` and every card `id` are globally unique across ALL decks in this
  repo.** Card progress in the app is keyed to the card id, so a collision
  would cross-link two users' stats. Namespace your ids with a short prefix
  (e.g. `c172-elec-…`) to stay clear of other contributions.
- **`id`s are forever.** Once a deck/card id has shipped, never reuse it for
  different content — edit in place or pick a new id.
- New ids must be added to `registry/ids.json` with `status: "active"`.
- To stop offering a shipped deck to new users while preserving access for
  existing users, set `deprecated: true` in YAML and mark the deck
  `deprecated` in the registry with `deprecated_at` and `reason`.
- To remove shipped content completely, mark the id `retired` in the registry
  with `retired_at` and `reason`; never reuse retired ids.
- Each deck needs a `title` and at least one card.
- Each card needs a non-empty `prompt` and `answer`. `detail` is optional.
- `accent` must be one of `sky`, `avgas`, `flame`, `heart`, `green`.

Every card must declare an explicit, namespaced `id` so the registry can
protect it across future edits.
