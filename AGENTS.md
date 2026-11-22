# AGENTS.md

## Layout

This repo holds both sides of the Inky Frame photo gallery, which talk to each other through the instructions of
stories 0001 and 0006:

- `backend-ts/` — the TypeScript backend: an Express server with the admin page, the frame's `/list` and
  `/instructions` endpoints, and the browser-based Photo Frame Simulator.
- `inky-frame-photo-gallery-cpp/` — the C++ client that runs on the Pimoroni Inky Frame (Raspberry Pi Pico W), built
  with the Pico SDK and the Pimoroni libraries.
- `stories/`, `AGENTS.md`, `CLAUDE.md` and `.claude/` (skills and agents) are shared by both, at the root.
- `LICENCE` — the one licence for the whole repo (MIT).

### Running commands

Run each part's commands from its own directory, not from the repo root:

- **Backend** — from `backend-ts/`: `npm ci`, `npm run build`, `npm test` (or `npx jest`), `npx tsc --noEmit`,
  `npm run build:simulator`, `npm run dev`.
- **C++ client** — from `inky-frame-photo-gallery-cpp/`, with CMake, the Pico SDK and the Pimoroni libraries (see its
  `README.md`). It needs a `wifi_settings.h`, made from `wifi_settings_template.h`, which is not committed. It has no
  host-side tests yet (story 0014) and no CI yet (story 0017).

## Stories

Stories live in `stories/`, in one of five folders according to their state:

- `stories/icebox/` — not a priority right now
- `stories/todo/` — not yet started; examples not yet created
- `stories/ready/` — examples have been created (e.g. by Example Mapping), and the story is ready to go
- `stories/doing/` — in progress
- `stories/done/` — complete

### Naming

- Each story file is named `NNNN-kebab-case-title.md`, e.g. `0001-instructions.md`.
- `NNNN` is a zero-padded, four-digit number. A new story takes the next unused number across **all five**
  folders (`icebox`, `todo`, `ready`, `doing` and `done`).
- The number is a permanent identifier that reflects creation order only. It does **not** indicate priority.
- A story keeps its number for its whole life. When it moves between folders, it is moved, never renumbered.
- Refer to stories by number (e.g. "story 0001") in commit messages, branch names and discussion.

### Sliced-out stories

When a story is sliced out of another story (e.g. a New Story card during Example Mapping):

- It gets its own number and file in `stories/todo/`.
- It links back to the story it came from.
- The original story links to it from its New Stories section.
