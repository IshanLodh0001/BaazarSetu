import { Request, Response } from 'express';
import {
  createEnquiry,
  getBuyerEnquiries,
  getBuyerEnquiryDetails,
  acceptCounterOffer,
  getArtisanEnquiries,
  getArtisanEnquiryDetails,
  respondToEnquiry,
  B2BError,
} from '../services/b2b.service';
import {
  createEnquirySchema,
  enquiryIdParamSchema,
  getEnquiriesQuerySchema,
  respondEnquirySchema,
} from '../schemas/b2b.schema';

export const handleCreateEnquiry = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validation = createEnquirySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.format(),
      });
    }

    const enquiry = await createEnquiry({
      buyerUserId,
      ...validation.data,
    });

    return res.status(201).json({
      success: true,
      message: 'B2B enquiry created successfully',
      data: enquiry,
    });
  } catch (error: any) {
    if (error instanceof B2BError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleGetBuyerEnquiries = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const queryValidation = getEnquiriesQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: queryValidation.error.format(),
      });
    }

    const result = await getBuyerEnquiries(buyerUserId, queryValidation.data);
    return res.status(200).json({
      success: true,
      data: result.enquiries,
      pagination: result.pagination,
    });
  } catch (error: any) {
    if (error instanceof B2BError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleGetBuyerEnquiryDetails = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const paramValidation = enquiryIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ success: false, error: 'Invalid enquiry ID' });
    }

    const enquiry = await getBuyerEnquiryDetails(buyerUserId, paramValidation.data.enquiryId);
    return res.status(200).json({
      success: true,
      data: enquiry,
    });
  } catch (error: any) {
    if (error instanceof B2BError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleAcceptCounterOffer = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const paramValidation = enquiryIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ success: false, error: 'Invalid enquiry ID' });
    }

    const updated = await acceptCounterOffer(buyerUserId, paramValidation.data.enquiryId);
    return res.status(200).json({
      success: true,
      message: 'Counter offer accepted successfully',
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof B2BError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleGetArtisanEnquiries = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const queryValidation = getEnquiriesQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: queryValidation.error.format(),
      });
    }

    const result = await getArtisanEnquiries(artisanUserId, queryValidation.data);
    return res.status(200).json({
      success: true,
      data: result.enquiries,
      pagination: result.pagination,
    });
  } catch (error: any) {
    if (error instanceof B2BError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleGetArtisanEnquiryDetails = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const paramValidation = enquiryIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ success: false, error: 'Invalid enquiry ID' });
    }

    const enquiry = await getArtisanEnquiryDetails(artisanUserId, paramValidation.data.enquiryId);
    return res.status(200).json({
      success: true,
      data: enquiry,
    });
  } catch (error: any) {
    if (error instanceof B2BError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleRespondToEnquiry = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const paramValidation = enquiryIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ success: false, error: 'Invalid enquiry ID' });
    }

    const bodyValidation = respondEnquirySchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: bodyValidation.error.format(),
      });
    }

    const updated = await respondToEnquiry(
      artisanUserId,
      paramValidation.data.enquiryId,
      bodyValidation.data
    );

    return res.status(200).json({
      success: true,
      message: `Enquiry status updated to ${updated.status}`,
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof B2BError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};
