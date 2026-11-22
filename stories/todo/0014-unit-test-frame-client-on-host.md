# Story: Unit-test the C++ frame client on the host

Status: Not yet example-mapped.

Sliced out of [0013-frame-carries-out-show](../ready/0013-frame-carries-out-show.md) during its Example Mapping session.

Order: comes before [story 0016](../ready/0016-frame-fetches-instructions.md) and [story 0013](../ready/0013-frame-carries-out-show.md).

## Context

The C++ frame client ([`inky-frame-photo-gallery-cpp/`](../../inky-frame-photo-gallery-cpp/)) has no tests, and all its logic is in `main.cpp`,
mixed with calls to the Pico SDK and the Inky Frame hardware. To build stories 0016 and 0013 test-first, the
instruction logic (parsing responses, updating N, choosing the last SHOW, handling failures) needs to be plain C++
that can be built and unit-tested on the development machine, with the hardware behind small interfaces.

One option for the test library: **doctest**, as used in `~/GitProjects/sudoku/cpp-sudoku`. There, the single
header is vendored as `test/doctest.h`, `test/test.cpp` provides the test runner's `main`, and CMake builds a separate
host test executable (`cpp_sudoku_doctest`) from the tests plus the source files under test, run through CTest
(`enable_testing()` and `add_test`).
