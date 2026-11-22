# Story: Scale photos that are not 600 × 448 to fit the screen

Status: Not yet example-mapped.

Sliced out of [0013-frame-carries-out-show](../ready/0013-frame-carries-out-show.md) during its Example Mapping
session.

## Context

The Inky Frame's screen is 600 × 448 pixels. Story 0013 assumes every photo is exactly that size. The frame client's
`draw_jpeg` takes a position and size, but overwrites the size with the JPEG's own before decoding, so a photo of any
other size is drawn unscaled: cropped if larger, with an empty border if smaller (see
[`inky-frame-photo-gallery-cpp/REVIEW.md`](../../inky-frame-photo-gallery-cpp/REVIEW.md)).
