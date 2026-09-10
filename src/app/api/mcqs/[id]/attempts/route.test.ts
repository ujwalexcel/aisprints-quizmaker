import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import type { McqAttempt } from "@/lib/services/mcq-service";

const {
  mockRequireSession,
  mockCreateAttempt,
  mockListAttemptsByMcqId,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockCreateAttempt: vi.fn(),
  mockListAttemptsByMcqId: vi.fn(),
}));

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: mockRequireSession,
}));

vi.mock("@/lib/services/mcq-service", () => ({
  createAttempt: mockCreateAttempt,
  listAttemptsByMcqId: mockListAttemptsByMcqId,
}));

const mockAttempt: McqAttempt = {
  id: "attempt-1",
  mcqId: "mcq-123",
  userId: "user-123",
  choiceId: "choice-1",
  isCorrect: true,
  createdAt: "2026-08-31T00:00:00.000Z",
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

describe("/api/mcqs/[id]/attempts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockReturnValue({ userId: "user-123" });
    mockCreateAttempt.mockResolvedValue(mockAttempt);
    mockListAttemptsByMcqId.mockResolvedValue([mockAttempt]);
  });

  describe("POST", () => {
    it("returns 201 with the created attempt", async () => {
      const { POST } = await import("@/app/api/mcqs/[id]/attempts/route");
      const response = await POST(
        createRequest("http://localhost/api/mcqs/mcq-123/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ choiceId: "choice-1" }),
        }),
        routeParams,
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.attempt).toEqual(mockAttempt);
      expect(mockCreateAttempt).toHaveBeenCalledWith(
        "mcq-123",
        "user-123",
        "choice-1",
      );
    });

    it("returns 400 for an invalid choice", async () => {
      mockCreateAttempt.mockRejectedValue(
        new Error("Choice not found for MCQ"),
      );

      const { POST } = await import("@/app/api/mcqs/[id]/attempts/route");
      const response = await POST(
        createRequest("http://localhost/api/mcqs/mcq-123/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ choiceId: "bad-choice" }),
        }),
        routeParams,
      );

      expect(response.status).toBe(400);
    });

    it("returns 404 when the MCQ does not exist", async () => {
      mockCreateAttempt.mockRejectedValue(new Error("MCQ not found"));

      const { POST } = await import("@/app/api/mcqs/[id]/attempts/route");
      const response = await POST(
        createRequest("http://localhost/api/mcqs/mcq-123/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ choiceId: "choice-1" }),
        }),
        routeParams,
      );

      expect(response.status).toBe(404);
    });
  });

  describe("GET", () => {
    it("returns 200 with attempts for the MCQ", async () => {
      const { GET } = await import("@/app/api/mcqs/[id]/attempts/route");
      const response = await GET(
        createRequest("http://localhost/api/mcqs/mcq-123/attempts"),
        routeParams,
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.attempts).toEqual([mockAttempt]);
      expect(mockListAttemptsByMcqId).toHaveBeenCalledWith("mcq-123");
    });

    it("returns 404 when the MCQ does not exist", async () => {
      mockListAttemptsByMcqId.mockRejectedValue(new Error("MCQ not found"));

      const { GET } = await import("@/app/api/mcqs/[id]/attempts/route");
      const response = await GET(
        createRequest("http://localhost/api/mcqs/mcq-123/attempts"),
        routeParams,
      );

      expect(response.status).toBe(404);
    });
  });
});
