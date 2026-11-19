// Rules for photo filenames (story 0012).

// Rule 1: a photo's filename may contain only characters that never need URL encoding: letters, digits, "-", ".",
// "_" and "~" (RFC 3986's unreserved characters).
export function hasAllowedName(filename: string): boolean {
  return /^[A-Za-z0-9\-._~]*$/.test(filename);
}

// Only .jpg files are candidates for photos (story 0006).
function isJpgFilename(filename: string): boolean {
  return filename.endsWith('.jpg');
}

// A file in the image folder is a photo if it is a .jpg with an allowed name (Rule 1).
export function isPhotoFilename(filename: string): boolean {
  return isJpgFilename(filename) && hasAllowedName(filename);
}

// A .jpg whose name is not allowed is skipped: left out everywhere, with a warning (Rules 2 and 3). Other files are
// not photos at all and are ignored silently.
export function isSkippedPhotoFilename(filename: string): boolean {
  return isJpgFilename(filename) && !hasAllowedName(filename);
}
