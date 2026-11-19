# AGENTS.md

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
