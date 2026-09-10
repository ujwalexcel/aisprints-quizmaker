import { beforeEach, describe, expect, it, vi } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";

type McqRow = {
  id: string;
  name: string;
  question: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

type ChoiceRow = {
  id: string;
  mcq_id: string;
  choice_text: string;
  is_correct: number;
  created_at: string;
  updated_at: string;
};

type AttemptRow = {
  id: string;
  mcq_id: string;
  user_id: string;
  choice_id: string;
  is_correct: number;
  created_at: string;
};

function createMockD1() {
  const mcqs = new Map<string, McqRow>();
  const choices = new Map<string, ChoiceRow>();
  const attempts = new Map<string, AttemptRow>();

  function createQueryExecutor(sql: string, params: unknown[]) {
    return {
      async run() {
        if (sql.includes("INSERT INTO mcqs")) {
          const row: McqRow = {
            id: params[0] as string,
            name: params[1] as string,
            question: params[2] as string,
            created_by_user_id: params[3] as string,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          mcqs.set(row.id, row);
          return { success: true };
        }

        if (sql.includes("INSERT INTO mcq_choices")) {
          const row: ChoiceRow = {
            id: params[0] as string,
            mcq_id: params[1] as string,
            choice_text: params[2] as string,
            is_correct: params[3] as number,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          choices.set(row.id, row);
          return { success: true };
        }

        if (sql.includes("INSERT INTO mcq_attempts")) {
          const row: AttemptRow = {
            id: params[0] as string,
            mcq_id: params[1] as string,
            user_id: params[2] as string,
            choice_id: params[3] as string,
            is_correct: params[4] as number,
            created_at: new Date().toISOString(),
          };
          attempts.set(row.id, row);
          return { success: true };
        }

        if (sql.includes("UPDATE mcqs")) {
          const id = params[2] as string;
          const existing = mcqs.get(id);
          if (existing) {
            mcqs.set(id, {
              ...existing,
              name: params[0] as string,
              question: params[1] as string,
              updated_at: new Date().toISOString(),
            });
          }
          return { success: true };
        }

        if (sql.includes("DELETE FROM mcq_choices WHERE mcq_id")) {
          for (const [id, choice] of choices) {
            if (choice.mcq_id === params[0]) {
              choices.delete(id);
            }
          }
          return { success: true };
        }

        if (sql.includes("DELETE FROM mcqs")) {
          const id = params[0] as string;
          mcqs.delete(id);
          for (const [choiceId, choice] of choices) {
            if (choice.mcq_id === id) {
              choices.delete(choiceId);
            }
          }
          for (const [attemptId, attempt] of attempts) {
            if (attempt.mcq_id === id) {
              attempts.delete(attemptId);
            }
          }
          return { success: true };
        }

        return { success: true };
      },
      async all<T>() {
        if (sql.includes("FROM mcqs") && sql.includes("ORDER BY")) {
          const results = [...mcqs.values()].sort((a, b) =>
            b.updated_at.localeCompare(a.updated_at),
          );
          return { results: results as T[] };
        }

        if (sql.includes("FROM mcqs WHERE id = ?1")) {
          const row = mcqs.get(params[0] as string);
          return { results: row ? [row as T] : [] };
        }

        if (sql.includes("FROM mcq_choices WHERE mcq_id = ?1")) {
          const results = [...choices.values()].filter(
            (choice) => choice.mcq_id === params[0],
          );
          return { results: results as T[] };
        }

        if (sql.includes("FROM mcq_choices WHERE id = ?1")) {
          const row = choices.get(params[0] as string);
          return { results: row ? [row as T] : [] };
        }

        if (sql.includes("FROM mcq_attempts WHERE mcq_id = ?1")) {
          const results = [...attempts.values()].filter(
            (attempt) => attempt.mcq_id === params[0],
          );
          return { results: results as T[] };
        }

        if (sql.includes("FROM mcq_attempts WHERE id = ?1")) {
          const row = attempts.get(params[0] as string);
          return { results: row ? [row as T] : [] };
        }

        return { results: [] as T[] };
      },
    };
  }

  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return createQueryExecutor(sql, params);
        },
        all<T>() {
          return createQueryExecutor(sql, []).all<T>();
        },
      };
    },
  } as unknown as D1Database;

  return { db, mcqs, choices, attempts };
}

let mockDb: D1Database;

vi.mock("server-only", () => ({}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(async () => ({
    env: { DB: mockDb },
  })),
}));

const createInput = {
  name: "Photosynthesis basics",
  question: "Which inputs are required for photosynthesis?",
  choices: [
    { choiceText: "Water and CO2", isCorrect: true },
    { choiceText: "Only oxygen", isCorrect: false },
  ],
};

describe("McqService", () => {
  beforeEach(() => {
    const mock = createMockD1();
    mockDb = mock.db;
  });

  it("createMcq inserts an MCQ and choices and sets created_by_user_id", async () => {
    const { createMcq } = await import("@/lib/services/mcq-service");

    const mcq = await createMcq(createInput, "user-123");

    expect(mcq.name).toBe(createInput.name);
    expect(mcq.question).toBe(createInput.question);
    expect(mcq.createdByUserId).toBe("user-123");
    expect(mcq.choices).toHaveLength(2);
    expect(mcq.choices.filter((choice) => choice.isCorrect)).toHaveLength(1);
    expect(mcq.choices[0].choiceText).toBe("Water and CO2");
  });

  it("listMcqs returns all MCQs ordered by updated_at descending", async () => {
    const { createMcq, listMcqs, updateMcq } = await import(
      "@/lib/services/mcq-service"
    );

    const first = await createMcq(createInput, "user-123");
    const second = await createMcq(
      {
        ...createInput,
        name: "Cell division",
        question: "What is mitosis?",
      },
      "user-123",
    );

    await updateMcq(first.id, {
      ...createInput,
      name: "Photosynthesis updated",
    });

    const mcqs = await listMcqs();
    expect(mcqs).toHaveLength(2);
    expect(mcqs[0].id).toBe(first.id);
    expect(mcqs[1].id).toBe(second.id);
  });

  it("getMcqById returns an MCQ with choices or null when missing", async () => {
    const { createMcq, getMcqById } = await import(
      "@/lib/services/mcq-service"
    );

    const created = await createMcq(createInput, "user-123");
    const found = await getMcqById(created.id);
    const missing = await getMcqById("missing-id");

    expect(found?.id).toBe(created.id);
    expect(found?.choices).toHaveLength(2);
    expect(missing).toBeNull();
  });

  it("updateMcq replaces MCQ fields and choices", async () => {
    const { createMcq, updateMcq, getMcqById } = await import(
      "@/lib/services/mcq-service"
    );

    const created = await createMcq(createInput, "user-123");
    const updated = await updateMcq(created.id, {
      name: "Updated name",
      question: "Updated question?",
      choices: [
        { choiceText: "New correct", isCorrect: true },
        { choiceText: "New wrong", isCorrect: false },
        { choiceText: "Another wrong", isCorrect: false },
      ],
    });

    expect(updated?.name).toBe("Updated name");
    expect(updated?.question).toBe("Updated question?");
    expect(updated?.choices).toHaveLength(3);
    expect(updated?.createdByUserId).toBe("user-123");

    const refetched = await getMcqById(created.id);
    expect(refetched?.choices.map((choice) => choice.choiceText)).toEqual([
      "New correct",
      "New wrong",
      "Another wrong",
    ]);
  });

  it("deleteMcq removes the MCQ", async () => {
    const { createMcq, deleteMcq, getMcqById } = await import(
      "@/lib/services/mcq-service"
    );

    const created = await createMcq(createInput, "user-123");
    await deleteMcq(created.id);

    expect(await getMcqById(created.id)).toBeNull();
  });

  it("createAttempt records user_id and is_correct from the selected choice", async () => {
    const { createMcq, createAttempt } = await import(
      "@/lib/services/mcq-service"
    );

    const mcq = await createMcq(createInput, "user-123");
    const correctChoice = mcq.choices.find((choice) => choice.isCorrect)!;
    const wrongChoice = mcq.choices.find((choice) => !choice.isCorrect)!;

    const correctAttempt = await createAttempt(
      mcq.id,
      "user-456",
      correctChoice.id,
    );
    const wrongAttempt = await createAttempt(
      mcq.id,
      "user-456",
      wrongChoice.id,
    );

    expect(correctAttempt.userId).toBe("user-456");
    expect(correctAttempt.isCorrect).toBe(true);
    expect(wrongAttempt.isCorrect).toBe(false);
  });

  it("listAttemptsByMcqId returns attempts for an MCQ", async () => {
    const { createMcq, createAttempt, listAttemptsByMcqId } = await import(
      "@/lib/services/mcq-service"
    );

    const mcq = await createMcq(createInput, "user-123");
    const choiceId = mcq.choices[0].id;

    await createAttempt(mcq.id, "user-456", choiceId);
    await createAttempt(mcq.id, "user-789", choiceId);

    const attempts = await listAttemptsByMcqId(mcq.id);
    expect(attempts).toHaveLength(2);
    expect(attempts.every((attempt) => attempt.mcqId === mcq.id)).toBe(true);
  });
});
