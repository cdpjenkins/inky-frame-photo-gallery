// Test list for story 0001: Instructions (stories/todo/0001-instructions.md)
//
// "Frame asks after N" = the frame requests all instructions with a sequence number greater than N.
// "Admin adds X" = the admin submits X via the add-instruction form on the /admin page.
//
// Rejection contract (Rule 2): the spec says a rejected instruction "shows an error message on the admin page,
// is not added, and does not use up a sequence number". The spec does not define the error text or the HTTP
// status of the form response, so rejection tests assert only that: (a) the resulting admin page contains an
// error message, and (b) the instruction is not added (the frame does not receive it and the admin page does
// not list it).

describe('Instructions', () => {
  // Rule 3 + Rule 4: empty case
  it.todo('frame asks after 0 with no instructions -> 200, text/plain, empty body');

  // Rule 1 + Rule 4: first instruction gets seq 1, line format "<seq> <text>"
  it.todo('admin adds "display /images/cat.jpg" with no instructions -> frame asks after 0 and receives "1 display /images/cat.jpg"');

  // Rule 1 + Rule 4: sequence numbers increase by 1; one line per instruction, joined by "\n"
  it.todo('admin adds "display /images/cat.jpg" then "sleep" -> frame asks after 0 and receives "1 display /images/cat.jpg\\n2 sleep"');

  // Rule 3: only instructions after N
  it.todo('instructions 1-5 exist, frame asks after 3 -> receives exactly instructions 4 then 5');

  // Rule 5: N ahead of the backend
  it.todo('latest seq is 5, frame asks after 9 -> 409 Conflict');

  // Rule 5: missing / invalid N
  it.todo('frame asks with no N -> 400 Bad Request');
  it.todo('frame asks after "abc" -> 400 Bad Request');
  it.todo('frame asks after -1 -> 400 Bad Request');
  it.todo('frame asks after 12.5 -> 400 Bad Request (sequence numbers are integers)');

  // Rule 7: admin page lists instructions
  it.todo('instructions 1-3 exist -> admin page lists 1, 2, 3 in that order, each with its sequence number and text');

  // Rule 2: trimming
  it.todo('admin adds "  sleep  " -> stored as "sleep" (frame asks after 0 and receives "1 sleep")');

  // Rule 2: rejections (see rejection contract at top of file)
  it.todo('admin adds "" -> rejected as empty: admin page shows an error message, frame asks after 0 and receives an empty body');
  it.todo('admin adds 101 characters (after trimming) -> rejected: admin page shows an error message, instruction not added');
  it.todo('admin adds "display\\ncat.jpg" -> rejected (contains newline): admin page shows an error message, instruction not added');
  it.todo('admin adds "display\\rcat.jpg" -> rejected (contains carriage return): admin page shows an error message, instruction not added');

  // Rule 2: length is checked AFTER trimming
  it.todo('admin adds 2 spaces + 100 characters + 2 spaces -> accepted and stored as the 100 characters');

  // Rule 6: persistence across restart
  it.todo('instructions 1-5 exist, backend restarts (new app, same storage) -> frame asks after 0 and receives 1-5; next instruction added gets seq 6');

  describe('verification', () => {
    // Relies on: increasing sequence numbers (test 3)
    it.todo('instructions 1-3 exist, admin adds "sleep" -> it gets seq 4');

    // Relies on: line format and joining (tests 2, 3) + filtering after N (test 4)
    it.todo('seq 4 "display /images/cat.jpg" and seq 5 "sleep", frame asks after 3 -> body is exactly "4 display /images/cat.jpg\\n5 sleep"');

    // Relies on: filtering after N (test 4)
    it.todo('instructions 1-5 exist, frame asks after 0 (first boot) -> receives 1-5 in ascending order');
    it.todo('instructions 1-5 exist, frame asks after 5 -> 200, empty body');

    // Relies on: 409 for N > latest (test 5); latest is 0 when there are no instructions (derived from Rule 5)
    it.todo('no instructions exist, frame asks after 1 -> 409 Conflict');

    // Relies on: trimming (test 11) + empty rejection (test 12)
    it.todo('admin adds "   " -> rejected as empty: admin page shows an error message, instruction not added');

    // Relies on: trimming (test 11) happening before the newline check (test 14)
    it.todo('admin adds "sleep\\n" -> trimmed to "sleep" and accepted (frame asks after 0 and receives "1 sleep")');

    // Relies on: length rejection (test 13); boundary
    it.todo('admin adds exactly 100 characters -> accepted');

    // Relies on: rejection not adding (tests 12-15) + sequence numbering (test 3)
    it.todo('latest seq is 3, admin submits "" then "sleep" -> "sleep" gets seq 4 (rejection uses up no sequence number)');
  });
});
