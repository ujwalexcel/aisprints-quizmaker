import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { McqList } from "@/components/mcq/mcq-list";
import type { McqSummary } from "@/lib/services/mcq-service";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const mockMcqs: McqSummary[] = [
  {
    id: "mcq-123",
    name: "Photosynthesis basics",
    question: "Which inputs are required for photosynthesis?",
    createdByUserId: "user-123",
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
  },
];

describe("McqList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mcq: { ...mockMcqs[0], choices: [] } }),
      }),
    );
  });

  it("renders the MCQ table and create link", () => {
    render(<McqList mcqs={mockMcqs} displayName="Jane Doe" />);

    expect(screen.getByText("Photosynthesis basics")).toBeInTheDocument();
    expect(
      screen.getByText("Which inputs are required for photosynthesis?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create mcq/i })).toHaveAttribute(
      "href",
      "/mcqs/new",
    );
  });

  it("shows edit, preview, and delete actions in the row menu", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<McqList mcqs={mockMcqs} displayName="Jane Doe" />);

    await user.click(screen.getByRole("button", { name: /actions for/i }));

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Preview")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });
});
