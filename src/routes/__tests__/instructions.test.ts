// Test list for story 0001: Instructions (stories/todo/0001-instructions.md)
//
// "Frame asks after N" = the frame requests all instructions with a sequence number greater than N.
// "Admin adds X" = the admin submits X via the add-instruction form on the /admin page.
//
// Rejection contract (Rule 2): the spec says a rejected instruction "shows an error message on the admin page,
// is not added, and does not use up a sequence number". The spec does not define the error text or the HTTP
// status of the form response, so rejection tests assert only that: (a) the resulting admin page contains a
// non-empty element with role="alert" (agreed contract for "shows an error message"), and (b) the instruction
// is not added (the frame does not receive it; the admin list reads from the same instruction list).

import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../../app';

const testImageDir = path.join(__dirname, '../../../test-fixtures/images');
const testInstructionsPath = path.join(__dirname, '../../../test-fixtures/test-instructions.json');

let testApp: any;

function removeTestInstructions() {
  if (fs.existsSync(testInstructionsPath)) {
    fs.unlinkSync(testInstructionsPath);
  }
}

function addInstruction(text: string) {
  return request(testApp).post('/admin/instructions').type('form').send({ text });
}

function errorMessage(html: string): string | undefined {
  return html.match(/<[^>]*role="alert"[^>]*>([^<]*)</)?.[1].trim();
}

async function addInstructions(count: number) {
  for (let i = 1; i <= count; i++) {
    await addInstruction(`instruction ${i}`);
  }
}

beforeEach(() => {
  removeTestInstructions();
  testApp = createApp({ imageDir: testImageDir, instructionsPath: testInstructionsPath });
});

afterEach(() => {
  removeTestInstructions();
});

describe('Instructions', () => {
  // Rule 3 + Rule 4: empty case
  it('frame asks after 0 with no instructions -> 200, text/plain, empty body', async () => {
    const response = await request(testApp).get('/instructions?after=0');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/plain');
    expect(response.text).toBe('');
  });

  // Rule 1 + Rule 4: first instruction gets seq 1, line format "<seq> <text>"
  it('admin adds "display /images/cat.jpg" with no instructions -> frame asks after 0 and receives "1 display /images/cat.jpg"', async () => {
    await addInstruction('display /images/cat.jpg');

    const response = await request(testApp).get('/instructions?after=0');

    expect(response.status).toBe(200);
    expect(response.text).toBe('1 display /images/cat.jpg');
  });

  // Rule 1 + Rule 4: sequence numbers increase by 1; one line per instruction, joined by "\n"
  it('admin adds "display /images/cat.jpg" then "sleep" -> frame asks after 0 and receives "1 display /images/cat.jpg\\n2 sleep"', async () => {
    await addInstruction('display /images/cat.jpg');
    await addInstruction('sleep');

    const response = await request(testApp).get('/instructions?after=0');

    expect(response.status).toBe(200);
    expect(response.text).toBe('1 display /images/cat.jpg\n2 sleep');
  });

  // Rule 3: only instructions after N
  it('instructions 1-5 exist, frame asks after 3 -> receives exactly instructions 4 then 5', async () => {
    await addInstructions(5);

    const response = await request(testApp).get('/instructions?after=3');

    expect(response.status).toBe(200);
    expect(response.text).toBe('4 instruction 4\n5 instruction 5');
  });

  // Rule 5: N ahead of the backend
  it('latest seq is 5, frame asks after 9 -> 409 Conflict', async () => {
    await addInstructions(5);

    const response = await request(testApp).get('/instructions?after=9');

    expect(response.status).toBe(409);
  });

  // Rule 5: missing / invalid N
  it('frame asks with no N -> 400 Bad Request', async () => {
    const response = await request(testApp).get('/instructions');

    expect(response.status).toBe(400);
  });
  it('frame asks after "abc" -> 400 Bad Request', async () => {
    const response = await request(testApp).get('/instructions?after=abc');

    expect(response.status).toBe(400);
  });
  it('frame asks after -1 -> 400 Bad Request', async () => {
    const response = await request(testApp).get('/instructions?after=-1');

    expect(response.status).toBe(400);
  });
  it('frame asks after 12.5 -> 400 Bad Request (sequence numbers are integers)', async () => {
    const response = await request(testApp).get('/instructions?after=12.5');

    expect(response.status).toBe(400);
  });
  it('frame asks with an empty N ("after=") -> 400 Bad Request', async () => {
    const response = await request(testApp).get('/instructions?after=');

    expect(response.status).toBe(400);
  });
  it('frame asks after " " (whitespace only) -> 400 Bad Request', async () => {
    const response = await request(testApp).get('/instructions?after=%20');

    expect(response.status).toBe(400);
  });
  it('frame asks after "0x10" (hexadecimal) -> 400 Bad Request', async () => {
    const response = await request(testApp).get('/instructions?after=0x10');

    expect(response.status).toBe(400);
  });
  it('frame asks with N given as an array ("after[]=3") -> 400 Bad Request (N must be a single string)', async () => {
    const response = await request(testApp).get('/instructions?after[]=3');

    expect(response.status).toBe(400);
  });

  // Rule 7: admin page lists instructions
  it('instructions 1-3 exist -> admin page lists 1, 2, 3 in that order, each with its sequence number and text', async () => {
    await addInstructions(3);

    const response = await request(testApp).get('/admin');

    expect(response.status).toBe(200);
    const positions = ['1 instruction 1', '2 instruction 2', '3 instruction 3'].map(line => response.text.indexOf(line));
    expect(positions).not.toContain(-1);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
  it('admin page has a form that posts a "text" field to /admin/instructions', async () => {
    const response = await request(testApp).get('/admin');

    expect(response.status).toBe(200);
    const form = response.text.match(/<form([^>]*action="\/admin\/instructions"[^>]*)>([\s\S]*?)<\/form>/);
    expect(form).not.toBeNull();
    const [, formAttributes, formContent] = form!;
    expect(formAttributes).toMatch(/method="post"/i);
    expect(formContent).toMatch(/name="text"/);
  });

  // Rule 2: trimming
  it('admin adds "  sleep  " -> stored as "sleep" (frame asks after 0 and receives "1 sleep")', async () => {
    await addInstruction('  sleep  ');

    const response = await request(testApp).get('/instructions?after=0');

    expect(response.text).toBe('1 sleep');
  });

  // Rule 2: rejections (see rejection contract at top of file)
  it('admin adds "" -> rejected as empty: admin page shows an error message, frame asks after 0 and receives an empty body', async () => {
    const addResponse = await addInstruction('');

    expect(errorMessage(addResponse.text)).toBeTruthy();
    const response = await request(testApp).get('/instructions?after=0');
    expect(response.text).toBe('');
  });
  it('admin adds 101 characters (after trimming) -> rejected: admin page shows an error message, instruction not added', async () => {
    const addResponse = await addInstruction('a'.repeat(101));

    expect(errorMessage(addResponse.text)).toBeTruthy();
    const response = await request(testApp).get('/instructions?after=0');
    expect(response.text).toBe('');
  });
  it('admin adds "display\\ncat.jpg" -> rejected (contains newline): admin page shows an error message, instruction not added', async () => {
    const addResponse = await addInstruction('display\ncat.jpg');

    expect(errorMessage(addResponse.text)).toBeTruthy();
    const response = await request(testApp).get('/instructions?after=0');
    expect(response.text).toBe('');
  });
  it('admin adds "display\\rcat.jpg" -> rejected (contains carriage return): admin page shows an error message, instruction not added', async () => {
    const addResponse = await addInstruction('display\rcat.jpg');

    expect(errorMessage(addResponse.text)).toBeTruthy();
    const response = await request(testApp).get('/instructions?after=0');
    expect(response.text).toBe('');
  });

  // Rule 6: persistence across restart
  it.todo('instructions 1-5 exist, backend restarts (new app, same storage) -> frame asks after 0 and receives 1-5; next instruction added gets seq 6');

  describe('verification', () => {
    // Relies on: increasing sequence numbers (test 3)
    it.todo('instructions 1-3 exist, admin adds "sleep" -> it gets seq 4');

    // Relies on: line format and joining (tests 2, 3) + filtering after N (test 4)
    it.todo('seq 4 "display /images/cat.jpg" and seq 5 "sleep", frame asks after 3 -> body is exactly "4 display /images/cat.jpg\\n5 sleep"');

    // Relies on: filtering after N (test 4)
    it.todo('instructions 1-5 exist, frame asks after 0 (first boot) -> receives 1-5 in ascending order');
    it.todo('instructions 1-5 exist, frame asks after 5 -> 200, empty body');

    // Relies on: 409 for N > latest (test 5); latest is 0 when there are no instructions (derived from Rule 5)
    it.todo('no instructions exist, frame asks after 1 -> 409 Conflict');

    // Relies on: plain decimal digits check (test 12)
    it.todo('frame asks after "1e1" (exponent notation) -> 400 Bad Request');

    // Relies on: N must be a single string (test 13)
    it.todo('frame asks with N given twice ("after=1&after=2") -> 400 Bad Request');

    // Relies on: trimming (test 16) + empty rejection (test 17)
    it.todo('admin adds "   " -> rejected as empty: admin page shows an error message, instruction not added');

    // Relies on: trimming (test 16) happening before the newline check (test 19)
    it.todo('admin adds "sleep\\n" -> trimmed to "sleep" and accepted (frame asks after 0 and receives "1 sleep")');

    // Relies on: length rejection (test 18); boundary
    it.todo('admin adds exactly 100 characters -> accepted');

    // Relies on: trimming (test 16) happening before the length check (test 18)
    it.todo('admin adds 2 spaces + 100 characters + 2 spaces -> accepted and stored as the 100 characters');

    // Relies on: rejection not adding (tests 17-20) + sequence numbering (test 3)
    it.todo('latest seq is 3, admin submits "" then "sleep" -> "sleep" gets seq 4 (rejection uses up no sequence number)');
  });
});
