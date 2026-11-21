# Story: Merge the C++ frame client into this repo

Status: Not yet example-mapped.

Sliced out of [0013-frame-carries-out-show](../ready/0013-frame-carries-out-show.md) during its Example Mapping session.

Order: comes before [story 0016](../ready/0016-frame-fetches-instructions.md) and [story 0013](../ready/0013-frame-carries-out-show.md).

## Context

The backend (this repo) and the C++ Inky Frame client (`~/GitProjects/inky-frame-photo-gallery-cpp`) implement one
shared protocol: the instructions of stories 0001 and 0006. Changes such as SHOW span both sides. Keeping both in one
repo would let one story, branch and commit cover the whole change, share the story conventions and skills, and keep
links between stories working.

Points raised when this was discussed:

- The two sides use different toolchains (Node and Jest; the Pico SDK and CMake), with their own build output and
  `.gitignore` rules, and possibly separate CI jobs.
- The C++ history should be kept, e.g. by merging it into a subdirectory such as `frame/` with `git subtree` or
  `git filter-repo`.
- The old GitHub repo would need to be archived or redirected.
