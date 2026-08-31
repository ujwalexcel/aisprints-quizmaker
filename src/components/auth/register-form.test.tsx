import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("SignupForm", () => {
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

  it("renders all registration fields", async () => {
    const { SignupForm } = await import("@/components/signup-form");
    render(<SignupForm />);

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("submits registration data to the register API", async () => {
    const user = userEvent.setup();
    const { SignupForm } = await import("@/components/signup-form");
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Doe");
    await user.type(screen.getByLabelText(/username/i), "jdoe");
    await user.type(screen.getByLabelText(/^email$/i), "jane.doe@school.edu");
    await user.type(screen.getByLabelText(/^password$/i), "securePassword123");
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "securePassword123",
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Jane",
          lastName: "Doe",
          username: "jdoe",
          email: "jane.doe@school.edu",
          password: "securePassword123",
        }),
      });
    });
  });

  it("shows validation errors for invalid input", async () => {
    const user = userEvent.setup();
    const { SignupForm } = await import("@/components/signup-form");
    render(<SignupForm />);

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("navigates to mcqs on successful registration", async () => {
    const user = userEvent.setup();
    const { SignupForm } = await import("@/components/signup-form");
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Doe");
    await user.type(screen.getByLabelText(/username/i), "jdoe");
    await user.type(screen.getByLabelText(/^email$/i), "jane.doe@school.edu");
    await user.type(screen.getByLabelText(/^password$/i), "securePassword123");
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "securePassword123",
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/mcqs");
    });
  });
});
