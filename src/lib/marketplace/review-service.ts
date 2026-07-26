/**
 * Review Service
 *
 * Review operations: getReviews, createReview, markHelpful
 */

import { getSupabase } from "../supabase/client";
import type { Database } from "../supabase/types";

type ReviewRow = Database["public"]["Tables"]["marketplace_reviews"]["Row"];

export interface Review {
  id: string;
  userId: string;
  productId: string | null;
  providerId: string | null;
  rating: number;
  title: string | null;
  content: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date;
}

/**
 * Public projection of a Review — the shape returned to UNAUTHENTICATED callers
 * (e.g. the public provider-detail catalog route). Deliberately omits `userId`
 * (the internal Supabase auth UUID) so anonymous callers cannot deanonymise or
 * correlate reviewers. Built as an explicit allowlist: any per-user field added
 * to `Review` later stays out of the public payload unless added here on purpose.
 */
export interface PublicReview {
  id: string;
  productId: string | null;
  providerId: string | null;
  rating: number;
  title: string | null;
  content: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date;
}

/** Strip per-user identifiers from a Review for public (unauthenticated) responses. */
export function toPublicReview(review: Review): PublicReview {
  return {
    id: review.id,
    productId: review.productId,
    providerId: review.providerId,
    rating: review.rating,
    title: review.title,
    content: review.content,
    verifiedPurchase: review.verifiedPurchase,
    helpfulCount: review.helpfulCount,
    createdAt: review.createdAt,
  };
}

export interface CreateReviewInput {
  productId?: string;
  providerId?: string;
  rating: number;
  title?: string;
  content: string;
}

const reviews = () => getSupabase().from("marketplace_reviews");

class ReviewService {
  async getReviewsForProduct(productId: string): Promise<Review[]> {
    const { data, error } = await reviews()
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) {
      // ReviewService error: Error fetching product reviews
      return [];
    }

    return (data || []).map(this.mapToReview);
  }

  async getReviewsForProvider(providerId: string): Promise<Review[]> {
    const { data, error } = await reviews()
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (error) {
      // ReviewService error: Error fetching provider reviews
      return [];
    }

    return (data || []).map(this.mapToReview);
  }

  /**
   * Public (unauthenticated) provider reviews — same rows as
   * getReviewsForProvider, projected through toPublicReview so no reviewer
   * userId reaches anonymous callers. Used by the public provider-detail route.
   */
  async getPublicReviewsForProvider(
    providerId: string,
  ): Promise<PublicReview[]> {
    const providerReviews = await this.getReviewsForProvider(providerId);
    return providerReviews.map(toPublicReview);
  }

  async getUserReviews(userId: string): Promise<Review[]> {
    const { data, error } = await reviews()
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      // ReviewService error: Error fetching user reviews
      return [];
    }

    return (data || []).map(this.mapToReview);
  }

  async createReview(
    userId: string,
    input: CreateReviewInput,
  ): Promise<Review | null> {
    if (!input.productId && !input.providerId) {
      // ReviewService error: Review must have either productId or providerId
      return null;
    }

    const insertData = {
      user_id: userId,
      product_id: input.productId || null,
      provider_id: input.providerId || null,
      rating: input.rating,
      title: input.title || null,
      content: input.content,
      verified_purchase: false,
      helpful_count: 0,
    };

    const query = reviews();
    const { data, error } = await query.insert(insertData).select().single();

    if (error) {
      // ReviewService error: Error creating review
      return null;
    }

    return this.mapToReview(data);
  }

  async markHelpful(reviewId: string): Promise<boolean> {
    const { data: current, error: fetchError } = await reviews()
      .select("helpful_count")
      .eq("id", reviewId)
      .single();

    if (fetchError || !current) {
      return false;
    }

    const currentCount = (current as { helpful_count: number }).helpful_count;
    const query = reviews();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (query as any)
      .update({ helpful_count: currentCount + 1 })
      .eq("id", reviewId);

    return !error;
  }

  async getAverageRating(
    productId?: string,
    providerId?: string,
  ): Promise<number> {
    let query = reviews().select("rating");

    if (productId) {
      query = query.eq("product_id", productId);
    } else if (providerId) {
      query = query.eq("provider_id", providerId);
    } else {
      return 0;
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return 0;
    }

    const ratings = data as { rating: number }[];
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / ratings.length) * 10) / 10;
  }

  private mapToReview(row: ReviewRow): Review {
    return {
      id: row.id,
      userId: row.user_id,
      productId: row.product_id,
      providerId: row.provider_id,
      rating: row.rating,
      title: row.title,
      content: row.content,
      verifiedPurchase: row.verified_purchase,
      helpfulCount: row.helpful_count,
      createdAt: new Date(row.created_at),
    };
  }
}

export const reviewService = new ReviewService();
