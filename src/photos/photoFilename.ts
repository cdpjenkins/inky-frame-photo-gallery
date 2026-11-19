// Rules for photo filenames (story 0012).

// Rule 1: a photo's filename may contain only characters that never need URL encoding: letters, digits, "-", ".",
// "_" and "~" (RFC 3986's unreserved characters).
export function hasAllowedName(filename: string): boolean {
  return /^[A-Za-z0-9\-._~]*$/.test(filename);
}

// A file in the image folder is a photo if its filename ends in ".jpg" (story 0006) and is allowed (Rule 1).
export function isPhotoFilename(filename: string): boolean {
  return filename.endsWith('.jpg') && hasAllowedName(filename);
}
