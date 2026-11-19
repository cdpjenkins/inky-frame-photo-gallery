# Story: Reject invalid request bodies with 400

Status: Not yet example-mapped.

Raised by a code review of the backend.

## Context

Request bodies are not checked at the HTTP boundary:

- `PATCH /api/photos/:filename` stores any value of `selected`. The string `"false"` is stored and later treated as
  selected by `/list`.
- `POST /admin/instructions` with a missing or non-string `text` reaches `.trim()` and returns 500.
- `POST /admin/show-photo` with a filename that cannot be shown (e.g. `my cat.jpg`) or with no filename (which
  becomes `SHOW /images/undefined`) is rejected by `AddInstructionCommand`, but the route passes the error on and
  returns 500. The "Show on frame" buttons never send such a request, but the route does not guard against it. See
  [story 0006](../done/0006-show-photo-instruction.md).
