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

## What was done

- **Host-tested logic** (`Instructions.hpp/.cpp`, built test-first with `test/CarryOutTest.cpp`, 14 tests):
  `plan_response()` works out the new N (`highest_sequence_number()`, Rule 1), the SHOW to carry out (the last one,
  Rule 2) and the unknown instructions (Rule 4); `show_path_of()` recognises a SHOW exactly as the simulator does
  (`^SHOW (\S+)$`); `format_sequence_number()` writes N for `/last_instruction.txt`.
- **Device code** (`main.cpp`): after logging the instructions it received, the frame logs
  `Ignoring unknown instruction <seq>: <text>` for unknown ones, saves the new N, then shows the photo:
  - `save_n()` writes N to `/last_instruction.txt` before anything is carried out.
  - `show_photo()` creates the photo's folder (e.g. `/images`) if needed, downloads to `<path>.part`, and replaces
    `<path>` only after a 200; on any failure it deletes the `.part` file, so the old copy is kept.
  - `draw_photo()` decodes into the frame's picture memory and refreshes the screen only if decoding worked.
- **Memory**: every new buffer is static; the largest frame on a cycle's path is `run_cycle` (288 bytes, with
  `gcc -fstack-usage`).

## Decisions made during implementation

These messages were not fixed by the rules above:

- `Could not download <path>: the path is too long` (the path, plus `.part`, must fit HttpConnection's 128-byte
  buffer).
- `Could not download <path>: could not create its folder on the SD card`.
- `Could not download <path>: could not save it to the SD card` (the temporary file cannot be opened).
- `Could not download <path>: could not replace the copy on the SD card` (the old copy cannot be removed, or the
  temporary file cannot be renamed).
- Successes are also logged: `Saved N = <n> to /last_instruction.txt` and `Saved <path>`.

Only the last folder in a SHOW's path is created (enough for `/images/...`).

## Device checks (by the admin, on the Inky Frame)

Before building: nothing new in `wifi_settings.h`. Run the backend with `npm run dev` from `backend-ts/`.

On USB power, watching the serial log:

1. [ ] **Last SHOW is drawn**: with the backend's current instructions (`1 SHOW .../Wedding_Day_Katie_and_Chris_319...`
   and `2 SHOW .../Wedding_Day_Katie_and_Chris_267...`), the log shows `Saved N = 2 to /last_instruction.txt`, the
   backend logs `GET /images/Wedding_Day_Katie_and_Chris_267.jpg_scaled.jpg`, the log shows `Saved /images/...267...`,
   and the screen shows photo 267 (not 319).
2. [ ] **N is used next cycle**: in the next cycle (after `Still powered (USB), so restarting for the next cycle`), the
   frame asks for `/instructions?after=2`, and nothing is redrawn. This also confirms story 0016's check 3.
3. [ ] **Unknown instruction**: add `sleep` on the admin page; the next cycle logs `Received instruction 3: sleep` and
   `Ignoring unknown instruction 3: sleep`, saves N = 3, and the screen does not change.
4. [ ] **Same photo again**: click "Show on frame" for the photo already on screen; the next cycle downloads it again
   and redraws it.
5. [ ] **Download fails (404)**: type `SHOW /images/missing.jpg` on the admin page (a valid SHOW for a photo that does
   not exist); the next cycle logs `Could not download /images/missing.jpg (404)`, and the photo on screen stays.
6. [ ] **Cannot be drawn**: put a file that is not a JPEG, named e.g. `bad.jpg`, in the backend's images folder, and
   click "Show on frame" for it; the next cycle logs `Could not draw /images/bad.jpg`, and the photo on screen stays.
7. [ ] **Stack**: every `Stack ...` line, including `Stack after drawing a photo`, says the stack pointer is above the
   bottom of the stack.

On battery:

8. [ ] **Power off and wake**: after a cycle the frame powers off, and about 5 minutes later the backend logs a new
   `GET /instructions?after=<N>`. This confirms story 0016's check 8.

Needing the SD card (optional until it can be read on the Mac):

9. [ ] **Saved files**: `/last_instruction.txt` holds the last N, `/images/` holds the downloaded photos, and no
   `.part` files are left behind.
10. [ ] **Old copy kept**: with `/images/cat.jpg` on the card, a failed re-download leaves it unchanged.
