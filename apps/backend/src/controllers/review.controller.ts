import { Request, Response } from 'express';
import { createVerifiedReview, ReviewError } from '../services/review.service';
import { createReviewSchema, productIdParamSchema } from '../schemas/review.schema';

export const handleCreateProductReview = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const paramValidation = productIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ success: false, error: 'Invalid product ID' });
    }

    const bodyValidation = createReviewSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: bodyValidation.error.format(),
      });
    }

    const review = await createVerifiedReview({
      buyerUserId,
      productId: paramValidation.data.productId,
      rating: bodyValidation.data.rating,
      reviewText: bodyValidation.data.reviewText,
      orderId: bodyValidation.data.orderId,
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error: any) {
    if (error instanceof ReviewError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Failed to submit review' });
  }
};
