import { InstructionRepository } from '../repositories/InstructionRepository';

const MAX_INSTRUCTION_LENGTH = 100;

export class InvalidInstructionError extends Error {}

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

    this.repository.add(text);
  }
}
