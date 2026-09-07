import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { redisClient } from '../src/config/redis';

// Note: Ensure tests run with NODE_ENV=test
const testPhone = '+919999999999';

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { phone: testPhone } });
  await redisClient.del(`otp:${testPhone}`);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { phone: testPhone } });
  await redisClient.quit();
});

describe('Authentication API', () => {
  it('should send an OTP successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: testPhone });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    const otp = await redisClient.get(`otp:${testPhone}`);
    expect(otp).toBeTruthy();
  });

  it('should rate limit OTP requests', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: testPhone });
    
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Please wait before requesting another OTP');
  });

  it('should fail with invalid phone format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '123' });
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should verify OTP and register a new user', async () => {
    const otp = await redisClient.get(`otp:${testPhone}`);
    
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: testPhone, code: otp, role: 'BUYER' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('BUYER');
    expect(res.body.data.user.isNewUser).toBe(true);
  });

  it('should fail verification with wrong OTP', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: testPhone, code: '000000', role: 'BUYER' });
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('OTP expired or not found'); // it was deleted by previous test
  });
});
