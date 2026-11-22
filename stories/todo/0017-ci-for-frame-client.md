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
[story 0014](0014-unit-test-frame-client-on-host.md) adds them. `wifi_settings.h` is not committed, so CI will need a
stand-in built from `wifi_settings_template.h`.
