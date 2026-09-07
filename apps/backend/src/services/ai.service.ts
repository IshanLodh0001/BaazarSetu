import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface AIImageProcessResult {
  processed_path: string;
  backgroundRemoved: boolean;
  lightingImproved: boolean;
  cropApplied: boolean;
}

export const processImageWithAI = async (imagePath: string, outputDir: string): Promise<AIImageProcessResult> => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/ai/enhance-image`,
      {
        image_path: imagePath,
        output_dir: outputDir,
      },
      { timeout: 60000 } // 60s timeout for image processing
    );

    return response.data;
  } catch (error: any) {
    console.error('AI Service Error:', error.message);
    throw new Error(`AI processing failed: ${error.message}`);
  }
};

export interface AITranscriptionResult {
  success: boolean;
  data: {
    transcript: string;
    language: string;
  };
}

export const transcribeAudio = async (
  audioBuffer: Buffer,
  filename: string,
  mimetype: string,
  language?: string
): Promise<AITranscriptionResult> => {
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('audio', audioBuffer, {
      filename: filename,
      contentType: mimetype,
    });
    
    if (language) {
      form.append('language', language);
    }

    const response = await axios.post(
      `${AI_SERVICE_URL}/api/ai/transcribe`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        timeout: 120000, // 2 minutes for speech recognition
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('AI Transcription Error:', error.message);
    throw new Error(`Transcription failed: ${error.message}`);
  }
};

export interface AITranslationResult {
  originalText: string;
  sourceLanguage: string;
  translatedText: string;
  targetLanguage: string;
}

export const translateText = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<AITranslationResult> => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/ai/translate`,
      {
        text,
        sourceLanguage,
        targetLanguage,
      },
      { timeout: 60000 }
    );

    return response.data;
  } catch (error: any) {
    console.error('AI Translation Error:', error.message);
    throw new Error(`Translation failed: ${error.message}`);
  }
};

export interface AIPricingResult {
  predictedMarketPrice: number;
  confidenceLevel: string;
  modelVersion: string;
}

export const predictPrice = async (features: any): Promise<AIPricingResult> => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/ai/predict-price`,
      features,
      { timeout: 30000 }
    );
    return response.data;
  } catch (error: any) {
    console.error('AI Pricing Error:', error.message);
    // Fallback to deterministic heuristic if service fails
    return {
      predictedMarketPrice: (features.totalCost || 0) * 1.5,
      confidenceLevel: 'fallback',
      modelVersion: 'heuristic-fallback'
    };
  }
};
