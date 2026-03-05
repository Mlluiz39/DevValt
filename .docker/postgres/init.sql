-- DevVault PostgreSQL initialization
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable pg_crypto for additional crypto functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
