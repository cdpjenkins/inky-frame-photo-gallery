// The SHOW instruction (story 0006): tells a photo frame to download and display one photo.

export const MALFORMED_SHOW_MESSAGE =
  'A SHOW instruction must be in the form "SHOW /images/<filename>.jpg", where the filename contains no whitespace or "/".';

// SHOW /images/<filename>.jpg, where the filename contains no whitespace or "/".
const SHOW_FORMAT = /^SHOW \/images\/[^\s/]*\.jpg$/;

export function showInstructionFor(filename: string): string {
  return `SHOW /images/${filename}`;
}

function isAttemptedShowInstruction(text: string): boolean {
  const firstWord = text.split(/\s/)[0];
  return firstWord.toUpperCase() === 'SHOW';
}

function hasShowFormat(text: string): boolean {
  return SHOW_FORMAT.test(text);
}

export function isMalformedShowInstruction(text: string): boolean {
  return isAttemptedShowInstruction(text) && !hasShowFormat(text);
}
