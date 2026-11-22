// Tests for reading /instructions responses and N (story 0016).
#include "doctest.h"

#include "Instructions.hpp"

#include <string>
#include <utility>
#include <vector>

namespace {

std::vector<std::pair<uint32_t, std::string>> instructions_in(std::string_view response) {
    std::vector<std::pair<uint32_t, std::string>> found;
    for_each_instruction(response, [&](const Instruction &instruction) {
        found.emplace_back(instruction.sequence_number, std::string(instruction.text));
    });
    return found;
}

using Found = std::vector<std::pair<uint32_t, std::string>>;

}

TEST_CASE("a response of two instructions gives both, in order, each with its whole text") {
    CHECK(instructions_in("7 SHOW /images/cat.jpg\n8 sleep") == Found{{7, "SHOW /images/cat.jpg"}, {8, "sleep"}});
}

TEST_CASE("an empty response gives no instructions") {
    CHECK(instructions_in("").empty());
}

TEST_CASE("a trailing newline, or a \\r before each newline, does not add or change instructions") {
    CHECK(instructions_in("7 SHOW /images/cat.jpg\n") == Found{{7, "SHOW /images/cat.jpg"}});
    CHECK(instructions_in("7 SHOW /images/cat.jpg\r\n8 sleep\r\n") == Found{{7, "SHOW /images/cat.jpg"}, {8, "sleep"}});
}

TEST_CASE("lines that are not \"<digits> <text>\" are skipped") {
    CHECK(instructions_in("hello\n7 sleep\n\nx8 sleep\n9sleep") == Found{{7, "sleep"}});
}

TEST_CASE("N is read from a decimal number, optionally followed by whitespace") {
    CHECK(parse_sequence_number("8") == std::optional<uint32_t>(8));
    CHECK(parse_sequence_number("8\n") == std::optional<uint32_t>(8));
    CHECK(parse_sequence_number("0") == std::optional<uint32_t>(0));
    CHECK(parse_sequence_number("4294967295") == std::optional<uint32_t>(4294967295u));
}

TEST_CASE("anything else is not a valid N") {
    CHECK(parse_sequence_number("") == std::nullopt);
    CHECK(parse_sequence_number("abc") == std::nullopt);
    CHECK(parse_sequence_number("8 9") == std::nullopt);
    CHECK(parse_sequence_number("-1") == std::nullopt);
    CHECK(parse_sequence_number("4294967296") == std::nullopt);
}

TEST_CASE("the frame asks for the instructions after N") {
    char path[32];
    REQUIRE(format_instructions_path(0, path, sizeof path));
    CHECK(std::string(path) == "/instructions?after=0");
    REQUIRE(format_instructions_path(8, path, sizeof path));
    CHECK(std::string(path) == "/instructions?after=8");
}

TEST_CASE("the path is not written when it does not fit") {
    char path[10];
    CHECK_FALSE(format_instructions_path(8, path, sizeof path));
}
