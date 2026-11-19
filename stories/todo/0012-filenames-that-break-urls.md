# Example Mapping: Disallow filenames that are not safe in URLs

## Story (yellow)

As an admin,
I want photos whose filenames contain characters that would need URL encoding to be disallowed,
so that every photo URL the backend and the frame use works without encoding.

Raised by a code review of the backend. None of the current photos have such names; this guards against future
files. An earlier version of this map encoded such filenames instead; that approach was dropped.

This story changes behaviour agreed in [story 0006](../done/0006-show-photo-instruction.md) (Rules 2 and 3: which
photos can be shown, and the SHOW error message). [Story 0011](../done/0011-reject-invalid-request-bodies.md)'s
show-photo rejections use the new message.

## Rules (blue)

### Rule 1: A photo's filename may contain only letters, digits, `-`, `.`, `_` and `~`
Letters are `A-Z` and `a-z` only, and digits `0-9` (RFC 3986's "unreserved" characters). A photo's filename must
also end in lowercase `.jpg`, as before. Replaces story 0006 Rule 2.

### Rule 2: A photo with a disallowed filename is left out everywhere
It has no gallery thumbnail, no Select checkbox and no "Show on frame" button, never appears in `/list` (even if it
was selected earlier), and is not served.

### Rule 3: Each time the image folder is read, a warning is logged for each disallowed photo
The folder is read for `/admin` and `/list`. The warning is logged with `console.warn` as
`Skipping photo with disallowed name: <filename>`. If this makes the logs busy, the admin must remove the file.
Files that are not photos (not ending in lowercase `.jpg`) are ignored silently, as before. Requests to `/images/`
and `/api/photos/` do not read the folder, so they log nothing.

### Rule 4: When photos were skipped, the admin page shows a notice
The notice is: `Some photos were skipped because their names contain characters that are not allowed.`
It does not list the skipped names.

### Rule 5: A typed SHOW must name a filename made only of allowed characters
Replaces story 0006 Rule 3's filename check. A rejected SHOW shows this message on the admin page (replacing story
0006's message everywhere, including show-photo rejections), is not added, and uses up no sequence number:

> A SHOW instruction must be in the form "SHOW /images/&lt;filename&gt;.jpg", where the filename contains only letters, digits, "-", ".", "_" and "~".

## Examples (green)

### For Rule 1: Allowed characters
- `cat.jpg`, `Summer_2024-07.jpg`, `a~b.jpg`, `.jpg` -> allowed
- `my cat.jpg` (space), `summer#1.jpg` (`#`), `what?.jpg` (`?`), `50%.jpg` (`%`), `café.jpg` (`é`), `it's.jpg`
  (`'`) -> disallowed

### For Rule 2: Left out everywhere
- `summer#1.jpg` in the folder -> no thumbnail, no Select checkbox, no "Show on frame" button on `/admin`
- `summer#1.jpg` selected earlier -> `/list` does not include it
- `GET /images/summer%231.jpg` -> 404
- `PATCH /api/photos/my%20cat.jpg` -> 404 `{ "error": "Not found" }`

### For Rule 3: Warnings
- Folder holds `cat.jpg` and `summer#1.jpg`; `/admin` is opened -> one warning:
  `Skipping photo with disallowed name: summer#1.jpg`; opened again -> logged again
- Folder holds `cat.jpg` and `summer#1.jpg`; `/list` is requested -> the same warning
- Folder holds `cat.png` and `bird.JPG` -> no warning

### For Rule 4: Admin notice
- Folder holds `my cat.jpg` and `summer#1.jpg` -> the notice is shown once
- Folder holds only allowed photos -> no notice
- Folder holds allowed photos and `cat.png` -> no notice

### For Rule 5: Typed SHOW
- `SHOW /images/Summer_2024-07.jpg` -> accepted
- `SHOW /images/.jpg` -> accepted
- `SHOW /images/summer#1.jpg` -> rejected with the new message
- `SHOW /images/my%20cat.jpg` -> rejected with the new message
- `SHOW /images/café.jpg` -> rejected with the new message
- show-photo with `filename=summer#1.jpg` (a crafted request; the page never offers it) -> 400 with the new message

## Questions (red)

No open questions - all ambiguities were resolved.

## New Stories (sliced out)

None - the scope held.
