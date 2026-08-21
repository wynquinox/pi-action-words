# pi-action-words

A [pi](https://github.com/earendil-works/pi-coding-agent) extension that replaces the
default `Working...` indicator with fun action words chosen by **the action pi is
taking right now** and **the current thinking level**.

Instead of staring at `Working...`, you get:

| Situation                   | Example                                       |
| --------------------------- | --------------------------------------------- |
| Thinking, level `off`       | `on pure autopilot…`                          |
| Thinking, level `xhigh`     | `wrestling the problem across 11 dimensions…` |
| Running a `bash` command    | `waving the shell wand…`                      |
| Reading a file              | `poring over the file…`                       |
| Writing a file, level `max` | `dictating to the compiler…`                  |
| Editing, level `high`       | `performing code surgery…`                    |
| Searching                   | `scrying through the entire repo…`            |
| Custom tool, level `medium` | `consulting quantum_tool…`                    |

Each phase also gets its own little animated indicator (🤔 🧠 💡, ⌨️ 🔥 💥, 👀 📖,
✍️ ⚡, 🛠️ ✂️, 🔍 🕵️, ✨ 🪄) in your terminal's accent color.

## How it works

The extension watches pi's lifecycle events and keeps the working message in sync
with what's happening:

| Event                   | Effect                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `session_start`         | Arms the extension, picks up the current thinking level                             |
| `thinking_level_select` | New level takes effect immediately (even mid-run)                                   |
| `agent_start`           | Phase → `thinking`                                                                  |
| `tool_execution_start`  | Phase → mapped from the tool name (`bash`/`read`/`write`/`edit`/`search`/`other`)   |
| `tool_execution_end`    | Phase → back to `thinking` (parallel-aware: waits until all in-flight tools finish) |
| `agent_end`             | Restores pi's default `Working...` message and spinner                              |

Phrases are never repeated back-to-back for the same (phase, level) pair.

## Install

Any of these work (extensions are TypeScript and loaded via jiti, no build step):

**Project-local** (this directory):

```bash
cd pi_action_words
npm install            # dev dependencies only; not needed at runtime
```

Then either load it ad hoc:

```bash
pi -e ./src/index.ts
```

or add the directory to `~/.pi/agent/settings.json`:

```json
{ "extensions": ["/absolute/path/to/pi_action_words"] }
```

(Or copy `src/` into `~/.pi/agent/extensions/action-words/` for a global install —
the `pi` field in `package.json` points pi at `src/index.ts` automatically when the
directory is loaded as a package.)

## Commands

| Command                                  | Effect                                                   |
| ---------------------------------------- | -------------------------------------------------------- |
| `/action-words`                          | Shows current state and a sample phrase                  |
| `/action-words on` / `/action-words off` | Enable/disable (off restores pi's default indicator)     |
| `/action-words list`                     | Lists all phases and thinking levels                     |
| `/action-words test [phase]`             | Prints a sample phrase for a phase (default: `thinking`) |

## Customizing phrases

All vocabulary lives in [`src/phrases.ts`](src/phrases.ts) as plain data:
one pool per (phase, thinking level). Add or edit strings there and reload
(`/reload`). Rules of the house:

- Phrases are short lowercase verb phrases (the extension appends `…`).
- Every (phase, level) cell has at least two distinct phrases (enforced by tests).
- The `other` phase (custom tools) uses `{tool}` templates filled in with the real
  tool name at render time.

The per-phase indicators (emoji frames + animation speed) live in
[`src/indicators.ts`](src/indicators.ts).

## Development

```bash
npm install
npm run check         # lint + format check + typecheck + tests
npm run lint          # eslint (type-checked, flat config)
npm run lint:fix
npm run format        # prettier
npm run typecheck     # tsc --noEmit
npm test              # vitest (56 unit tests)
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

- In print/JSON mode the working indicator doesn't exist, so the extension is a
  no-op there (pi's UI stubs swallow the calls).
- Thinking levels understood: `off`, `minimal`, `low`, `medium`, `high`,
  `xhigh`, `max`. Unknown levels fall back to `medium`.
