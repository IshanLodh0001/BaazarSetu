import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Invalid phone number format. Must include country code.'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Invalid phone number format.'),
    code: z.string().length(6, 'OTP must be 6 digits'),
    role: z.nativeEnum(UserRole).optional(),
  }),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>['body'];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
