import { Router } from 'express';
import { handleCalculatePricing, handleApplyPrice, handleExplainPrice, handleGetPricingHistory } from '../controllers/pricing.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { pricingCalculationSchema, applyPriceSchema, explainPriceSchema, pricingHistorySchema } from '../schemas/pricing.schema';

const router = Router();

// All pricing routes require authentication
router.use(authenticate);

router.post('/calculate', validate(pricingCalculationSchema), handleCalculatePricing);
router.post('/apply/:pricingId', validate(applyPriceSchema), handleApplyPrice);
router.post('/explain/:pricingId', validate(explainPriceSchema), handleExplainPrice);
router.get('/product/:productId/history', validate(pricingHistorySchema), handleGetPricingHistory);

export default router;
