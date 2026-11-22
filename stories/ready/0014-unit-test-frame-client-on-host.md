# Example Mapping: Unit-test the C++ frame client on the host

## Story (yellow)

As a developer of the frame client,
I want to build and run unit tests for its logic on my Mac, without the Pico SDK or the Inky Frame,
so that stories 0016 and 0013 can be built test-first.

Sliced out of [0013-frame-carries-out-show](0013-frame-carries-out-show.md) during its Example Mapping session.

Order: comes before [story 0016](0016-frame-fetches-instructions.md) and [story 0013](0013-frame-carries-out-show.md).

The frame client is in [`inky-frame-photo-gallery-cpp/`](../../inky-frame-photo-gallery-cpp/). Today it has no tests,
and all its logic is in `main.cpp`, mixed with calls to the Pico SDK and the Inky Frame hardware. Its firmware build
(`CMakeLists.txt`) is a Pico SDK build that cross-compiles for ARM, with C++17.

Out of scope:

- Moving logic out of `main.cpp` into portable, tested code: stories 0016 and 0013 do that, test-first.
- CI for the client: [story 0017](../todo/0017-ci-for-frame-client.md).

## Rules (blue)

### Rule 1: Tests are written with doctest
The single header is vendored as `inky-frame-photo-gallery-cpp/test/doctest.h`, from the doctest 2.4.12 release.
`test/test.cpp` provides the test runner's `main`. (This follows `~/GitProjects/sudoku/cpp-sudoku`, which uses
doctest the same way.)

### Rule 2: A separate host CMake project builds and runs the tests
`inky-frame-photo-gallery-cpp/test/CMakeLists.txt` builds a host test executable with C++17 (the firmware's
standard) and registers it with CTest (`enable_testing()` and `add_test`). It does not use the Pico SDK or the
Pimoroni libraries, so it builds on the Mac with only CMake and a C++ compiler. The firmware's `CMakeLists.txt` is
unchanged.

### Rule 3: The tests run with one documented command sequence
From `inky-frame-photo-gallery-cpp/`:

```
cmake -S test -B build-host
cmake --build build-host
ctest --test-dir build-host --output-on-failure
```

`build-host/` is ignored by git. The commands are documented in `AGENTS.md` (replacing its "no host-side tests yet
(story 0014)") and in the client's `README.md`.

### Rule 4: The story delivers the harness with one trivial test
Logic is moved into tested, portable code by later stories.

## Examples (green)

### For Rule 1: doctest
- `test/doctest.h` is doctest 2.4.12; `test/test.cpp` defines the runner's `main` with
  `DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN`

### For Rule 2: Separate host project
- On the Mac, with no Pico SDK or Pimoroni libraries on the path, `cmake -S test -B build-host` configures
  successfully
- The firmware build from `inky-frame-photo-gallery-cpp/` is unchanged and still builds (checked by hand by the admin)

### For Rule 3: Documented commands
- The three commands, run on a fresh checkout -> they build, and CTest reports 1 test passed
- After running them, `git status` shows nothing new (`build-host/` is ignored)

### For Rule 4: One trivial test
- The trivial test, run as above -> passes
- The trivial test temporarily changed to fail -> CTest reports the failure and exits non-zero (checked by hand, not
  committed)

## Questions (red)

No open questions - all ambiguities were resolved.

## New Stories (sliced out)

None - the scope held.
