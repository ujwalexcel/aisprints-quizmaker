import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CreateMcqInput } from "@/lib/validations/mcq";

const MCQ_SELECT =
  "SELECT id, name, question, created_by_user_id, created_at, updated_at FROM mcqs";
const CHOICE_SELECT =
  "SELECT id, mcq_id, choice_text, is_correct, created_at, updated_at FROM mcq_choices";
const ATTEMPT_SELECT =
  "SELECT id, mcq_id, user_id, choice_id, is_correct, created_at FROM mcq_attempts";

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

export type McqChoice = {
  id: string;
  mcqId: string;
  choiceText: string;
  isCorrect: boolean;
  createdAt: string;
  updatedAt: string;
};

export type McqSummary = {
  id: string;
  name: string;
  question: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type Mcq = McqSummary & {
  choices: McqChoice[];
};

export type McqAttempt = {
  id: string;
  mcqId: string;
  userId: string;
  choiceId: string;
  isCorrect: boolean;
  createdAt: string;
};

async function getDb() {
  const { env } = await getCloudflareContext();
  return env.DB;
}

function toMcqSummary(row: McqRow): McqSummary {
  return {
    id: row.id,
    name: row.name,
    question: row.question,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMcqChoice(row: ChoiceRow): McqChoice {
  return {
    id: row.id,
    mcqId: row.mcq_id,
    choiceText: row.choice_text,
    isCorrect: row.is_correct === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMcqAttempt(row: AttemptRow): McqAttempt {
  return {
    id: row.id,
    mcqId: row.mcq_id,
    userId: row.user_id,
    choiceId: row.choice_id,
    isCorrect: row.is_correct === 1,
    createdAt: row.created_at,
  };
}

async function getMcqRowById(id: string): Promise<McqRow | null> {
  const db = await getDb();
  const result = await db
    .prepare(`${MCQ_SELECT} WHERE id = ?1`)
    .bind(id)
    .all<McqRow>();

  return result.results[0] ?? null;
}

async function getChoicesByMcqId(mcqId: string): Promise<McqChoice[]> {
  const db = await getDb();
  const result = await db
    .prepare(`${CHOICE_SELECT} WHERE mcq_id = ?1`)
    .bind(mcqId)
    .all<ChoiceRow>();

  return result.results.map(toMcqChoice);
}

async function getChoiceById(choiceId: string): Promise<ChoiceRow | null> {
  const db = await getDb();
  const result = await db
    .prepare(`${CHOICE_SELECT} WHERE id = ?1`)
    .bind(choiceId)
    .all<ChoiceRow>();

  return result.results[0] ?? null;
}

async function insertChoices(
  mcqId: string,
  choices: CreateMcqInput["choices"],
): Promise<McqChoice[]> {
  const db = await getDb();
  const inserted: McqChoice[] = [];

  for (const choice of choices) {
    const id = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO mcq_choices (id, mcq_id, choice_text, is_correct) VALUES (?1, ?2, ?3, ?4)",
      )
      .bind(id, mcqId, choice.choiceText, choice.isCorrect ? 1 : 0)
      .run();

    const row = await getChoiceById(id);
    if (!row) {
      throw new Error("Failed to create MCQ choice");
    }

    inserted.push(toMcqChoice(row));
  }

  return inserted;
}

export async function listMcqs(): Promise<McqSummary[]> {
  const db = await getDb();
  const result = await db
    .prepare(`${MCQ_SELECT} ORDER BY updated_at DESC`)
    .all<McqRow>();

  return result.results.map(toMcqSummary);
}

export async function getMcqById(id: string): Promise<Mcq | null> {
  const row = await getMcqRowById(id);
  if (!row) {
    return null;
  }

  const choices = await getChoicesByMcqId(id);
  return {
    ...toMcqSummary(row),
    choices,
  };
}

export async function createMcq(
  input: CreateMcqInput,
  createdByUserId: string,
): Promise<Mcq> {
  const db = await getDb();
  const id = crypto.randomUUID();

  await db
    .prepare(
      "INSERT INTO mcqs (id, name, question, created_by_user_id) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(id, input.name, input.question, createdByUserId)
    .run();

  const choices = await insertChoices(id, input.choices);
  const row = await getMcqRowById(id);
  if (!row) {
    throw new Error("Failed to create MCQ");
  }

  return {
    ...toMcqSummary(row),
    choices,
  };
}

export async function updateMcq(
  id: string,
  input: CreateMcqInput,
): Promise<Mcq | null> {
  const existing = await getMcqRowById(id);
  if (!existing) {
    return null;
  }

  const db = await getDb();
  await db
    .prepare(
      "UPDATE mcqs SET name = ?1, question = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
    )
    .bind(input.name, input.question, id)
    .run();

  await db
    .prepare("DELETE FROM mcq_choices WHERE mcq_id = ?1")
    .bind(id)
    .run();

  const choices = await insertChoices(id, input.choices);
  const row = await getMcqRowById(id);
  if (!row) {
    return null;
  }

  return {
    ...toMcqSummary(row),
    choices,
  };
}

export async function deleteMcq(id: string): Promise<boolean> {
  const existing = await getMcqRowById(id);
  if (!existing) {
    return false;
  }

  const db = await getDb();
  await db.prepare("DELETE FROM mcqs WHERE id = ?1").bind(id).run();
  return true;
}

export async function createAttempt(
  mcqId: string,
  userId: string,
  choiceId: string,
): Promise<McqAttempt> {
  const mcq = await getMcqRowById(mcqId);
  if (!mcq) {
    throw new Error("MCQ not found");
  }

  const choice = await getChoiceById(choiceId);
  if (!choice || choice.mcq_id !== mcqId) {
    throw new Error("Choice not found for MCQ");
  }

  const db = await getDb();
  const id = crypto.randomUUID();
  const isCorrect = choice.is_correct === 1 ? 1 : 0;

  await db
    .prepare(
      "INSERT INTO mcq_attempts (id, mcq_id, user_id, choice_id, is_correct) VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(id, mcqId, userId, choiceId, isCorrect)
    .run();

  const result = await db
    .prepare(`${ATTEMPT_SELECT} WHERE id = ?1`)
    .bind(id)
    .all<AttemptRow>();

  const row = result.results[0];
  if (!row) {
    throw new Error("Failed to create attempt");
  }

  return toMcqAttempt(row);
}

export async function listAttemptsByMcqId(
  mcqId: string,
): Promise<McqAttempt[]> {
  const mcq = await getMcqRowById(mcqId);
  if (!mcq) {
    throw new Error("MCQ not found");
  }

  const db = await getDb();
  const result = await db
    .prepare(`${ATTEMPT_SELECT} WHERE mcq_id = ?1`)
    .bind(mcqId)
    .all<AttemptRow>();

  return result.results.map(toMcqAttempt);
}
