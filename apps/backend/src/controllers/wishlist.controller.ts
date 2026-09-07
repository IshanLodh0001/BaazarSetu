import { Request, Response } from 'express';
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} from '../services/wishlist.service';

export const handleAddToWishlist = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { productId } = req.params;
    const result = await addToWishlist(buyerUserId, productId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('not available')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleRemoveFromWishlist = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { productId } = req.params;
    const result = await removeFromWishlist(buyerUserId, productId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleGetWishlist = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const result = await getWishlist(buyerUserId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};
