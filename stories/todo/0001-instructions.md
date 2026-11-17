# Example Mapping: Instructions

## Story (yellow)

As an admin,
I want to add instructions to a list that the photo frame retrieves,
so that I can remotely control what photos the frame displays, and for how long, without rebuilding the frame's code.

An instruction is a free-text instruction to a photo frame to take some action (e.g. "display a particular photo",
"download a photo from the backend", "download a list of photos from the server"). The actions themselves are not
defined in this story; the backend stores and returns the text without interpreting it.

The frame consumes each instruction once. It keeps persisted state holding the sequence number of the last
instruction it consumed (N), and asks the backend for instructions after N.

Note: named "Instruction" (not "Command") to avoid confusion with the existing `*Command` business-logic classes
such as `TogglePhotoSelectionCommand`.

## Rules (blue)

### Rule 1: Each added instruction gets the next sequence number
Sequence numbers start at 1 and increase by 1 with each instruction added.

### Rule 2: Instructions are trimmed, then validated
Leading/trailing whitespace is trimmed before validation. An instruction is rejected if, after trimming, it is empty,
longer than 100 characters, or contains a newline (`\n`) or carriage return (`\r`). A rejected instruction shows an
error message on the admin page, is not added, and does not use up a sequence number.

Because trimming happens first, a trailing newline is trimmed away and the instruction is accepted. This is accepted
for now; changing it would be a new story.

### Rule 3: The frame receives all instructions with a sequence number greater than N, in ascending order
A brand-new frame sends N=0 to receive all instructions.

### Rule 4: The response is text/plain, one instruction per line, as `<seq> <text>`
Sequence number, a single space, then the instruction text.

### Rule 5: A missing or invalid N, or an N ahead of the backend, is an error
Missing, empty or invalid N (non-numeric, negative, non-integer, or not written as plain decimal digits) -> 400 Bad Request. Sequence numbers are integers.
N greater than the latest sequence number -> 409 Conflict.

### Rule 6: Instructions and the sequence counter survive a backend restart
Sequence numbers are never reused.

### Rule 7: The /admin page lists the instructions added so far
Shown in ascending order with their sequence numbers. Instructions are added via a form on the /admin page.

## Examples (green)

### For Rule 1: Each added instruction gets the next sequence number
- No instructions yet; admin adds "display /images/cat.jpg" -> it gets seq 1
- Instructions 1-3 exist; admin adds "sleep" -> it gets seq 4

### For Rule 2: Instructions are trimmed, then validated
- "  sleep  " -> stored as "sleep"
- "" -> rejected as empty, error message shown
- "   " -> rejected as empty, error message shown
- 100 characters after trimming -> accepted
- 101 characters after trimming -> rejected, error message shown
- "display\ncat.jpg" -> rejected (contains newline), error message shown
- "display\rcat.jpg" -> rejected (contains carriage return), error message shown
- "sleep\n" -> trimmed to "sleep" and accepted
- Latest seq is 3; admin submits "", then "sleep" -> "sleep" gets seq 4

### For Rule 3: The frame receives all instructions after N, ascending
- Instructions 1-5 exist; frame asks after 3 -> receives 4, then 5
- Instructions 1-5 exist; frame asks after 0 (first boot) -> receives 1-5
- Instructions 1-5 exist; frame asks after 5 -> empty response, 200
- No instructions exist; frame asks after 0 -> empty response, 200

### For Rule 4: Response format
- Seq 4 "display /images/cat.jpg" and seq 5 "sleep" -> `4 display /images/cat.jpg\n5 sleep`

### For Rule 5: Missing / invalid / too-high N
- No N sent -> 400
- N = "abc" -> 400
- N = -1 -> 400
- N = 12.5 -> 400
- N empty ("after=") -> 400
- N = " " (whitespace only) -> 400
- N = "0x10" (hexadecimal) -> 400
- N = "1e1" (exponent notation) -> 400
- Latest seq is 5; frame asks after 9 -> 409 Conflict

### For Rule 6: Persistence
- Instructions 1-5 exist; backend restarts -> 1-5 still returned, and the next instruction added gets seq 6

### For Rule 7: Admin page lists instructions
- Instructions 1-3 exist -> admin page shows 1, 2, 3 in that order with their sequence numbers

## Questions (red)

No open questions - all ambiguities were resolved.

## New Stories (sliced out)

- [0002](0002-limit-instructions-per-response.md): Limit the number of instructions returned in one response (the frame has limited memory)
- [0003](0003-per-frame-instructions.md): Send different instructions to different frames
- [0004](0004-edit-delete-instructions.md): Admin edits or deletes instructions
- [0005](0005-clean-up-old-instructions.md): Clean up old instructions so the list doesn't grow forever
