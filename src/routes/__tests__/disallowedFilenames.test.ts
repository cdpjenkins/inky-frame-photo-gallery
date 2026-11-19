// Test list for story 0012: Disallow filenames that are not safe in URLs
// (stories/doing/0012-filenames-that-break-urls.md).
//
// "Allowed" = a filename made only of letters A-Z and a-z, digits 0-9, "-", ".", "_" and "~" (Rule 1).
// "Folder holds X" = each test starts the app on its own temporary image folder holding exactly the files X.
// "Left out of the gallery" = no gallery item on /admin refers to the file: no thumbnail, no Select checkbox and no
// "Show on frame" button (Rule 2).
// "Warning logged for F" = console.warn is called with exactly "Skipping photo with disallowed name: F" (Rule 3).
// Tests observe console.warn through a Jest spy.
// "The notice" = "Some photos were skipped because their names contain characters that are not allowed." (Rule 4).
// The spec defines its text but not its markup, so tests assert only that the /admin page's text contains it, and
// how many times.
// "The SHOW message" = story 0012's message for a rejected SHOW, defined below (Rule 5). When the test that
// introduces it is activated, the SHOW_ERROR_MESSAGE constants in showInstruction.test.ts and
// invalidRequestBodies.test.ts change to it too, since it replaces story 0006's message everywhere.
// "Admin types X" = POST /admin/instructions with text=X (story 0001).
// "Frame asks after N" = GET /instructions?after=N (story 0001).
//
// Covered by existing tests, not repeated here:
// - Allowed photos stay in /list and are served from /images/ (index.test.ts).
// - "my cat.jpg" has no "Show on frame" button (showInstruction.test.ts), and Show on frame for "my cat.jpg" -> 400
//   with the SHOW message (invalidRequestBodies.test.ts).
// - Typed "SHOW /images/my cat.jpg", "SHOW /images/cat.png" and "SHOW /images/cat.JPG" are rejected
//   (showInstruction.test.ts; their expected message becomes the SHOW message).

import request from 'supertest';
import path from 'path';
import fs from 'fs';
import http from 'http';
import os from 'os';
import { createApp } from '../../app';

const SHOW_ERROR_MESSAGE =
  'A SHOW instruction must be in the form "SHOW /images/<filename>.jpg", where the filename contains only letters, digits, "-", ".", "_" and "~".';

const SKIPPED_PHOTOS_NOTICE = 'Some photos were skipped because their names contain characters that are not allowed.';

let testDir: string;
let testApp: http.Server | undefined;

// Starts the app on a fresh image folder holding exactly `filenames` (each file contains its own name), with
// `selected` photos marked as selected in its metadata file. Started on 127.0.0.1; see instructions.test.ts.
async function startWith(filenames: string[], selected: string[] = []) {
  const imageDir = path.join(testDir, 'images');
  fs.mkdirSync(imageDir);
  for (const filename of filenames) {
    fs.writeFileSync(path.join(imageDir, filename), filename);
  }
  const metadataPath = path.join(testDir, 'photo-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(Object.fromEntries(selected.map(f => [f, { selected: true }]))));
  const app = createApp({ imageDir, metadataPath, instructionsPath: path.join(testDir, 'instructions.json') });
  testApp = await new Promise<http.Server>(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function server(): http.Server {
  if (!testApp) {
    throw new Error('startWith() must be called before making requests');
  }
  return testApp;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// The filenames the /admin gallery refers to, through any gallery item's thumbnail (img alt), Select checkbox
// (data-filename) or "Show on frame" form (hidden filename value).
function galleryFilenames(html: string): string[] {
  const items = html.split('<div class="gallery-item"').slice(1);
  const referenced = items.flatMap(item =>
    [...item.matchAll(/(?:alt|data-filename|value)="([^"]*)"/g)].map(([, value]) => decodeHtmlEntities(value)),
  );
  return [...new Set(referenced)];
}

function occurrences(text: string, of: string): number {
  return text.split(of).length - 1;
}

function typeInstruction(text: string) {
  return request(server()).post('/admin/instructions').type('form').send({ text });
}

function errorMessage(html: string): string | undefined {
  const message = html.match(/<[^>]*role="alert"[^>]*>([^<]*)</)?.[1].trim();
  return message === undefined ? undefined : decodeHtmlEntities(message);
}

async function instructionsAfter(n: number) {
  return (await request(server()).get(`/instructions?after=${n}`)).text;
}

async function adminPage(): Promise<string> {
  return (await request(server()).get('/admin')).text;
}

let warn: jest.SpyInstance;

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'disallowed-filenames-test-'));
  testApp = undefined;
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  if (testApp) {
    const server = testApp;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
  fs.rmSync(testDir, { recursive: true, force: true });
  warn.mockRestore();
});

function warningsLogged(): unknown[][] {
  return warn.mock.calls;
}

describe('Disallow filenames that are not safe in URLs (story 0012)', () => {
  // Rule 2: a disallowed photo is left out of the gallery
  it('folder holds cat.jpg and summer#1.jpg -> /admin shows cat.jpg; summer#1.jpg is left out of the gallery', async () => {
    await startWith(['cat.jpg', 'summer#1.jpg']);

    const gallery = galleryFilenames(await adminPage());

    expect(gallery).toContain('cat.jpg');
    expect(gallery).not.toContain('summer#1.jpg');
  });

  // Rule 1: every character outside the allowed set disallows a photo
  it('folder holds cat.jpg, "my cat.jpg", what?.jpg, 50%.jpg, café.jpg and it\'s.jpg -> /admin shows cat.jpg; all the others are left out of the gallery', async () => {
    await startWith(['cat.jpg', 'my cat.jpg', 'what?.jpg', '50%.jpg', 'café.jpg', "it's.jpg"]);

    expect(galleryFilenames(await adminPage())).toEqual(['cat.jpg']);
  });

  // Rule 2: left out of /list
  it('folder holds cat.jpg and summer#1.jpg, both selected earlier -> /list is "/images/cat.jpg" only', async () => {
    await startWith(['cat.jpg', 'summer#1.jpg'], ['cat.jpg', 'summer#1.jpg']);

    const response = await request(server()).get('/list');

    expect(response.text).toBe('/images/cat.jpg');
  });

  // Rule 2: not served
  it('folder holds summer#1.jpg -> GET /images/summer%231.jpg -> 404', async () => {
    await startWith(['summer#1.jpg']);

    const response = await request(server()).get('/images/summer%231.jpg');

    expect(response.status).toBe(404);
  });

  // Rule 2: its selection cannot be changed
  it('folder holds "my cat.jpg" -> PATCH /api/photos/my%20cat.jpg with { "selected": true } -> 404 { "error": "Not found" }', async () => {
    await startWith(['my cat.jpg']);

    const response = await request(server()).patch('/api/photos/my%20cat.jpg').send({ selected: true });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  // Rule 3: warning when /admin reads the folder
  it('folder holds cat.jpg and summer#1.jpg, /admin opened -> warning logged once, for summer#1.jpg', async () => {
    await startWith(['cat.jpg', 'summer#1.jpg']);

    await adminPage();

    expect(warningsLogged()).toEqual([['Skipping photo with disallowed name: summer#1.jpg']]);
  });

  // Rule 3: warning when /list reads the folder
  it('folder holds cat.jpg and summer#1.jpg, /list requested -> warning logged once, for summer#1.jpg', async () => {
    await startWith(['cat.jpg', 'summer#1.jpg']);

    await request(server()).get('/list');

    expect(warningsLogged()).toEqual([['Skipping photo with disallowed name: summer#1.jpg']]);
  });

  // Rule 4: notice when photos were skipped
  it('folder holds cat.jpg, "my cat.jpg" and summer#1.jpg -> /admin shows the notice exactly once, without the skipped names', async () => {
    await startWith(['cat.jpg', 'my cat.jpg', 'summer#1.jpg']);

    const page = decodeHtmlEntities(await adminPage());

    expect(occurrences(page, SKIPPED_PHOTOS_NOTICE)).toBe(1);
    expect(page).not.toContain('my cat.jpg');
    expect(page).not.toContain('summer#1.jpg');
  });

  // Rule 4: no notice when nothing was skipped
  it('folder holds only cat.jpg -> /admin does not show the notice', async () => {
    await startWith(['cat.jpg']);

    const page = decodeHtmlEntities(await adminPage());

    expect(occurrences(page, SKIPPED_PHOTOS_NOTICE)).toBe(0);
  });

  // Rule 5: typed SHOW must name an allowed filename; the new SHOW message
  it('admin types "SHOW /images/summer#1.jpg" -> 400, admin page shows the SHOW message, frame asks after 0 and receives an empty body', async () => {
    await startWith(['cat.jpg']);

    const response = await typeInstruction('SHOW /images/summer#1.jpg');

    expect(response.status).toBe(400);
    expect(errorMessage(response.text)).toBe(SHOW_ERROR_MESSAGE);
    expect(await instructionsAfter(0)).toBe('');
  });

  describe('verification', () => {
    // Relies on: tests 1 and 2 (the allowed set includes upper case, digits, "-", "_", "~" and ".")
    it('folder holds Summer_2024-07.jpg, a~b.jpg and .jpg -> /admin shows all three in the gallery, and no notice', async () => {
      await startWith(['Summer_2024-07.jpg', 'a~b.jpg', '.jpg']);

      const html = await adminPage();

      expect(galleryFilenames(html).sort()).toEqual(['.jpg', 'Summer_2024-07.jpg', 'a~b.jpg']);
      expect(occurrences(decodeHtmlEntities(html), SKIPPED_PHOTOS_NOTICE)).toBe(0);
    });

    // Relies on: test 6 (the warning is logged every time the folder is read, not once)
    it('folder holds cat.jpg and summer#1.jpg, /admin opened twice -> warning for summer#1.jpg logged twice', async () => {
      await startWith(['cat.jpg', 'summer#1.jpg']);

      await adminPage();
      await adminPage();

      expect(warningsLogged()).toEqual([
        ['Skipping photo with disallowed name: summer#1.jpg'],
        ['Skipping photo with disallowed name: summer#1.jpg'],
      ]);
    });

    // Relies on: tests 6 and 7 (only .jpg files are checked). "summer#1.png" is not in the spec's example; it is
    // added so the test fails if non-photos with disallowed names were warned about.
    it('folder holds cat.png, bird.JPG and summer#1.png, /admin opened and /list requested -> no warning logged', async () => {
      await startWith(['cat.png', 'bird.JPG', 'summer#1.png']);

      await adminPage();
      await request(server()).get('/list');

      expect(warningsLogged()).toEqual([]);
    });

    // Relies on: tests 4 and 5 (they reject without reading the folder)
    it('folder holds summer#1.jpg -> GET /images/summer%231.jpg and PATCH /api/photos/summer%231.jpg -> no warning logged', async () => {
      await startWith(['summer#1.jpg']);

      await request(server()).get('/images/summer%231.jpg');
      await request(server()).patch('/api/photos/summer%231.jpg').send({ selected: true });

      expect(warningsLogged()).toEqual([]);
    });

    // Relies on: test 9 + non-photos being ignored (as above, summer#1.png is added to make it discriminating)
    it('folder holds cat.jpg, cat.png and summer#1.png -> /admin does not show the notice', async () => {
      await startWith(['cat.jpg', 'cat.png', 'summer#1.png']);

      const page = decodeHtmlEntities(await adminPage());

      expect(occurrences(page, SKIPPED_PHOTOS_NOTICE)).toBe(0);
    });

    // Relies on: test 10 using the allowed set from test 2
    it('admin types "SHOW /images/café.jpg" -> 400, SHOW message, nothing added', async () => {
      await startWith(['cat.jpg']);

      const response = await typeInstruction('SHOW /images/café.jpg');

      expect(response.status).toBe(400);
      expect(errorMessage(response.text)).toBe(SHOW_ERROR_MESSAGE);
      expect(await instructionsAfter(0)).toBe('');
    });
    it('admin types "SHOW /images/my%20cat.jpg" -> 400, SHOW message, nothing added', async () => {
      await startWith(['cat.jpg']);

      const response = await typeInstruction('SHOW /images/my%20cat.jpg');

      expect(response.status).toBe(400);
      expect(errorMessage(response.text)).toBe(SHOW_ERROR_MESSAGE);
      expect(await instructionsAfter(0)).toBe('');
    });

    // Relies on: test 10 accepting allowed filenames
    it('admin types "SHOW /images/Summer_2024-07.jpg" -> accepted: frame asks after 0 and receives "1 SHOW /images/Summer_2024-07.jpg"', async () => {
      await startWith(['cat.jpg']);

      await typeInstruction('SHOW /images/Summer_2024-07.jpg');

      expect(await instructionsAfter(0)).toBe('1 SHOW /images/Summer_2024-07.jpg');
    });
    it('admin types "SHOW /images/.jpg" -> accepted: frame asks after 0 and receives "1 SHOW /images/.jpg"', async () => {
      await startWith(['cat.jpg']);

      await typeInstruction('SHOW /images/.jpg');

      expect(await instructionsAfter(0)).toBe('1 SHOW /images/.jpg');
    });

    // Relies on: test 10 (show-photo goes through the same SHOW check)
    it('Show on frame for "summer#1.jpg" (a crafted request) -> 400, admin page shows the SHOW message, nothing added', async () => {
      await startWith(['cat.jpg', 'summer#1.jpg']);

      const response = await request(server()).post('/admin/show-photo').type('form').send('filename=summer%231.jpg');

      expect(response.status).toBe(400);
      expect(errorMessage(response.text)).toBe(SHOW_ERROR_MESSAGE);
      expect(await instructionsAfter(0)).toBe('');
    });
  });
});
