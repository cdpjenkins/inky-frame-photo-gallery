// Test list for story 0006: Show Photo Instruction, backend part (Rules 1-5)
// (stories/doing/0006-show-photo-instruction.md). Simulator behaviour (Rules 6-10) is in
// src/simulator/__tests__/simulator.test.ts.
//
// "Admin types X" = the admin submits X via the existing add-instruction form on /admin (story 0001).
// "Admin picks F" = the admin chooses photo F in the new photo picker on /admin and submits it.
// "Frame asks after N" = GET /instructions?after=N (story 0001).
//
// Rejection contract (Rule 3): the spec defines the exact error text, so rejection tests assert that the
// resulting admin page shows exactly this message (in the role="alert" element agreed in story 0001), and that
// the instruction is not added (the frame does not receive it):
//   A SHOW instruction must be in the form "SHOW /images/<filename>.jpg", where the filename contains no whitespace or "/".
//
// Picker tests use their own temporary image directory containing "cat.jpg", "my cat.jpg", "cat.png" and
// "bird.JPG", so the shared test-fixtures/images directory is left unchanged. (Not "cat.JPG": on a
// case-insensitive filesystem such as default macOS, it would be the same file as "cat.jpg".)
//
// Rule 2 also excludes filenames containing "/". A file on disk cannot have "/" in its name, so no test covers
// that case.

import request from 'supertest';
import path from 'path';
import fs from 'fs';
import http from 'http';
import os from 'os';
import { createApp } from '../../app';

const SHOW_ERROR_MESSAGE =
  'A SHOW instruction must be in the form "SHOW /images/<filename>.jpg", where the filename contains no whitespace or "/".';

// Each test gets a fresh temporary directory holding its own images and instructions file.
let testDir: string;
let testImageDir: string;
let testApp: http.Server;

// Started explicitly on 127.0.0.1; see the note in instructions.test.ts.
async function startApp() {
  const app = createApp({ imageDir: testImageDir, instructionsPath: path.join(testDir, 'instructions.json') });
  testApp = await new Promise<http.Server>(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function stopApp() {
  return new Promise<void>(resolve => testApp.close(() => resolve()));
}

function typeInstruction(text: string) {
  return request(testApp).post('/admin/instructions').type('form').send({ text });
}

function pickPhoto(filename: string) {
  return request(testApp).post('/admin/show-photo').type('form').send({ filename });
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function errorMessage(html: string): string | undefined {
  const message = html.match(/<[^>]*role="alert"[^>]*>([^<]*)</)?.[1].trim();
  return message === undefined ? undefined : decodeHtmlEntities(message);
}

// The photo picker: a form on /admin posting to /admin/show-photo, with a <select name="filename"> whose options'
// values are the filenames offered. Returns undefined if there is no such form.
function pickerOptions(html: string): string[] | undefined {
  const form = html.match(/<form([^>]*action="\/admin\/show-photo"[^>]*)>([\s\S]*?)<\/form>/);
  if (!form) {
    return undefined;
  }
  const [, formAttributes, formContent] = form;
  if (!/method="post"/i.test(formAttributes)) {
    return undefined;
  }
  const select = formContent.match(/<select[^>]*name="filename"[^>]*>([\s\S]*?)<\/select>/);
  if (!select) {
    return undefined;
  }
  return [...select[1].matchAll(/<option[^>]*value="([^"]*)"/g)].map(([, value]) => decodeHtmlEntities(value));
}

async function instructionsAfter(n: number) {
  return (await request(testApp).get(`/instructions?after=${n}`)).text;
}

beforeEach(async () => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'show-instruction-test-'));
  testImageDir = path.join(testDir, 'images');
  fs.mkdirSync(testImageDir);
  for (const filename of ['cat.jpg', 'my cat.jpg', 'cat.png', 'bird.JPG']) {
    fs.writeFileSync(path.join(testImageDir, filename), '');
  }
  await startApp();
});

afterEach(async () => {
  await stopApp();
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('Show photo instruction (story 0006)', () => {
  // Rule 3: an attempted SHOW with no path is rejected with the exact message
  it('admin types "SHOW" -> rejected: admin page shows the SHOW error message, frame asks after 0 and receives an empty body', async () => {
    const addResponse = await typeInstruction('SHOW');

    expect(errorMessage(addResponse.text)).toBe(SHOW_ERROR_MESSAGE);
    expect(await instructionsAfter(0)).toBe('');
  });

  // Rule 3: the path must start with /images/
  it('admin types "SHOW cat.jpg" -> rejected with the SHOW error message, instruction not added', async () => {
    const addResponse = await typeInstruction('SHOW cat.jpg');

    expect(errorMessage(addResponse.text)).toBe(SHOW_ERROR_MESSAGE);
    expect(await instructionsAfter(0)).toBe('');
  });

  // Rule 3: the filename must end in .jpg
  it('admin types "SHOW /images/cat.png" -> rejected with the SHOW error message, instruction not added', async () => {
    const addResponse = await typeInstruction('SHOW /images/cat.png');

    expect(errorMessage(addResponse.text)).toBe(SHOW_ERROR_MESSAGE);
    expect(await instructionsAfter(0)).toBe('');
  });

  // Rule 3: the filename must contain no whitespace
  it('admin types "SHOW /images/my cat.jpg" -> rejected with the SHOW error message, instruction not added', async () => {
    const addResponse = await typeInstruction('SHOW /images/my cat.jpg');

    expect(errorMessage(addResponse.text)).toBe(SHOW_ERROR_MESSAGE);
    expect(await instructionsAfter(0)).toBe('');
  });

  // Rule 3: the filename must contain no "/"
  it('admin types "SHOW /images/../secret.jpg" -> rejected with the SHOW error message, instruction not added', async () => {
    const addResponse = await typeInstruction('SHOW /images/../secret.jpg');

    expect(errorMessage(addResponse.text)).toBe(SHOW_ERROR_MESSAGE);
    expect(await instructionsAfter(0)).toBe('');
  });

  // Rule 3: a first word of "show" in any case is an attempted SHOW, and only uppercase SHOW is valid
  it('admin types "show /images/cat.jpg" -> rejected with the SHOW error message, instruction not added', async () => {
    const addResponse = await typeInstruction('show /images/cat.jpg');

    expect(errorMessage(addResponse.text)).toBe(SHOW_ERROR_MESSAGE);
    expect(await instructionsAfter(0)).toBe('');
  });

  // Rule 4: a line whose first word is not "show" stays free text, even if it starts with the letters SHOW
  it('admin types "SHOWING /images/cat.jpg" -> accepted as free text: frame asks after 0 and receives "1 SHOWING /images/cat.jpg"', async () => {
    await typeInstruction('SHOWING /images/cat.jpg');

    expect(await instructionsAfter(0)).toBe('1 SHOWING /images/cat.jpg');
  });

  // Rule 2: the picker lists .jpg photos
  it('image directory contains cat.jpg -> admin page has a photo picker offering cat.jpg', async () => {
    const response = await request(testApp).get('/admin');

    expect(response.status).toBe(200);
    expect(pickerOptions(response.text)).toContain('cat.jpg');
  });

  // Rule 1: picking a photo adds SHOW /images/<filename>
  it('no instructions exist, admin picks cat.jpg -> frame asks after 0 and receives "1 SHOW /images/cat.jpg"', async () => {
    await pickPhoto('cat.jpg');

    expect(await instructionsAfter(0)).toBe('1 SHOW /images/cat.jpg');
  });

  // Rule 2: the picker leaves out filenames containing whitespace
  it('image directory contains "my cat.jpg" -> the photo picker does not offer "my cat.jpg"', async () => {
    const response = await request(testApp).get('/admin');

    const options = pickerOptions(response.text);
    expect(options).toContain('cat.jpg');
    expect(options).not.toContain('my cat.jpg');
  });

  // Rule 5 (served by the backend): the simulator page
  it.todo('GET /simulator -> 200, HTML page');

  describe('verification', () => {
    // Accepts a valid SHOW. This already passes before the story (free text), and must keep passing once
    // validation exists. Relies on: tests 1-6 rejecting only malformed SHOWs
    it.todo('admin types "SHOW /images/cat.jpg" -> accepted: frame asks after 0 and receives "1 SHOW /images/cat.jpg"');

    // Relies on: the valid-SHOW verification test above + Rule 3 does not check existence
    it.todo('admin types "SHOW /images/dog.jpg" (dog.jpg is not in the image directory) -> accepted: frame receives "1 SHOW /images/dog.jpg"');

    // Relies on: story 0001 trimming happening before SHOW validation (the valid-SHOW verification test above)
    it.todo('admin types "  SHOW /images/cat.jpg  " -> trimmed and accepted: frame receives "1 SHOW /images/cat.jpg"');

    // Relies on: lowercase .jpg check (test 3)
    it.todo('admin types "SHOW /images/cat.JPG" -> rejected with the SHOW error message, instruction not added');

    // Relies on: no-whitespace check (test 4)
    it.todo('admin types "SHOW /images/my\\tcat.jpg" (tab) -> rejected with the SHOW error message, instruction not added');
    it.todo('admin types "SHOW /images/cat.jpg extra" -> rejected with the SHOW error message, instruction not added');

    // Relies on: exact form "SHOW /images/" with a single space (tests 2, 4)
    it.todo('admin types "SHOW  /images/cat.jpg" (two spaces) -> rejected with the SHOW error message, instruction not added');

    // Relies on: case-insensitive first word plus uppercase-only SHOW (test 6)
    it.todo('admin types "Show /images/cat.jpg" -> rejected with the SHOW error message, instruction not added');

    // Relies on: story 0001 free-text path, unchanged for non-SHOW lines (test 7)
    it.todo('admin types "sleep" -> accepted as free text: frame receives "1 sleep"');

    // Relies on: SHOW rejection not adding (tests 1-6) + story 0001 sequence numbering
    it.todo('latest seq is 3, admin types "SHOW cat.jpg" then "SHOW /images/cat.jpg" -> the latter gets seq 4 (rejection uses up no sequence number)');

    // Relies on: picking (test 9) + story 0001 sequence numbering
    it.todo('latest seq is 6, admin picks cat.jpg -> frame asks after 6 and receives "7 SHOW /images/cat.jpg"');

    // Relies on: picker lists only .jpg (test 8, reusing the existing lowercase .jpg filter)
    it.todo('image directory contains cat.png -> the photo picker does not offer cat.png');
    it.todo('image directory contains bird.JPG -> the photo picker does not offer bird.JPG');
  });
});
