// Test list for story 0011: Reject invalid request bodies with 400
// (stories/doing/0011-reject-invalid-request-bodies.md).
//
// "PATCH F with B" = PATCH /api/photos/F with JSON body B (the admin page's Select checkbox).
// "Admin adds X" = POST /admin/instructions with form field text=X (story 0001).
// "Show on frame for F" = POST /admin/show-photo with form field filename=F (story 0006).
// "Frame asks after N" = GET /instructions?after=N (story 0001).
// "/list includes F" = GET /list contains the line /images/F (the frame's list of selected photos).
//
// Rejection contracts (all defined by the spec):
// - PATCH (Rules 1 and 3): status 400 with exactly the JSON body given in the test.
// - Admin forms (Rules 4 and 5): status 400 and the admin page re-rendered with exactly the given message in its
//   role="alert" element (as in stories 0001 and 0006), and the instruction is not added.
//
// Not tested: an unknown photo PATCHed with an invalid `selected`. The spec accepts either the 404 or the 400
// (Rule 1), so no test may depend on which one wins.
//
// Already covered by existing tests, so not repeated here:
// - PATCH with { "selected": true } -> 200 and the photo appears in /list (index.test.ts, "GET /list").
// - Show on frame for cat.jpg adds SHOW /images/cat.jpg (showInstruction.test.ts).
//
// Each test gets its own temporary directory holding "cat.jpg", "my cat.jpg" and "cat.png", and its own
// instructions and photo-metadata files.

import request from 'supertest';
import path from 'path';
import fs from 'fs';
import http from 'http';
import os from 'os';
import { createApp } from '../../app';

const SHOW_ERROR_MESSAGE =
  'A SHOW instruction must be in the form "SHOW /images/<filename>.jpg", where the filename contains no whitespace or "/".';

let testDir: string;
let testApp: http.Server;

// Started explicitly on 127.0.0.1; see the note in instructions.test.ts.
async function startApp() {
  const app = createApp({
    imageDir: path.join(testDir, 'images'),
    instructionsPath: path.join(testDir, 'instructions.json'),
    metadataPath: path.join(testDir, 'photo-metadata.json'),
  });
  testApp = await new Promise<http.Server>(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function stopApp() {
  return new Promise<void>(resolve => testApp.close(() => resolve()));
}

function patchPhoto(filename: string, body: object) {
  return request(testApp).patch(`/api/photos/${filename}`).send(body);
}

// Form fields are sent as a raw urlencoded string, so tests can leave a field out or send it twice.
function addInstruction(form: string) {
  return request(testApp).post('/admin/instructions').type('form').send(form);
}

function showOnFrame(form: string) {
  return request(testApp).post('/admin/show-photo').type('form').send(form);
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

async function instructionsAfter(n: number) {
  return (await request(testApp).get(`/instructions?after=${n}`)).text;
}

async function listedPhotos(): Promise<string[]> {
  const text = (await request(testApp).get('/list')).text;
  return text === '' ? [] : text.split('\n');
}

beforeEach(async () => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'invalid-request-bodies-test-'));
  fs.mkdirSync(path.join(testDir, 'images'));
  for (const filename of ['cat.jpg', 'my cat.jpg', 'cat.png']) {
    fs.writeFileSync(path.join(testDir, 'images', filename), '');
  }
  await startApp();
});

afterEach(async () => {
  await stopApp();
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('Reject invalid request bodies (story 0011)', () => {
  // Rule 1: selected must be a JSON boolean
  it('cat.jpg not selected, PATCH cat.jpg with { "selected": "true" } -> 400 { "error": "selected must be true or false" }, /list does not include cat.jpg', async () => {
    const response = await patchPhoto('cat.jpg', { selected: 'true' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'selected must be true or false' });
    expect(await listedPhotos()).not.toContain('/images/cat.jpg');
  });

  // Rule 3: a PATCH body that is not valid JSON
  it('PATCH cat.jpg with the body "{selected:" (Content-Type application/json) -> 400 { "error": "Request body must be valid JSON" }', async () => {
    const response = await request(testApp)
      .patch('/api/photos/cat.jpg')
      .set('Content-Type', 'application/json')
      .send('{selected:');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Request body must be valid JSON' });
  });

  // Rule 4: text must be a string
  it('admin adds an instruction with no text field -> 400, admin page shows "Instruction must be text", frame asks after 0 and receives an empty body', async () => {
    const response = await addInstruction('');

    expect(response.status).toBe(400);
    expect(errorMessage(response.text)).toBe('Instruction must be text');
    expect(await instructionsAfter(0)).toBe('');
  });

  // Rule 5: the filename must be one that can be shown
  it('Show on frame for "my cat.jpg" -> 400, admin page shows the SHOW error message, frame asks after 0 and receives an empty body', async () => {
    const response = await showOnFrame('filename=my%20cat.jpg');

    expect(response.status).toBe(400);
    expect(errorMessage(response.text)).toBe(SHOW_ERROR_MESSAGE);
    expect(await instructionsAfter(0)).toBe('');
  });

  // Rule 5: a filename sent more than once is not a filename that can be shown. Express turns it into a list, which
  // would otherwise become the valid-looking "SHOW /images/cat.jpg,dog.jpg".
  it('Show on frame with filename sent twice (filename=cat.jpg&filename=dog.jpg) -> 400, admin page shows the SHOW error message, nothing added', async () => {
    const response = await showOnFrame('filename=cat.jpg&filename=dog.jpg');

    expect(response.status).toBe(400);
    expect(errorMessage(response.text)).toBe(SHOW_ERROR_MESSAGE);
    expect(await instructionsAfter(0)).toBe('');
  });

  describe('verification', () => {
    // Relies on: test 1 (any non-boolean selected is rejected, and the selection is left unchanged)
    it.todo('cat.jpg selected, PATCH cat.jpg with { "selected": "false" } -> 400 { "error": "selected must be true or false" }, /list still includes cat.jpg');
    it.todo('PATCH cat.jpg with {} (no selected) -> 400 { "error": "selected must be true or false" }');

    // Relies on: test 1 not rejecting a valid selected + existing PATCH behaviour (only selected is read)
    it.todo('cat.jpg not selected, PATCH cat.jpg with { "selected": true, "colour": "red" } -> 200, /list includes cat.jpg');

    // Relies on: test 3 (any non-string text is rejected)
    it.todo('admin adds an instruction with text sent twice (text=a&text=b) -> 400, admin page shows "Instruction must be text", nothing added');
    it.todo('admin adds an instruction with JSON body { "text": 42 } -> 400, admin page shows "Instruction must be text", nothing added');

    // Relies on: test 3 checking the type only, + story 0001's empty-text rule
    it.todo('admin adds "" -> 400, admin page shows "Instruction must not be empty" (unchanged from story 0001)');

    // Relies on: test 4 (rejection of a filename that cannot be shown is rendered on the admin page)
    it.todo('Show on frame with no filename field -> 400, admin page shows the SHOW error message, nothing added');
    it.todo('Show on frame for "cat.png" -> 400, admin page shows the SHOW error message, nothing added');

    // Relies on: test 4 + story 0001 numbering (a rejection uses up no sequence number)
    it.todo('latest seq is 3, Show on frame for "my cat.jpg" rejected, then Show on frame for cat.jpg -> frame asks after 3 and receives "4 SHOW /images/cat.jpg"');

    // Relies on: test 3 + story 0001 numbering
    it.todo('latest seq is 3, admin adds an instruction with no text field (rejected), then adds "sleep" -> frame asks after 3 and receives "4 sleep"');
  });
});
