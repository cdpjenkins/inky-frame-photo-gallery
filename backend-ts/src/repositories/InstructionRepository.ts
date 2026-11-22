import fs from 'fs';

export type Instruction = {
  sequenceNumber: number;
  text: string;
};

export class InstructionRepository {
  private instructions: Instruction[] = [];

  constructor(private readonly instructionsPath: string) {
    this.load();
  }

  add(text: string): void {
    this.instructions.push({ sequenceNumber: this.latestSequenceNumber() + 1, text });
    this.save();
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

  private load(): void {
    if (fs.existsSync(this.instructionsPath)) {
      this.instructions = JSON.parse(fs.readFileSync(this.instructionsPath, 'utf-8'));
    }
  }

  private save(): void {
    fs.writeFileSync(this.instructionsPath, JSON.stringify(this.instructions, null, 2));
  }
}
