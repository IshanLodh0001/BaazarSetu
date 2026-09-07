import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./swagger";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import catalogRoutes from './routes/catalog.routes';
import pricingRoutes from './routes/pricing.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import wishlistRoutes from './routes/wishlist.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import artisanOrderRoutes from './routes/artisanOrder.routes';
import b2bRoutes from './routes/b2b.routes';
import artisanB2bRoutes from './routes/artisanB2b.routes';
import notificationRoutes from './routes/notification.routes';
import analyticsRoutes from './routes/analytics.routes';
import artisanInventoryRoutes from './routes/artisanInventory.routes';
import artisanRecommendationRoutes from './routes/artisanRecommendation.routes';
import assistantRoutes from './routes/assistant.routes';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  lazyConnect: true, // Don't crash immediately on startup if not available
});

// Production Security Headers
app.use(helmet({ contentSecurityPolicy: false })); // allows Swagger UI assets to load
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting (generous in test environment, strictly enforced in production)
const isTestEnv = process.env.NODE_ENV === 'test';
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 20000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1/pricing', pricingRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/artisan/orders', artisanOrderRoutes);
app.use('/api/v1/b2b/enquiries', b2bRoutes);
app.use('/api/v1/artisan/b2b/enquiries', artisanB2bRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/artisan/analytics', analyticsRoutes);
app.use('/api/v1/artisan/inventory', artisanInventoryRoutes);
app.use('/api/v1/artisan/recommendations', artisanRecommendationRoutes);
app.use('/api/v1/ai', assistantRoutes);
app.use('/api/v1/assistant', assistantRoutes);

// General Health check endpoint
app.get("/api/v1/health", async (req, res) => {
  let dbStatus = "unhealthy";
  let redisStatus = "unhealthy";
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "healthy";
  } catch (error) {}

  try {
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    const ping = await redis.ping();
    if (ping === "PONG") {
      redisStatus = "healthy";
    }
  } catch (error) {}

  res.status(200).json({ 
    status: "healthy", 
    service: "baazarsetu-node",
    database: dbStatus,
    redis: redisStatus
  });
});

// AI Health check endpoint
app.get("/api/v1/health/ai", async (req, res) => {
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const response = await fetch(`${aiServiceUrl}/health`);
    
    if (response.ok) {
      const data = await response.json();
      res.status(200).json({ status: "healthy", ai_service: data });
    } else {
      res.status(503).json({ status: "unhealthy", ai_service: "failed_to_connect" });
    }
  } catch (error) {
    res.status(503).json({ status: "unhealthy", ai_service: "failed_to_connect" });
  }
});

// Swagger Documentation
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Raw OpenAPI JSON
app.get("/openapi.json", (req, res) => {
  res.json(swaggerDocument);
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error(err.stack);
  }
  const isProd = process.env.NODE_ENV === 'production';
  const status = err.status || 500;
  const message = isProd && status === 500 ? 'Internal Server Error' : err.message || 'Internal Server Error';
  res.status(status).json({
    success: false,
    error: message,
  });
});

export default app;
