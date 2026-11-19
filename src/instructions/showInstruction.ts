// The SHOW instruction (story 0006): tells a photo frame to download and display one photo.
// Its form is "SHOW /images/<filename>", where <filename> is a photo filename (story 0012).

import { isPhotoFilename } from '../photos/photoFilename';

const SHOW_PREFIX = 'SHOW /images/';

export const MALFORMED_SHOW_MESSAGE =
  'A SHOW instruction must be in the form "SHOW /images/<filename>.jpg", where the filename contains only letters, digits, "-", ".", "_" and "~".';

export function showInstructionFor(filename: string): string {
  return `${SHOW_PREFIX}${filename}`;
}

function isAttemptedShowInstruction(text: string): boolean {
  const firstWord = text.split(/\s/)[0];
  return firstWord.toUpperCase() === 'SHOW';
}

function hasShowFormat(text: string): boolean {
  return text.startsWith(SHOW_PREFIX) && isPhotoFilename(text.slice(SHOW_PREFIX.length));
}

export function isMalformedShowInstruction(text: string): boolean {
  return isAttemptedShowInstruction(text) && !hasShowFormat(text);
}
