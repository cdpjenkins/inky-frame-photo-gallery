export class InstructionRepository {
  private readonly instructions: string[] = [];

  add(text: string): void {
    this.instructions.push(text);
  }

  getAll(): string[] {
    return this.instructions;
  }
}
