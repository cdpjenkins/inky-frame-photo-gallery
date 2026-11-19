# Example Mapping: Reject invalid request bodies with 400

## Story (yellow)

As an admin,
I want the backend to reject a request whose body is invalid with a 400, changing nothing,
so that a bad request can neither corrupt photo selections or instructions nor fail with a server error.

Raised by a code review of the backend. Covers `PATCH /api/photos/:filename`, `POST /admin/instructions` and
`POST /admin/show-photo`. `GET /instructions?after=` already rejects a bad `after` with 400 (story 0001).

## Rules (blue)

### Rule 1: `PATCH /api/photos/:filename` accepts only a JSON boolean `selected`
Any other value, including a missing `selected` or the strings `"true"` and `"false"`, gets a 400 with the JSON body
`{ "error": "selected must be true or false" }`, and the photo's selection is unchanged. If the photo is unknown and
`selected` is invalid, either the 404 or the 400 is acceptable: whichever is checked first wins.

### Rule 2: Extra fields in a PATCH body are ignored
Only `selected` is read; any other fields neither cause a rejection nor are stored.

### Rule 3: A PATCH body that is not valid JSON gets a 400 with a JSON error
The body is `{ "error": "Request body must be valid JSON" }`, not the HTML error page.

### Rule 4: `POST /admin/instructions` rejects a missing or non-string `text`
The admin page is re-rendered with a 400 and the message `Instruction must be text`, as story 0001 does for other
invalid instructions, and nothing is added. An empty `text` still gets story 0001's `Instruction must not be empty`.

### Rule 5: `POST /admin/show-photo` rejects a filename that cannot be shown
A missing filename, a filename containing whitespace or `/`, and a filename that is not a `.jpg` are all rejected.
The admin page is re-rendered with a 400 and the typed-SHOW message from story 0006, and nothing is added:

> A SHOW instruction must be in the form "SHOW /images/&lt;filename&gt;.jpg", where the filename contains no whitespace or "/".

### Rule 6: A rejected request uses up no sequence number

## Examples (green)

### For Rule 1: `selected` must be a boolean
- `cat.jpg` not selected; `{ "selected": true }` -> 200, `/list` includes `/images/cat.jpg` (as today)
- `cat.jpg` not selected; `{ "selected": "true" }` -> 400 with the error, `/list` does not include `/images/cat.jpg`
- `cat.jpg` selected; `{ "selected": "false" }` -> 400, `/list` still includes `/images/cat.jpg`
- `{}` (no `selected`) -> 400 with the error

### For Rule 2: Extra fields
- `cat.jpg` not selected; `{ "selected": true, "colour": "red" }` -> 200, `/list` includes `/images/cat.jpg`

### For Rule 3: Body that is not JSON
- Body `{selected:` -> 400 with `{ "error": "Request body must be valid JSON" }`

### For Rule 4: `text` must be a string
- No `text` field -> 400, `Instruction must be text`
- `text` sent twice (`text=a&text=b`) -> 400, `Instruction must be text`
- JSON `{ "text": 42 }` -> 400, `Instruction must be text`
- `text` is `""` -> 400, `Instruction must not be empty` (unchanged from story 0001)

### For Rule 5: Filename must be showable
- No `filename` -> 400, SHOW message
- `filename=my cat.jpg` -> 400, SHOW message
- `filename=cat.png` -> 400, SHOW message
- `filename=cat.jpg` -> `SHOW /images/cat.jpg` is added (as today)

### For Rule 6: No sequence number used up
- Latest seq is 3; a show-photo request with `my cat.jpg` is rejected; then "Show on frame" for `cat.jpg` ->
  `4 SHOW /images/cat.jpg`

## Questions (red)

No open questions - all ambiguities were resolved.

## New Stories (sliced out)

None - the scope held.
