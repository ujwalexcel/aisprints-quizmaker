import { z } from "zod";

export const mcqChoiceSchema = z.object({
  choiceText: z.string().trim().min(1),
  isCorrect: z.boolean(),
});

const choicesSchema = z
  .array(mcqChoiceSchema)
  .min(2)
  .max(6)
  .refine((choices) => choices.filter((choice) => choice.isCorrect).length === 1, {
    message: "Exactly one choice must be marked correct",
  });

export const createMcqSchema = z.object({
  name: z.string().trim().min(1),
  question: z.string().trim().min(1),
  choices: choicesSchema,
});

export const updateMcqSchema = createMcqSchema;

export const createAttemptSchema = z.object({
  choiceId: z.string().min(1),
});

export type McqChoiceInput = z.infer<typeof mcqChoiceSchema>;
export type CreateMcqInput = z.infer<typeof createMcqSchema>;
export type UpdateMcqInput = z.infer<typeof updateMcqSchema>;
export type CreateAttemptInput = z.infer<typeof createAttemptSchema>;
