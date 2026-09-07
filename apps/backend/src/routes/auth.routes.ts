import { Router } from 'express';
import { sendOtp, verifyOtp } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { sendOtpSchema, verifyOtpSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/send-otp', validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);

export default router;
