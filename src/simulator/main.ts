// Browser adapter for the Photo Frame Simulator (story 0006): connects the page, local storage, fetch and the
// console to PhotoFrameSimulator. Compiled for the browser by `npm run build:simulator`.

import { PhotoFrameSimulator, SimulatorView } from './PhotoFrameSimulator.js';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) {
    throw new Error(`Simulator page is missing #${id}`);
  }
  return found as T;
}

const nDisplay = element<HTMLElement>('simulator-n');
const photo = element<HTMLImageElement>('simulator-photo');
const message = element<HTMLElement>('simulator-message');

const view: SimulatorView = {
  showN(n) {
    nDisplay.textContent = String(n);
  },
  showPhoto(path) {
    photo.src = path;
    photo.alt = path;
    photo.hidden = false;
  },
  showMessage(text) {
    message.textContent = text;
  },
};

const simulator = new PhotoFrameSimulator({
  fetch: url => window.fetch(url),
  storage: window.localStorage,
  view,
  log: text => console.log(text),
});

element<HTMLButtonElement>('simulator-fetch').addEventListener('click', () => simulator.fetchInstructions());
element<HTMLButtonElement>('simulator-reset').addEventListener('click', () => simulator.reset());

simulator.start();
