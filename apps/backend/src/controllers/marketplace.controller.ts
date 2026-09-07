import { Request, Response } from 'express';
import {
  listMarketplaceProducts,
  getProductDetails,
  getArtisanPublicProfile,
  getArtisanProducts,
  getCategories,
  getFilters,
  getProductReviews,
} from '../services/marketplace.service';

export const handleListProducts = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    const result = await listMarketplaceProducts(req.query as any, buyerUserId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleGetProductDetails = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const buyerUserId = req.user?.id;
    const result = await getProductDetails(productId, buyerUserId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleGetArtisanProfile = async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const result = await getArtisanPublicProfile(sellerId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleGetArtisanProducts = async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await getArtisanProducts(sellerId, page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleGetCategories = async (req: Request, res: Response) => {
  try {
    const result = await getCategories();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleGetFilters = async (req: Request, res: Response) => {
  try {
    const result = await getFilters();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleGetProductReviews = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await getProductReviews(productId, page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};
