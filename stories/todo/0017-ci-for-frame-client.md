# Story: Get CI working for the C++ frame client

Status: Not yet example-mapped.

Sliced out of [0015-merge-frame-client-into-this-repo](../done/0015-merge-frame-client-into-this-repo.md) while scoping it.

## Context

The C++ client's old repo had a CMake workflow (`.github/workflows/cmake.yml`), dropped when the client moved into
`inky-frame-photo-gallery-cpp/` in this repo (story 0015). It would not have worked as it was:

- It ran on `ubuntu-20.04`, which GitHub has retired.
- It checked the project out at the repo root (`path: project`), not in a subdirectory.
- It needs the Pico SDK (`raspberrypi/pico-sdk`, with submodules) and the Pimoroni libraries
  (`pimoroni/pimoroni-pico`), and the ARM toolchain (`gcc-arm-none-eabi`, newlib).
- It also built and uploaded release packages when a GitHub release was created.

A new workflow should build the firmware from `inky-frame-photo-gallery-cpp/`, and run the host-side unit tests once
[story 0014](../doing/0014-unit-test-frame-client-on-host.md) adds them. `wifi_settings.h` is not committed, so CI will
need a stand-in built from `wifi_settings_template.h`.

## Note: how the firmware build finds `wifi_settings.h` today

`CMakeLists.txt` already provides a stand-in: it copies `wifi_settings_template.h` to `wifi_settings.h` in the build
directory, with the comment "This will make CI build work but won't actually help it to run...". Its condition,
`if (NOT wifi_settings.h)`, tests a CMake variable of that name rather than the file, so it is always true and the
copy is made on every build. This does no harm when a real `wifi_settings.h` exists next to `main.cpp`: `main.cpp`
includes `"wifi_settings.h"`, and the compiler finds the real file in `main.cpp`'s own directory before the copy in
the build directory (checked with a CLion build on 2026-11-22). But when there is no real file, as in CI or on a fresh
checkout, the firmware builds without any warning using the template's placeholder SSID and password, and only fails
on the frame with a WiFi error. To decide in this story: keep the stand-in for CI, and whether a build that uses only
the template should warn (for example a CMake `message(WARNING ...)` when the real file is missing).
