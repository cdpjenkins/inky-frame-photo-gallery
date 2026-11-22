import createError from 'http-errors';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import indexRouter from './routes/index';
import { PhotoMetadataRepository } from './repositories/PhotoMetadataRepository';
import { TogglePhotoSelectionCommand } from './commands/TogglePhotoSelectionCommand';
import { InstructionRepository } from './repositories/InstructionRepository';
import { AddInstructionCommand } from './commands/AddInstructionCommand';

interface AppConfig {
  imageDir: string;
  metadataPath?: string;
  instructionsPath?: string;
}

// Story 0011, Rule 3: a JSON body that cannot be parsed gets a JSON 400, not the HTML error page.
function rejectInvalidJsonBody(err: any, req: Request, res: Response, next: NextFunction) {
  if (err.type !== 'entity.parse.failed') {
    next(err);
    return;
  }
  res.status(400).json({ error: 'Request body must be valid JSON' });
}

export function createApp(config: AppConfig) {
  const app = express();

  app.set('imageDir', config.imageDir);

  const metadataPath = config.metadataPath || path.join(config.imageDir, 'photo-metadata.json');
  const photoMetadataRepository = new PhotoMetadataRepository(metadataPath);
  const togglePhotoSelectionCommand = new TogglePhotoSelectionCommand(photoMetadataRepository, config.imageDir);

  app.set('photoMetadataRepository', photoMetadataRepository);
  app.set('togglePhotoSelectionCommand', togglePhotoSelectionCommand);
  const instructionsPath = config.instructionsPath || path.join(config.imageDir, 'instructions.json');
  const instructionRepository = new InstructionRepository(instructionsPath);
  app.set('instructionRepository', instructionRepository);
  app.set('addInstructionCommand', new AddInstructionCommand(instructionRepository));

  app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'pug');

  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, '../public')));

  app.use('/', indexRouter);

  app.use(function(req: Request, res: Response, next: NextFunction) {
    next(createError(404));
  });

  app.use(rejectInvalidJsonBody);

  app.use(function(err: any, req: Request, res: Response, next: NextFunction) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(err.status || 500);
    res.render('error');
  });

  return app;
}

const app = createApp({ imageDir: process.env.IMAGE_DIR || './images' });

export default app;