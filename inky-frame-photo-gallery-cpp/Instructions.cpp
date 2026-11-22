#include "Instructions.hpp"

#include <cstdio>

namespace {

// Parses the decimal number at the start of `text`, removing it from `text`. Gives nothing if `text` does not start
// with a digit, or if the number does not fit in 32 bits.
std::optional<uint32_t> take_number(std::string_view &text) {
    if (text.empty() || text.front() < '0' || text.front() > '9') {
        return std::nullopt;
    }
    uint64_t value = 0;
    while (!text.empty() && text.front() >= '0' && text.front() <= '9') {
        value = value * 10 + static_cast<uint64_t>(text.front() - '0');
        if (value > UINT32_MAX) {
            return std::nullopt;
        }
        text.remove_prefix(1);
    }
    return static_cast<uint32_t>(value);
}

bool is_whitespace(char c) {
    return c == ' ' || c == '\t' || c == '\r' || c == '\n';
}

}

std::optional<Instruction> parse_instruction_line(std::string_view line) {
    std::optional<uint32_t> sequence_number = take_number(line);
    if (!sequence_number || line.empty() || line.front() != ' ') {
        return std::nullopt;
    }
    line.remove_prefix(1);
    return Instruction{*sequence_number, line};
}

std::optional<std::string_view> show_path_of(std::string_view text) {
    if (text.substr(0, 5) != "SHOW ") {
        return std::nullopt;
    }
    return text.substr(5);
}

std::optional<uint32_t> parse_sequence_number(std::string_view text) {
    std::optional<uint32_t> n = take_number(text);
    for (char c : text) {
        if (!is_whitespace(c)) {
            return std::nullopt;
        }
    }
    return n;
}

bool format_instructions_path(uint32_t n, char *out, std::size_t size) {
    int written = std::snprintf(out, size, "/instructions?after=%lu", static_cast<unsigned long>(n));
    return written >= 0 && static_cast<std::size_t>(written) < size;
}
