import { Request, Response } from 'express';
import { calculatePricing, applyPrice, explainPrice, getPricingHistory } from '../services/pricing.service';

export const handleCalculatePricing = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const input = { ...req.body, sellerId: userId };
    const result = await calculatePricing(input);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleApplyPrice = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const pricingId = req.params.pricingId;
    const result = await applyPrice(pricingId, userId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleExplainPrice = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const pricingId = req.params.pricingId;
    const result = await explainPrice(pricingId, userId);
    res.status(200).json({ success: true, data: { explanation: result } });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleGetPricingHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const productId = req.params.productId;
    const result = await getPricingHistory(productId, userId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};
