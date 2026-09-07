import { Request, Response } from 'express';
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  StockError,
} from '../services/cart.service';

export const handleGetCart = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const cart = await getCart(buyerUserId);
    res.status(200).json({ success: true, data: cart });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleAddToCart = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { productId, quantity } = req.body;
    const cart = await addToCart(buyerUserId, productId, quantity);
    res.status(200).json({ success: true, data: cart });
  } catch (error: any) {
    if (error instanceof StockError || error.message.includes('Requested quantity exceeds available stock')) {
      return res.status(400).json({ success: false, error: 'Requested quantity exceeds available stock.' });
    }
    if (error.message.includes('not available')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleUpdateCartItem = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { productId } = req.params;
    const { quantity } = req.body;
    const cart = await updateCartItemQuantity(buyerUserId, productId, quantity);
    res.status(200).json({ success: true, data: cart });
  } catch (error: any) {
    if (error instanceof StockError || error.message.includes('Requested quantity exceeds available stock')) {
      return res.status(400).json({ success: false, error: 'Requested quantity exceeds available stock.' });
    }
    if (error.message.includes('not available')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleRemoveFromCart = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { productId } = req.params;
    const cart = await removeFromCart(buyerUserId, productId);
    res.status(200).json({ success: true, data: cart });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleClearCart = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const cart = await clearCart(buyerUserId);
    res.status(200).json({ success: true, data: cart });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};
