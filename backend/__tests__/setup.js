// Jest setup file
const dotenv = require('dotenv');
const path = require('path');

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long!';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'postgres';
process.env.DB_NAME = 'desktop_support_test';

// Mock Redis for tests
jest.mock('../utils/redisClient', () => ({
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve()),
    del: jest.fn(() => Promise.resolve()),
    exists: jest.fn(() => Promise.resolve(false)),
    close: jest.fn(() => Promise.resolve())
}));

// Set global test timeout
jest.setTimeout(10000);

console.log('Jest test environment configured');
