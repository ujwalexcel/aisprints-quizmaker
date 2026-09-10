import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteMcqDialog } from "@/components/mcq/delete-mcq-dialog";
import type { McqSummary } from "@/lib/services/mcq-service";

const mockMcq: McqSummary = {
  id: "mcq-123",
  name: "Photosynthesis basics",
  question: "Which inputs are required for photosynthesis?",
  createdByUserId: "user-123",
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
};

describe("DeleteMcqDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      }),
    );
  });

  it("calls DELETE when deletion is confirmed", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    render(
      <DeleteMcqDialog
        mcq={mockMcq}
        open
        onOpenChange={vi.fn()}
        onDeleted={onDeleted}
      />,
    );

    await user.click(screen.getByRole("button", { name: /delete mcq/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/mcqs/mcq-123", {
        method: "DELETE",
      });
    });

    expect(onDeleted).toHaveBeenCalled();
  });
});
