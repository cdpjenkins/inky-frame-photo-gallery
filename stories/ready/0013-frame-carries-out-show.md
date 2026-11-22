# Example Mapping: The Inky Frame carries out SHOW instructions

## Story (yellow)

As an admin,
I want the Inky Frame to carry out the SHOW instructions it fetches,
so that I can make the real frame display a chosen photo remotely.

The frame is the C++ client in [`inky-frame-photo-gallery-cpp/`](../../inky-frame-photo-gallery-cpp/). It carries out instructions exactly as
the Photo Frame Simulator does in [story 0006](../done/0006-show-photo-instruction.md) (Rules 7-10), and logs to the
serial port where the simulator shows messages on its page.

Order: comes after [story 0016](0016-frame-fetches-instructions.md), which makes the frame wake every 5 minutes, fetch
`/instructions?after=N` (N from a file on the SD card), log each instruction it receives, and log failed fetches and
WiFi failures. This story keeps all of that, including logging each received instruction. It also comes after
[story 0014](../doing/0014-unit-test-frame-client-on-host.md) and
[story 0015](../done/0015-merge-frame-client-into-this-repo.md).

Out of scope:

- The existing slideshow from `/list.txt` is not shown; it will be re-introduced in a later feature.
- Responses too big for the frame's buffer; see [story 0002](../icebox/0002-limit-instructions-per-response.md).

## Rules (blue)

### Rule 1: N is updated as in the simulator
After a successful fetch, N becomes the highest sequence number in the response, whether or not each instruction was
carried out successfully, and the new N is written to the SD card file. An empty response leaves N unchanged. After a
failed fetch, N is unchanged. (Story 0006, Rule 7.)

### Rule 2: The photo from the last SHOW in a response is downloaded and drawn
If one response contains several SHOW lines, only the last one is carried out (story 0006, Rule 8). Before any SHOW
has arrived, the screen is left as it is. A SHOW for the photo already on screen is still downloaded and redrawn,
because the file may have changed on the server.

### Rule 3: An unknown instruction is ignored and logged
The serial log says `Ignoring unknown instruction <seq>: <text>`, as the simulator does (story 0006, Rule 9), in
addition to story 0016's `Received instruction <seq>: <text>`.

### Rule 4: When a download or fetch fails, N and the current photo are unchanged
A failed photo download is logged as `Could not download <path> (<status>)` (story 0006, Rule 10). A failed fetch is
already logged by story 0016; this story keeps N and the photo unchanged. Either way, the frame sleeps and tries
again in the next cycle.

## Examples (green)

### For Rule 1: Updating N
- N is 6; response is `7 SHOW /images/cat.jpg` and `8 sleep` -> N becomes 8; the next cycle asks for
  `/instructions?after=8`
- N is 6; response is `7 SHOW /images/dog.jpg` and dog.jpg returns 404 -> N becomes 7
- N is 8; response is empty (200) -> N stays 8 and the screen does not change

### For Rule 2: Drawing the photo
- Response is `7 SHOW /images/cat.jpg` -> cat.jpg is downloaded and drawn
- Response is `7 SHOW /images/cat.jpg` and `8 SHOW /images/dog.jpg` -> only dog.jpg is downloaded and drawn
- Start-up, response is empty -> the screen is left as it is
- cat.jpg on screen; `9 SHOW /images/cat.jpg` arrives -> cat.jpg is downloaded again and redrawn

### For Rule 3: Unknown instructions
- `8 sleep` -> ignored; the serial log says `Received instruction 8: sleep` and
  `Ignoring unknown instruction 8: sleep`

### For Rule 4: Failures
- cat.jpg on screen; `8 SHOW /images/dog.jpg` arrives and dog.jpg returns 404 -> cat.jpg stays; log says
  `Could not download /images/dog.jpg (404)`
- N is 12; `/instructions` returns 409 -> N stays 12 and the photo stays
- N is 8; backend cannot be reached -> N stays 8 and the photo stays

## Questions (red)

No open questions - all ambiguities were resolved.

## New Stories (sliced out)

- [0014](../doing/0014-unit-test-frame-client-on-host.md): Unit-test the C++ frame client on the host
- [0015](../done/0015-merge-frame-client-into-this-repo.md): Merge the C++ frame client into this repo
- [0016](0016-frame-fetches-instructions.md): The Inky Frame wakes, fetches instructions and sleeps
