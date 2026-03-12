/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";

const mockPrisma: any = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  organization: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  project: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  secret: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  membership: {
    create: jest.fn(),
  },
  subscription: {
    create: jest.fn(),
  },
  $transaction: jest.fn((callback: (tx: any) => any) => callback(mockPrisma)),
};

jest.mock("./src/database/prisma.client", () => ({
  prisma: mockPrisma,
}));

jest.mock("./src/cache/redis.client", () => ({
  redis: {},
  CACHE_KEYS: {
    LOGIN_ATTEMPTS: (email: string) => `login_attempts:${email}`,
    TWO_FACTOR_CHALLENGE: (userId: string) => `2fa:${userId}`,
  },
  CACHE_TTL: {
    DEFAULT: 3600,
  },
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  cacheIncr: jest.fn(),
  cacheDel: jest.fn(),
}));

jest.mock("./src/crypto/crypto.service", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed_password"),
  verifyPassword: jest.fn().mockResolvedValue(true),
  generateSecureToken: jest.fn().mockReturnValue("secure_token"),
  hashToken: jest.fn().mockReturnValue("hashed_token"),
  serverEncrypt: jest.fn().mockReturnValue({
    encrypted: "encrypted",
    iv: "iv",
    authTag: "authTag",
  }),
  serverDecrypt: jest.fn().mockReturnValue("decrypted_secret"),
  validateEncryptedPayload: jest.fn().mockReturnValue(true),
}));

jest.mock("./src/common/middleware/auth.middleware", () => ({
  signAccessToken: jest.fn().mockReturnValue("access_token"),
  signRefreshToken: jest.fn().mockReturnValue("refresh_token"),
  verifyRefreshToken: jest
    .fn()
    .mockReturnValue({ sub: "user_id", email: "test@test.com" }),
}));

jest.mock("./src/config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("./src/modules/audit/audit.service", () => ({
  auditService: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

(global as any).mockPrisma = mockPrisma;
