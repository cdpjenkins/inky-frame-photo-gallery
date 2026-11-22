# Inky Frame Photo Gallery

A photo gallery for the Pimoroni Inky Frame: a backend where an admin chooses photos and sends instructions, and the
C++ client that runs on the frame.

| Directory | What it is |
|---|---|
| [`backend-ts/`](backend-ts/) | The TypeScript backend (Express): the admin page, the endpoints the frame uses (`/list`, `/instructions`, `/images/...`), and a browser-based Photo Frame Simulator at `/simulator` |
| [`inky-frame-photo-gallery-cpp/`](inky-frame-photo-gallery-cpp/) | The C++ client for the Inky Frame (Raspberry Pi Pico W), built with the Pico SDK and the Pimoroni libraries |
| [`stories/`](stories/) | The backlog for both, one story per file; see [`AGENTS.md`](AGENTS.md) for the conventions |

## Backend

From `backend-ts/`:

```bash
npm ci                    # install dependencies
npm test                  # run the tests
npm run build             # compile the server and the simulator
npm run dev               # run the server on http://localhost:3000 (photos from ./images, or IMAGE_DIR)
```

Then open http://localhost:3000/admin to choose photos and send instructions, and http://localhost:3000/simulator to
try them out without a frame.

## Inky Frame client

From `inky-frame-photo-gallery-cpp/`: create `wifi_settings.h` from `wifi_settings_template.h` (it is not committed),
then build with CMake against the Pico SDK and the Pimoroni libraries, as described in its
[`README.md`](inky-frame-photo-gallery-cpp/README.md).

## Licence

MIT; see [`LICENCE`](LICENCE).
