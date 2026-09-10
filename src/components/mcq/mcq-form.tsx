"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { createMcqSchema } from "@/lib/validations/mcq";
import type { CreateMcqInput } from "@/lib/validations/mcq";

type McqFormProps = {
  mode: "create" | "edit";
  mcqId?: string;
  initialValues?: CreateMcqInput;
};

type ChoiceRow = {
  choiceText: string;
};

function buildInitialChoices(initialValues?: CreateMcqInput): {
  choices: ChoiceRow[];
  correctIndex: number;
} {
  if (!initialValues) {
    return {
      choices: [{ choiceText: "" }, { choiceText: "" }],
      correctIndex: 0,
    };
  }

  const correctIndex = Math.max(
    0,
    initialValues.choices.findIndex((choice) => choice.isCorrect),
  );

  return {
    choices: initialValues.choices.map((choice) => ({
      choiceText: choice.choiceText,
    })),
    correctIndex,
  };
}

export function McqForm({ mode, mcqId, initialValues }: McqFormProps) {
  const router = useRouter();
  const initialState = buildInitialChoices(initialValues);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [question, setQuestion] = useState(initialValues?.question ?? "");
  const [choices, setChoices] = useState<ChoiceRow[]>(initialState.choices);
  const [correctIndex, setCorrectIndex] = useState(initialState.correctIndex);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addChoice() {
    if (choices.length >= 6) {
      return;
    }

    setChoices((current) => [...current, { choiceText: "" }]);
  }

  function removeChoice(index: number) {
    if (choices.length <= 2) {
      return;
    }

    setChoices((current) => current.filter((_, choiceIndex) => choiceIndex !== index));
    setCorrectIndex((current) => {
      if (current === index) {
        return 0;
      }

      if (current > index) {
        return current - 1;
      }

      return current;
    });
  }

  function updateChoiceText(index: number, value: string) {
    setChoices((current) =>
      current.map((choice, choiceIndex) =>
        choiceIndex === index ? { choiceText: value } : choice,
      ),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const payload = {
      name,
      question,
      choices: choices.map((choice, index) => ({
        choiceText: choice.choiceText,
        isCorrect: index === correctIndex,
      })),
    };

    const parsed = createMcqSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ?? "Validation failed. Check all fields.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const url = mode === "create" ? "/api/mcqs" : `/api/mcqs/${mcqId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setFormError(data.error ?? "Unable to save MCQ");
        return;
      }

      router.push("/mcqs");
    } catch {
      setFormError("Unable to save MCQ");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create MCQ" : "Edit MCQ"}</CardTitle>
        <CardDescription>
          Add a question with 2–6 choices and mark exactly one correct answer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="mcq-name">Name</FieldLabel>
              <Input
                id="mcq-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="mcq-question">Question</FieldLabel>
              <Textarea
                id="mcq-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Choices</FieldLabel>
              <RadioGroup
                value={String(correctIndex)}
                onValueChange={(value) => setCorrectIndex(Number(value))}
                className="gap-3"
              >
                {choices.map((choice, index) => (
                  <div
                    key={`choice-${index}`}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2 pt-2">
                      <RadioGroupItem
                        value={String(index)}
                        id={`correct-choice-${index}`}
                        aria-label={`Mark choice ${index + 1} as correct`}
                      />
                      <Label htmlFor={`correct-choice-${index}`}>Correct</Label>
                    </div>
                    <div className="flex-1 space-y-2">
                      <FieldLabel htmlFor={`choice-text-${index}`}>
                        Choice text {index + 1}
                      </FieldLabel>
                      <Input
                        id={`choice-text-${index}`}
                        aria-label={`Choice text ${index + 1}`}
                        value={choice.choiceText}
                        onChange={(event) =>
                          updateChoiceText(index, event.target.value)
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeChoice(index)}
                      disabled={choices.length <= 2}
                      aria-label={`Remove choice ${index + 1}`}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </RadioGroup>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={addChoice}
                disabled={choices.length >= 6}
              >
                Add choice
              </Button>
            </Field>
            {formError ? <FieldError>{formError}</FieldError> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/mcqs")}
              >
                Cancel
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
