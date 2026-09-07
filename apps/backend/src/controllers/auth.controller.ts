import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { redisClient } from "../config/redis";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback-secret-key-do-not-use-in-prod";

export const sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { phone } = req.body;

    // Rate limiting logic: Check if an OTP was requested recently (e.g. 1 min)
    const existingOtp = await redisClient.get(`otp:${phone}`);
    if (existingOtp) {
      return res.status(429).json({
        success: false,
        error: "Please wait before requesting another OTP",
      });
    }

    // Generate random 6-digit OTP (or use 123456 for dev if configured)
    const isDev = process.env.NODE_ENV !== "production";
    const otp = isDev
      ? "123456"
      : Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis with 5 minutes expiration
    await redisClient.setex(`otp:${phone}`, 300, otp);

    if (isDev) {
      console.log(`[DEV ONLY] OTP for ${phone}: ${otp}`);
    }

    const response: {
      success: boolean;
      message: string;
      devOtp?: string;
    } = {
      success: true,
      message: "OTP sent successfully",
    };

    if (process.env.RETURN_OTP === "true") {
      response.devOtp = otp;
    }

    return res.status(200).json(response);  
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { phone, code, role } = req.body;

    const storedOtp = await redisClient.get(`otp:${phone}`);

    if (!storedOtp) {
      return res
        .status(400)
        .json({ success: false, error: "OTP expired or not found" });
    }

    if (storedOtp !== code) {
      return res.status(400).json({ success: false, error: "Invalid OTP" });
    }

    // Clear OTP after successful verification
    await redisClient.del(`otp:${phone}`);

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { phone } });
    let isNewUser = false;

    if (!user) {
      if (!role) {
        return res
          .status(400)
          .json({ success: false, error: "Role is required for new users" });
      }
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          phone,
          role: role as UserRole,
        },
      });

      // Create empty profile based on role
      if (role === UserRole.ARTISAN) {
        await prisma.artisan.create({ data: { userId: user.id } });
      } else if (role === UserRole.BUYER) {
        await prisma.buyer.create({ data: { userId: user.id } });
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          name: user.name,
          isNewUser,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
