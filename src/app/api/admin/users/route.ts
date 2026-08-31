import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Strict schema for GET search params — sanitize search to prevent injection
const AdminUserListSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z
    .string()
    .max(200)
    .regex(/^[a-zA-Z0-9@._\s-]*$/, "Invalid search characters")
    .default(""),
  status: z
    .string()
    .max(50)
    .regex(/^[a-zA-Z_]*$/, "Invalid status value")
    .default(""),
  plan: z
    .string()
    .max(50)
    .regex(/^[a-zA-Z_]*$/, "Invalid plan value")
    .default(""),
});

// Strict schema for PATCH — only allow safe profile fields, never role/permissions
const AdminUserUpdateSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  updates: z
    .object({
      full_name: z.string().min(1).max(200).optional(),
      avatar_url: z.string().url().max(2000).optional(),
      phone: z
        .string()
        .max(20)
        .regex(/^[+\d\s()-]*$/, "Invalid phone format")
        .optional(),
      status: z.enum(["active", "suspended", "pending"]).optional(),
    })
    .strict(),
});

export const GET = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
    const supabase = getSupabaseClient();
    try {
    const { searchParams } = new URL(request.url);
    const params = AdminUserListSchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      plan: searchParams.get("plan") ?? undefined,
    });

    const offset = (params.page - 1) * params.limit;

    // `subscriptions.plan` does not exist. 001_initial_schema.sql:63 declares
    // stripe_price_id, and 20260110000002 only ever ADDs tracker columns; no
    // migration creates `plan`. PostgREST rejects the unknown column, `if
    // (error) throw error` below caught it, and this route answered 500 for
    // every request. The real column is selected instead; the caller resolves
    // the plan name from it via lookupPlanByPriceId.
    let query = supabase
      .from("profiles")
      .select("*, subscriptions(stripe_price_id, status)", { count: "exact" });

    if (params.search) {
      query = query.or(
        `full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`,
      );
    }

    if (params.status) {
      // `profiles` has no `status` column either — the column that holds this
      // is `subscription_status` (001_initial_schema.sql:15). Filtering on
      // `status` made every filtered request a 500.
      query = query.eq("subscription_status", params.status);
    }

    const {
      data: users,
      count,
      error,
    } = await query
      .range(offset, offset + params.limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil((count || 0) / params.limit),
    });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: error.issues },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 },
      );
    }
  },
);

export const PATCH = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
    const supabase = getSupabaseClient();
    try {
    const body = await request.json();
    const { userId, updates } = AdminUserUpdateSchema.parse(body);

    // Only pass validated/whitelisted fields to the DB
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ user: data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid request body", details: error.issues },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 },
      );
    }
  },
);
