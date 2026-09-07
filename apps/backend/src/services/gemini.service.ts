import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import fs from 'fs';

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const catalogSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    category: { type: SchemaType.STRING },
    subCategory: { type: SchemaType.STRING },
    material: { type: SchemaType.STRING },
    colour: { type: SchemaType.STRING },
    craftType: { type: SchemaType.STRING },
    tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    seoKeywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ['title', 'description', 'category', 'subCategory', 'material', 'colour', 'craftType', 'tags', 'seoKeywords'],
};

export interface CatalogGenerationResult {
  title: string;
  description: string;
  category: string;
  subCategory: string;
  material: string;
  colour: string;
  craftType: string;
  tags: string[];
  seoKeywords: string[];
}

export const generateCatalog = async (
  descriptionText: string,
  targetLanguage: string,
  imagePath?: string
): Promise<CatalogGenerationResult> => {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: catalogSchema as any,
      },
    });

    const prompt = `
      You are an expert e-commerce catalog generator for Indian artisan products.
      Based on the following artisan description (and image if provided), generate a professional, structured product catalog.
      Do not invent facts like "100% pure cotton" unless stated or obvious from the image.
      If information is unknown, leave it blank or omit it.
      Generate the catalog in the following language: ${targetLanguage}.
      
      Artisan Description:
      "${descriptionText}"
    `;

    const contents: any[] = [prompt];

    if (imagePath && fs.existsSync(imagePath)) {
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const fileData = fs.readFileSync(imagePath).toString('base64');
      contents.push({
        inlineData: {
          data: fileData,
          mimeType,
        },
      });
    }

    const result = await model.generateContent(contents);
    const responseText = result.response.text();
    
    // Parse JSON
    const parsedData = JSON.parse(responseText);
    
    return parsedData as CatalogGenerationResult;
  } catch (error: any) {
    console.error('Gemini Generation Error:', error.message);
    throw new Error(`Catalog generation failed: ${error.message}`);
  }
};

export const generatePricingExplanation = async (pricingData: any): Promise<string> => {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const prompt = `
      You are an AI assistant helping a marginalized artisan understand how their product should be priced.
      
      Here is the calculated pricing data for their product:
      - Product: ${pricingData.productName || 'Unknown Product'}
      - Category: ${pricingData.category || 'Unknown Category'}
      - Total Production Cost: ₹${pricingData.totalCost}
      - Unit Cost: ₹${pricingData.unitCost}
      - Market Range: ₹${pricingData.marketMinPrice || 'N/A'} - ₹${pricingData.marketMaxPrice || 'N/A'}
      - Predicted Market Price: ₹${pricingData.predictedMarketPrice || 'N/A'}
      
      **FINAL SUGGESTED PRICE: ₹${pricingData.suggestedPrice}**
      - Expected Profit per unit: ₹${pricingData.expectedProfit}
      - Profit Margin: ${pricingData.profitMargin}%
      
      Explain to the artisan:
      1. Why this final suggested price is reasonable.
      2. Whether the price is conservative, competitive, or premium based on the market range (if available).
      3. A simple recommendation or encouragement for the artisan.
      
      IMPORTANT:
      - Do NOT change or suggest a different numerical price. You MUST justify the exact "FINAL SUGGESTED PRICE" provided above.
      - Keep the language very simple, encouraging, and easy to understand for someone with low digital literacy.
      - Output plain text (no markdown formatting like ** or #).
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error: any) {
    console.error('Gemini Pricing Explanation Error:', error.message);
    throw new Error(`Pricing explanation failed: ${error.message}`);
  }
};
