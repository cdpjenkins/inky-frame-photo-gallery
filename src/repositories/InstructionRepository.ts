export type Instruction = {
  sequenceNumber: number;
  text: string;
};

export class InstructionRepository {
  private readonly instructions: Instruction[] = [];

  add(text: string): void {
    this.instructions.push({ sequenceNumber: this.instructions.length + 1, text });
  }

  getAll(): Instruction[] {
    return this.instructions;
  }
}
