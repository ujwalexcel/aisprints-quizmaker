import { describe, expect, it } from "vitest";
import {
  createAttemptSchema,
  createMcqSchema,
  updateMcqSchema,
} from "@/lib/validations/mcq";

const validPayload = {
  name: "Photosynthesis basics",
  question: "Which inputs are required for photosynthesis?",
  choices: [
    { choiceText: "Water and CO2", isCorrect: true },
    { choiceText: "Only oxygen", isCorrect: false },
  ],
};

describe("createMcqSchema", () => {
  it("accepts a valid MCQ payload with 2–6 choices and one correct answer", () => {
    const result = createMcqSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts up to 6 choices", () => {
    const result = createMcqSchema.safeParse({
      ...validPayload,
      choices: [
        { choiceText: "A", isCorrect: true },
        { choiceText: "B", isCorrect: false },
        { choiceText: "C", isCorrect: false },
        { choiceText: "D", isCorrect: false },
        { choiceText: "E", isCorrect: false },
        { choiceText: "F", isCorrect: false },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 2 choices", () => {
    const result = createMcqSchema.safeParse({
      ...validPayload,
      choices: [{ choiceText: "Only one", isCorrect: true }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 6 choices", () => {
    const result = createMcqSchema.safeParse({
      ...validPayload,
      choices: [
        { choiceText: "A", isCorrect: true },
        { choiceText: "B", isCorrect: false },
        { choiceText: "C", isCorrect: false },
        { choiceText: "D", isCorrect: false },
        { choiceText: "E", isCorrect: false },
        { choiceText: "F", isCorrect: false },
        { choiceText: "G", isCorrect: false },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects when no choice is marked correct", () => {
    const result = createMcqSchema.safeParse({
      ...validPayload,
      choices: [
        { choiceText: "Water and CO2", isCorrect: false },
        { choiceText: "Only oxygen", isCorrect: false },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects when more than one choice is marked correct", () => {
    const result = createMcqSchema.safeParse({
      ...validPayload,
      choices: [
        { choiceText: "Water and CO2", isCorrect: true },
        { choiceText: "Only oxygen", isCorrect: true },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name, question, or choice text", () => {
    expect(
      createMcqSchema.safeParse({ ...validPayload, name: "   " }).success,
    ).toBe(false);
    expect(
      createMcqSchema.safeParse({ ...validPayload, question: "" }).success,
    ).toBe(false);
    expect(
      createMcqSchema.safeParse({
        ...validPayload,
        choices: [
          { choiceText: "   ", isCorrect: true },
          { choiceText: "Only oxygen", isCorrect: false },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("updateMcqSchema", () => {
  it("uses the same rules as createMcqSchema", () => {
    const result = updateMcqSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });
});

describe("createAttemptSchema", () => {
  it("accepts a non-empty choiceId", () => {
    const result = createAttemptSchema.safeParse({ choiceId: "choice-123" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty choiceId", () => {
    const result = createAttemptSchema.safeParse({ choiceId: "" });
    expect(result.success).toBe(false);
  });
});
