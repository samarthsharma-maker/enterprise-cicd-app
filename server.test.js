const request = require('supertest');
const server = require('./server');

afterAll(() => server.close());

describe('GET /health', () => {
  it('returns 200 and UP status', async () => {
    const res = await request(server).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
  });
});

describe('GET /', () => {
  it('returns the success page', async () => {
    const res = await request(server).get('/');
    expect(res.statusCode).toBe(200);
  });
});