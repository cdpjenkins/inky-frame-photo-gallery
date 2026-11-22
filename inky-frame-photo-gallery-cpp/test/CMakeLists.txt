# Host-side unit tests for the Inky Frame client (story 0014).
#
# A separate CMake project from the firmware build in ../CMakeLists.txt: it builds only portable code and its tests,
# with the host's own C++ compiler, so it needs no embedded SDK or hardware libraries.
#
# From inky-frame-photo-gallery-cpp/:
#   cmake -S test -B build-host
#   cmake --build build-host
#   ctest --test-dir build-host --output-on-failure

cmake_minimum_required(VERSION 3.16)
project(inky_frame_photo_gallery_host_tests CXX)

# The same C++ standard as the firmware build.
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# The portable source files under test, from the directory above, and their tests.
add_executable(host_tests
        test.cpp
        HarnessTest.cpp
        InstructionsTest.cpp
        CarryOutTest.cpp
        ../Instructions.cpp)
target_include_directories(host_tests PRIVATE ..)

enable_testing()
add_test(NAME host_tests COMMAND host_tests)
