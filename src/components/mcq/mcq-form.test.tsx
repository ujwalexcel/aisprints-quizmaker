import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { McqForm } from "@/components/mcq/mcq-form";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("McqForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ mcq: { id: "mcq-123" } }),
      }),
    );
  });

  it("renders two default choice rows on create", () => {
    render(<McqForm mode="create" />);

    expect(screen.getAllByLabelText(/choice text/i)).toHaveLength(2);
  });

  it("adds and removes choice rows within 2–6 limits", async () => {
    const user = userEvent.setup();
    render(<McqForm mode="create" />);

    await user.click(screen.getByRole("button", { name: /add choice/i }));
    expect(screen.getAllByLabelText(/choice text/i)).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: /remove choice 3/i }));
    expect(screen.getAllByLabelText(/choice text/i)).toHaveLength(2);
    expect(screen.getByRole("button", { name: /remove choice 1/i })).toBeDisabled();
  });

  it("shows validation errors for invalid submissions", async () => {
    const user = userEvent.setup();
    render(<McqForm mode="create" />);

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText(/validation failed|too small|required/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits the create payload and redirects to /mcqs", async () => {
    const user = userEvent.setup();
    render(<McqForm mode="create" />);

    await user.type(screen.getByLabelText(/^name$/i), "Photosynthesis basics");
    await user.type(
      screen.getByLabelText(/^question$/i),
      "Which inputs are required for photosynthesis?",
    );
    await user.type(screen.getByLabelText(/choice text 1/i), "Water and CO2");
    await user.type(screen.getByLabelText(/choice text 2/i), "Only oxygen");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/mcqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Photosynthesis basics",
          question: "Which inputs are required for photosynthesis?",
          choices: [
            { choiceText: "Water and CO2", isCorrect: true },
            { choiceText: "Only oxygen", isCorrect: false },
          ],
        }),
      });
    });

    expect(mockPush).toHaveBeenCalledWith("/mcqs");
  });
});
