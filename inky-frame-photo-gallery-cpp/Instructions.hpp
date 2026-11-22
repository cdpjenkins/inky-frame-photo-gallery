// Instructions from the backend (stories 0001 and 0016): portable code, with no Pico SDK, FatFs or lwIP headers, so
// it can be unit-tested on the host (see test/).
//
// Memory rules for the Inky Frame (story 0018): no large local variables, no heap allocation and no exceptions.
// Text is read in place with std::string_view, and callers provide any buffers.

#ifndef INKY_FRAME_PHOTO_GALLERY_CPP_INSTRUCTIONS_HPP
#define INKY_FRAME_PHOTO_GALLERY_CPP_INSTRUCTIONS_HPP

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string_view>

// One instruction: a line "<sequence number> <text>" of an /instructions response.
struct Instruction {
    uint32_t sequence_number;
    std::string_view text;      // points into the response; valid only while the response is
};

// Parses one line of an /instructions response, e.g. "7 SHOW /images/cat.jpg". A line that is not
// "<digits> <text>" gives no instruction.
std::optional<Instruction> parse_instruction_line(std::string_view line);

// Calls f(instruction) for each instruction in an /instructions response, in order. The response is one instruction
// per line, separated by '\n'; a '\r' before the '\n' is ignored, and lines that are not instructions are skipped.
template<typename F>
void for_each_instruction(std::string_view response, F f) {
    while (!response.empty()) {
        std::size_t end = response.find('\n');
        std::string_view line = response.substr(0, end);
        if (!line.empty() && line.back() == '\r') {
            line.remove_suffix(1);
        }
        if (std::optional<Instruction> instruction = parse_instruction_line(line)) {
            f(*instruction);
        }
        if (end == std::string_view::npos) {
            break;
        }
        response.remove_prefix(end + 1);
    }
}

// What an /instructions response asks the frame to do (story 0013).
struct ResponsePlan {
    std::optional<uint32_t> new_n;              // the new N; none means N is unchanged
    std::optional<std::string_view> show_path;  // the photo to show; points into the response
};

// A SHOW instruction is "SHOW <path>", as in the Photo Frame Simulator (story 0006): gives the path, or nothing if
// the text is not a SHOW.
std::optional<std::string_view> show_path_of(std::string_view text);

// Works out what an /instructions response asks the frame to do, calling on_unknown(instruction) for each
// instruction the frame does not know.
template<typename F>
ResponsePlan plan_response(std::string_view response, F on_unknown) {
    ResponsePlan plan;
    for_each_instruction(response, [&](const Instruction &instruction) {
        plan.new_n = instruction.sequence_number;
        if (std::optional<std::string_view> path = show_path_of(instruction.text)) {
            plan.show_path = path;
        }
    });
    return plan;
}

// Parses the contents of the file holding N, the sequence number of the last instruction the frame consumed
// (story 0016, Rule 2): a decimal number, optionally followed by whitespace such as a newline. Anything else gives
// no number.
std::optional<uint32_t> parse_sequence_number(std::string_view text);

// Writes the path that asks for the instructions after N, e.g. "/instructions?after=8", into `out` (of `size`
// bytes, including the terminating '\0'). Returns false, and writes nothing usable, if it does not fit.
bool format_instructions_path(uint32_t n, char *out, std::size_t size);

#endif //INKY_FRAME_PHOTO_GALLERY_CPP_INSTRUCTIONS_HPP
