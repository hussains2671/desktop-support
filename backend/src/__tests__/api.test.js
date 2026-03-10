const request = require('supertest');
const app = require('../server');

describe('API Health Check', () => {
    test('GET /health should return 200', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);
        
        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
    });
});

describe('API Documentation', () => {
    test('GET /api-docs should return 200', async () => {
        await request(app)
            .get('/api-docs')
            .expect(200);
    });

    test('GET /api-docs.json should return valid JSON', async () => {
        const response = await request(app)
            .get('/api-docs.json')
            .expect(200)
            .expect('Content-Type', /json/);
        
        expect(response.body).toHaveProperty('openapi');
        expect(response.body).toHaveProperty('info');
    });
});

describe('Authentication', () => {
    test('POST /api/auth/login without credentials should return 400', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({})
            .expect(400);
        
        expect(response.body).toHaveProperty('success', false);
    });
});

describe('404 Handler', () => {
    test('GET /nonexistent should return 404', async () => {
        const response = await request(app)
            .get('/nonexistent')
            .expect(404);
        
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message');
    });
});

