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

export class PhotoFrameSimulator {
  constructor(private readonly ports: SimulatorPorts) {}

  start(): void {
    this.ports.view.showN(FIRST_VISIT_N);
  }

  async fetchInstructions(): Promise<void> {
    const n = this.ports.storage.getItem(N_STORAGE_KEY) ?? FIRST_VISIT_N;
    const response = await this.ports.fetch(`/instructions?after=${n}`);
    const body = await response.text();

    const show = body.match(/^\d+ SHOW (\S+)$/);
    if (show) {
      await this.showPhoto(show[1]);
    }
  }

  // Carries out a SHOW instruction: downloads the photo, then displays it.
  private async showPhoto(path: string): Promise<void> {
    await this.ports.fetch(path);
    this.ports.view.showPhoto(path);
  }
}
