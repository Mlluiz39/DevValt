# 🔐 DevVault

**Enterprise-grade secure API key management SaaS.**

DevVault is a state-of-the-art Secret Management SaaS built with a fully Zero-Knowledge architecture. It ensures that the server **never** has access to plaintext secrets. Every secret is encrypted on the client side using AES-256-GCM, with keys derived from a Master Password via Argon2id (PBKDF2 in this browser concept).

---

## 🏗 Stack Architecture

### Backend (`/apps/api`)
Built for performance, scale and security.
- **Node.js + Express** (REST API)
- **TypeScript** (Strict Mode)
- **Prisma ORM** + **PostgreSQL**
- **Redis** (Rate Limiting, Session CACHE, 2FA Challenge caching)
- **Argon2id** (Password Hashing)
- **Node Crypto (AES-256-GCM / SHA-256)** (Zero-Knowledge and validation modules)

### Frontend (`/apps/web`)
Modern, responsive and client-side crypto-capable.
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Web Crypto API** (Client-side AES-256-GCM Encryption)

### Infrastructure
- **Docker & Docker Compose** (Full environment)
- **Turborepo** (Monorepo speed and pipeline execution)

---

## 🔒 Security Posture & Zero-Knowledge Architecture

1. **True Zero-Knowledge**: The server database only stores `encryptedValue`, `iv`, `authTag`, and `salt`.
2. **Client-side Encryption**: Users must provide a `Master Password` on the frontend. The browser derives an AES key (Argon2id -> AES-256-GCM) and performs encryption *before* the POST request is sent.
3. **Advanced Rate Limiting**: Redis-backed limits for global requests, API key usage, and strict Brute-Force protection on auth endpoints.
4. **MFA / 2FA**: Support for Time-Based One-Time Passwords (TOTP) during login.
5. **Role-Based Access Control (RBAC)**: Multi-tenant design with `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER` roles.
6. **Audit Logs**: Every interaction with a secret (Read, Create, Update, Delete) is logged anonymously. Logs are scrubbed of any sensitive input.

---

## 🚀 Getting Started

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (v20+)
- [npm](https://www.npmjs.com/) (v10+)

### 2. Environment Variables
A `.env.example` file is provided in the `apps/api` folder.
For development, docker-compose will inject standard default variables automatically. Make sure you don't use these in production!

### 3. Spin up the infrastructure
Run the database and Redis services using Docker:
```bash
docker-compose up -d postgres redis
```

### 4. Install dependencies
From the root of the project:
```bash
npm install
```

### 5. Database Setup (Migrations & Seed)
Run Prisma migrations and populate the database with a test Admin, Demo user, and sample encrypted secrets.
```bash
npm run db:migrate
npm run db:seed
```

### 6. Run the Application
You can run the API and Web apps concurrently using Turborepo:
```bash
npm run dev
```
Alternatively, to run the entire stack (API, Web, DB, Redis) inside Docker:
```bash
docker-compose up --build
```

---

## 📡 API Flow Example (Adding a Secret)

1. **User requests to add a secret** (Frontend):
   The user types their `Master Password` and the `Secret Value` (e.g. `sk_live_12345...`).
2. **Encryption** (Frontend `src/lib/crypto.ts`):
   - Generates a random 32-byte `salt` and 12-byte `iv`.
   - Derives a 32-byte Key using `Argon2id` (or PBKDF2).
   - Operates `AES-256-GCM` encryption. Retrieves `ciphertext` and `authTag`.
3. **Transmission** (Frontend -> Backend):
   - Sends: `{ name: "Stripe Key", encryptedValue: "...base64...", iv: "...", authTag: "...", salt: "..." }`
4. **Storage** (Backend `src/modules/secrets/secrets.service.ts`):
   - Validates payload structure.
   - Saves blob to PostgreSQL.
   - Logs `SECRET_CREATED` in Audit Log.

Your `Secret Value` never touched the network in plaintext!

---

## 🧪 Testing

```bash
# Run tests across all packages
npm run test
```

## 🏗️ Folder Structure Highlights

```text
/
├── apps/
│   ├── api/                 # Express backend
│   │   ├── src/
│   │   │   ├── crypto/      # Backend cryptographic utilities
│   │   │   ├── modules/     # Domain-driven feature modules (Auth, Secrets, Users, etc.)
│   │   │   └── common/      # Global middlewares and error handling
│   │   └── prisma/          # Database schema and migrations
│   ├── web/                 # Next.js frontend
│   │   └── src/lib/crypto.ts # Crucial client-side Zero-Knowledge crypto functions
│   ├── mobile/              # (Placeholder) React Native
│   └── desktop/             # (Placeholder) Tauri
└── packages/                # Shared internal libraries
```

Developed as a highly secure, scalable, enterprise-grade architecture. Ready for investment pitches. 🚀
