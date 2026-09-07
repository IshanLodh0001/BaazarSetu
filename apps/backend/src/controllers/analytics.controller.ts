import { Request, Response } from 'express';
import {
  getArtisanOverview,
  getArtisanSalesAnalytics,
  getArtisanProductAnalytics,
  getArtisanInventoryAnalytics,
  AnalyticsError,
} from '../services/analytics.service';
import { analyticsDateRangeSchema } from '../schemas/analytics.schema';

export const handleGetOverview = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const queryValidation = analyticsDateRangeSchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date parameters',
        details: queryValidation.error.format(),
      });
    }

    const data = await getArtisanOverview(artisanUserId, queryValidation.data);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error instanceof AnalyticsError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleGetSalesAnalytics = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const queryValidation = analyticsDateRangeSchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date parameters',
        details: queryValidation.error.format(),
      });
    }

    const data = await getArtisanSalesAnalytics(artisanUserId, queryValidation.data);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error instanceof AnalyticsError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleGetProductAnalytics = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const data = await getArtisanProductAnalytics(artisanUserId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error instanceof AnalyticsError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleGetInventoryAnalytics = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const data = await getArtisanInventoryAnalytics(artisanUserId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error instanceof AnalyticsError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};
