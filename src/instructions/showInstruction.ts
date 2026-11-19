// The SHOW instruction (story 0006): tells a photo frame to download and display one photo.
// Its form is "SHOW /images/<filename>", where <filename> is a showable filename.

const SHOW_PREFIX = 'SHOW /images/';

export const MALFORMED_SHOW_MESSAGE =
  'A SHOW instruction must be in the form "SHOW /images/<filename>.jpg", where the filename contains no whitespace or "/".';

// Story 0012, Rule 1: a photo's filename may contain only characters that never need URL encoding.
export function hasAllowedName(filename: string): boolean {
  return !filename.includes('#');
}

// A photo can be shown if its filename ends in ".jpg" and contains no whitespace or "/".
export function isShowableFilename(filename: string): boolean {
  return filename.endsWith('.jpg') && !/[\s/]/.test(filename);
}

export function showInstructionFor(filename: string): string {
  return `${SHOW_PREFIX}${filename}`;
}

function isAttemptedShowInstruction(text: string): boolean {
  const firstWord = text.split(/\s/)[0];
  return firstWord.toUpperCase() === 'SHOW';
}

function hasShowFormat(text: string): boolean {
  return text.startsWith(SHOW_PREFIX) && isShowableFilename(text.slice(SHOW_PREFIX.length));
}

export function isMalformedShowInstruction(text: string): boolean {
  return isAttemptedShowInstruction(text) && !hasShowFormat(text);
}
