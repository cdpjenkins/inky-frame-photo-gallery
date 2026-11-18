// The Photo Frame Simulator (story 0006): emulates the photo frame so SHOW instructions can be tested without one.

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
    this.ports.view.showN(0);
  }
}
