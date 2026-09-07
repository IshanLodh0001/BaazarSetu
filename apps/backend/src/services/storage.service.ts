import fs from 'fs/promises';
import path from 'path';

const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || 'uploads';

export const saveProductImage = async (productId: string, file: Express.Multer.File): Promise<string> => {
  const dirPath = path.join(process.cwd(), UPLOAD_BASE_DIR, 'products', productId);
  
  // Ensure directory exists
  await fs.mkdir(dirPath, { recursive: true });
  
  const ext = path.extname(file.originalname);
  const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
  const filePath = path.join(dirPath, uniqueFilename);
  
  // File is already saved to disk if using Multer diskStorage, 
  // but if we need to move it from a temp dir:
  await fs.rename(file.path, filePath);
  
  return path.join(UPLOAD_BASE_DIR, 'products', productId, uniqueFilename).replace(/\\/g, '/');
};

export const deleteProductImage = async (imagePath: string): Promise<void> => {
  try {
    const fullPath = path.join(process.cwd(), imagePath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error(`Failed to delete image at ${imagePath}:`, error);
  }
};
