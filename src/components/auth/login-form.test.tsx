import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: "user-123" },
          redirectTo: "/mcqs",
        }),
      }),
    );
  });

  it("renders identifier and password fields", async () => {
    const { LoginForm } = await import("@/components/login-form");
    render(<LoginForm />);

    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("shows a generic error message on failed login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: "Invalid email/username or password",
        }),
      }),
    );

    const user = userEvent.setup();
    const { LoginForm } = await import("@/components/login-form");
    render(<LoginForm />);

    await user.type(
      screen.getByLabelText(/email or username/i),
      "jane.doe@school.edu",
    );
    await user.type(screen.getByLabelText(/^password$/i), "wrongPassword123");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    expect(
      await screen.findByText(/invalid email\/username or password/i),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to mcqs on successful login", async () => {
    const user = userEvent.setup();
    const { LoginForm } = await import("@/components/login-form");
    render(<LoginForm />);

    await user.type(
      screen.getByLabelText(/email or username/i),
      "jane.doe@school.edu",
    );
    await user.type(screen.getByLabelText(/^password$/i), "securePassword123");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/mcqs");
    });
  });
});
