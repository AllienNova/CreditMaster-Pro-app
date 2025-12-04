import supabase from '../supabase';
import { SUBSCRIPTION_PLANS } from './stripe-service';

const TABLE = 'billing_profiles';

export interface BillingPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface BillingInvoice {
  id: string;
  amount: number;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  created: Date;
  dueDate?: Date;
  pdfUrl?: string;
}

export interface BillingProfile {
  customerId: string;
  currentPlanId: string;
  status: 'active' | 'trialing' | 'canceled' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  paymentMethods: BillingPaymentMethod[];
  invoices: BillingInvoice[];
}

type BillingProfileRow = {
  user_id: string;
  profile: BillingProfile;
};

const profiles = new Map<string, BillingProfile>();

const createSeedProfile = (userId: string): BillingProfile => {
  const defaultPlan = SUBSCRIPTION_PLANS[0];
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(now.getMonth() + 1);

  return {
    customerId: `cus_${userId}`,
    currentPlanId: defaultPlan.id,
    status: 'trialing',
    currentPeriodStart: now,
    currentPeriodEnd: nextMonth,
    cancelAtPeriodEnd: false,
    paymentMethods: [
      {
        id: `pm_${userId}`,
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: new Date().getFullYear() + 3,
        isDefault: true,
      },
    ],
    invoices: [
      {
        id: `inv_${Date.now() - 86400000}`,
        amount: defaultPlan.price,
        status: 'paid',
        created: new Date(now.getTime() - 86400000),
        pdfUrl: '#',
      },
    ],
  };
};

const repository = {
  async load(userId: string): Promise<BillingProfile | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('profile')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.warn('Failed to load billing profile', error);
        }
        return null;
      }

      const profile = data?.profile as BillingProfile | undefined;
      if (!profile) return null;

      profile.currentPeriodStart = new Date(profile.currentPeriodStart);
      profile.currentPeriodEnd = new Date(profile.currentPeriodEnd);
      profile.invoices = profile.invoices.map((invoice) => ({
        ...invoice,
        created: new Date(invoice.created),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
      }));
      return profile;
    } catch (err) {
      console.warn('Billing profile repository load failed', err);
      return null;
    }
  },

  async save(userId: string, profile: BillingProfile): Promise<void> {
    try {
      const row: BillingProfileRow = {
        user_id: userId,
        profile,
      };
      const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'user_id' });
      if (error) {
        console.warn('Billing profile repository save failed', error);
      }
    } catch (err) {
      console.warn('Billing profile repository save error', err);
    }
  },
};

const cloneProfile = (profile: BillingProfile): BillingProfile => ({
  ...profile,
  paymentMethods: profile.paymentMethods.map((method) => ({ ...method })),
  invoices: profile.invoices.map((invoice) => ({ ...invoice })),
});

export const billingProfileStore = {
  async getProfile(userId: string): Promise<BillingProfile> {
    if (profiles.has(userId)) {
      return cloneProfile(profiles.get(userId)!);
    }

    const persisted = await repository.load(userId);
    if (persisted) {
      profiles.set(userId, persisted);
      return cloneProfile(persisted);
    }

    const seeded = createSeedProfile(userId);
    profiles.set(userId, seeded);
    await repository.save(userId, seeded);
    return cloneProfile(seeded);
  },

  async updatePlan(userId: string, planId: string): Promise<BillingProfile> {
    const profile = await this.getProfile(userId);
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) ?? SUBSCRIPTION_PLANS[0];
    profile.currentPlanId = plan.id;
    profile.status = 'active';
    profile.cancelAtPeriodEnd = false;
    profile.currentPeriodStart = new Date();
    profile.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    profile.invoices.unshift({
      id: `inv_${Date.now()}`,
      amount: plan.price,
      status: 'paid',
      created: new Date(),
      pdfUrl: '#',
    });
    profiles.set(userId, profile);
    await repository.save(userId, profile);
    return cloneProfile(profile);
  },

  async cancelSubscription(userId: string): Promise<BillingProfile> {
    const profile = await this.getProfile(userId);
    profile.cancelAtPeriodEnd = true;
    profiles.set(userId, profile);
    await repository.save(userId, profile);
    return cloneProfile(profile);
  },
};

