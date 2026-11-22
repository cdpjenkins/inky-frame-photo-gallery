# Example Mapping: The Inky Frame wakes, fetches instructions and sleeps

## Story (yellow)

As an admin,
I want the Inky Frame to wake up regularly, fetch the instructions from the backend and log them,
so that the frame is connected to the backend and ready to carry out instructions.

The frame is the C++ client in `~/GitProjects/inky-frame-photo-gallery-cpp`. This story was sliced from
[story 0013](0013-frame-carries-out-show.md), which builds on it to carry out SHOW.

Order: comes after [story 0014](../todo/0014-unit-test-frame-client-on-host.md) (host-side unit tests) and
[story 0015](../doing/0015-merge-frame-client-into-this-repo.md) (merge the frame client into this repo), and before
story 0013.

Out of scope:

- Carrying out instructions, and updating N: story 0013.
- The existing slideshow from `/list.txt` is not shown; it will be re-introduced in a later feature.
- Responses too big for the frame's buffer; see [story 0002](../icebox/0002-limit-instructions-per-response.md).

## Rules (blue)

### Rule 1: Every wake-up runs one cycle: connect, fetch, log, sleep
The cycle runs when the frame is powered on. At the end of it, the frame powers off with `inky.sleep` and wakes after
5 minutes, which starts the next cycle from scratch. The frame does not draw anything on the screen in this story.

### Rule 2: N comes from a file on the SD card; no file means 0
N is the sequence number of the last instruction the frame consumed. The frame asks for `/instructions?after=N`.
To reset N, delete the file. N does not change in this story (story 0013 updates it), so the frame asks for the same
instructions every cycle.

### Rule 3: Each instruction received is logged
The serial log (`cout`) says `Received instruction <seq>: <text>` for each instruction in the response.

### Rule 4: If WiFi fails to connect, the error is logged and the frame tries again next cycle
It sleeps for 5 minutes as usual. (Today the program stops for good when WiFi fails.)

### Rule 5: If a fetch fails, the error is logged and the frame tries again next cycle
The log messages are the simulator's (story 0006, Rule 10):

- `/instructions` returns an error -> `Could not fetch instructions (<status>)`
- the backend cannot be reached -> `Could not reach the backend`

### Rule 6: The server address and port come from `wifi_settings.h`
`wifi_settings_template.h` gains entries for the server address and port, with port 3000.

## Examples (green)

### For Rule 1: One cycle per wake-up
- Frame powers on -> connects to WiFi, fetches `/instructions?after=N`, logs the instructions, then sleeps for 5
  minutes; after waking, it repeats
- The screen is left as it is in every cycle

### For Rule 2: N on the SD card
- No N file on the SD card -> the frame asks for `/instructions?after=0`
- N file says 8 -> the frame asks for `/instructions?after=8`
- N file says 8; the response is `9 SHOW /images/cat.jpg` -> the next cycle still asks for `/instructions?after=8`

### For Rule 3: Logging received instructions
- Response is `7 SHOW /images/cat.jpg` and `8 sleep` -> the log says `Received instruction 7: SHOW /images/cat.jpg`
  and `Received instruction 8: sleep`
- Response is empty -> no instruction is logged

### For Rule 4: WiFi failure
- WiFi fails to connect -> the error is logged; the frame sleeps 5 minutes and tries again

### For Rule 5: Fetch failure
- `/instructions` returns 409 -> log says `Could not fetch instructions (409)`; the frame sleeps and tries again
- Backend cannot be reached -> log says `Could not reach the backend`; the frame sleeps and tries again

### For Rule 6: Server settings
- `wifi_settings.h` names the backend's address and port 3000 -> the frame fetches from that address and port

## Questions (red)

No open questions - all ambiguities were resolved.

## New Stories (sliced out)

None - this story was itself sliced out of story 0013.
