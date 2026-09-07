import { z } from 'zod';
import { BuyerType } from '@prisma/client';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    preferredLanguage: z.string().length(2).optional(),
  }),
});

export const onboardArtisanSchema = z.object({
  body: z.object({
    businessName: z.string().min(2, 'Business name must be at least 2 characters').optional(),
    craftType: z.string().min(2).optional(),
    experienceYears: z.number().int().min(0).optional(),
    state: z.string().min(2).optional(),
    district: z.string().min(2).optional(),
    address: z.string().min(5).optional(),
    bio: z.string().max(500).optional(),
    productionCapacity: z.number().int().min(0).optional(),
  }),
});

export const onboardBuyerSchema = z.object({
  body: z.object({
    buyerType: z.nativeEnum(BuyerType).optional(),
    companyName: z.string().min(2).optional(),
    gstNumber: z.string().min(5).optional(),
    state: z.string().min(2).optional(),
    district: z.string().min(2).optional(),
    address: z.string().min(5).optional(),
    preferredCategories: z.string().optional(),
  }),
});
