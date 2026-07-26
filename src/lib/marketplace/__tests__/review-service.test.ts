/**
 * Unit tests for the public review projection (P0 info-disclosure fix).
 *
 * toPublicReview must strip the reviewer's internal userId while preserving the
 * public review fields, and getPublicReviewsForProvider must apply that
 * projection so no reviewer userId reaches unauthenticated callers.
 */

import { reviewService, toPublicReview, type Review } from "@/lib/marketplace";

const fullReview: Review = {
  id: "rv1",
  userId: "auth-uuid-must-not-leak",
  productId: null,
  providerId: "pr1",
  rating: 4,
  title: "Solid",
  content: "Ten plus characters of honest review content",
  verifiedPurchase: true,
  helpfulCount: 2,
  createdAt: new Date("2026-01-02T00:00:00Z"),
};

describe("toPublicReview", () => {
  it("omits userId from the projection", () => {
    const pub = toPublicReview(fullReview);
    expect(pub).not.toHaveProperty("userId");
    expect(JSON.stringify(pub)).not.toMatch(/auth-uuid-must-not-leak/);
    expect(JSON.stringify(pub)).not.toMatch(/user_?id/i);
  });

  it("preserves the useful public review fields", () => {
    expect(toPublicReview(fullReview)).toEqual({
      id: "rv1",
      productId: null,
      providerId: "pr1",
      rating: 4,
      title: "Solid",
      content: "Ten plus characters of honest review content",
      verifiedPurchase: true,
      helpfulCount: 2,
      createdAt: fullReview.createdAt,
    });
  });
});

describe("reviewService.getPublicReviewsForProvider", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns provider reviews with the reviewer userId stripped", async () => {
    jest
      .spyOn(reviewService, "getReviewsForProvider")
      .mockResolvedValue([fullReview]);

    const result = await reviewService.getPublicReviewsForProvider("pr1");

    expect(reviewService.getReviewsForProvider).toHaveBeenCalledWith("pr1");
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty("userId");
    expect(result[0].rating).toBe(4);
    expect(result[0].content).toBe(
      "Ten plus characters of honest review content",
    );
  });

  it("returns an empty array when the provider has no reviews", async () => {
    jest.spyOn(reviewService, "getReviewsForProvider").mockResolvedValue([]);

    expect(await reviewService.getPublicReviewsForProvider("pr1")).toEqual([]);
  });
});
