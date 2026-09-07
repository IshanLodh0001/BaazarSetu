import { Request, Response, NextFunction } from 'express';
import * as catalogService from '../services/catalog.service';
import { transcribeAudio, translateText } from '../services/ai.service';
import { prisma } from '../config/prisma';

export const transcribeVoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Audio file is required' });
    }

    const { language } = req.body;
    
    // Size check handled by multer, but we can enforce logic here too
    
    const result = await transcribeAudio(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      language
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const translateTextDirectly = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;
    
    if (!text || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const result = await translateText(text, sourceLanguage, targetLanguage);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const generateCatalogVoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Audio file is required' });
    }

    const { language, targetLanguage, productId } = req.body;
    const userId = (req as any).user.id;

    if (!language || !targetLanguage) {
      return res.status(400).json({ success: false, error: 'language and targetLanguage required' });
    }
    
    let imagePath;
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { images: true, seller: true }
      });
      if (product && product.seller.userId === userId) {
        // Find primary image or first
        const image = product.images.find((img: any) => img.isPrimary) || product.images[0];
        if (image) {
           imagePath = image.originalPath; // The local path to use
        }
      } else {
        return res.status(403).json({ success: false, error: 'Unauthorized to access this product' });
      }
    }

    const result = await catalogService.processVoiceCatalog(
      userId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      language,
      targetLanguage,
      productId,
      imagePath
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const generateCatalogText = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, language, targetLanguage, productId } = req.body;
    const userId = (req as any).user.id;

    if (!text || !language || !targetLanguage) {
      return res.status(400).json({ success: false, error: 'text, language and targetLanguage required' });
    }
    
    let imagePath;
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { images: true, seller: true }
      });
      if (product && product.seller.userId === userId) {
        const image = product.images.find((img: any) => img.isPrimary) || product.images[0];
        if (image) {
           imagePath = image.originalPath;
        }
      } else {
        return res.status(403).json({ success: false, error: 'Unauthorized to access this product' });
      }
    }

    const result = await catalogService.processTextCatalog(
      userId,
      text,
      language,
      targetLanguage,
      productId,
      imagePath
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const applyCatalog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const catalogData = req.body;
    const userId = (req as any).user.id;

    const updatedProduct = await catalogService.applyCatalogToProduct(userId, productId, catalogData);

    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

export const getCatalogHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const history = await catalogService.getCatalogHistory(userId);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

export const getCatalogHistoryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const history = await catalogService.getCatalogHistoryById(userId, id);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};
