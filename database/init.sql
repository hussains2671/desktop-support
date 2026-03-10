-- ============================================
-- Database Initialization Script
-- Desktop Support SaaS System
-- ============================================
-- This script runs automatically when PostgreSQL container starts
-- It ensures the database is properly initialized

-- Create database if it doesn't exist (handled by POSTGRES_DB env var)
-- This script runs after database creation

-- Set timezone
SET timezone = 'UTC';

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: schema.sql will be executed after this script
-- This file can be used for any pre-schema initialization

