import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import type { Mcq } from "@/lib/services/mcq-service";

const {
  mockRequireSession,
  mockGetMcqById,
  mockUpdateMcq,
  mockDeleteMcq,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockGetMcqById: vi.fn(),
  mockUpdateMcq: vi.fn(),
  mockDeleteMcq: vi.fn(),
}));

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: mockRequireSession,
}));

vi.mock("@/lib/services/mcq-service", () => ({
  getMcqById: mockGetMcqById,
  updateMcq: mockUpdateMcq,
  deleteMcq: mockDeleteMcq,
}));

const validBody = {
  name: "Photosynthesis basics",
  question: "Which inputs are required for photosynthesis?",
  choices: [
    { choiceText: "Water and CO2", isCorrect: true },
    { choiceText: "Only oxygen", isCorrect: false },
  ],
};

const mockMcq: Mcq = {
  id: "mcq-123",
  name: validBody.name,
  question: validBody.question,
  createdByUserId: "user-123",
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
  choices: [
    {
      id: "choice-1",
      mcqId: "mcq-123",
      choiceText: "Water and CO2",
      isCorrect: true,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    },
    {
      id: "choice-2",
      mcqId: "mcq-123",
      choiceText: "Only oxygen",
      isCorrect: false,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    },
  ],
};

function createRequest(
  url: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
) {
  return new NextRequest(url, {
    ...init,
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=valid-token`,
      ...(init?.headers ?? {}),
    },
  });
}

const routeParams = { params: Promise.resolve({ id: "mcq-123" }) };

describe("/api/mcqs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockReturnValue({ userId: "user-123" });
    mockGetMcqById.mockResolvedValue(mockMcq);
    mockUpdateMcq.mockResolvedValue(mockMcq);
    mockDeleteMcq.mockResolvedValue(true);
  });

  describe("GET", () => {
    it("returns 200 with the MCQ", async () => {
      const { GET } = await import("@/app/api/mcqs/[id]/route");
      const response = await GET(
        createRequest("http://localhost/api/mcqs/mcq-123"),
        routeParams,
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.mcq).toEqual(mockMcq);
      expect(mockGetMcqById).toHaveBeenCalledWith("mcq-123");
    });

    it("returns 404 when the MCQ does not exist", async () => {
      mockGetMcqById.mockResolvedValue(null);

      const { GET } = await import("@/app/api/mcqs/[id]/route");
      const response = await GET(
        createRequest("http://localhost/api/mcqs/mcq-123"),
        routeParams,
      );

      expect(response.status).toBe(404);
    });

    it("returns 401 without a valid session", async () => {
      mockRequireSession.mockReturnValue(null);

      const { GET } = await import("@/app/api/mcqs/[id]/route");
      const response = await GET(
        new NextRequest("http://localhost/api/mcqs/mcq-123"),
        routeParams,
      );

      expect(response.status).toBe(401);
      expect(mockGetMcqById).not.toHaveBeenCalled();
    });
  });

  describe("PUT", () => {
    it("returns 200 with the updated MCQ", async () => {
      const { PUT } = await import("@/app/api/mcqs/[id]/route");
      const response = await PUT(
        createRequest("http://localhost/api/mcqs/mcq-123", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        }),
        routeParams,
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.mcq).toEqual(mockMcq);
      expect(mockUpdateMcq).toHaveBeenCalledWith("mcq-123", validBody);
    });

    it("returns 404 when the MCQ does not exist", async () => {
      mockUpdateMcq.mockResolvedValue(null);

      const { PUT } = await import("@/app/api/mcqs/[id]/route");
      const response = await PUT(
        createRequest("http://localhost/api/mcqs/mcq-123", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        }),
        routeParams,
      );

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE", () => {
    it("returns 200 when the MCQ is deleted", async () => {
      const { DELETE } = await import("@/app/api/mcqs/[id]/route");
      const response = await DELETE(
        createRequest("http://localhost/api/mcqs/mcq-123", {
          method: "DELETE",
        }),
        routeParams,
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(mockDeleteMcq).toHaveBeenCalledWith("mcq-123");
    });

    it("returns 404 when the MCQ does not exist", async () => {
      mockDeleteMcq.mockResolvedValue(false);

      const { DELETE } = await import("@/app/api/mcqs/[id]/route");
      const response = await DELETE(
        createRequest("http://localhost/api/mcqs/mcq-123", {
          method: "DELETE",
        }),
        routeParams,
      );

      expect(response.status).toBe(404);
    });
  });
});
