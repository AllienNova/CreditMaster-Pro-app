import { redirect } from "next/navigation";

// Mock next/navigation redirect
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

// Import after mock setup
import LoginPage from "../page";

describe("LoginPage (Redirect)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should redirect to /auth/login", () => {
    // Call the component
    LoginPage();

    // Verify redirect was called with correct path
    expect(redirect).toHaveBeenCalledWith("/auth/login");
  });

  it("should redirect immediately on render", () => {
    // The component should call redirect
    LoginPage();

    // Ensure redirect was called exactly once
    expect(redirect).toHaveBeenCalledTimes(1);
  });
});
