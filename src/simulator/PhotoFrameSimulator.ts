// The Photo Frame Simulator (story 0006): emulates the photo frame so SHOW instructions can be tested without one.

// The local storage key holding N, the sequence number of the last instruction the simulator consumed.
export const N_STORAGE_KEY = 'photoFrameSimulator.lastSequenceNumber';

// A brand-new frame has consumed no instructions, so it asks for all instructions after 0.
const FIRST_VISIT_N = 0;

export interface SimulatorResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export interface SimulatorStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SimulatorView {
  showN(n: number): void;
  showPhoto(path: string): void;
  showMessage(message: string): void;
}

export interface SimulatorPorts {
  fetch(url: string): Promise<SimulatorResponse>;
  storage: SimulatorStorage;
  view: SimulatorView;
  log(message: string): void;
}

interface Instruction {
  sequenceNumber: number;
  text: string;
}

// The /instructions response (story 0001): one instruction per line, as "<seq> <text>".
function parseInstructions(body: string): Instruction[] {
  return body
    .split('\n')
    .map(line => line.match(/^(\d+) (.*)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map(([, sequenceNumber, text]) => ({ sequenceNumber: Number(sequenceNumber), text }));
}

// A SHOW instruction is "SHOW <path>"; returns the path, or undefined if the text is not a SHOW.
function showPathOf(text: string): string | undefined {
  return text.match(/^SHOW (\S+)$/)?.[1];
}

export class PhotoFrameSimulator {
  constructor(private readonly ports: SimulatorPorts) {}

  start(): void {
    this.ports.view.showN(FIRST_VISIT_N);
  }

  async fetchInstructions(): Promise<void> {
    const n = this.ports.storage.getItem(N_STORAGE_KEY) ?? FIRST_VISIT_N;
    const response = await this.ports.fetch(`/instructions?after=${n}`);
    const body = await response.text();

    const instructions = parseInstructions(body);

    this.consume(instructions);
    await this.carryOut(instructions);
  }

  // Rule 7: once fetched, instructions are consumed: N becomes the highest sequence number among them, whether or
  // not each one is carried out successfully.
  private consume(instructions: Instruction[]): void {
    const highestSequenceNumber = Math.max(...instructions.map(instruction => instruction.sequenceNumber));
    this.ports.storage.setItem(N_STORAGE_KEY, String(highestSequenceNumber));
    this.ports.view.showN(highestSequenceNumber);
  }

  // Rule 8: of the SHOW instructions in one response, the last one wins.
  private async carryOut(instructions: Instruction[]): Promise<void> {
    const showPaths = instructions
      .map(instruction => showPathOf(instruction.text))
      .filter((path): path is string => path !== undefined);
    const lastShowPath = showPaths[showPaths.length - 1];
    if (lastShowPath !== undefined) {
      await this.showPhoto(lastShowPath);
    }
  }

  // Carries out a SHOW instruction: downloads the photo, then displays it.
  private async showPhoto(path: string): Promise<void> {
    await this.ports.fetch(path);
    this.ports.view.showPhoto(path);
  }
}
