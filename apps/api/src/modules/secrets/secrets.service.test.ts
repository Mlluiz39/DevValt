import {
  SecretsService,
  CreateSecretDto,
  UpdateSecretDto,
} from "../secrets/secrets.service";
import { AppError } from "../../common/errors/app.error";
import { SecretType } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var mockPrisma: any;
}

describe("SecretsService", () => {
  let secretsService: SecretsService;

  beforeEach(() => {
    secretsService = new SecretsService();
    jest.clearAllMocks();
  });

  describe("create", () => {
    const validSecretDto: CreateSecretDto = {
      name: "API_KEY",
      description: "My API Key",
      type: SecretType.CUSTOM,
      tags: ["production", "api"],
      keyHint: "AWS",
      encryptedValue: "encrypted_value",
      iv: "iv_value",
      authTag: "auth_tag",
      salt: "salt_value",
    };

    const mockUserId = "user_123";
    const mockOrganizationId = "org_123";
    const mockProjectId = "project_123";

    it("should create a secret successfully", async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: mockProjectId });
      mockPrisma.secret.findFirst.mockResolvedValue(null);
      mockPrisma.secret.create.mockResolvedValue({
        id: "secret_123",
        name: "API_KEY",
        description: "My API Key",
        type: SecretType.CUSTOM,
        tags: ["production", "api"],
        keyHint: "AWS",
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await secretsService.create(
        mockProjectId,
        mockOrganizationId,
        mockUserId,
        validSecretDto,
      );

      expect(result.id).toBe("secret_123");
      expect(result.name).toBe("API_KEY");
    });

    it("should throw error if project not found", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      await expect(
        secretsService.create(
          mockProjectId,
          mockOrganizationId,
          mockUserId,
          validSecretDto,
        ),
      ).rejects.toThrow(AppError);
      await expect(
        secretsService.create(
          mockProjectId,
          mockOrganizationId,
          mockUserId,
          validSecretDto,
        ),
      ).rejects.toThrow("Project not found");
    });

    it("should throw error if secret name already exists", async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: mockProjectId });
      mockPrisma.secret.findFirst.mockResolvedValue({ id: "existing_secret" });

      await expect(
        secretsService.create(
          mockProjectId,
          mockOrganizationId,
          mockUserId,
          validSecretDto,
        ),
      ).rejects.toThrow(AppError);
      await expect(
        secretsService.create(
          mockProjectId,
          mockOrganizationId,
          mockUserId,
          validSecretDto,
        ),
      ).rejects.toThrow("already exists");
    });

    it("should throw error for invalid encrypted payload", async () => {
      const {
        validateEncryptedPayload,
      } = require("../../crypto/crypto.service");
      validateEncryptedPayload.mockReturnValue(false);

      await expect(
        secretsService.create(
          mockProjectId,
          mockOrganizationId,
          mockUserId,
          validSecretDto,
        ),
      ).rejects.toThrow(AppError);
      await expect(
        secretsService.create(
          mockProjectId,
          mockOrganizationId,
          mockUserId,
          validSecretDto,
        ),
      ).rejects.toThrow("Invalid encrypted payload");
    });
  });

  describe("listByProject", () => {
    const mockOrganizationId = "org_123";
    const mockProjectId = "project_123";

    it("should list secrets by project", async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: mockProjectId });
      mockPrisma.secret.findMany.mockResolvedValue([
        {
          id: "secret_1",
          name: "API_KEY",
          description: "Test",
          type: SecretType.CUSTOM,
          tags: [],
          keyHint: null,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "secret_2",
          name: "DATABASE_URL",
          description: "DB",
          type: SecretType.CUSTOM,
          tags: [],
          keyHint: null,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.secret.count.mockResolvedValue(2);

      const result = await secretsService.listByProject(
        mockProjectId,
        mockOrganizationId,
      );

      expect(result.secrets).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it("should throw error if project not found", async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      await expect(
        secretsService.listByProject(mockProjectId, mockOrganizationId),
      ).rejects.toThrow("Project not found");
    });

    it("should filter secrets by type", async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: mockProjectId });
      mockPrisma.secret.findMany.mockResolvedValue([
        {
          id: "secret_1",
          name: "API_KEY",
          description: "Test",
          type: SecretType.API_KEY,
          tags: [],
          keyHint: null,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.secret.count.mockResolvedValue(1);

      const result = await secretsService.listByProject(
        mockProjectId,
        mockOrganizationId,
        { type: SecretType.API_KEY },
      );

      expect(result.secrets).toHaveLength(1);
    });
  });

  describe("getSecretEncryptedPayload", () => {
    const mockOrganizationId = "org_123";
    const mockUserId = "user_123";
    const mockSecretId = "secret_123";

    it("should return encrypted payload", async () => {
      mockPrisma.secret.findFirst.mockResolvedValue({
        id: mockSecretId,
        name: "API_KEY",
        description: "Test",
        type: SecretType.CUSTOM,
        tags: [],
        keyHint: "AWS",
        expiresAt: null,
        projectId: "project_123",
        encryptedValue: "encrypted_value",
        iv: "iv_value",
        authTag: "auth_tag",
        salt: "salt_value",
      });

      const result = await secretsService.getSecretEncryptedPayload(
        mockSecretId,
        mockOrganizationId,
        mockUserId,
      );

      expect(result.id).toBe(mockSecretId);
      expect(result.encryptedValue).toBe("encrypted_value");
    });

    it("should throw error if secret not found", async () => {
      mockPrisma.secret.findFirst.mockResolvedValue(null);

      await expect(
        secretsService.getSecretEncryptedPayload(
          mockSecretId,
          mockOrganizationId,
          mockUserId,
        ),
      ).rejects.toThrow(AppError);
    });

    it("should throw error if secret is expired", async () => {
      mockPrisma.secret.findFirst.mockResolvedValue({
        id: mockSecretId,
        name: "API_KEY",
        description: "Test",
        type: SecretType.CUSTOM,
        tags: [],
        keyHint: null,
        expiresAt: new Date(Date.now() - 1000),
        projectId: "project_123",
        encryptedValue: "encrypted_value",
        iv: "iv_value",
        authTag: "auth_tag",
        salt: "salt_value",
      });

      await expect(
        secretsService.getSecretEncryptedPayload(
          mockSecretId,
          mockOrganizationId,
          mockUserId,
        ),
      ).rejects.toThrow("expired");
    });
  });

  describe("update", () => {
    const mockOrganizationId = "org_123";
    const mockUserId = "user_123";
    const mockSecretId = "secret_123";

    it("should update secret successfully", async () => {
      mockPrisma.secret.findFirst.mockResolvedValue({
        id: mockSecretId,
        projectId: "project_123",
        name: "API_KEY",
      });
      mockPrisma.secret.update.mockResolvedValue({
        id: mockSecretId,
        name: "UPDATED_API_KEY",
        description: "Updated",
        type: SecretType.CUSTOM,
        tags: [],
        keyHint: null,
        expiresAt: null,
        updatedAt: new Date(),
      });

      const updateDto: UpdateSecretDto = {
        name: "UPDATED_API_KEY",
        description: "Updated",
      };

      const result = await secretsService.update(
        mockSecretId,
        mockOrganizationId,
        mockUserId,
        updateDto,
      );

      expect(result.name).toBe("UPDATED_API_KEY");
    });

    it("should throw error if secret not found", async () => {
      mockPrisma.secret.findFirst.mockResolvedValue(null);

      await expect(
        secretsService.update(mockSecretId, mockOrganizationId, mockUserId, {
          name: "New Name",
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe("delete", () => {
    const mockOrganizationId = "org_123";
    const mockUserId = "user_123";
    const mockSecretId = "secret_123";

    it("should delete secret successfully", async () => {
      mockPrisma.secret.findFirst.mockResolvedValue({
        id: mockSecretId,
        projectId: "project_123",
        name: "API_KEY",
      });
      mockPrisma.secret.update.mockResolvedValue({});

      const result = await secretsService.delete(
        mockSecretId,
        mockOrganizationId,
        mockUserId,
      );

      expect(result.deleted).toBe(true);
    });

    it("should throw error if secret not found", async () => {
      mockPrisma.secret.findFirst.mockResolvedValue(null);

      await expect(
        secretsService.delete(mockSecretId, mockOrganizationId, mockUserId),
      ).rejects.toThrow(AppError);
    });
  });
});
