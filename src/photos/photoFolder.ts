import fs from 'fs/promises';
import { isPhotoFilename, isSkippedPhotoFilename } from './photoFilename';

// Reads the photos in the image folder (story 0012). Each time the folder is read, a warning is logged for each
// skipped photo (Rule 3), and only the photos are returned (Rule 2).
export async function readPhotos(imageDir: string): Promise<string[]> {
  const files = await fs.readdir(imageDir);
  for (const file of files.filter(isSkippedPhotoFilename)) {
    console.warn(`Skipping photo with disallowed name: ${file}`);
  }
  return files.filter(isPhotoFilename);
}
