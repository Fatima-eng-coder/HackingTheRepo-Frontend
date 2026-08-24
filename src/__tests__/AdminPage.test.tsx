import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminPage from "../pages/AdminPage";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import api, { USER_KEY } from "../utils/api";

vi.mock("../utils/api", async () => {
  const actual = await vi.importActual<typeof import("../utils/api")>("../utils/api");
  return {
    ...actual,
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: { baseURL: "/api", headers: { common: {} } },
      interceptors: actual.default.interceptors,
    },
  };
});

vi.mock("../utils/metrics", () => ({ sendMetricEvent: vi.fn() }));

const adminUser = { id: "admin-1", username: "boss", email: "boss@example.com", role: "admin" };

const mockUsers = [
  {
    _id: "admin-1",
    username: "boss",
    email: "boss@example.com",
    role: "admin",
    totalJobs: 3,
    successfulPRs: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    _id: "user-2",
    username: "regular",
    email: "regular@example.com",
    role: "user",
    totalJobs: 1,
    successfulPRs: 0,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

const mockJobs = [
  {
    _id: "job-1",
    repoUrl: "https://github.com/a/b",
    instruction: "add tests",
    branchName: "repomind/add-tests",
    status: "completed",
    createdAt: "2026-01-01T00:00:00.000Z",
    userId: { _id: "user-2", username: "regular", email: "regular@example.com" },
  },
];

function renderAdminPage() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={["/admin"]}>
          <AdminPage />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe("AdminPage", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(USER_KEY, JSON.stringify(adminUser));
    vi.clearAllMocks();

    (api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === "/auth/me") {
        return Promise.resolve({ data: adminUser });
      }
      if (url === "/admin/users") {
        return Promise.resolve({ data: mockUsers });
      }
      if (url === "/jobs") {
        return Promise.resolve({ data: mockJobs });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it("lists users with their roles", async () => {
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText("regular")).toBeInTheDocument();
    });

    expect(screen.getByText("boss")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("user")).toBeInTheDocument();
  });

  it("promotes a user to admin", async () => {
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ...mockUsers[1], role: "admin" },
    });

    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText("regular")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /make admin/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/admin/users/user-2/role", {
        role: "admin",
      });
    });
  });

  it("deletes a user after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { message: "User deleted" },
    });

    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText("regular")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/admin/users/user-2");
    });
  });

  it("does not delete when confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText("regular")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);

    expect(api.delete).not.toHaveBeenCalled();
  });

  it("switches to the jobs tab and shows the job owner", async () => {
    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText(/all jobs/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /all jobs/i }));

    await waitFor(() => {
      expect(screen.getByText("add tests")).toBeInTheDocument();
      expect(screen.getByText("regular")).toBeInTheDocument();
    });
  });

  it("shows an error when loading admin data fails", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === "/auth/me") {
        return Promise.resolve({ data: adminUser });
      }
      return Promise.reject({
        response: { data: { message: "Admin access required" } },
      });
    });

    renderAdminPage();

    await waitFor(() => {
      expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
    });
  });
});