/**
 * Adapter tests for the profile and settings API.
 *
 * These two endpoints are the reason adapters exist at all. The server stores
 * both NESTED and snake_case; the mobile screens hold flat camelCase. Because
 * `api.get<T>` is an unchecked cast rather than a validated parse, a wrong
 * mapping does not fail to compile and does not throw — it renders a screen of
 * blanks. That failure is quieter than the 404 it replaced, so it gets pinned
 * here rather than trusted.
 */

import { userProfileApi, settingsApi } from "../user";
import { api } from "../client";

jest.mock("../client", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGet = api.get as jest.Mock;
const mockPatch = api.patch as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("profile adapter", () => {
  const serverPayload = {
    success: true,
    data: {
      profile: {
        id: "u-1",
        email: "a@example.com",
        full_name: "Ada Lovelace",
        avatar_url: "https://cdn/a.png",
        phone: "+15550100",
        created_at: "2026-01-01T00:00:00Z",
        subscription: { tier: "pro", status: "active" },
      },
      stats: { creditScore: 720 },
    },
  };

  it("reads /profile, not the /user/profile path that never existed", async () => {
    mockGet.mockResolvedValueOnce(serverPayload);
    await userProfileApi.getProfile();
    expect(mockGet).toHaveBeenCalledWith("/profile");
  });

  it("splits full_name into firstName and lastName", async () => {
    mockGet.mockResolvedValueOnce(serverPayload);
    const res = await userProfileApi.getProfile();

    expect(res.data?.firstName).toBe("Ada");
    expect(res.data?.lastName).toBe("Lovelace");
  });

  it("keeps every part of a multi-word surname", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { profile: { full_name: "Ada van der Lovelace" } },
    });
    const res = await userProfileApi.getProfile();

    expect(res.data?.firstName).toBe("Ada");
    expect(res.data?.lastName).toBe("van der Lovelace");
  });

  it("maps snake_case fields onto their camelCase names", async () => {
    mockGet.mockResolvedValueOnce(serverPayload);
    const res = await userProfileApi.getProfile();

    expect(res.data?.avatarUrl).toBe("https://cdn/a.png");
    expect(res.data?.createdAt).toBe("2026-01-01T00:00:00Z");
    expect(res.data?.subscriptionTier).toBe("pro");
    expect(res.data?.subscriptionStatus).toBe("active");
  });

  it("falls back to the free tier rather than leaving it undefined", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: { profile: { full_name: "Ada", subscription: null } },
    });
    const res = await userProfileApi.getProfile();

    expect(res.data?.subscriptionTier).toBe("free");
  });

  it("returns undefined when the server sends no profile at all", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: {} });
    const res = await userProfileApi.getProfile();

    expect(res.data).toBeUndefined();
  });

  it("recombines the name and translates keys on update", async () => {
    mockPatch.mockResolvedValueOnce({ success: true, data: {} });
    await userProfileApi.updateProfile({
      firstName: "Ada",
      lastName: "Lovelace",
      avatarUrl: "https://cdn/b.png",
    });

    expect(mockPatch).toHaveBeenCalledWith("/profile", {
      full_name: "Ada Lovelace",
      avatar_url: "https://cdn/b.png",
    });
  });

  it("omits fields the caller did not set, rather than sending undefined", async () => {
    mockPatch.mockResolvedValueOnce({ success: true, data: {} });
    await userProfileApi.updateProfile({ phone: "+15550111" });

    // PATCH /api/profile allowlists four fields; anything absent must stay
    // absent so an untouched field is not overwritten with undefined.
    expect(mockPatch).toHaveBeenCalledWith("/profile", { phone: "+15550111" });
  });
});

describe("settings adapter", () => {
  it("reads /settings and flattens the nested payload", async () => {
    mockGet.mockResolvedValueOnce({
      success: true,
      data: {
        settings: {
          privacy: { share_data: true, two_factor: true },
          display: { theme: "dark", language: "fr" },
        },
      },
    });

    const res = await settingsApi.getAll();

    expect(mockGet).toHaveBeenCalledWith("/settings");
    expect(res.data).toEqual({
      theme: "dark",
      language: "fr",
      twoFactorEnabled: true,
      dataSharing: true,
    });
  });

  it("supplies defaults instead of undefined when settings are absent", async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: {} });
    const res = await settingsApi.getAll();

    expect(res.data).toEqual({
      theme: "system",
      language: "en",
      twoFactorEnabled: false,
      dataSharing: false,
    });
  });

  it("regroups a flat update into the display/privacy shape zod requires", async () => {
    mockPatch.mockResolvedValueOnce({ success: true, data: {} });
    await settingsApi.update({ theme: "dark", dataSharing: false });

    expect(mockPatch).toHaveBeenCalledWith("/settings", {
      display: { theme: "dark" },
      privacy: { share_data: false },
    });
  });

  it("sends only the categories that changed", async () => {
    mockPatch.mockResolvedValueOnce({ success: true, data: {} });
    await settingsApi.update({ language: "es" });

    // The schema rejects a body with no category, and an empty `privacy: {}`
    // would claim a change that was not requested.
    expect(mockPatch).toHaveBeenCalledWith("/settings", {
      display: { language: "es" },
    });
  });

  it("sends false as a real value, not as an absent field", async () => {
    mockPatch.mockResolvedValueOnce({ success: true, data: {} });
    await settingsApi.update({ twoFactorEnabled: false });

    // A `!== undefined` check rather than a truthiness check is what makes
    // "turn 2FA off" distinguishable from "leave 2FA alone".
    expect(mockPatch).toHaveBeenCalledWith("/settings", {
      privacy: { two_factor: false },
    });
  });
});
