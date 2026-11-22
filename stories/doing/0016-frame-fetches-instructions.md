# Example Mapping: The Inky Frame wakes, fetches instructions and sleeps

## Story (yellow)

As an admin,
I want the Inky Frame to wake up regularly, fetch the instructions from the backend and log them,
so that the frame is connected to the backend and ready to carry out instructions.

The frame is the C++ client in [`inky-frame-photo-gallery-cpp/`](../../inky-frame-photo-gallery-cpp/). This story was sliced from
[story 0013](../ready/0013-frame-carries-out-show.md), which builds on it to carry out SHOW.

Order: comes after [story 0014](../done/0014-unit-test-frame-client-on-host.md) (host-side unit tests),
[story 0015](../done/0015-merge-frame-client-into-this-repo.md) (merge the frame client into this repo) and
[story 0018](../done/0018-fix-stack-buffer-in-read-text-file.md) (fix the 16 KB stack buffer in `read_text_file`), and
before story 0013. See also the review of the client in
[`inky-frame-photo-gallery-cpp/REVIEW.md`](../../inky-frame-photo-gallery-cpp/REVIEW.md).

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

## What was done

- **One cycle per wake-up** (`main.cpp`): mount the SD card, connect to WiFi, read N, fetch
  `/instructions?after=N` into `/instructions.txt` on the SD card, log each instruction, then sleep. The slideshow is
  gone; the JPEG drawing code stays for story 0013.
- **Sleeping**: `sleep_until_next_cycle()` does what `inky.sleep(5)` does (sets the RTC timer and releases the
  power-hold pin). On battery the power goes off there, and the RTC powers the frame on again 5 minutes later, which
  starts a fresh cycle. `inky.sleep()` would then loop forever, so on USB power (where the power cannot go off) the
  frame would never run another cycle; instead it waits 5 minutes and reboots, which is also a fresh start.
- **No exceptions**: connecting to WiFi, mounting the SD card, reading files and HTTP requests return results.
  `HttpConnection` now reports the HTTP status, and returns at once if a request cannot be started (lwIP's own
  15-second timeout covers a backend that stops answering).
- **Portable code**: `Instructions.hpp/.cpp` parse `/instructions` responses and N in place (`std::string_view`, no
  heap), with host tests in `test/InstructionsTest.cpp` (9 test cases).
- **Memory**: the largest stack frames on a cycle's path are `http_get_to_file` (664 bytes), `read_text_file` (632)
  and `run_cycle` (208), measured with `gcc -fstack-usage`.
- **Settings**: `wifi_settings_template.h` gains `SERVER_ADDRESS` and `SERVER_PORT` (3000).

## Decisions made during implementation

These were not fixed by the rules above:

- The N file is `/last_instruction.txt`, holding N as a decimal number (story 0013 will write it).
- If that file exists but does not hold a number, the frame logs
  `/last_instruction.txt does not hold a sequence number, so N is 0` and uses 0.
- A response larger than the 16 KB buffer is logged as
  `Could not read the instructions: the response is larger than 16383 bytes`, and the frame tries again next cycle.
- If the SD card cannot be mounted, the frame logs `Could not mount the SD card` and tries again next cycle (the
  response is downloaded to the SD card, so a cycle cannot work without it).

## Fixed while checking on the device

- **Uninitialised proxy settings**: `HttpConnection::do_request` set only the callbacks in lwIP's
  `httpc_connection_t`, leaving `use_proxy`, `proxy_addr` and `proxy_port` with whatever was on the stack. With story
  0018's stack painting that was `0xDEADBEEF`, so lwIP sent every request to a "proxy" at `222.173.190.239:48879`,
  and every fetch timed out (`result 5`). The settings are now zero-initialised. This probably also explains earlier
  unreliable networking.

## Device checks (by the admin, on the Inky Frame)

Before building: add `SERVER_ADDRESS` (the backend's IP address) and `SERVER_PORT 3000` to the real
`wifi_settings.h`, as in the template. Run the backend with `npm run dev` from `backend-ts/`; its log shows each
request the frame makes (e.g. `GET /instructions?after=0 200`).

On USB power, watching the serial log:

1. [x] **First cycle, no N file**: the log shows `No /last_instruction.txt, so N is 0`, the backend logs
   `GET /instructions?after=0`, and the frame logs `Received instruction <seq>: <text>` for each instruction (e.g.
   add `SHOW /images/cat.jpg` and `sleep` on the admin page first).
   Result (2026-11-22): passes, after fixing uninitialised proxy settings in `HttpConnection` (see below). The log
   shows `HTTP request done: result 0, status 200`, `123 bytes downloaded`, then
   `Received instruction 1: SHOW /images/Wedding_Day_Katie_and_Chris_319.jpg_scaled.jpg` and
   `Received instruction 2: SHOW /images/Wedding_Day_Katie_and_Chris_267.jpg_scaled.jpg`, then
   `Sleeping for 5 minutes`. The stack's deepest use was 1880 of 2048 bytes, leaving only 168 bytes.
2. [ ] **No instructions**: with no instructions on the backend, no `Received instruction` line is logged.
3. [ ] **Sleep and next cycle**: the log shows `Sleeping for 5 minutes`, and 5 minutes later
   `Still powered (USB), so restarting for the next cycle`; the next cycle asks for `/instructions?after=0` again
   (N does not change in this story).
4. [x] **Backend unreachable**: with the backend stopped, the log shows `Could not reach the backend`, then
   `Sleeping for 5 minutes`.
   Result (2026-11-22): seen by accident, with `SERVER_ADDRESS` set to an address where nothing listens
   (`192.168.1.51`): the request timed out (`result 5, status 0`), the frame logged `Could not reach the backend`,
   then `Sleeping for 5 minutes`, without hanging.
5. [ ] **WiFi failure**: with a wrong WiFi password in `wifi_settings.h` (temporarily), the log shows
   `Could not connect to WiFi: ...`, then `Sleeping for 5 minutes`.
6. [ ] **Screen**: the screen is left as it was in every cycle.
7. [ ] **Stack**: every `Stack ...` line says the stack pointer is above the bottom of the stack.

On battery:

8. [ ] **Power off and wake**: the frame powers off after a cycle, and the backend logs a new
   `GET /instructions?after=0` about every 5 minutes.

Needing the SD card (optional until it can be read on the Mac):

9. [ ] **N from the file**: with `/last_instruction.txt` holding `8` (and at least 8 instructions on the backend), the
   frame asks for `/instructions?after=8`.
10. [ ] **Fetch error**: with `/last_instruction.txt` holding a number above the latest sequence number, the backend
    answers 409 and the frame logs `Could not fetch instructions (409)`.
