import { transcribeAudio, translateText } from './ai.service';
import { generateCatalog, CatalogGenerationResult } from './gemini.service';
import { prisma } from '../config/prisma';

export const processVoiceCatalog = async (
  userId: string,
  audioBuffer: Buffer,
  filename: string,
  mimetype: string,
  language: string,
  targetLanguage: string,
  productId?: string,
  imagePath?: string
) => {
  // 1. Transcribe Voice
  const transcribeRes = await transcribeAudio(audioBuffer, filename, mimetype, language);
  const originalText = transcribeRes.data.transcript;
  
  if (!originalText) {
    throw new Error('Could not transcribe audio');
  }

  // 2. Translate if needed
  let translatedText = originalText;
  if (language !== targetLanguage) {
    const translateRes = await translateText(originalText, language, targetLanguage);
    translatedText = translateRes.translatedText;
  }

  // 3. Generate Catalog via Gemini
  const catalogResult = await generateCatalog(translatedText, targetLanguage, imagePath);

  // 4. Save to Database
  const catalogGeneration = await prisma.catalogGeneration.create({
    data: {
      userId,
      productId,
      sourceLanguage: language,
      targetLanguage,
      originalText,
      translatedText: language !== targetLanguage ? translatedText : null,
      generatedTitle: catalogResult.title,
      generatedDescription: catalogResult.description,
      generatedCategory: catalogResult.category,
      generatedSubCategory: catalogResult.subCategory,
      generatedMaterial: catalogResult.material,
      generatedColour: catalogResult.colour,
      generatedCraftType: catalogResult.craftType,
      generatedTags: catalogResult.tags,
      seoKeywords: catalogResult.seoKeywords,
    },
  });

  return {
    generationId: catalogGeneration.id,
    transcript: originalText,
    translatedText: translatedText,
    catalog: catalogResult,
  };
};

export const processTextCatalog = async (
  userId: string,
  text: string,
  language: string,
  targetLanguage: string,
  productId?: string,
  imagePath?: string
) => {
  // 1. Translate if needed
  let translatedText = text;
  if (language !== targetLanguage) {
    const translateRes = await translateText(text, language, targetLanguage);
    translatedText = translateRes.translatedText;
  }

  // 2. Generate Catalog via Gemini
  const catalogResult = await generateCatalog(translatedText, targetLanguage, imagePath);

  // 3. Save to Database
  const catalogGeneration = await prisma.catalogGeneration.create({
    data: {
      userId,
      productId,
      sourceLanguage: language,
      targetLanguage,
      originalText: text,
      translatedText: language !== targetLanguage ? translatedText : null,
      generatedTitle: catalogResult.title,
      generatedDescription: catalogResult.description,
      generatedCategory: catalogResult.category,
      generatedSubCategory: catalogResult.subCategory,
      generatedMaterial: catalogResult.material,
      generatedColour: catalogResult.colour,
      generatedCraftType: catalogResult.craftType,
      generatedTags: catalogResult.tags,
      seoKeywords: catalogResult.seoKeywords,
    },
  });

  return {
    generationId: catalogGeneration.id,
    originalText: text,
    translatedText: translatedText,
    catalog: catalogResult,
  };
};

export const applyCatalogToProduct = async (
  userId: string,
  productId: string,
  catalogData: Partial<CatalogGenerationResult>
) => {
  // Verify ownership
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { seller: true }
  });

  if (!product || product.seller.userId !== userId) {
    throw new Error('Product not found or unauthorized');
  }

  // Update allowed fields
  const updateData: any = {};
  if (catalogData.title) updateData.name = catalogData.title;
  if (catalogData.description) updateData.description = catalogData.description;
  if (catalogData.category) updateData.category = catalogData.category;
  if (catalogData.subCategory) updateData.subcategory = catalogData.subCategory;
  if (catalogData.material) updateData.material = catalogData.material;
  if (catalogData.colour) updateData.colour = catalogData.colour;
  if (catalogData.craftType) updateData.craftType = catalogData.craftType;
  if (catalogData.tags) updateData.tags = catalogData.tags;

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: updateData,
  });

  return updatedProduct;
};

export const getCatalogHistory = async (userId: string) => {
  return prisma.catalogGeneration.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getCatalogHistoryById = async (userId: string, id: string) => {
  const record = await prisma.catalogGeneration.findUnique({
    where: { id },
  });

  if (!record || record.userId !== userId) {
    throw new Error('Record not found or unauthorized');
  }

  return record;
};
