# Story: Handle filenames that are not safe in URLs

Status: Not yet example-mapped.

Raised by a code review of the backend.

## Context

[Story 0006](../done/0006-show-photo-instruction.md) Rule 2 allows any `.jpg` filename that contains no whitespace or
`/`. Some of those characters have a meaning in URLs. For `summer#1.jpg`, the SHOW instruction is
`SHOW /images/summer#1.jpg`, and a fetch of that path requests `/images/summer`, which returns 404. `?` and `%`
cause similar problems.

The gallery links, the photo selection request, `/list` and SHOW instructions all put raw filenames into URL paths.

To decide during Example Mapping: either encode filenames consistently as URL path segments, or narrow the
filenames that can be shown. This changes what the frame receives, so it needs agreeing with how the real frame reads
SHOW paths and `/list`.
