import { AuthService } from "../auth/auth.service";
import { AppError } from "../../common/errors/app.error";
import { UserStatus } from "@prisma/client";
import { cacheGet } from "../../cache/redis.client";

declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var mockPrisma: any;
}

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    (cacheGet as jest.Mock).mockResolvedValue(null);
  });

  describe("register", () => {
    const validRegisterData = {
      name: "John Doe",
      email: "john@test.com",
      password: "SecurePassword123!",
      organizationName: "Test Organization",
    };

    it("should register a new user successfully", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "user_id",
        email: "john@test.com",
        name: "John Doe",
        status: UserStatus.ACTIVE,
      });
      mockPrisma.organization.create.mockResolvedValue({
        id: "org_id",
        name: "Test Organization",
        slug: "test-org-1234",
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.register(validRegisterData);

      expect(result.user).toBeDefined();
      expect(result.organization).toBeDefined();
      expect(result.accessToken).toBe("access_token");
      expect(result.refreshToken).toBe("refresh_token");
    });

    it("should throw error if email already exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "existing_user_id" });

      await expect(authService.register(validRegisterData)).rejects.toThrow(
        AppError,
      );
      await expect(authService.register(validRegisterData)).rejects.toThrow(
        "Email already registered",
      );
    });
  });

  describe("login", () => {
    const validLoginData = {
      email: "john@test.com",
      password: "SecurePassword123!",
    };

    it("should login successfully with valid credentials", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user_id",
        email: "john@test.com",
        name: "John Doe",
        hashedPassword: "hashed_password",
        status: UserStatus.ACTIVE,
        twoFactorEnabled: false,
        lockedUntil: null,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login(validLoginData);

      expect(result.requiresTwoFactor).toBe(false);
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBe("access_token");
    });

    it("should throw error for invalid credentials", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(validLoginData)).rejects.toThrow(AppError);
      await expect(authService.login(validLoginData)).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should throw error if account is locked", async () => {
      const { cacheGet } = require("../../cache/redis.client");
      cacheGet.mockResolvedValue(5);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user_id",
        email: "john@test.com",
        hashedPassword: "hashed_password",
        status: UserStatus.ACTIVE,
      });

      await expect(authService.login(validLoginData)).rejects.toThrow(
        "Account locked",
      );
    });

    it("should require 2FA if enabled", async () => {
      (cacheGet as jest.Mock).mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user_id",
        email: "john@test.com",
        name: "John Doe",
        hashedPassword: "hashed_password",
        status: UserStatus.ACTIVE,
        twoFactorEnabled: true,
        lockedUntil: null,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await authService.login(validLoginData);

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.userId).toBe("user_id");
      expect(result.challengeToken).toBeDefined();
    });

    it("should throw error if account is inactive", async () => {
      (cacheGet as jest.Mock).mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user_id",
        email: "john@test.com",
        hashedPassword: "hashed_password",
        status: UserStatus.INACTIVE,
      });

      await expect(authService.login(validLoginData)).rejects.toThrow(
        "Account is not active",
      );
    });
  });

  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: "token_id",
        userId: "user_id",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      });
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          refreshToken: {
            update: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const result = await authService.refreshToken("valid_refresh_token");

      expect(result.accessToken).toBe("access_token");
      expect(result.refreshToken).toBe("refresh_token");
    });

    it("should throw error for invalid token", async () => {
      const {
        verifyRefreshToken,
      } = require("../../common/middleware/auth.middleware");
      verifyRefreshToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(authService.refreshToken("invalid_token")).rejects.toThrow(
        AppError,
      );
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await authService.logout("refresh_token", "user_id");

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });
});
