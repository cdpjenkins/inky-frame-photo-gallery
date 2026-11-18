# Example Mapping: Show Photo Instruction

## Story (yellow)

As an admin,
I want to add a SHOW instruction for a specific photo, either by picking it in the admin GUI or by typing it,
so that I can remotely make a photo frame download and display that photo.

To test this without a real frame, the backend serves a Photo Frame Simulator at `/simulator` that fetches
instructions and carries out SHOW the way the frame would.

Note: these are "instructions" (see story 0001), not "commands". Instruction names are uppercase.

## Rules (blue)

### Rule 1: Picking a photo in the admin GUI adds a SHOW instruction with the next sequence number
The instruction text is `SHOW /images/<filename>`. The backend does not check that the photo exists.

### Rule 2: The picker lists only `.jpg` files whose names contain no whitespace or `/`
Any such `.jpg` in the image directory is allowed, whether or not it is marked as selected.

### Rule 3: A typed SHOW instruction is validated
After trimming (as in story 0001), a line is an attempted SHOW if its first word is `show` in any case. It is
accepted only if it is exactly `SHOW /images/<filename>.jpg`: uppercase `SHOW`, a single space, then a filename that
contains no whitespace or `/` and ends in lowercase `.jpg`. The file does not have to exist. A rejected SHOW shows
this error message on the admin page, is not added, and does not use up a sequence number:

> A SHOW instruction must be in the form "SHOW /images/&lt;filename&gt;.jpg", where the filename contains no whitespace or "/".

### Rule 4: Other typed instructions are stored as free text, unvalidated, as in story 0001
This is likely to change in a future story.

### Rule 5: The simulator is served at `/simulator`; "Fetch instructions" asks for instructions after N
Fetching happens only when the button is pressed.

### Rule 6: The simulator keeps N in local storage, displays it, and a Reset button sets it to 0

### Rule 7: Updating N is separate from carrying out instructions
After a successful fetch, N becomes the highest sequence number in the response, regardless of whether each
instruction was carried out successfully or was ignored. After a failed fetch (400, 409, backend unreachable), N is
unchanged.

### Rule 8: The simulator displays the photo from the last SHOW it fetched
No image is shown before any SHOW arrives. If one response contains several SHOW lines, the last one wins.

### Rule 9: The simulator ignores unknown instructions and logs a warning with `console.log()`

### Rule 10: On failure, the currently displayed photo stays and a message is shown on the page
Failures: the photo returns 404, `/instructions` returns an error (e.g. 409), or the backend cannot be reached.

## Examples (green)

### For Rule 1: Picking a photo adds a SHOW instruction
- Latest seq is 6; admin picks `cat.jpg` -> `7 SHOW /images/cat.jpg` is added

### For Rule 2: Picker contents
- `cat.jpg` -> listed
- `my cat.jpg` -> not listed
- `cat.png` -> not listed
- `cat.JPG` -> not listed

### For Rule 3: Typed SHOW validation
- `SHOW /images/cat.jpg` -> accepted
- `SHOW /images/dog.jpg` (dog.jpg does not exist) -> accepted
- `"  SHOW /images/cat.jpg  "` -> trimmed and accepted as `SHOW /images/cat.jpg`
- `SHOW` -> rejected, error message shown
- `SHOW cat.jpg` -> rejected
- `SHOW /images/cat.png` -> rejected
- `SHOW /images/cat.JPG` -> rejected
- `SHOW /images/my cat.jpg` -> rejected
- `SHOW /images/my<TAB>cat.jpg` -> rejected
- `SHOW  /images/cat.jpg` (two spaces) -> rejected
- `SHOW /images/cat.jpg extra` -> rejected
- `SHOW /images/../secret.jpg` -> rejected
- `show /images/cat.jpg` -> rejected
- `Show /images/cat.jpg` -> rejected
- Latest seq is 3; admin submits `SHOW cat.jpg`, then `SHOW /images/cat.jpg` -> the latter gets seq 4

### For Rule 4: Other instructions remain free text
- `sleep` -> accepted
- `SHOWING /images/cat.jpg` -> accepted (first word is not `show`)

### For Rule 5: Fetching
- N is 6; user clicks "Fetch instructions" -> simulator requests `GET /instructions?after=6`

### For Rule 6: N in local storage
- First visit -> N displayed as 0
- N is 8; page is reloaded -> N still displayed as 8
- N is 8; user clicks Reset -> N displayed as 0

### For Rule 7: Updating N
- N is 6; response is `7 SHOW /images/cat.jpg` and `8 sleep` -> N becomes 8
- N is 6; response is `7 SHOW /images/dog.jpg` and dog.jpg returns 404 -> N becomes 7
- N is 8; response is empty (200) -> N stays 8 and nothing on the page changes
- N is 12, latest seq is 8; `/instructions` returns 409 -> N stays 12 and an error message is shown

### For Rule 8: Displaying the photo
- Fresh simulator -> no image shown
- Response is `7 SHOW /images/cat.jpg` -> cat.jpg displayed
- Response is `7 SHOW /images/cat.jpg` and `8 SHOW /images/dog.jpg` -> dog.jpg displayed

### For Rule 9: Unknown instructions
- `8 sleep` -> ignored, warning logged
- `9 show /images/cat.jpg` (lowercase, stored as free text before this story) -> ignored, warning logged

### For Rule 10: Failures
- cat.jpg displayed; `8 SHOW /images/dog.jpg` arrives and dog.jpg returns 404 -> cat.jpg stays, message shown
- cat.jpg displayed; response is `8 SHOW /images/cat.jpg` and `9 SHOW /images/dog.jpg`, dog.jpg returns 404 -> the
  previously displayed photo stays (no fallback to seq 8), message shown
- cat.jpg displayed; `/instructions` returns 409 -> cat.jpg stays, message shown
- cat.jpg displayed; backend cannot be reached -> cat.jpg stays, message shown

## Questions (red)

No open questions - all ambiguities were resolved.

## New Stories (sliced out)

- [0007](../todo/0007-check-show-photo-exists.md): Check that a SHOW instruction's photo exists before adding it
- [0008](../todo/0008-support-other-image-formats.md): Support image formats other than `.jpg`
- [0009](../todo/0009-validate-other-instructions.md): Validate instructions other than SHOW

## Notes

This story has 10 rules, which is more than usual. Rules 5-10 concern the simulator and would split cleanly into a
separate story. We are trying it as one story because the simulator is needed to test SHOW; if it becomes
unmanageable, we will come back and slice it.
