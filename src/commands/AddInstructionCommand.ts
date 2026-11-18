import { InstructionRepository } from '../repositories/InstructionRepository';

const MAX_INSTRUCTION_LENGTH = 100;

const MALFORMED_SHOW_MESSAGE =
  'A SHOW instruction must be in the form "SHOW /images/<filename>.jpg", where the filename contains no whitespace or "/".';

export class InvalidInstructionError extends Error {}

function isAttemptedShowInstruction(text: string): boolean {
  return text.startsWith('SHOW');
}

// SHOW /images/<filename>.jpg, where the filename contains no whitespace.
const SHOW_FORMAT = /^SHOW \/images\/\S*\.jpg$/;

function hasShowFormat(text: string): boolean {
  return SHOW_FORMAT.test(text);
}

function isMalformedShowInstruction(text: string): boolean {
  return isAttemptedShowInstruction(text) && !hasShowFormat(text);
}

export class AddInstructionCommand {
  constructor(private readonly repository: InstructionRepository) {}

  execute(rawText: string): void {
    const text = rawText.trim();

    if (text === '') {
      throw new InvalidInstructionError('Instruction must not be empty');
    }
    if (text.length > MAX_INSTRUCTION_LENGTH) {
      throw new InvalidInstructionError(`Instruction must be at most ${MAX_INSTRUCTION_LENGTH} characters`);
    }
    if (/[\r\n]/.test(text)) {
      throw new InvalidInstructionError('Instruction must not contain line breaks');
    }
    if (isMalformedShowInstruction(text)) {
      throw new InvalidInstructionError(MALFORMED_SHOW_MESSAGE);
    }

    this.repository.add(text);
  }
}
