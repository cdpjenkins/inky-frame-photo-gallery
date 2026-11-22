# Example Mapping: Unit-test the C++ frame client on the host

## Story (yellow)

As a developer of the frame client,
I want to build and run unit tests for its logic on my Mac, without the Pico SDK or the Inky Frame,
so that stories 0016 and 0013 can be built test-first.

Sliced out of [0013-frame-carries-out-show](../ready/0013-frame-carries-out-show.md) during its Example Mapping session.

Order: comes before [story 0016](../ready/0016-frame-fetches-instructions.md) and [story 0013](../ready/0013-frame-carries-out-show.md).

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

## Test list

This story builds the test harness itself, so there is no test mechanism to write inactive tests in yet. The tests
are acceptance checks instead: each is a command, run from `inky-frame-photo-gallery-cpp/` unless it says otherwise,
with its exact expected result. An unticked box is an inactive test; tick each one when it has been made to pass.
Driving checks come first, in order; verification checks are expected to pass once the driving checks they name do.

The Pico SDK and Pimoroni library paths are set in the developer's environment (`PICO_SDK_PATH`,
`PIMORONI_PICO_PATH`), so checks that prove the host build does not need them unset both.

### Driving checks

1. [x] **Configures without the Pico SDK or Pimoroni libraries** (Rule 2):
   `env -u PICO_SDK_PATH -u PIMORONI_PICO_PATH cmake -S test -B build-host` -> exits 0.
2. [x] **Builds the host test executable** (Rules 1 and 2):
   `env -u PICO_SDK_PATH -u PIMORONI_PICO_PATH cmake --build build-host` -> exits 0 and produces
   `build-host/host_tests`. (Corrected during implementation: an empty project also builds with exit 0, so the check
   now also requires the test executable.)
3. [x] **CTest runs one passing test** (Rules 2 and 4):
   `ctest --test-dir build-host --output-on-failure` -> exits 0 and reports
   `100% tests passed, 0 tests failed out of 1`.
4. [x] **Builds as C++17** (Rule 2): `test/CMakeLists.txt` sets `CMAKE_CXX_STANDARD` to `17`
   (`grep -n "CMAKE_CXX_STANDARD 17" test/CMakeLists.txt` -> one match).
5. [x] **`build-host/` is ignored** (Rule 3): after checks 1-3, `git status --short` -> shows nothing for
   `build-host/`.
6. [x] **The commands are documented** (Rule 3): `AGENTS.md` and `inky-frame-photo-gallery-cpp/README.md` each give the
   three commands of Rule 3, and `AGENTS.md` no longer says the client has "no host-side tests yet (story 0014)".

### Verification checks

7. [x] **doctest is the 2.4.12 release** (Rule 1; relies on check 2):
   `grep -E '#define DOCTEST_VERSION_(MAJOR 2|MINOR 4|PATCH 12)$' test/doctest.h` -> three matches. (Corrected during
   implementation: doctest builds `DOCTEST_VERSION_STR` from these three numbers, so the text `"2.4.12"` never
   appears in the header.)
8. [x] **The runner's `main` comes from doctest** (Rule 1; relies on check 2):
   `grep -n DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN test/test.cpp` -> one match.
9. [x] **The host build uses no Pico SDK or Pimoroni code** (Rule 2; relies on checks 1-2):
   `grep -n -i -E 'pico|pimoroni' test/CMakeLists.txt` -> no matches.
10. [x] **A failing test is visible** (Rule 4; relies on check 3; by hand, not committed): temporarily change the
    trivial test to fail, rebuild and run `ctest --test-dir build-host --output-on-failure` -> exits non-zero and
    reports `0% tests passed, 1 tests failed out of 1`; then undo the change.
11. [x] **Works on a fresh checkout** (Rule 3; relies on checks 1-5): in a fresh clone of the repo, the three commands
    of Rule 3, run from `inky-frame-photo-gallery-cpp/` -> all exit 0 and CTest reports 1 test passed.
12. [x] **The firmware build is unchanged** (Rule 2; relies on all of the above): `git diff 3d73cad -- CMakeLists.txt`
    -> no changes (passes); the admin built the firmware by hand as before, and ran it on the frame: it works.

## Questions (red)

No open questions - all ambiguities were resolved.

## New Stories (sliced out)

None - the scope held.
