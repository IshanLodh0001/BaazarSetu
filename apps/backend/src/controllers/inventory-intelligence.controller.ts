import { Request, Response } from 'express';
import { getInventoryInsights, InventoryIntelligenceError } from '../services/inventory-intelligence.service';
import { getArtisanRecommendations } from '../services/business-recommendations.service';

export const handleGetInventoryInsights = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const insights = await getInventoryInsights(artisanUserId);
    return res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    if (error instanceof InventoryIntelligenceError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleGetBusinessRecommendations = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await getArtisanRecommendations(artisanUserId);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};
