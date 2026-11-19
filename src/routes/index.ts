import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { TogglePhotoSelectionCommand } from '../commands/TogglePhotoSelectionCommand';
import { PhotoMetadataRepository } from '../repositories/PhotoMetadataRepository';
import { InstructionRepository } from '../repositories/InstructionRepository';
import { AddInstructionCommand, InvalidInstructionError } from '../commands/AddInstructionCommand';
import { isShowableFilename, MALFORMED_SHOW_MESSAGE, showInstructionFor } from '../instructions/showInstruction';
import { hasAllowedName } from '../photos/photoFilename';
const router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Photo Gallery' });
});

router.get('/list', async function(req, res, next) {
  try {
    const imageDir = req.app.get('imageDir');
    const photoMetadataRepository: PhotoMetadataRepository = req.app.get('photoMetadataRepository');

    const files = await fs.readdir(imageDir);
    const jpgFiles = files.filter(file => file.endsWith('.jpg'));
    const selectedFiles = jpgFiles.filter(file => photoMetadataRepository.getSelection(file));
    const selectedFilesWithPrefix = selectedFiles.map(file => `/images/${file}`);

    res.type('text/plain');
    res.send(selectedFilesWithPrefix.join('\n'));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    next(error);
  }
});

async function renderAdminPage(req: Request, res: Response, next: NextFunction, error?: string) {
  try {
    const imageDir = req.app.get('imageDir');
    const photoMetadataRepository: PhotoMetadataRepository = req.app.get('photoMetadataRepository');
    const files = await fs.readdir(imageDir);
    const jpgFiles = files.filter(file => file.endsWith('.jpg') && hasAllowedName(file));
    const galleryImages = jpgFiles.map(file => ({
      filename: file,
      selected: photoMetadataRepository.getSelection(file),
      showable: isShowableFilename(file),
    }));
    const instructionRepository: InstructionRepository = req.app.get('instructionRepository');
    if (error) {
      res.status(400);
    }
    res.render('admin', { title: 'Admin', images: galleryImages, instructions: instructionRepository.getAll(), error });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    next(error);
  }
}

// Wrapped so Express sees a 3-argument handler; a 4-argument function is treated as error-handling middleware.
router.get('/admin', (req, res, next) => renderAdminPage(req, res, next));

router.get('/images/:filename', function(req, res, next) {
  const imageDir = req.app.get('imageDir');
  const filename = path.basename(req.params.filename);

  if (!filename.endsWith('.jpg')) {
    res.status(404).send('Not found');
    return;
  }

  const filePath = path.resolve(imageDir, filename);
  res.sendFile(filePath, (error: any) => {
    if (error) {
      if (error.code === 'ENOENT' || error.status === 404) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      next(error);
    }
  });
});

router.patch('/api/photos/:filename', function(req, res, next) {
  try {
    const togglePhotoSelectionCommand: TogglePhotoSelectionCommand = req.app.get('togglePhotoSelectionCommand');
    const filename = path.basename(req.params.filename);
    const { selected } = req.body;
    if (typeof selected !== 'boolean') {
      res.status(400).json({ error: 'selected must be true or false' });
      return;
    }

    togglePhotoSelectionCommand.execute(filename, selected);

    res.json({ selected });
  } catch (error: any) {
    if (error.message === 'Photo not found') {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    next(error);
  }
});

function parseSequenceNumber(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return undefined;
  }
  return Number(value);
}

router.get('/instructions', function(req, res) {
  const instructionRepository: InstructionRepository = req.app.get('instructionRepository');
  const after = parseSequenceNumber(req.query.after);
  if (after === undefined) {
    res.sendStatus(400);
    return;
  }
  if (after > instructionRepository.latestSequenceNumber()) {
    res.sendStatus(409);
    return;
  }
  const instructions = instructionRepository.getAfter(after);

  res.type('text/plain');
  res.send(instructions.map(({ sequenceNumber, text }) => `${sequenceNumber} ${text}`).join('\n'));
});

// Adds an instruction submitted from the admin page: on success, back to the admin page; if the instruction is
// rejected, the admin page is shown again with the reason.
function addInstructionFromAdminPage(req: Request, res: Response, next: NextFunction, text: string) {
  const addInstructionCommand: AddInstructionCommand = req.app.get('addInstructionCommand');

  try {
    addInstructionCommand.execute(text);
  } catch (error) {
    if (error instanceof InvalidInstructionError) {
      renderAdminPage(req, res, next, error.message);
      return;
    }
    next(error);
    return;
  }
  res.redirect('/admin');
}

router.post('/admin/instructions', function(req, res, next) {
  if (typeof req.body.text !== 'string') {
    renderAdminPage(req, res, next, 'Instruction must be text');
    return;
  }
  addInstructionFromAdminPage(req, res, next, req.body.text);
});

router.post('/admin/show-photo', function(req, res, next) {
  if (typeof req.body.filename !== 'string') {
    renderAdminPage(req, res, next, MALFORMED_SHOW_MESSAGE);
    return;
  }
  addInstructionFromAdminPage(req, res, next, showInstructionFor(req.body.filename));
});

router.get('/simulator', function(req, res) {
  res.render('simulator', { title: 'Photo Frame Simulator' });
});

export default router;