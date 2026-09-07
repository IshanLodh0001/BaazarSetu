import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { processImageWithAI } from '../services/ai.service';
import path from 'path';

const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || 'uploads';

export const processImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id, imageId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (product.seller.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this product' });
    }

    const image = await prisma.image.findUnique({
      where: { id: imageId },
    });

    if (!image || image.productId !== id) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    // Set status to PROCESSING
    await prisma.image.update({
      where: { id: imageId },
      data: { processingStatus: 'PROCESSING' },
    });

    try {
      const outputDir = path.join(UPLOAD_BASE_DIR, 'products', id, 'enhanced').replace(/\\/g, '/');
      const aiResult = await processImageWithAI(image.originalPath, outputDir);

      const updatedImage = await prisma.image.update({
        where: { id: imageId },
        data: {
          processedPath: aiResult.processed_path,
          backgroundRemoved: aiResult.backgroundRemoved,
          lightingImproved: aiResult.lightingImproved,
          cropApplied: aiResult.cropApplied,
          processingStatus: 'COMPLETED',
        },
      });

      return res.status(200).json({ success: true, data: updatedImage });
    } catch (error: any) {
      await prisma.image.update({
        where: { id: imageId },
        data: { processingStatus: 'FAILED' },
      });
      return res.status(500).json({ success: false, error: error.message || 'Image processing failed' });
    }
  } catch (error) {
    next(error);
  }
};

export const getImageStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, imageId } = req.params;

    const image = await prisma.image.findUnique({
      where: { id: imageId, productId: id },
    });

    if (!image) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    return res.status(200).json({ success: true, data: { processingStatus: image.processingStatus } });
  } catch (error) {
    next(error);
  }
};

export const retryImageProcessing = async (req: Request, res: Response, next: NextFunction) => {
  // It's essentially the same logic as processImage.
  return processImage(req, res, next);
};
