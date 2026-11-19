# Story: A failed save leaves instructions and photo selections unchanged

Status: Not yet example-mapped.

Raised by a code review of the backend.

## Context

`InstructionRepository` and `PhotoMetadataRepository` both change their in-memory state before writing it to disk.
If the write fails, the request reports an error, but later requests still see the change. For instructions, the
latest sequence number has also advanced, and a later successful write saves the instruction that appeared to fail.

The review suggests writing the new state to disk first and changing the in-memory state only once the write has
succeeded.
