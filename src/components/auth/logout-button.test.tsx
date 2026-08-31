import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          redirectTo: "/login",
        }),
      }),
    );
  });

  it("calls logout API and navigates to login", async () => {
    const user = userEvent.setup();
    const { LogoutButton } = await import("@/components/auth/logout-button");
    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/auth/logout", {
        method: "POST",
      });
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
