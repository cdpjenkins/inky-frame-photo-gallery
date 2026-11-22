// A trivial test that proves the host test harness builds and runs (story 0014). Tests of the client's own logic
// arrive with stories 0016 and 0013.
#include "doctest.h"

TEST_CASE("the host test harness runs") {
    CHECK(1 + 1 == 2);
}
