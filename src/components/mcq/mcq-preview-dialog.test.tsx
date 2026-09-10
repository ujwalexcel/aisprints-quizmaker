import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { McqPreviewDialog } from "@/components/mcq/mcq-preview-dialog";
import type { Mcq } from "@/lib/services/mcq-service";

const mockMcq: Mcq = {
  id: "mcq-123",
  name: "Photosynthesis basics",
  question: "Which inputs are required for photosynthesis?",
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

describe("McqPreviewDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          attempt: {
            id: "attempt-1",
            mcqId: "mcq-123",
            userId: "user-123",
            choiceId: "choice-1",
            isCorrect: true,
            createdAt: "2026-08-31T00:00:00.000Z",
          },
        }),
      }),
    );
  });

  it("renders the question and choices when open", () => {
    render(
      <McqPreviewDialog mcq={mockMcq} open onOpenChange={vi.fn()} />,
    );

    expect(
      screen.getByText("Which inputs are required for photosynthesis?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Water and CO2")).toBeInTheDocument();
    expect(screen.getByText("Only oxygen")).toBeInTheDocument();
  });

  it("submits an attempt when a choice is selected", async () => {
    const user = userEvent.setup();
    render(
      <McqPreviewDialog mcq={mockMcq} open onOpenChange={vi.fn()} />,
    );

    await user.click(screen.getByRole("radio", { name: "Water and CO2" }));
    await user.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/mcqs/mcq-123/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceId: "choice-1" }),
      });
    });

    expect(await screen.findByText(/correct/i)).toBeInTheDocument();
  });
});
