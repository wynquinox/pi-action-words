# pi-action-words

A [pi](https://github.com/earendil-works/pi-coding-agent) extension that replaces the
default `Working...` indicator with some fun action descriptions that vary by your chosen
thinking level (falling back to medium when it can't be determined), and animated indicators
paired with them to spice them up a bit.

## Install

`pi install git:github.com/wynquinox/pi-action-words`

## Commands

| Command                                  | Effect                                                   |
| ---------------------------------------- | -------------------------------------------------------- |
| `/action-words`                          | Shows current state and a sample phrase                  |
| `/action-words on` / `/action-words off` | Enable/disable (off restores pi's default indicator)     |
| `/action-words list`                     | Lists all phases and thinking levels                     |
| `/action-words test [phase]`             | Prints a sample phrase for a phase (default: `thinking`) |

## Development

### Install for development

```bash
cd pi_action_words
npm install            # dev dependencies only; not needed at runtime
```

Either load ad hoc:

```bash
pi -e ./src/index.ts
```

or add the directory to `~/.pi/agent/settings.json`:

```json
{ "extensions": ["/absolute/path/to/pi_action_words"] }
```

### Development Command Cheatsheet

```bash
npm install
npm run check                 # lint + format check + typecheck + tests
npm run lint                  # eslint (type-checked, flat config)
npm run lint:fix
npm run mutation              # Run Stryker mutation tests
npm run mutation:ignoreStatic # Run Stryker mutation tests without static mutants
npm run format                # prettier
npm run typecheck             # tsc --noEmit
npm test                      # vitest unit tests
npm run test:watch
```

### Architecture

```
src/
├── index.ts        # thin pi adapter: events → ctx.ui.setWorkingMessage/Indicator
├── phases.ts       # ActionPhase type + tool name → phase mapping
├── levels.ts       # thinking-level vocabulary + normalization
├── phrases.ts      # the phrase pools (the fun part) + phrase builder
├── picker.ts       # random pick with no-immediate-repeat, injectable rng
├── indicators.ts   # per-phase animated indicator frames
└── tracker.ts      # parallel-tool-aware phase tracking

tests/              # vitest, one file per module
```

Everything except `index.ts` is pure and framework-free, so the whole phrase
engine is unit-testable without a pi runtime.

## Notes

- Thinking levels understood: `off`, `minimal`, `low`, `medium`, `high`,
  `xhigh`, `max`. Unknown levels fall back to `medium`.
