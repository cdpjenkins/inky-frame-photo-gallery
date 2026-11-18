// Test list for story 0006: Show Photo Instruction, Photo Frame Simulator part (Rules 5-10)
// (stories/doing/0006-show-photo-instruction.md). Backend behaviour is in
// src/routes/__tests__/showInstruction.test.ts.
//
// The simulator is a single-page TypeScript app served at /simulator. These tests describe what the page does,
// not how it is built.
//
// How the tests drive the page (agreed approach): the simulator's behaviour lives in PhotoFrameSimulator, whose
// dependencies are injected as ports. The tests replace each port with a fake:
// - fetch: a fake backend that records requested URLs and answers each URL with a status and body, or is
//   unreachable (the fetch rejects, as a browser's fetch does on a network error).
// - storage: a fake local storage (getItem/setItem).
// - view: records what the page shows: N, the displayed photo, and messages.
// - log: records console.log warnings.
// The thin browser adapter that connects these ports to the real DOM, localStorage and console is not covered by
// these tests.
//
// Terms:
// - "Fetch" = the user clicks the "Fetch instructions" button.
// - "Response X" = /instructions answers the fetch with status 200 and body X.
// - "N displayed" = the N shown on the page. "N stored" = the N in local storage.
// - "Displayed photo" = the image shown on the page; "no image" = no photo is shown.
// - "Message shown" = a non-empty failure message appears on the page. The spec does not define its text,
//   so tests assert only that one appears.
// - "Warning logged" = console.log is called with a warning. The spec does not define its text.
// - "Reload" = a fresh simulator page using the same local storage.

import { N_STORAGE_KEY, PhotoFrameSimulator, SimulatorView } from '../PhotoFrameSimulator';

type FakeResponse = { status: number; body: string };

class FakeBackend {
  readonly requests: string[] = [];
  private readonly responses = new Map<string, FakeResponse>();
  reachable = true;

  respond(url: string, status: number, body = ''): void {
    this.responses.set(url, { status, body });
  }

  fetch = async (url: string) => {
    this.requests.push(url);
    if (!this.reachable) {
      throw new TypeError('Failed to fetch');
    }
    const { status, body } = this.responses.get(url) ?? { status: 404, body: '' };
    return { ok: status >= 200 && status < 300, status, text: async () => body };
  };
}

class FakeStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

class FakeView implements SimulatorView {
  n?: number;
  photo?: string;
  readonly messages: string[] = [];

  showN(n: number): void {
    this.n = n;
  }

  showPhoto(path: string): void {
    this.photo = path;
  }

  showMessage(message: string): void {
    this.messages.push(message);
  }
}

let backend: FakeBackend;
let storage: FakeStorage;
let view: FakeView;
let logged: string[];

function openSimulator(): PhotoFrameSimulator {
  view = new FakeView();
  const simulator = new PhotoFrameSimulator({
    fetch: backend.fetch,
    storage,
    view,
    log: message => logged.push(message),
  });
  simulator.start();
  return simulator;
}

beforeEach(() => {
  backend = new FakeBackend();
  storage = new FakeStorage();
  logged = [];
});

describe('Photo Frame Simulator (story 0006)', () => {
  // Rule 6 + Rule 8: starting state
  it('first visit (empty local storage) -> N displayed as 0, no image', () => {
    openSimulator();

    expect(view.n).toBe(0);
    expect(view.photo).toBeUndefined();
  });

  // Rule 5: Fetch asks for instructions after N
  it('N is 6, Fetch -> simulator requests GET /instructions?after=6', async () => {
    storage.setItem(N_STORAGE_KEY, '6');
    const simulator = openSimulator();

    await simulator.fetchInstructions();

    expect(backend.requests).toEqual(['/instructions?after=6']);
  });

  // Rule 8: a SHOW displays its photo
  it.todo('Fetch, response "7 SHOW /images/cat.jpg" -> displayed photo is /images/cat.jpg');

  // Rule 8: the last SHOW in a response wins
  it.todo('Fetch, response "7 SHOW /images/cat.jpg\\n8 SHOW /images/dog.jpg" -> displayed photo is /images/dog.jpg');

  // Rule 7: N becomes the highest seq in the response, counting instructions that are not SHOW
  it.todo('N is 6, Fetch, response "7 SHOW /images/cat.jpg\\n8 sleep" -> N displayed and stored as 8');

  // Rule 7: an empty response has no highest seq, so N must not change
  it.todo('N is 8, Fetch, response "" -> N stays 8 and nothing on the page changes');

  // Rule 6: N survives a reload
  it.todo('N is 8, reload -> N displayed as 8');

  // Rule 6: Reset sets N to 0
  it.todo('N is 8, click Reset -> N displayed and stored as 0');

  // Rule 9: unknown instructions are ignored with a warning
  it.todo('cat.jpg displayed, Fetch, response "8 sleep" -> cat.jpg still displayed, warning logged');

  // Rule 10: a photo that cannot be downloaded leaves the current photo and shows a message
  it.todo('cat.jpg displayed, Fetch, response "8 SHOW /images/dog.jpg", dog.jpg returns 404 -> cat.jpg still displayed, message shown');

  // Rule 8 + Rule 10: if the last SHOW fails, there is no fallback to an earlier SHOW in the same response.
  // The story's example uses cat.jpg as both the current photo and seq 8, which cannot tell "kept" from
  // "fell back". This test uses bird.jpg as the current photo so the two outcomes differ.
  it.todo('bird.jpg displayed, Fetch, response "8 SHOW /images/cat.jpg\\n9 SHOW /images/dog.jpg", dog.jpg returns 404 -> bird.jpg still displayed (not cat.jpg), message shown');

  // Rule 7 + Rule 10: a failed instructions fetch leaves N and the photo unchanged
  it.todo('N is 12, cat.jpg displayed, Fetch, /instructions returns 409 -> N stays 12, cat.jpg still displayed, message shown');

  // Rule 10: backend cannot be reached
  it.todo('N is 8, cat.jpg displayed, Fetch, backend cannot be reached -> N stays 8, cat.jpg still displayed, message shown');

  describe('verification', () => {
    // Relies on: starting N of 0 (test 1) + Fetch after N (test 2)
    it.todo('first visit, Fetch -> simulator requests GET /instructions?after=0');

    // Relies on: N updated separately from carrying out instructions (test 5) + photo 404 handling (test 10)
    it.todo('N is 6, Fetch, response "7 SHOW /images/dog.jpg", dog.jpg returns 404 -> N becomes 7 (seq 7 is consumed)');

    // Relies on: unknown-instruction handling (test 9); lowercase "show" is not SHOW
    it.todo('Fetch, response "9 show /images/cat.jpg" -> no photo change, warning logged');

    // Relies on: failed instructions fetch handling (test 12)
    it.todo('N is 8, cat.jpg displayed, Fetch, /instructions returns 400 -> N stays 8, cat.jpg still displayed, message shown');

    // Relies on: N persisted on update (test 5) + reload (test 7)
    it.todo('N is 6, Fetch, response "7 sleep", reload -> N displayed as 7');

    // Relies on: Reset (test 8) + Fetch after N (test 2)
    it.todo('N is 8, click Reset, Fetch -> simulator requests GET /instructions?after=0');
  });
});
