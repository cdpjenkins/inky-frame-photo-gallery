# Story: Fix the 16 KB stack buffer in read_text_file

Status: Not yet example-mapped.

Found in a review of the C++ frame client (see
[`inky-frame-photo-gallery-cpp/REVIEW.md`](../../inky-frame-photo-gallery-cpp/REVIEW.md)).

Order: to be done, and tested on the device, before [story 0016](../done/0016-frame-fetches-instructions.md).

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

## What was done

- **Evidence without the device**: building the firmware with `gcc -fstack-usage` showed that `read_text_file`'s
  stack frame was **17,016 bytes**, on a 2,048-byte stack. The next-largest frame was 656 bytes.
- **The fix**: the buffer is now `static`, so its 16 KB is reserved once in static memory. `read_text_file`'s frame
  is now 632 bytes, and the largest frame in `main.cpp` is 656 bytes.
- **A diagnostic**, to confirm the fix on the device: `paint_stack()` fills the unused part of the stack with a known
  pattern at start-up, and `report_stack_usage()` prints a line on the serial log such as

  ```
  Stack inside read_text_file: deepest use 900 of 2048 bytes; stack pointer is 1200 bytes above the bottom of the stack
  ```

  It reports inside `read_text_file`, after reading `/list.txt`, and after each photo is drawn. The stack pointer
  position is what shows an overflow (`OVERFLOW: stack pointer is ... bytes BELOW the bottom of the stack`): an
  oversized local variable's data is written below the stack, where the painted pattern cannot see it.

## Device checks (by the admin, on the Inky Frame)

The client still runs the slideshow from `/list.txt` on the SD card (`USE_WIFI` is `false`). It already returns a
`std::string` from `read_text_file` and a `std::vector<std::string>` from `split_by_newlines`, and throws
`std::runtime_error` when a file cannot be opened, so it exercises both things that froze the device before.

1. [x] **With the fix and `/list.txt` on the SD card**: the slideshow works, and every `Stack ...` line in the serial
   log says the stack pointer is *above* the bottom of the stack, with the deepest use under 2048 bytes.
   Result (2026-11-22): the slideshow works, and the log shows
   `Stack after drawing a photo: deepest use 1320 of 2048 bytes; stack pointer is 1968 bytes above the bottom of the
   stack`. The deepest use is 65% of the stack, leaving about 700 bytes of headroom, which stories 0016 and 0013 need
   to respect.
2. [ ] **With the fix and no `/list.txt` on the SD card**: the serial log shows `runtime_error:` and
   `Failed to open file for reading`, i.e. the exception is thrown, caught and reported rather than freezing the
   frame. (The program then stops, as before.)
   Not run (2026-11-22): the SD card cannot be read on the admin's Mac without hardware that is not to hand.
3. [ ] **Optional, to see the old behaviour**: temporarily remove `static` from `buffer` in `read_text_file`, rebuild,
   and run with `/list.txt` on the SD card. Expect the frame to freeze, or the log to show
   `OVERFLOW: stack pointer is ... bytes BELOW the bottom of the stack`. Then put `static` back.
   Not run.

If checks 1 and 2 pass, the hypothesis is confirmed: the memory rule for stories 0016 and 0013 is "no large local
variables", not "no strings".

## Outcome

Check 1 was counted as enough for now. What it shows:

- **Confirmed**: the stack no longer overflows, and returning `std::string`s (from `read_text_file`) and a
  `std::vector<std::string>` (from `split_by_newlines`) works on the device.
- **Not yet confirmed**: that throwing an exception no longer freezes the frame (check 2). Until it is, stories 0016
  and 0013 should keep avoiding exceptions, which they need to anyway ("log, sleep, try again").
- **Headroom**: the deepest stack use is 1320 of 2048 bytes. New code must not add large local variables.
- **The stack diagnostic stays in** `main.cpp` for now, to keep an eye on stack use while stories 0016 and 0013 are
  built.
