# Code review: the C++ Inky Frame client

Reviewed on 2026-11-22, before stories 0016 and 0013 add instruction handling. The client is a working spike: WiFi,
the SD card, JPEG decoding and the e-ink display all work, which is the hard part on this hardware. It is not yet a
structure to build on.

## The likely cause of the freezes: a stack overflow

Core 0's stack is only 2 KB, and `read_text_file` declares a 16 KB local buffer, so calling it silently overwrites
about 14 KB of other memory, including the top of the heap. That would explain the freezes seen when returning
`std::string`s or throwing exceptions, and the "memory getting trampled" comment in `HttpConnection.cpp`. Fixing and
confirming this is [story 0018](../stories/doing/0018-fix-stack-buffer-in-read-text-file.md), to be done before story
0016.

## Other problems, roughly by risk

### 1. `HttpConnection::do_request` can hang forever

It busy-waits until `completed` is set, which only happens in the result callback. If `httpc_get_file` fails
immediately, its error is printed but not checked, the callback may never be called, and the loop never ends. There
is also no timeout. Story 0016's "if a fetch fails, log it and sleep" needs this fixed.

### 2. HTTP status codes are ignored

`srv_res` (the HTTP status) is never checked, so the body of a 404 or 409 is written to the file as if it were the
download. Story 0013 needs `Could not download /images/dog.jpg (404)`, and story 0016 needs
`Could not fetch instructions (409)`.

### 3. Exceptions are used for ordinary failures

WiFi failures, file errors and oversized files throw; `main()` catches them once and the program then stops for good.
Story 0016 needs "log, sleep, try again", i.e. error results rather than exceptions. Also, the `HttpConnection`
constructor throws after allocating its three buffers with `new[]`, so they leak (its destructor does not run).

### 4. Small bugs

- The `HttpConnection` constructor initialises `file_handle(file_handle)`, i.e. the member from itself.
- `draw_jpeg` ignores whether `jpeg.open` succeeded. It also overwrites the requested width and height with the
  JPEG's own size, so the `600, 448` passed in are never used.
- `jpegdec_open_callback` leaks its `new FIL` when `f_open` fails.
- `read_text_file` does not close the file when it is too large.
- `filesystem_list` and `display_images_by_listing_directory` each leak a `new DIR()`, and neither is used.
- The check in `http_body_received` compares a packet's size with `BUFFER_CAPACITY`, but nothing is buffered (the
  data goes straight to the file). Its local `size` also shadows the member of the same name.
- `photo_gallery_main` is declared to return `int` but returns nothing.

### 5. Heavy library features

`iostream`, `stringstream` and `std::string` add a lot of code size and heap use. That is fine with about 166 KB of
heap, but worth keeping out of hot paths; `printf` is lighter for logging.

## Structure

- **Everything is in `main.cpp`**: global hardware objects (`inky`, `fs`, `jpeg`), the JPEGDEC callbacks (with global
  state to pass data into them, as its `TODO` notes), reading files from the SD card, connecting to WiFi, and the
  slideshow loop, plus two unused functions.
- **`HttpConnection`** mixes HTTP with writing to the SD card, and turns lwIP's asynchronous callbacks into a blocking
  call by busy-waiting.
- **Nothing is unit-testable yet**: all the logic depends on Pico, FatFs or lwIP headers. The only portable function is
  `split_by_newlines`.
- **Settings are hard-coded**: `SERVER_IP` and port 8000 are in the code, and `USE_WIFI` is `false` while
  `connect_wifi()` runs anyway.

## Recommendations for stories 0016 and 0013

Use the same shape as the backend's Photo Frame Simulator: **portable logic in its own files, with the hardware behind
small interfaces ("ports")**.

- **Pure functions in plain C++17**, unit-tested on the host with the doctest harness from story 0014: parsing
  `/instructions` responses into `(seq, text)` items, working out the new N, finding the last SHOW, and classifying
  instructions as SHOW or unknown.
- **Interfaces for the hardware**: HTTP fetch, the N file, downloading and drawing a photo, logging and sleeping. The
  device code implements them with lwIP, FatFs, the Inky Frame library and `inky.sleep`; the tests use fakes.
- **Memory rules that fit the device**:
  - no large local variables; big buffers are `static`, or are passed in by the caller
  - parse text in place with `std::string_view` (C++17), which does not allocate, rather than building `std::string`s
  - return small result structs or status codes, not exceptions
  - make fixed limits (such as the response buffer's size) explicit, and report going over one as a failure
- **Fix the network edge cases in story 0016**: a timeout and failed-start handling in `do_request`, and checking the
  HTTP status.
