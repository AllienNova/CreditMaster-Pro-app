/**
 * Fynvita Mobile User API Service
 * Handles user profile, subscriptions, notifications, and settings
 */

import { api } from "./client";
import { offlineSyncService } from "../offline-sync";
import type {
  UserProfile,
  Subscription,
  SubscriptionPlan,
  Notification,
  NotificationPreferences,
  Recommendation,
  IdentityProtectionStatus,
  IdentityAlert,
  Document,
  ApiResponse,
  PaginatedResponse,
} from "./types";

// User Profile Endpoints
export const userProfileApi = {
  /**
   * Get current user profile
   */
  // GET /api/profile returns { profile: {...}, stats: {...} } with snake_case
  // keys and a single `full_name` (profile/route.ts:82-100). UserProfile here
  // is flat camelCase with firstName/lastName split. `/user/profile` never
  // existed, and a bare repoint would have type-checked — api.get<T> is an
  // unchecked cast — while yielding undefined for every field on screen.
  //
  // The name split is lossy in one direction (the server keeps one field), so
  // it is done in exactly one place rather than in each screen that needs a
  // first name.
  getProfile: async () => {
    const res = await api.get<{
      profile?: {
        id?: string;
        email?: string;
        full_name?: string;
        avatar_url?: string;
        role?: string;
        phone?: string;
        address?: UserProfile["address"];
        created_at?: string;
        onboarding_completed?: boolean;
        subscription?: { tier?: string; status?: string } | null;
      };
    }>("/profile");

    const p = res.data?.profile;
    const [firstName = "", ...rest] = (p?.full_name ?? "").split(" ");

    return {
      ...res,
      data: p
        ? ({
            id: p.id ?? "",
            email: p.email ?? "",
            firstName,
            lastName: rest.join(" "),
            avatarUrl: p.avatar_url,
            phone: p.phone,
            address: p.address,
            createdAt: p.created_at ?? "",
            role: (p.role ?? "user") as UserProfile["role"],
            // Server-authoritative. UserProfile has declared this field all
            // along and the adapter never filled it, so the app fell back to
            // reading profiles.onboarding_completed straight from the table —
            // which the `authenticated` role has no grant on (task #65).
            onboardingCompleted: Boolean(p.onboarding_completed),
            subscriptionTier: (p.subscription?.tier ??
              "free") as UserProfile["subscriptionTier"],
            subscriptionStatus: (p.subscription?.status ??
              "active") as UserProfile["subscriptionStatus"],
          } as UserProfile)
        : undefined,
    };
  },

  /**
   * Update user profile.
   *
   * PATCH /api/profile allows exactly four fields: full_name, phone, address,
   * avatar_url (profile/route.ts:122). Anything else is dropped server-side,
   * so the camelCase names are translated here and unsupported keys are not
   * sent at all rather than silently ignored.
   */
  updateProfile: (
    updates: Partial<
      Omit<UserProfile, "id" | "email" | "createdAt" | "updatedAt">
    >,
  ) => {
    const body: Record<string, unknown> = {};
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      body.full_name = [updates.firstName, updates.lastName]
        .filter(Boolean)
        .join(" ");
    }
    if (updates.phone !== undefined) body.phone = updates.phone;
    if (updates.address !== undefined) body.address = updates.address;
    if (updates.avatarUrl !== undefined) body.avatar_url = updates.avatarUrl;

    return api.patch<UserProfile>("/profile", body);
  },

  /**
   * Upload avatar.
   * If the device is offline, the upload is queued for sync.
   */
  uploadAvatar: async (file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<ApiResponse<{ avatarUrl: string }>> => {
    if (!offlineSyncService.getIsOnline()) {
      await offlineSyncService.addToQueue({
        endpoint: "/user/avatar",
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          fileUri: file.uri,
          fileType: file.type,
        }),
        entity: "profile",
        operationType: "upload",
        priority: "low",
        conflictStrategy: "last_write_wins",
        metadata: { fileName: file.name },
      });
      return {
        success: false,
        error: {
          code: "OFFLINE_QUEUED",
          message: "Upload queued for when online",
          retryable: true,
        },
        message:
          "You appear to be offline. This upload will be processed when you reconnect.",
      } as ApiResponse<{ avatarUrl: string }>;
    }

    const { supabase } = await import("../supabase");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const formData = new FormData();
    formData.append("avatar", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || "https://api.fynvita.com"}/user/avatar`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      },
    );

    return response.json() as Promise<ApiResponse<{ avatarUrl: string }>>;
  },

  /**
   * Delete account
   */
  // GDPR Art. 17 erasure. The route is POST /api/privacy/delete and it requires
  // the literal confirmation token: { "confirm": "DELETE" } (privacy/delete/
  // route.ts:36,66). This sent { confirmation } to /user/delete-account, so it
  // was a 404 — and had the path been right it would still have been rejected
  // for the wrong key. A user asking to be forgotten was silently not forgotten.
  deleteAccount: (confirmation: string) =>
    api.post<{ success: boolean }>("/privacy/delete", { confirm: confirmation }),

  /**
   * Get onboarding status
   */
  getOnboardingStatus: () =>
    api.get<{
      completed: boolean;
      steps: { step: string; completed: boolean }[];
      currentStep: string;
    }>("/user/onboarding"),

  /**
   * Update onboarding progress
   */
  updateOnboarding: (step: string, data?: Record<string, unknown>) =>
    api.patch<{ nextStep: string; completed: boolean }>("/user/onboarding", {
      step,
      data,
    }),

  /**
   * Complete onboarding
   */
  /**
   * Mark onboarding finished. POSTs /api/onboarding/complete (withAuth), which
   * calls the complete_onboarding() SECURITY DEFINER function so
   * onboarding_progress and profiles.onboarding_completed move together.
   *
   * The old path, /user/onboarding/complete, is not a route this app serves.
   */
  completeOnboarding: () =>
    api.post<{ success: boolean; onboarding_completed?: boolean }>(
      "/onboarding/complete",
    ),
};

// ── Billing overview (real source: GET /api/payment/billing) ──────────────────
// The web billing route (withPermission("billing:read"), Stripe-backed) returns
// plans + subscription + payment methods + invoices in one un-wrapped payload;
// Date fields arrive as ISO strings over JSON. Adapt to a mobile view-model the
// billing overview screen renders directly. No fabrication: a user with no Stripe
// presence yields an empty payment-method list and empty invoices (free plan),
// which the screen empty-states — it never invents a card number or an invoice.
interface WebBillingPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  // The web route serves the full SUBSCRIPTION_PLANS catalog, which carries a
  // features list. The overview adapter ignores it; the subscription-detail
  // adapter renders it. Optional at the boundary so a plan without features (or
  // a slimmer future payload) still maps rather than failing.
  features?: string[];
}

interface WebBillingSubscription {
  planId: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

interface WebBillingPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface WebBillingInvoice {
  id: string;
  amount: number;
  status: string;
  created: string;
  dueDate?: string;
  pdfUrl?: string;
}

export interface WebBillingResponse {
  plans: WebBillingPlan[];
  subscription: WebBillingSubscription;
  paymentMethods: WebBillingPaymentMethod[];
  invoices: WebBillingInvoice[];
}

/** A real Stripe payment method, reduced to what the overview renders. */
export interface BillingPaymentMethodView {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

/** A real Stripe invoice, reduced to what the overview renders. */
export interface BillingInvoiceView {
  id: string;
  date: string;
  amount: number;
  status: string;
}

/** The mobile billing-overview view-model — every field sourced, none invented. */
export interface BillingOverview {
  planName: string;
  price: number;
  interval: string;
  status: string;
  nextBilling: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethod: BillingPaymentMethodView | null;
  recentInvoices: BillingInvoiceView[];
}

/** Format an ISO datetime to a YYYY-MM-DD date, or null when absent/invalid. */
function toBillingDate(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function mapWebBilling(res: WebBillingResponse): BillingOverview {
  const plan = res.plans.find((p) => p.id === res.subscription.planId);
  const defaultMethod =
    res.paymentMethods.find((pm) => pm.isDefault) ??
    res.paymentMethods[0] ??
    null;

  return {
    planName: plan?.name ?? "Free",
    price: plan?.price ?? 0,
    interval: plan?.interval ?? "month",
    status: res.subscription.status,
    nextBilling: toBillingDate(res.subscription.currentPeriodEnd),
    cancelAtPeriodEnd: res.subscription.cancelAtPeriodEnd,
    paymentMethod: defaultMethod
      ? {
          brand: defaultMethod.brand,
          last4: defaultMethod.last4,
          expMonth: defaultMethod.expMonth,
          expYear: defaultMethod.expYear,
        }
      : null,
    recentInvoices: res.invoices.slice(0, 3).map((inv) => ({
      id: inv.id,
      date: toBillingDate(inv.created) ?? "",
      amount: inv.amount,
      status: inv.status,
    })),
  };
}

// ── Subscription detail (real source: GET /api/payment/billing) ───────────────
// The subscription-management screen needs the full plan catalog (with features)
// and which plan is active — both already in the /payment/billing payload (plans =
// SUBSCRIPTION_PLANS, subscription.planId = the active plan). This view-model
// reduces that payload to what the screen renders and marks the active plan. It
// replaces the screen's former hardcoded, wrong-priced plan catalog: nothing here
// is invented — the plans, prices, features, and current marker are all sourced.

/** One catalog plan, reduced to what the subscription screen renders. */
export interface SubscriptionPlanView {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  isCurrent: boolean;
}

/** The mobile subscription-management view-model — every field sourced. */
export interface SubscriptionDetail {
  plans: SubscriptionPlanView[];
  currentPlanId: string;
  status: string;
  nextBilling: string | null;
  cancelAtPeriodEnd: boolean;
}

/** Result of a plan change (POST /api/payment/billing/plan). */
export interface PlanUpdateResult {
  // "updated": an existing Stripe subscription was changed in place (re-fetch to
  // reflect it). "redirect": a new subscription needs Stripe Checkout — open
  // checkoutUrl. The web route also returns { status: "updated" } on cancel.
  status: "updated" | "redirect";
  checkoutUrl?: string;
}

export function mapWebSubscription(res: WebBillingResponse): SubscriptionDetail {
  const currentPlanId = res.subscription.planId;
  return {
    plans: res.plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      interval: p.interval,
      features: p.features ?? [],
      isCurrent: p.id === currentPlanId,
    })),
    currentPlanId,
    status: res.subscription.status,
    nextBilling: toBillingDate(res.subscription.currentPeriodEnd),
    cancelAtPeriodEnd: res.subscription.cancelAtPeriodEnd,
  };
}

// ── Invoices (real source: GET /api/payment/billing) ──────────────────────────
// The invoices screen shows the full billing history — every Stripe invoice for
// the customer, not just the three the overview previews. Same /payment/billing
// payload (invoices[] = real Stripe invoices; the web route already converts cents
// to dollars). This view-model reduces each invoice to what the screen renders and
// remaps Stripe's status vocabulary (paid | open | void | uncollectible | draft)
// to the mobile paid | pending | failed set. It replaces the screen's former
// hardcoded INV-001..007 array: ids, amounts, dates, statuses, and the optional
// PDF link are all sourced — nothing invented. A user with no Stripe presence
// yields an empty list (the screen empty-states), never a fabricated invoice.

/** The mobile status vocabulary for an invoice. */
export type InvoiceStatus = "paid" | "pending" | "failed";

/** A real Stripe invoice, reduced to what the invoices screen renders. */
export interface InvoiceView {
  id: string;
  date: string;
  amount: number;
  status: InvoiceStatus;
  pdfUrl?: string;
}

// Stripe invoice status -> mobile status. The web route (billing-data.ts) already
// filters to paid | open | void | uncollectible, but this map stays exhaustive
// (includes draft) and is hasOwnProperty-guarded with an honest unknown -> pending
// floor, so a future or unfiltered Stripe status never crashes or mislabels a
// still-owed invoice as paid.
const WEB_TO_MOBILE_INVOICE_STATUS: Record<string, InvoiceStatus> = {
  paid: "paid",
  open: "pending",
  draft: "pending",
  void: "failed",
  uncollectible: "failed",
};

function toInvoiceStatus(status: string): InvoiceStatus {
  return Object.prototype.hasOwnProperty.call(
    WEB_TO_MOBILE_INVOICE_STATUS,
    status,
  )
    ? WEB_TO_MOBILE_INVOICE_STATUS[status]
    : "pending";
}

/**
 * Adapt the web billing payload's invoices[] to the mobile InvoiceView[] the
 * invoices screen renders, in server order and uncapped (the full history). Every
 * field is sourced; a malformed row from the JSON boundary degrades honestly —
 * absent/invalid amount -> 0, absent/invalid date -> "" — rather than fabricating.
 */
export function mapWebInvoices(res: WebBillingResponse): InvoiceView[] {
  const invoices = Array.isArray(res.invoices) ? res.invoices : [];
  return invoices.map((inv) => {
    const view: InvoiceView = {
      id: inv.id,
      date: toBillingDate(inv.created) ?? "",
      amount: Number.isFinite(inv.amount) ? inv.amount : 0,
      status: toInvoiceStatus(inv.status),
    };
    if (inv.pdfUrl) view.pdfUrl = inv.pdfUrl;
    return view;
  });
}

// Subscription Endpoints
export const subscriptionApi = {
  /**
   * Get the real billing overview (current plan, default payment method, and
   * recent invoices) from the Stripe-backed web route GET /api/payment/billing.
   * Adapted to the mobile BillingOverview view-model by mapWebBilling; unsourced
   * fields are omitted so the screen can empty-state rather than fabricate.
   */
  getBillingOverview: async (): Promise<ApiResponse<BillingOverview>> => {
    const res = await api.get<WebBillingResponse>("/payment/billing");
    if (res.success && res.data) {
      return { success: true, data: mapWebBilling(res.data) };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get the real subscription detail (full plan catalog + the active plan) from
   * the Stripe-backed web route GET /api/payment/billing, adapted to the mobile
   * SubscriptionDetail view-model by mapWebSubscription. Replaces the subscription
   * screen's former hardcoded, wrong-priced plan catalog.
   */
  getSubscriptionDetail: async (): Promise<ApiResponse<SubscriptionDetail>> => {
    const res = await api.get<WebBillingResponse>("/payment/billing");
    if (res.success && res.data) {
      return { success: true, data: mapWebSubscription(res.data) };
    }
    return { success: false, error: res.error };
  },

  /**
   * Get the real billing history (all invoices) from the Stripe-backed web route
   * GET /api/payment/billing, adapted to the mobile InvoiceView[] by mapWebInvoices.
   * Replaces the invoices screen's former hardcoded INV-001..007 array. A user with
   * no Stripe presence yields an empty list — never a fabricated invoice.
   */
  getInvoices: async (): Promise<ApiResponse<InvoiceView[]>> => {
    const res = await api.get<WebBillingResponse>("/payment/billing");
    if (res.success && res.data) {
      return { success: true, data: mapWebInvoices(res.data) };
    }
    return { success: false, error: res.error };
  },

  /**
   * Change the current plan via the real web route POST /api/payment/billing/plan.
   * Returns { status: "updated" } when an existing subscription is changed in place
   * (re-fetch to reflect it) or { status: "redirect", checkoutUrl } when a new
   * subscription must go through Stripe Checkout.
   */
  updatePlan: (planId: string): Promise<ApiResponse<PlanUpdateResult>> =>
    api.post<PlanUpdateResult>("/payment/billing/plan", { planId }),

  /**
   * Cancel the current subscription via POST /api/payment/billing/plan with
   * cancelSubscription: true (server keeps access until period end, then Free).
   */
  cancelPlan: (): Promise<ApiResponse<PlanUpdateResult>> =>
    api.post<PlanUpdateResult>("/payment/billing/plan", {
      cancelSubscription: true,
    }),

  // GET /api/payment/billing is the ONE billing read. It returns
  // { plans, subscription, paymentMethods, invoices } in a single response
  // (payment/billing/route.ts:11-15), so the four separate paths the client
  // used — /user/subscription, /subscription/plans, /user/billing/history and
  // /user/billing/payment-method — were four 404s asking for slices of a
  // document that is already served whole.
  getCurrent: async () => {
    const res = await api.get<{ subscription: Subscription }>("/payment/billing");
    return { ...res, data: res.data?.subscription };
  },

  /**
   * Get available plans
   */
  getPlans: async () => {
    const res = await api.get<{ plans: SubscriptionPlan[] }>("/payment/billing", {
      enableCache: true,
      cacheTime: 60 * 60 * 1000,
    });
    return { ...res, data: { plans: res.data?.plans ?? [] } };
  },

  /**
   * Create checkout session
   */
  createCheckout: (priceId: string) =>
    api.post<{ sessionId: string; url: string }>("/payment/checkout", {
      priceId,
    }),

  // upgrade / cancel / reactivate were exact duplicates of updatePlan and
  // cancelPlan above, except that those two call the REAL route and these
  // three called /user/subscription/{upgrade,cancel,reactivate}, none of
  // which exist. Two implementations of one operation, one working and one
  // 404ing, is how a feature appears to work in a code review and fails in a
  // user's hands. They now delegate; there is one implementation.
  upgrade: (planId: string) => subscriptionApi.updatePlan(planId),

  /**
   * Cancel the subscription (access continues to period end).
   */
  cancel: () => subscriptionApi.cancelPlan(),

  /**
   * Resume a cancelled subscription by re-selecting a plan.
   */
  reactivate: (planId: string) => subscriptionApi.updatePlan(planId),

  /**
   * Get billing history
   */
  getBillingHistory: () =>
    api.get<{
      invoices: {
        id: string;
        amount: number;
        status: string;
        date: string;
        pdfUrl?: string;
      }[];
    }>("/payment/billing"),

  /**
   * Update payment method
   */
  updatePaymentMethod: (paymentMethodId: string) =>
    api.post<{ success: boolean }>("/user/billing/payment-method", {
      paymentMethodId,
    }),
};

// The real web route (/api/notifications) returns notifications with `message`
// and a broader type enum than the mobile Notification type (`body` + a smaller
// enum). Adapt web -> mobile at the boundary so the store/screen see one shape.
interface WebNotification {
  id: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const WEB_TO_MOBILE_NOTIFICATION_TYPE: Record<string, Notification["type"]> = {
  dispute_update: "dispute_update",
  dispute_overdue: "dispute_update",
  dispute_reminder: "dispute_update",
  draft_reminder: "dispute_update",
  payment_success: "payment",
  subscription_expiring: "payment",
  score_reminder: "score_change",
  document_uploaded: "alert",
  tip: "recommendation",
  welcome: "system",
  system: "system",
};

export function mapWebNotification(n: WebNotification): Notification {
  return {
    id: n.id,
    userId: n.userId ?? "",
    type: WEB_TO_MOBILE_NOTIFICATION_TYPE[n.type] ?? "system",
    title: n.title,
    body: n.message,
    read: n.read,
    createdAt: n.createdAt,
  };
}

// Notification Endpoints
export const notificationApi = {
  /**
   * Get all notifications
   */
  getAll: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<
    ApiResponse<{ notifications: Notification[]; unreadCount: number }>
  > => {
    // The web route honors ?limit= and returns { notifications, unreadCount } in
    // the web notification shape; adapt each to the mobile Notification shape.
    const query = params?.limit ? `?limit=${params.limit}` : "";
    const res = await api.get<{
      notifications: WebNotification[];
      unreadCount: number;
    }>(`/notifications${query}`);
    if (res.success && res.data) {
      return {
        success: true,
        data: {
          notifications: res.data.notifications.map(mapWebNotification),
          unreadCount: res.data.unreadCount,
        },
      };
    }
    return { success: false, error: res.error };
  },

  /**
   * Mark one notification as read. Web contract: PATCH with an action body.
   */
  markAsRead: (notificationId: string) =>
    api.patch<{ success: boolean }>("/notifications", {
      notificationId,
      action: "mark_read",
    }),

  /**
   * Mark all as read. Web contract: PATCH with action only.
   */
  markAllAsRead: () =>
    api.patch<{ count: number }>("/notifications", { action: "mark_all_read" }),

  /**
   * Get notification preferences
   */
  getPreferences: () =>
    api.get<NotificationPreferences>("/notifications/preferences"),

  /**
   * Update notification preferences
   */
  updatePreferences: (preferences: Partial<NotificationPreferences>) =>
    api.patch<NotificationPreferences>(
      "/notifications/preferences",
      preferences,
    ),

  /**
   * Register push token
   */
  registerPushToken: (token: string, platform: "ios" | "android") =>
    api.post<{ success: boolean }>("/notifications/push-token", {
      token,
      platform,
    }),

  /**
   * Delete notification
   */
  delete: (notificationId: string) =>
    api.delete<{ success: boolean }>(
      `/notifications?notificationId=${encodeURIComponent(notificationId)}`,
    ),
};

// Recommendations Endpoints
export const recommendationApi = {
  /**
   * Get personalized recommendations
   */
  getAll: () =>
    api.get<{ recommendations: Recommendation[] }>("/user/recommendations"),

  /**
   * Get recommendations by type
   */
  getByType: (type: Recommendation["type"]) =>
    api.get<{ recommendations: Recommendation[] }>(
      `/user/recommendations?type=${type}`,
    ),

  /**
   * Dismiss recommendation
   */
  dismiss: (recommendationId: string) =>
    api.patch<{ success: boolean }>(
      `/user/recommendations/${recommendationId}/dismiss`,
    ),

  /**
   * Track recommendation click
   */
  trackClick: (recommendationId: string) =>
    api.post<{ success: boolean }>(
      `/user/recommendations/${recommendationId}/click`,
    ),
};

// User Analytics Endpoints
// GET /api/user/analytics (withAuth) returns the authenticated user's credit
// dashboard analytics. creditHistory + disputeStats are real per-user data
// (credit_score_history, disputes), honestly empty/zeroed when a source is
// empty. scoreFactors (standard FICO category weights, status "neutral" until a
// pulled report drives per-factor analysis) and recommendations (general
// best-practice tips) are the endpoint's own reference data — not per-user
// fabrication. normalizeUserAnalytics only guarantees array/number shapes and
// clamps status to the known union; it never invents values (missing => [] / 0
// / "neutral"), so an empty response stays honestly empty rather than mocked.
export type ScoreFactorStatus = "positive" | "negative" | "neutral";

export interface CreditHistoryPoint {
  date: string;
  score: number;
}

export interface AnalyticsDisputeStats {
  total: number;
  resolved: number;
  pending: number;
  successRate: number;
}

export interface ScoreFactor {
  factor: string;
  impact: number;
  status: ScoreFactorStatus;
}

export interface UserAnalytics {
  creditHistory: CreditHistoryPoint[];
  disputeStats: AnalyticsDisputeStats;
  scoreFactors: ScoreFactor[];
  recommendations: string[];
  timeRange: string;
}

interface RawUserAnalytics {
  creditHistory?: unknown;
  disputeStats?: unknown;
  scoreFactors?: unknown;
  recommendations?: unknown;
  timeRange?: unknown;
}

const SCORE_FACTOR_STATUSES: readonly ScoreFactorStatus[] = [
  "positive",
  "negative",
  "neutral",
];

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeScoreFactorStatus(value: unknown): ScoreFactorStatus {
  return typeof value === "string" &&
    (SCORE_FACTOR_STATUSES as readonly string[]).includes(value)
    ? (value as ScoreFactorStatus)
    : "neutral";
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      )
    : [];
}

export function normalizeUserAnalytics(raw: RawUserAnalytics): UserAnalytics {
  const creditHistory = asRecordArray(raw.creditHistory).map((point) => ({
    date: typeof point.date === "string" ? point.date : "",
    score: toFiniteNumber(point.score),
  }));

  const scoreFactors = asRecordArray(raw.scoreFactors).map((factor) => ({
    factor: typeof factor.factor === "string" ? factor.factor : "",
    impact: toFiniteNumber(factor.impact),
    status: normalizeScoreFactorStatus(factor.status),
  }));

  const recommendations = Array.isArray(raw.recommendations)
    ? raw.recommendations.filter((tip): tip is string => typeof tip === "string")
    : [];

  const stats =
    typeof raw.disputeStats === "object" && raw.disputeStats !== null
      ? (raw.disputeStats as Record<string, unknown>)
      : {};

  return {
    creditHistory,
    disputeStats: {
      total: toFiniteNumber(stats.total),
      resolved: toFiniteNumber(stats.resolved),
      pending: toFiniteNumber(stats.pending),
      successRate: toFiniteNumber(stats.successRate),
    },
    scoreFactors,
    recommendations,
    timeRange: typeof raw.timeRange === "string" ? raw.timeRange : "6m",
  };
}

export const userAnalyticsApi = {
  /**
   * Get the authenticated user's credit-dashboard analytics.
   * @param range "3m" | "6m" | "12m" (server default "6m")
   */
  getAnalytics: async (range = "6m"): Promise<ApiResponse<UserAnalytics>> => {
    const res = await api.get<RawUserAnalytics>(
      `/user/analytics?range=${encodeURIComponent(range)}`,
    );
    if (res.success && res.data) {
      return { success: true, data: normalizeUserAnalytics(res.data) };
    }
    return { success: false, error: res.error };
  },
};

// Identity Protection Endpoints
export const identityProtectionApi = {
  /**
   * Get identity protection status
   */
  getStatus: () => api.get<IdentityProtectionStatus>("/identity/status"),

  /**
   * Enable dark web monitoring
   */
  enableDarkWebMonitoring: (personalInfo: {
    email: string;
    phone?: string;
    ssn?: string;
  }) =>
    api.post<{ success: boolean; nextScan: string }>(
      "/identity/dark-web/enable",
      personalInfo,
    ),

  /**
   * Disable dark web monitoring
   */
  disableDarkWebMonitoring: () =>
    api.post<{ success: boolean }>("/identity/dark-web/disable"),

  /**
   * Get identity alerts
   */
  getAlerts: () => api.get<{ alerts: IdentityAlert[] }>("/identity/alerts"),

  /**
   * Mark alert as resolved
   */
  resolveAlert: (alertId: string) =>
    api.patch<IdentityAlert>(`/identity/alerts/${alertId}/resolve`),

  /**
   * Request manual scan
   */
  requestScan: () =>
    api.post<{ success: boolean; scanId: string }>("/identity/scan"),
};

// Document Endpoints
export const documentApi = {
  /**
   * Get all documents
   */
  getAll: () => api.get<{ documents: Document[] }>("/documents"),

  /**
   * Get document by ID
   */
  getById: (documentId: string) =>
    api.get<Document>(`/documents/${documentId}`),

  /**
   * Upload document.
   * If the device is offline, the upload metadata is queued for sync.
   */
  upload: async (
    file: { uri: string; name: string; type: string },
    docType: Document["type"],
  ): Promise<ApiResponse<Document>> => {
    if (!offlineSyncService.getIsOnline()) {
      await offlineSyncService.addToQueue({
        endpoint: "/documents/upload",
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          fileUri: file.uri,
          fileType: file.type,
          docType,
        }),
        entity: "document",
        operationType: "upload",
        priority: "normal",
        conflictStrategy: "client_wins",
        metadata: { fileName: file.name, docType },
      });
      return {
        success: false,
        error: {
          code: "OFFLINE_QUEUED",
          message: "Upload queued for when online",
          retryable: true,
        },
        message:
          "You appear to be offline. This upload will be processed when you reconnect.",
      } as ApiResponse<Document>;
    }

    const { supabase } = await import("../supabase");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
    formData.append("type", docType);

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || "https://api.fynvita.com"}/documents/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      },
    );

    return response.json() as Promise<ApiResponse<Document>>;
  },

  /**
   * Analyze document
   */
  analyze: (documentId: string) =>
    api.post<Document>(`/documents/${documentId}/analyze`),

  /**
   * Delete document
   */
  delete: (documentId: string) =>
    api.delete<{ success: boolean }>(`/documents/${documentId}`),

  /**
   * Get document download URL
   */
  getDownloadUrl: (documentId: string) =>
    api.get<{ url: string; expiresAt: string }>(
      `/documents/${documentId}/download`,
    ),
};

// Settings Endpoints
export const settingsApi = {
  /**
   * Get user settings
   */
  // The server stores settings NESTED and snake_case:
  //   { settings: { notifications, privacy: { share_data, analytics,
  //     two_factor }, display: { theme, language, timezone } } }
  // (src/app/api/settings/route.ts:18-32,39). The mobile screens want a flat
  // camelCase object. Repointing the path alone would have type-checked —
  // api.get<T> is an unchecked cast — and handed every field back as
  // undefined, which is worse than the 404 it replaced. Hence a real adapter.
  //
  // biometricEnabled is deliberately absent from the round-trip. Biometric
  // unlock is a property of the DEVICE, not the account (biometricService.ts
  // keeps it in local storage); syncing it would enable Face ID on a phone
  // that has never been unlocked with it.
  getAll: async () => {
    const res = await api.get<{
      settings?: {
        privacy?: { share_data?: boolean; two_factor?: boolean };
        display?: { theme?: "light" | "dark" | "system"; language?: string };
      };
    }>("/settings");
    const s = res.data?.settings;
    return {
      ...res,
      data: {
        theme: s?.display?.theme ?? "system",
        language: s?.display?.language ?? "en",
        twoFactorEnabled: s?.privacy?.two_factor ?? false,
        dataSharing: s?.privacy?.share_data ?? false,
      },
    };
  },

  /**
   * Update settings
   */
  // Inverse of the adapter above. The PATCH body is validated by a zod schema
  // that requires at least one of notifications/privacy/display and rejects
  // unknown shapes (settings/route.ts:34-48), so the flat object the screens
  // hold has to be regrouped before it is sent.
  update: (
    settings: Partial<{
      theme: "light" | "dark" | "system";
      language: string;
      twoFactorEnabled: boolean;
      dataSharing: boolean;
    }>,
  ) => {
    const display: Record<string, unknown> = {};
    if (settings.theme !== undefined) display.theme = settings.theme;
    if (settings.language !== undefined) display.language = settings.language;

    const privacy: Record<string, unknown> = {};
    if (settings.twoFactorEnabled !== undefined) {
      privacy.two_factor = settings.twoFactorEnabled;
    }
    if (settings.dataSharing !== undefined) {
      privacy.share_data = settings.dataSharing;
    }

    const body: Record<string, unknown> = {};
    if (Object.keys(display).length > 0) body.display = display;
    if (Object.keys(privacy).length > 0) body.privacy = privacy;

    return api.patch<{ success: boolean }>("/settings", body);
  },

  /**
   * Enable two-factor authentication
   */
  enable2FA: () =>
    api.post<{ secret: string; qrCode: string }>("/user/settings/2fa/enable"),

  /**
   * Verify two-factor authentication
   */
  verify2FA: (code: string) =>
    api.post<{ success: boolean; backupCodes: string[] }>(
      "/user/settings/2fa/verify",
      { code },
    ),

  /**
   * Disable two-factor authentication
   */
  disable2FA: (code: string) =>
    api.post<{ success: boolean }>("/user/settings/2fa/disable", { code }),

  /**
   * Export user data
   */
  // GDPR Art. 20 portability. GET /api/privacy/export returns the export
  // INLINE as { success, data } (privacy/export/route.ts:71) — there is no
  // download URL and no POST. The old signature promised { downloadUrl,
  // expiresAt }, which no route has ever produced; it had no callers, so the
  // shape is corrected here rather than adapted around.
  exportData: (format: "json" | "csv" | "xml" = "json") =>
    api.get<Record<string, unknown>>(`/privacy/export?format=${format}`),
};

export default {
  profile: userProfileApi,
  subscription: subscriptionApi,
  notifications: notificationApi,
  recommendations: recommendationApi,
  identityProtection: identityProtectionApi,
  documents: documentApi,
  settings: settingsApi,
};
