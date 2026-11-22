// Test list for story 0013: The Inky Frame carries out SHOW instructions
// (stories/ready/0013-frame-carries-out-show.md) - only the pure logic that can be unit-tested on the host.
//
// The operation under test: "working out what a response asks the frame to do". Given N and an /instructions
// response, it gives:
// - the new N: the highest sequence number in the response, or "unchanged" when there is none (Rule 1)
// - the SHOW to carry out: the path from the last SHOW in the response, if any (Rule 2)
// - the unknown instructions to log as "Ignoring unknown instruction <seq>: <text>", in order (Rule 4)
// It also covers how N is written to /last_instruction.txt, so that story 0016's reading of the file gives it back
// (Rule 1).
//
// What counts as a SHOW follows the Photo Frame Simulator (story 0006, src/simulator/PhotoFrameSimulator.ts,
// showPathOf): exactly "SHOW", one space, then a path with no whitespace; anything else is an unknown instruction.
//
// Not covered here, because they need the SD card, the network or the screen (checked on the device instead):
// saving N before carrying anything out, a failed save, downloading to a temporary file and replacing the old copy,
// creating /images/, refreshing the screen only when the photo was decoded, and the failure messages of Rule 5.
//
// Inactive tests are doctest test cases marked `* doctest::skip()`, with empty bodies until they are activated.

#include "doctest.h"

TEST_CASE("an empty response leaves N unchanged, asks for no SHOW and has nothing to ignore" * doctest::skip()) {
}

TEST_CASE("response \"7 SHOW /images/cat.jpg\" -> N becomes 7 and the SHOW is /images/cat.jpg" * doctest::skip()) {
}

TEST_CASE("response \"8 sleep\" -> N becomes 8, no SHOW, and \"8 sleep\" is ignored as unknown" * doctest::skip()) {
}

TEST_CASE("response \"7 SHOW /images/cat.jpg\\n8 sleep\" -> N becomes 8 (the highest), the SHOW is /images/cat.jpg"
          * doctest::skip()) {
}

TEST_CASE("response \"7 SHOW /images/cat.jpg\\n8 SHOW /images/dog.jpg\" -> only the last SHOW: /images/dog.jpg"
          * doctest::skip()) {
}

TEST_CASE("N becomes the highest sequence number even when it is not the last line: \"9 sleep\\n8 SHOW /images/cat.jpg\""
          " -> N becomes 9" * doctest::skip()) {
}

TEST_CASE("only exactly \"SHOW <path>\" is a SHOW: \"9 show /images/cat.jpg\", \"9 SHOW\", \"9 SHOW /images/my cat.jpg\""
          " and \"9 SHOW  /images/cat.jpg\" are unknown instructions" * doctest::skip()) {
}

TEST_CASE("N is written for /last_instruction.txt as a decimal number that reads back as the same N: 8 -> \"8\""
          * doctest::skip()) {
}

TEST_SUITE("verification") {
    // Relies on: the "7 SHOW /images/cat.jpg" test. Whether the photo later downloads makes no difference here.
    TEST_CASE("response \"7 SHOW /images/dog.jpg\" (dog.jpg will return 404) -> N still becomes 7" * doctest::skip()) {
    }

    // Relies on: the "7 SHOW /images/cat.jpg" test (nothing remembers which photo is on screen).
    TEST_CASE("response \"9 SHOW /images/cat.jpg\" while cat.jpg is on screen -> the SHOW is /images/cat.jpg"
              * doctest::skip()) {
    }

    // Relies on: the "8 sleep" test.
    TEST_CASE("response \"8 sleep\\n9 HELLO\" -> both are ignored as unknown, in order: 8 sleep, then 9 HELLO"
              * doctest::skip()) {
    }

    // Relies on: the highest-N, last-SHOW and "8 sleep" tests together.
    TEST_CASE("response \"7 SHOW /images/cat.jpg\\n8 sleep\\n9 SHOW /images/dog.jpg\" -> N becomes 9, the SHOW is "
              "/images/dog.jpg, and only \"8 sleep\" is ignored" * doctest::skip()) {
    }

    // Relies on: story 0016's for_each_instruction, which skips lines that are not instructions.
    TEST_CASE("response \"hello\\n7 sleep\" -> N becomes 7; \"hello\" is not an instruction, so it is neither ignored "
              "nor counted" * doctest::skip()) {
    }

    // Relies on: the "N is written" test.
    TEST_CASE("N = 0 and N = 4294967295 are written so that they read back unchanged" * doctest::skip()) {
    }
}
