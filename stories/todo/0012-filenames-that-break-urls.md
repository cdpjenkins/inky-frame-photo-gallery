# Example Mapping: Handle filenames that are not safe in URLs

## Story (yellow)

As an admin,
I want photos whose filenames contain characters that mean something in a URL (such as `#`, `?` and `%`) to be
handled consistently,
so that the frame and the admin page never request the wrong file.

Raised by a code review of the backend. None of the current photos have such names; this guards against future
files. The real frame uses the paths it receives unchanged, so encoded paths work for it.

This story changes behaviour agreed in [story 0006](../done/0006-show-photo-instruction.md) (Rules 2 and 3) and
[story 0011](../done/0011-reject-invalid-request-bodies.md) (Rule 5); their tests are updated as part of this story.

## Rules (blue)

### Rule 1: A filename is URL-encoded wherever it is put into a URL
Standard URL encoding, as JavaScript's `encodeURIComponent`: letters, digits and `-_.!~*'()` stay as they are;
everything else is percent-encoded. Non-English letters are allowed and are encoded as UTF-8.

### Rule 2: Filenames shown as text stay unencoded
Only URLs are encoded.

### Rule 3: Every URL the admin page and `/list` produce uses the encoded filename
Thumbnail links and images, the Select checkbox's PATCH request, and the lines of `/list`.

### Rule 4: Any `.jpg` whose name contains no `/` can be shown, including names with whitespace
Replaces story 0006 Rule 2 and part of story 0011 Rule 5. The "Show on frame" button posts the plain filename; the
backend adds `SHOW /images/<encoded filename>`. A missing filename, a filename sent more than once, a filename that is
not a `.jpg`, and a filename containing `/` are still rejected with the SHOW message (as in story 0011).

### Rule 5: A typed SHOW's filename must be well-formed URL encoding
Replaces story 0006 Rule 3's filename check, together with Rules 6 and 7. The text after `SHOW /images/` may contain
only characters that standard encoding leaves as they are, and `%` only as the start of a `%XX` escape (two hex
digits). A SHOW that passes Rules 5-7 is stored as typed. A SHOW that fails any of them shows this message on the
admin page (replacing story 0006's message), is not added, and uses up no sequence number:

> A SHOW instruction must be in the form "SHOW /images/&lt;filename&gt;.jpg", where the filename is URL-encoded and contains no "/".

### Rule 6: A typed SHOW's filename must be in the standard encoded form
The text after `SHOW /images/` must be exactly what standard encoding produces for the decoded filename, so each
photo has one spelling: escapes only where encoding needs them, with uppercase hex digits.

### Rule 7: A typed SHOW's decoded filename must end in `.jpg` and contain no `/`

### Rule 8: A photo request is decoded to a filename, and a filename never contains `/`
`GET /images/...` accepts any valid encoding of a filename (only typed SHOW instructions require the standard form).
A request that decodes to a name containing `/` never serves a file outside the image directory.

## Examples (green)

### For Rule 1: Standard URL encoding
- `summer#1.jpg` -> `summer%231.jpg`
- `50%.jpg` -> `50%25.jpg`
- `what?.jpg` -> `what%3F.jpg`
- `café.jpg` -> `caf%C3%A9.jpg`

### For Rule 2: Text stays unencoded
- The `summer#1.jpg` thumbnail's label and alt text are `summer#1.jpg`

### For Rule 3: URLs use the encoded filename
- The `summer#1.jpg` thumbnail's link and image use `/images/summer%231.jpg`
- The `summer#1.jpg` Select checkbox sends `PATCH /api/photos/summer%231.jpg`; the selection is stored under
  `summer#1.jpg`
- `summer#1.jpg` selected -> `/list` includes `/images/summer%231.jpg`

### For Rule 4: Showable photos
- `my cat.jpg` has a "Show on frame" button; clicking it adds `SHOW /images/my%20cat.jpg`
- "Show on frame" for `summer#1.jpg` adds `SHOW /images/summer%231.jpg`
- show-photo with `filename=my cat.jpg` -> accepted (story 0011 rejected it)
- show-photo with a filename containing `/` -> 400, SHOW message
- show-photo with no filename, a filename sent twice, or `cat.png` -> 400, SHOW message (unchanged from story 0011)

### For Rule 5: Well-formed encoding
- `SHOW /images/my%20cat.jpg` -> accepted
- `SHOW /images/summer%231.jpg` -> accepted
- `SHOW /images/my cat.jpg` -> rejected (raw space)
- `SHOW /images/summer#1.jpg` -> rejected (raw `#`)
- `SHOW /images/50%.jpg` -> rejected (`%` not followed by two hex digits)

### For Rule 6: Standard form only
- `SHOW /images/what%3F.jpg` -> accepted
- `SHOW /images/what%3f.jpg` -> rejected (lowercase hex; the standard form is `what%3F.jpg`)
- `SHOW /images/c%61t.jpg` -> rejected (needless escape; the standard form is `cat.jpg`)

### For Rule 7: Decoded filename
- `SHOW /images/.jpg` -> accepted (empty name before `.jpg`)
- `SHOW /images/..%2Fsecret.jpg` -> rejected (decodes to a name containing `/`)
- `SHOW /images/cat.png` -> rejected (not a `.jpg`)

### For Rule 8: Serving photos
- `GET /images/summer%231.jpg` -> serves `summer#1.jpg`
- `GET /images/c%61t.jpg` -> serves `cat.jpg` (any valid encoding is accepted when serving)
- `GET /images/..%2Fsecret.jpg` -> 404, no file outside the image directory is served (already true today)

## Questions (red)

No open questions - all ambiguities were resolved.

## New Stories (sliced out)

None - the scope held.
