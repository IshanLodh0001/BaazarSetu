import { z } from 'zod';

export const textCatalogSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Text is required'),
    language: z.string().min(2, 'Language is required'),
    targetLanguage: z.string().min(2, 'Target language is required'),
    productId: z.string().uuid('Invalid product ID').optional(),
  }),
});

export const translateSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Text is required'),
    sourceLanguage: z.string().min(2, 'Source language is required'),
    targetLanguage: z.string().min(2, 'Target language is required'),
  }),
});

export const applyCatalogSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    material: z.string().optional(),
    colour: z.string().optional(),
    craftType: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one catalog field must be provided to update",
  }),
});

export const productIdSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID'),
  }),
});
