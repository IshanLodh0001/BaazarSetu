import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ProductStatus, StockStatus, UserRole } from '@prisma/client';
import { saveProductImage, deleteProductImage } from '../services/storage.service';

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    if (role !== UserRole.ARTISAN) {
      return res.status(403).json({ success: false, error: 'Forbidden: Requires ARTISAN role' });
    }

    const artisan = await prisma.artisan.findUnique({ where: { userId } });
    if (!artisan) {
      return res.status(403).json({ success: false, error: 'Forbidden: Artisan profile not found' });
    }

    const {
      productName,
      category,
      subCategory,
      description,
      material,
      colour,
      craftType,
      tags,
      stock,
      price,
    } = req.body;

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          sellerId: artisan.id,
          name: productName,
          category,
          subcategory: subCategory,
          description,
          material,
          colour,
          craftType,
          tags,
          price,
          status: ProductStatus.DRAFT,
        },
      });

      const stockStatus = stock > 5 ? StockStatus.IN_STOCK : (stock > 0 ? StockStatus.LOW_STOCK : StockStatus.OUT_OF_STOCK);

      await tx.inventory.create({
        data: {
          productId: newProduct.id,
          availableQuantity: stock,
          reorderLevel: 5,
          stockStatus,
        },
      });

      return newProduct;
    });

    return res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      include: { inventory: true, images: true },
    });
    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { inventory: true, images: true, seller: true },
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

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

    const {
      productName,
      category,
      subCategory,
      description,
      material,
      colour,
      craftType,
      tags,
      price,
    } = req.body;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: productName,
        category,
        subcategory: subCategory,
        description,
        material,
        colour,
        craftType,
        tags,
        price,
      },
    });

    return res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

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

    await prisma.product.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};

export const updateProductStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { stock } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { seller: true, inventory: true },
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (product.seller.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this product' });
    }

    const reorderLevel = product.inventory?.reorderLevel || 5;
    const stockStatus = stock > reorderLevel ? StockStatus.IN_STOCK : (stock > 0 ? StockStatus.LOW_STOCK : StockStatus.OUT_OF_STOCK);

    const inventory = await prisma.inventory.update({
      where: { productId: id },
      data: {
        availableQuantity: stock,
        stockStatus,
      },
    });

    return res.status(200).json({ success: true, data: inventory });
  } catch (error) {
    next(error);
  }
};

export const publishProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

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

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { status: ProductStatus.PUBLISHED },
    });

    return res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

export const unpublishProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

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

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { status: ProductStatus.DRAFT },
    });

    return res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

export const uploadImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

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

    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const files = req.files as Express.Multer.File[];
    const images = [];

    for (const file of files) {
      const savedPath = await saveProductImage(id, file);
      const image = await prisma.image.create({
        data: {
          productId: id,
          originalPath: savedPath,
          processingStatus: 'pending',
        },
      });
      images.push(image);
    }

    return res.status(200).json({ success: true, data: images });
  } catch (error) {
    next(error);
  }
};

export const getImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const images = await prisma.image.findMany({
      where: { productId: id },
    });
    return res.status(200).json({ success: true, data: images });
  } catch (error) {
    next(error);
  }
};

export const deleteImage = async (req: Request, res: Response, next: NextFunction) => {
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

    await deleteProductImage(image.originalPath);
    if (image.processedPath) await deleteProductImage(image.processedPath);

    await prisma.image.delete({ where: { id: imageId } });

    return res.status(200).json({ success: true, message: 'Image deleted' });
  } catch (error) {
    next(error);
  }
};
