-- CreateTable
CREATE TABLE "CatalogGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "translatedText" TEXT,
    "generatedTitle" TEXT,
    "generatedDescription" TEXT,
    "generatedCategory" TEXT,
    "generatedSubCategory" TEXT,
    "generatedMaterial" TEXT,
    "generatedColour" TEXT,
    "generatedCraftType" TEXT,
    "generatedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogGeneration_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CatalogGeneration" ADD CONSTRAINT "CatalogGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
