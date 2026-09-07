import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { UserRole } from '@prisma/client';

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        artisan: role === UserRole.ARTISAN,
        buyer: role === UserRole.BUYER,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, preferredLanguage } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, preferredLanguage },
    });

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const onboardArtisan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    if (req.user!.role !== UserRole.ARTISAN) {
      return res.status(403).json({ success: false, error: 'Forbidden: Requires ARTISAN role' });
    }

    const {
      businessName,
      craftType,
      experienceYears,
      state,
      district,
      address,
      bio,
      productionCapacity,
    } = req.body;

    const artisan = await prisma.artisan.upsert({
      where: { userId },
      update: {
        businessName,
        craftType,
        experienceYears,
        state,
        district,
        address,
        bio,
        productionCapacity,
        onboardingComplete: true,
      },
      create: {
        userId,
        businessName,
        craftType,
        experienceYears,
        state,
        district,
        address,
        bio,
        productionCapacity,
        onboardingComplete: true,
      },
    });

    // Mark user as verified for simplicity or rely on verificationStatus later
    await prisma.user.update({
      where: { id: userId },
      data: { name: businessName || undefined },
    });

    return res.status(200).json({ success: true, data: artisan });
  } catch (error) {
    next(error);
  }
};

export const onboardBuyer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    if (req.user!.role !== UserRole.BUYER) {
      return res.status(403).json({ success: false, error: 'Forbidden: Requires BUYER role' });
    }

    const {
      buyerType,
      companyName,
      gstNumber,
      state,
      district,
      address,
      preferredCategories,
    } = req.body;

    const buyer = await prisma.buyer.upsert({
      where: { userId },
      update: {
        buyerType,
        companyName,
        gstNumber,
        state,
        district,
        address,
        preferredCategories,
      },
      create: {
        userId,
        buyerType,
        companyName,
        gstNumber,
        state,
        district,
        address,
        preferredCategories,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { name: companyName || undefined },
    });

    return res.status(200).json({ success: true, data: buyer });
  } catch (error) {
    next(error);
  }
};
