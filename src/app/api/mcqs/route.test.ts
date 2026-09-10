import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import type { Mcq, McqSummary } from "@/lib/services/mcq-service";

const {
  mockRequireSession,
  mockListMcqs,
  mockCreateMcq,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockListMcqs: vi.fn(),
  mockCreateMcq: vi.fn(),
}));

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: mockRequireSession,
}));

vi.mock("@/lib/services/mcq-service", () => ({
  listMcqs: mockListMcqs,
  createMcq: mockCreateMcq,
}));

const validBody = {
  name: "Photosynthesis basics",
  question: "Which inputs are required for photosynthesis?",
  choices: [
    { choiceText: "Water and CO2", isCorrect: true },
    { choiceText: "Only oxygen", isCorrect: false },
  ],
};

const mockMcqSummary: McqSummary = {
  id: "mcq-123",
  name: validBody.name,
  question: validBody.question,
  createdByUserId: "user-123",
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
};

const mockMcq: Mcq = {
  ...mockMcqSummary,
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

describe("/api/mcqs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockReturnValue({ userId: "user-123" });
    mockListMcqs.mockResolvedValue([mockMcqSummary]);
    mockCreateMcq.mockResolvedValue(mockMcq);
  });

  describe("GET", () => {
    it("returns 200 with the MCQ list", async () => {
      const { GET } = await import("@/app/api/mcqs/route");
      const response = await GET(createRequest("http://localhost/api/mcqs"));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.mcqs).toEqual([mockMcqSummary]);
      expect(mockListMcqs).toHaveBeenCalled();
    });

    it("returns 401 without a valid session", async () => {
      mockRequireSession.mockReturnValue(null);

      const { GET } = await import("@/app/api/mcqs/route");
      const response = await GET(
        new NextRequest("http://localhost/api/mcqs"),
      );

      expect(response.status).toBe(401);
      expect(mockListMcqs).not.toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("returns 201 with the created MCQ", async () => {
      const { POST } = await import("@/app/api/mcqs/route");
      const response = await POST(
        createRequest("http://localhost/api/mcqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        }),
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.mcq).toEqual(mockMcq);
      expect(mockCreateMcq).toHaveBeenCalledWith(validBody, "user-123");
    });

    it("returns 401 without a valid session", async () => {
      mockRequireSession.mockReturnValue(null);

      const { POST } = await import("@/app/api/mcqs/route");
      const response = await POST(
        new NextRequest("http://localhost/api/mcqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        }),
      );

      expect(response.status).toBe(401);
      expect(mockCreateMcq).not.toHaveBeenCalled();
    });
  });
});
