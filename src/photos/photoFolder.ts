import fs from 'fs/promises';
import { isPhotoFilename, isSkippedPhotoFilename } from './photoFilename';

export interface PhotoFolder {
  photos: string[];
  skippedPhotos: string[];
}

// Reads the photos in the image folder (story 0012). Each time the folder is read, a warning is logged for each
// skipped photo (Rule 3). Only the photos are used (Rule 2); the skipped ones are returned so the admin page can
// say that some were skipped (Rule 4).
export async function readPhotos(imageDir: string): Promise<PhotoFolder> {
  const files = await fs.readdir(imageDir);
  const skippedPhotos = files.filter(isSkippedPhotoFilename);
  for (const file of skippedPhotos) {
    console.warn(`Skipping photo with disallowed name: ${file}`);
  }
  return { photos: files.filter(isPhotoFilename), skippedPhotos };
}
