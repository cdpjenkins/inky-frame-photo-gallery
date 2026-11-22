# Story: Merge the C++ frame client into this repo

Status: Scoped (a restructuring task, not example-mapped or test-driven).

Sliced out of [0013-frame-carries-out-show](0013-frame-carries-out-show.md) during its Example Mapping session.

Order: comes before [story 0016](0016-frame-fetches-instructions.md) and [story 0013](0013-frame-carries-out-show.md).

## Story

As a developer of the photo gallery,
I want the TypeScript backend and the C++ Inky Frame client in one repo, each in its own subdirectory,
so that one story, branch and commit can cover a change to the instruction protocol on both sides, with one backlog
and one set of skills.

## Target layout

```
/
├── AGENTS.md, CLAUDE.md               shared; AGENTS.md describes the layout
├── LICENCE                            the one licence for the whole repo: MIT
├── .claude/                           shared skills and agents
├── stories/                           one backlog for both parts
├── README.md                          new: what is where, how to build and test each part
├── .gitignore                         root-level entries only (e.g. .DS_Store)
├── .github/workflows/ci.yml           the backend's CI, working in backend-ts/
├── backend-ts/                        the TypeScript backend: package.json, package-lock.json, src/, views/,
│                                      public/, test-fixtures/, tsconfig.json, tsconfig.simulator.json,
│                                      jest.config.js, and its own .gitignore entries
└── inky-frame-photo-gallery-cpp/      the C++ Inky Frame client, copied from
                                       ~/GitProjects/inky-frame-photo-gallery-cpp
```

## Scope

1. **Move the backend into `backend-ts/`** with `git mv`, so its history is kept (`git log --follow`). Its code
   should need no changes: its paths (`views/`, `public/`, `test-fixtures/`, `../../../test-fixtures`) are relative to
   its own files.
2. **Copy the C++ client into `inky-frame-photo-gallery-cpp/`** from its tracked files at commit `9da7db5`, without
   its git history. The commit message names the source repo and commit. Its untracked build output (`build/`,
   `cmake-build-debug/`) and IDE settings (`.idea/`) are not copied.
3. **Keep `stories/`, `AGENTS.md`, `CLAUDE.md` and `.claude/` at the root.**
4. **`.gitignore`:** the root `.gitignore` holds entries that apply everywhere (e.g. `.DS_Store`). Each subdirectory
   gets its own `.gitignore` with its existing entries (the backend's `/node_modules/`, `/dist/`, `/images`,
   `/public/js/`, ...; the C++ client's `build/*`, `.idea`, `cmake-build-debug-arm-none-eabi-gcc`,
   `wifi_settings.h`). `inky-frame-photo-gallery-cpp/wifi_settings.h` must be ignored before any C++ file is
   committed.
5. **`AGENTS.md`:** describe the layout, and say that backend commands (`npm ci`, `npm test`, `npx jest`,
   `npx tsc`, `npm run build:simulator`, `npm run dev`) run from `backend-ts/`.
6. **CI:** update `.github/workflows/ci.yml` to run in `backend-ts/` (`working-directory`, and the npm cache's
   `cache-dependency-path: backend-ts/package-lock.json`). It keeps running on every push and pull request to `main`
   (no path filter). The C++ client's CMake workflow is dropped; getting C++ CI working is
   [story 0017](../todo/0017-ci-for-frame-client.md).
7. **Story links:** update stories that point at `~/GitProjects/inky-frame-photo-gallery-cpp` (0013, 0014, 0016, and
   this one) to point at `inky-frame-photo-gallery-cpp/` in this repo.
8. **Root `README.md`:** a short page saying what each subdirectory is and how to build and test it.
9. **One licence, MIT, at the root, spelt `LICENCE`.** The backend's existing `LICENCE` (MIT, Copyright (c) 2026 Chris
   Jenkins) stays at the root rather than moving into `backend-ts/`. The C++ client's `LICENSE` (the Pimoroni
   boilerplate's BSD-style licence) is not copied. `backend-ts/package.json` gains `"license": "MIT"`. Files copied
   from third parties (e.g. `pico_sdk_import.cmake`, `pimoroni_pico_import.cmake`) keep any notices they carry.

## Done when

- [ ] The layout above is in place, and the backend's history is kept.
- [ ] From `backend-ts/`: `npm ci`, `npm run build`, `npm test` (all 143 tests pass) and `npm run build:simulator`
      work.
- [ ] CI passes on GitHub for the restructured repo.
- [ ] `inky-frame-photo-gallery-cpp/wifi_settings.h` is ignored by git.
- [ ] `AGENTS.md`, the root `README.md` and the story links describe the new layout.
- [ ] There is one licence file, `LICENCE` (MIT), at the root, and `backend-ts/package.json` says `"license": "MIT"`.
- [ ] The admin builds the C++ client by hand from `inky-frame-photo-gallery-cpp/` (the admin's responsibility).

## Out of scope (the admin does these later)

- Recreating `inky-frame-photo-gallery-cpp/wifi_settings.h` from the template (the real one is on another computer).
- Renaming this repo on GitHub, and renaming the local checkout to match.
- Archiving the old `inky-frame-photo-gallery-cpp` repo on GitHub.
- CI for the C++ client: [story 0017](../todo/0017-ci-for-frame-client.md).

## Decisions

- One licence for the whole repo: MIT, in a root `LICENCE` file (British spelling). Chosen over the Eclipse Public
  License 2.0 and GPL v3: the backend was already MIT, the C++ client and all its dependencies use permissive
  licences, and MIT is the simplest for a small project.
- The backend's CI runs on every push and pull request, with no path filter.
