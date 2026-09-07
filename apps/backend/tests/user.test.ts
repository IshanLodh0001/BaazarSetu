import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod';
let token: string;
let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      phone: '+918888888888',
      role: 'ARTISAN',
    },
  });
  userId = user.id;

  token = jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { phone: '+918888888888' } });
});

describe('User API', () => {
  it('should fetch user profile', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.phone).toBe('+918888888888');
  });

  it('should update basic profile', async () => {
    const res = await request(app)
      .patch('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Artisan' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Artisan');
  });

  it('should onboard artisan', async () => {
    const res = await request(app)
      .post('/api/v1/users/artisan/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({
        businessName: 'Artisan Creations',
        craftType: 'Pottery',
        experienceYears: 5,
        state: 'Rajasthan',
        district: 'Jaipur',
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.businessName).toBe('Artisan Creations');
    expect(res.body.data.onboardingComplete).toBe(true);
  });

  it('should prevent buyer onboarding for artisan role', async () => {
    const res = await request(app)
      .post('/api/v1/users/buyer/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyName: 'Buyer Co' });
    
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
