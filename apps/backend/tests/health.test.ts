import request from 'supertest';
import app from '../src/app';

describe('Health Endpoints', () => {
  it('GET /api/v1/health should return 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body.service).toEqual('baazarsetu-node');
    // database and redis will be reported based on connectivity
  });

  it('GET /api/v1/health/ai should attempt connection', async () => {
    const res = await request(app).get('/api/v1/health/ai');
    // Because the AI service might not be running in CI, we just expect a JSON response
    // It will return 200 if connected, or 503/502 if not.
    expect([200, 502, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('status');
  });

  it('GET /docs should return 200 (Swagger UI)', async () => {
    const res = await request(app).get('/docs/');
    expect(res.statusCode).toEqual(200);
  });

  it('GET /openapi.json should return valid OpenAPI 3.0.0 JSON', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.statusCode).toEqual(200);
    expect(res.body.openapi).toEqual('3.0.0');
  });
});
