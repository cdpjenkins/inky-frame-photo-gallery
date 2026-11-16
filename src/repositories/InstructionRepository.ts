export type Instruction = {
  sequenceNumber: number;
  text: string;
};

export class InstructionRepository {
  private readonly instructions: Instruction[] = [];

  add(text: string): void {
    this.instructions.push({ sequenceNumber: this.instructions.length + 1, text });
  }

  getAfter(sequenceNumber: number): Instruction[] {
    return this.instructions.filter(instruction => instruction.sequenceNumber > sequenceNumber);
  }
}
