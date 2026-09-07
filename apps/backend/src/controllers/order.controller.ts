import { Request, Response } from 'express';
import {
  checkoutCart,
  getBuyerOrders,
  getBuyerOrderDetails,
  cancelBuyerOrder,
  getArtisanOrders,
  getArtisanOrderDetails,
  updateOrderStatusByArtisan,
  OrderError,
} from '../services/order.service';
import {
  checkoutSchema,
  getOrdersQuerySchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
} from '../schemas/order.schema';

export const handleCheckout = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validation = checkoutSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.format(),
      });
    }

    const result = await checkoutCart({
      buyerUserId,
      shippingAddress: validation.data.shippingAddress,
      paymentMethod: validation.data.paymentMethod,
      notes: validation.data.notes,
    });

    return res.status(201).json({
      success: true,
      message: 'Checkout successful',
      data: result,
    });
  } catch (error: any) {
    if (error instanceof OrderError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Checkout failed' });
  }
};

export const handleGetBuyerOrders = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const queryValidation = getOrdersQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: queryValidation.error.format(),
      });
    }

    const result = await getBuyerOrders(buyerUserId, queryValidation.data);
    return res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error: any) {
    if (error instanceof OrderError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleGetBuyerOrderDetails = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const paramValidation = orderIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ success: false, error: 'Invalid order ID' });
    }

    const order = await getBuyerOrderDetails(buyerUserId, paramValidation.data.orderId);
    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    if (error instanceof OrderError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleCancelBuyerOrder = async (req: Request, res: Response) => {
  try {
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const paramValidation = orderIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ success: false, error: 'Invalid order ID' });
    }

    const bodyValidation = cancelOrderSchema.safeParse(req.body);
    const reason = bodyValidation.success ? bodyValidation.data.reason : undefined;

    const cancelledOrder = await cancelBuyerOrder(buyerUserId, paramValidation.data.orderId, reason);
    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully and inventory restored',
      data: cancelledOrder,
    });
  } catch (error: any) {
    if (error instanceof OrderError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleGetArtisanOrders = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const queryValidation = getOrdersQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: queryValidation.error.format(),
      });
    }

    const result = await getArtisanOrders(artisanUserId, queryValidation.data);
    return res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error: any) {
    if (error instanceof OrderError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleGetArtisanOrderDetails = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const paramValidation = orderIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ success: false, error: 'Invalid order ID' });
    }

    const order = await getArtisanOrderDetails(artisanUserId, paramValidation.data.orderId);
    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    if (error instanceof OrderError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleUpdateOrderStatusByArtisan = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const paramValidation = orderIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ success: false, error: 'Invalid order ID' });
    }

    const bodyValidation = updateOrderStatusSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: bodyValidation.error.format(),
      });
    }

    const updatedOrder = await updateOrderStatusByArtisan(
      artisanUserId,
      paramValidation.data.orderId,
      bodyValidation.data
    );

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${bodyValidation.data.status}`,
      data: updatedOrder,
    });
  } catch (error: any) {
    if (error instanceof OrderError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};
