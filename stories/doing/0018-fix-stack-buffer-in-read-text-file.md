# Story: Fix the 16 KB stack buffer in read_text_file

Status: Not yet example-mapped.

Found in a review of the C++ frame client (see
[`inky-frame-photo-gallery-cpp/REVIEW.md`](../../inky-frame-photo-gallery-cpp/REVIEW.md)).

Order: to be done, and tested on the device, before [story 0016](../ready/0016-frame-fetches-instructions.md).

## Context

On the Inky Frame (an RP2040), core 0's stack is only 2 KB: the Pico SDK's default `PICO_STACK_SIZE` is `0x800`, and
the firmware's map file shows `__StackBottom = 0x20041800` and `__StackTop = 0x20042000`. The rest of the 264 KB of
RAM is mostly heap (about 166 KB).

`read_text_file` in `inky-frame-photo-gallery-cpp/main.cpp` declares a 16 KB local buffer:

```cpp
const FSIZE_t LIST_MAX_SIZE = (1 << 14) - 1;
char buffer[LIST_MAX_SIZE + 1];
```

Calling it runs about 14 KB past the end of the stack, silently overwriting core 1's stack area and then the top of
the heap. That would explain the freezes seen when returning `std::string`s or throwing exceptions (both use the
heap), and the "memory getting trampled" comment in `HttpConnection.cpp`. This is a strong hypothesis, not yet proven
on the device.

## Goal

Move the buffer off the stack (e.g. make it `static`, or have the caller provide it), and confirm on the device
whether this was the cause of the freezes, e.g. by checking whether returning a `std::string` or throwing an
exception still freezes the frame, or by filling the stack with a known pattern at start-up and checking how much of
it gets overwritten.

The outcome decides the memory rules for stories 0016 and 0013: if confirmed, the rule is "no large local
variables" rather than "no strings".
