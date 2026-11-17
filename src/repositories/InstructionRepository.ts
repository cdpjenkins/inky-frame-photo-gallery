export type Instruction = {
  sequenceNumber: number;
  text: string;
};

export class InstructionRepository {
  private readonly instructions: Instruction[] = [];

  add(text: string): void {
    this.instructions.push({ sequenceNumber: this.latestSequenceNumber() + 1, text });
  }

  latestSequenceNumber(): number {
    return this.instructions.length;
  }

  getAll(): Instruction[] {
    return this.instructions;
  }

  getAfter(sequenceNumber: number): Instruction[] {
    return this.instructions.filter(instruction => instruction.sequenceNumber > sequenceNumber);
  }
}
