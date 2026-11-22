# Example Mapping: The Inky Frame carries out SHOW instructions

## Story (yellow)

As an admin,
I want the Inky Frame to carry out the SHOW instructions it fetches,
so that I can make the real frame display a chosen photo remotely.

The frame is the C++ client in [`inky-frame-photo-gallery-cpp/`](../../inky-frame-photo-gallery-cpp/). It carries out
instructions exactly as the Photo Frame Simulator does in [story 0006](../done/0006-show-photo-instruction.md)
(Rules 7-10), and logs to the serial port where the simulator shows messages on its page. Every photo is assumed to be
600 × 448 pixels, the size of the screen.

Order: comes after [story 0016](../done/0016-frame-fetches-instructions.md), which makes the frame wake every 5
minutes, fetch `/instructions?after=N` (N from `/last_instruction.txt` on the SD card; no file means 0), log each
instruction it receives (`Received instruction <seq>: <text>`), and log failed fetches and WiFi failures. This story
keeps all of that. It also comes after [story 0014](../done/0014-unit-test-frame-client-on-host.md),
[story 0015](../done/0015-merge-frame-client-into-this-repo.md) and
[story 0018](../done/0018-fix-stack-buffer-in-read-text-file.md).

Constraints (stories 0016 and 0018): no exceptions, no large local variables, and the stack diagnostic stays in.
Drawing a photo used to reach a deepest stack use of 1320 of 2048 bytes; fetching and drawing happen one after the
other (not nested), but the `Stack ...` lines should be checked on the device.

Still to confirm on the device from story 0016 (not run there): that the frame runs a new cycle 5 minutes after
sleeping, both on USB power (wait, then reboot) and on battery (power off, then the RTC wakes it). This story's
checks depend on it.

Out of scope:

- The existing slideshow from `/list.txt` is not shown; it will be re-introduced in a later feature.
- Responses too big for the frame's buffer; see [story 0002](../icebox/0002-limit-instructions-per-response.md).
- Photos that are not 600 × 448: [story 0019](../todo/0019-scale-photos-to-fit-the-screen.md).

## Rules (blue)

### Rule 1: N is updated as in the simulator, and saved before anything is carried out
After a successful fetch, N becomes the highest sequence number in the response, whether or not each instruction is
carried out successfully (story 0006, Rule 7). The new N is written to `/last_instruction.txt` before any photo is
downloaded or drawn. An empty response leaves N unchanged; after a failed fetch, N is unchanged. If writing the file
fails, the frame logs `Could not save N to /last_instruction.txt` and carries on.

### Rule 2: The photo from the last SHOW in a response is downloaded to the SD card, under its own path
If one response contains several SHOW lines, only the last one is carried out (story 0006, Rule 8). The photo is saved
on the SD card at the same path as in the SHOW (e.g. `/images/cat.jpg`), and kept there. It is downloaded to a
temporary file, which replaces the file at that path only when the download succeeds. The `/images/` folder is created
if it does not exist. A SHOW for a photo already on the card is downloaded again, because the file may have changed on
the server.

### Rule 3: The screen is only refreshed if the photo was decoded
If the photo cannot be decoded (e.g. it is not a valid JPEG), the current photo stays on the screen and the log says
`Could not draw <path>`. Before any SHOW has arrived, the screen is left as it is.

### Rule 4: An unknown instruction is ignored and logged
The serial log says `Ignoring unknown instruction <seq>: <text>`, as the simulator does (story 0006, Rule 9), in
addition to story 0016's `Received instruction <seq>: <text>`.

### Rule 5: When a download fails, the current photo stays and the old copy on the card is kept
A failed photo download is logged as (story 0006, Rule 10):

- an HTTP error -> `Could not download <path> (<status>)`
- the backend cannot be reached -> `Could not download <path>: could not reach the backend`

A failed fetch of `/instructions` is already logged by story 0016; this story keeps N and the photo unchanged. Either
way, the frame sleeps and tries again in the next cycle.

## Examples (green)

### For Rule 1: Updating and saving N
- N is 6; response is `7 SHOW /images/cat.jpg` and `8 sleep` -> N becomes 8 and is saved to `/last_instruction.txt`;
  the next cycle asks for `/instructions?after=8`
- N is 6; response is `7 SHOW /images/dog.jpg` and dog.jpg returns 404 -> N still becomes 7
- N is 8; response is empty (200) -> N stays 8 and the screen does not change
- Writing `/last_instruction.txt` fails -> the log says `Could not save N to /last_instruction.txt`, and the photo is
  still downloaded and drawn

### For Rule 2: Downloading the photo
- Response is `7 SHOW /images/cat.jpg` -> saved as `/images/cat.jpg` on the SD card, then drawn
- Response is `7 SHOW /images/cat.jpg` and `8 SHOW /images/dog.jpg` -> only dog.jpg is downloaded and drawn
- `/images/cat.jpg` on the card and on screen; `9 SHOW /images/cat.jpg` arrives -> downloaded again, replaced, and
  redrawn
- Fresh card with no `/images/` folder; `7 SHOW /images/cat.jpg` -> `/images/` is created and cat.jpg is saved there

### For Rule 3: Drawing the photo
- `/images/cat.jpg` downloads but is not a valid JPEG -> the current photo stays; the log says
  `Could not draw /images/cat.jpg`
- Start-up, response is empty -> the screen is left as it is

### For Rule 4: Unknown instructions
- `8 sleep` -> ignored; the serial log says `Received instruction 8: sleep` and
  `Ignoring unknown instruction 8: sleep`

### For Rule 5: Failures
- cat.jpg on screen; `8 SHOW /images/dog.jpg` arrives and dog.jpg returns 404 -> cat.jpg stays; the log says
  `Could not download /images/dog.jpg (404)`
- `/images/cat.jpg` on the card; downloading it again fails -> the old `/images/cat.jpg` is still there, unchanged
- cat.jpg on screen; the backend cannot be reached while downloading `/images/dog.jpg` -> cat.jpg stays; the log says
  `Could not download /images/dog.jpg: could not reach the backend`
- N is 12; `/instructions` returns 409 -> N stays 12 and the photo stays

## Questions (red)

No open questions - all ambiguities were resolved.

## New Stories (sliced out)

- [0014](../done/0014-unit-test-frame-client-on-host.md): Unit-test the C++ frame client on the host
- [0015](../done/0015-merge-frame-client-into-this-repo.md): Merge the C++ frame client into this repo
- [0016](../done/0016-frame-fetches-instructions.md): The Inky Frame wakes, fetches instructions and sleeps
- [0019](../todo/0019-scale-photos-to-fit-the-screen.md): Scale photos that are not 600 × 448 to fit the screen
