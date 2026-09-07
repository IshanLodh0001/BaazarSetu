import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
  productIdSchema,
  imageIdSchema
} from '../schemas/product.schema';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStock,
  publishProduct,
  unpublishProduct,
  uploadImages,
  getImages,
  deleteImage
} from '../controllers/product.controller';
import path from 'path';
import fs from 'fs';

// Setup Multer temporary storage
const tmpDir = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_UPLOAD_SIZE_MB || '20') * 1024 * 1024) },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const router = Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', validate(productIdSchema), getProductById);
router.get('/:id/images', validate(productIdSchema), getImages);

// Protected routes
router.use(authenticate);

router.post('/', validate(createProductSchema), createProduct);
router.patch('/:id', validate(productIdSchema), validate(updateProductSchema), updateProduct);
router.delete('/:id', validate(productIdSchema), deleteProduct);

router.patch('/:id/stock', validate(productIdSchema), validate(updateStockSchema), updateProductStock);
router.post('/:id/publish', validate(productIdSchema), publishProduct);
router.post('/:id/unpublish', validate(productIdSchema), unpublishProduct);

import {
  processImage,
  getImageStatus,
  retryImageProcessing
} from '../controllers/image.controller';

// Image upload
router.post('/:id/images', validate(productIdSchema), upload.array('images', 10), uploadImages);
router.delete('/:id/images/:imageId', validate(imageIdSchema), deleteImage);

// AI Image Studio
router.post('/:id/images/:imageId/process', validate(imageIdSchema), processImage);
router.post('/:id/images/:imageId/retry', validate(imageIdSchema), retryImageProcessing);
router.get('/:id/images/:imageId/status', validate(imageIdSchema), getImageStatus);

export default router;
