import express from 'express';
import multer from 'multer';
import {
  transcribeVoice,
  translateTextDirectly,
  generateCatalogVoice,
  generateCatalogText,
  applyCatalog,
  getCatalogHistory,
  getCatalogHistoryById
} from '../controllers/catalog.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { textCatalogSchema, translateSchema, applyCatalogSchema, productIdSchema } from '../schemas/catalog.schema';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type, only audio is allowed'));
    }
  },
});

router.use(authenticate);

router.post('/voice/transcribe', upload.single('audio'), transcribeVoice);
router.post('/translate', validate(translateSchema), translateTextDirectly);

router.post('/generate', upload.single('audio'), generateCatalogVoice);
router.post('/generate-from-text', validate(textCatalogSchema), generateCatalogText);

router.post('/apply/:productId', validate(productIdSchema), validate(applyCatalogSchema), applyCatalog);

router.get('/history', getCatalogHistory);
router.get('/history/:id', getCatalogHistoryById);

export default router;
