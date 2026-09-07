import { Router } from 'express';
import { getMe, updateProfile, onboardArtisan, onboardBuyer } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateProfileSchema, onboardArtisanSchema, onboardBuyerSchema } from '../schemas/user.schema';

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/me', getMe);
router.patch('/profile', validate(updateProfileSchema), updateProfile);

router.post('/artisan/onboarding', validate(onboardArtisanSchema), onboardArtisan);
router.post('/buyer/onboarding', validate(onboardBuyerSchema), onboardBuyer);

export default router;
