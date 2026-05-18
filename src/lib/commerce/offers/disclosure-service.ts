/**
 * Disclosure Service
 *
 * Manages compliance disclosures for financial products and affiliate relationships.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Disclosure, DisclosureType, OfferCategory } from "./types";

// =============================================================================
// Configuration
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Lazily constructed so `next build` page-data-collection (no runtime env)
// does not abort on createClient's "supabaseUrl is required".
let _supabase: SupabaseClient | null = null;
const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop, recv) {
    if (!_supabase) _supabase = createClient(supabaseUrl, supabaseServiceKey);
    const v = Reflect.get(_supabase, prop, recv);
    return typeof v === "function" ? v.bind(_supabase) : v;
  },
});

// =============================================================================
// Default Disclosures
// =============================================================================

const DEFAULT_DISCLOSURES: Record<
  DisclosureType,
  { title: string; shortText: string; fullText: string }
> = {
  advertiser_disclosure: {
    title: "Advertiser Disclosure",
    shortText: "We may receive compensation from partners.",
    fullText: `Advertiser Disclosure: Fynvita may receive compensation from partners when you click on links or apply for products featured on our site. This compensation may impact how and where products appear on our site, including the order in which they appear. However, this does not influence our editorial opinions and recommendations. We always strive to provide you with accurate, unbiased information to help you make informed financial decisions.`,
  },
  affiliate_disclosure: {
    title: "Affiliate Disclosure",
    shortText: "We earn commissions from partner links.",
    fullText: `Affiliate Disclosure: Some of the links on this page are affiliate links, which means we may receive a commission if you click through and make a purchase or apply for a product. This comes at no additional cost to you. We only recommend products and services that we believe will add value to our users.`,
  },
  rate_disclosure: {
    title: "Rate Disclosure",
    shortText: "Rates and terms may vary.",
    fullText: `Rate Disclosure: Interest rates, APRs, and other terms displayed are for informational purposes only and may vary based on your creditworthiness, location, and other factors. Actual rates, terms, and conditions are determined by the financial institution upon application. Please review all terms carefully before applying.`,
  },
  terms_conditions: {
    title: "Terms & Conditions",
    shortText: "Terms and conditions apply.",
    fullText: `Terms & Conditions: By using the offers and services featured on Fynvita, you agree to the terms and conditions set forth by the respective financial institutions. Fynvita is not a lender, bank, or credit card issuer. We do not make credit decisions or process applications.`,
  },
  privacy_policy: {
    title: "Privacy Notice",
    shortText: "Your information is protected.",
    fullText: `Privacy Notice: When you click on affiliate links and submit applications, your personal information may be shared with our partners to process your application. Please review each partner's privacy policy for information on how they collect, use, and protect your data.`,
  },
  fcra_disclosure: {
    title: "FCRA Disclosure",
    shortText: "Your rights under the Fair Credit Reporting Act.",
    fullText: `Fair Credit Reporting Act Disclosure: Under the Fair Credit Reporting Act (FCRA), you have the right to dispute inaccurate information on your credit report. You may obtain a free copy of your credit report from each of the three major credit bureaus once every 12 months at AnnualCreditReport.com. If you believe information on your report is inaccurate, you have the right to dispute it directly with the credit bureau.`,
  },
  ecoa_disclosure: {
    title: "ECOA Notice",
    shortText: "Equal credit opportunity for all.",
    fullText: `Equal Credit Opportunity Act Notice: Federal law prohibits creditors from discriminating against credit applicants on the basis of race, color, religion, national origin, sex, marital status, age, because all or part of the applicant's income derives from any public assistance program, or because the applicant has in good faith exercised any right under the Consumer Credit Protection Act.`,
  },
  tila_disclosure: {
    title: "TILA Disclosure",
    shortText: "Truth in Lending information.",
    fullText: `Truth in Lending Disclosure: Under the Truth in Lending Act (TILA), creditors must disclose key loan terms and costs before you enter into a credit agreement. This includes the Annual Percentage Rate (APR), the amount financed, the total of payments, and the payment schedule. Review these disclosures carefully before accepting any credit offer.`,
  },
};

// =============================================================================
// Disclosure Service
// =============================================================================

class DisclosureService {
  // ===========================================================================
  // Disclosure CRUD
  // ===========================================================================

  /**
   * Create a new disclosure
   */
  async createDisclosure(input: {
    type: DisclosureType;
    title: string;
    shortText: string;
    fullText: string;
    version?: string;
    regions?: string[];
    categories?: OfferCategory[];
    partnerId?: string;
  }): Promise<Disclosure> {
    const now = new Date();

    const disclosureData = {
      type: input.type,
      title: input.title,
      short_text: input.shortText,
      full_text: input.fullText,
      version: input.version || "1.0",
      effective_date: now.toISOString(),
      is_active: true,
      regions: input.regions || ["US"],
      categories: input.categories,
      partner_id: input.partnerId,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { data, error } = await supabase
      .from("disclosures")
      .insert(disclosureData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create disclosure: ${error.message}`);
    }

    return this.mapDisclosure(data);
  }

  /**
   * Update a disclosure
   */
  async updateDisclosure(
    id: string,
    input: {
      title?: string;
      shortText?: string;
      fullText?: string;
      version?: string;
      isActive?: boolean;
      regions?: string[];
      categories?: OfferCategory[];
    },
  ): Promise<Disclosure> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.shortText !== undefined) updateData.short_text = input.shortText;
    if (input.fullText !== undefined) updateData.full_text = input.fullText;
    if (input.version !== undefined) updateData.version = input.version;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;
    if (input.regions !== undefined) updateData.regions = input.regions;
    if (input.categories !== undefined)
      updateData.categories = input.categories;

    const { data, error } = await supabase
      .from("disclosures")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update disclosure: ${error.message}`);
    }

    return this.mapDisclosure(data);
  }

  /**
   * Get disclosure by ID
   */
  async getDisclosure(id: string): Promise<Disclosure | null> {
    const { data, error } = await supabase
      .from("disclosures")
      .select()
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to get disclosure: ${error.message}`);
    }

    return this.mapDisclosure(data);
  }

  /**
   * Get active disclosure by type
   */
  async getDisclosureByType(
    type: DisclosureType,
    region?: string,
  ): Promise<Disclosure | null> {
    let query = supabase
      .from("disclosures")
      .select()
      .eq("type", type)
      .eq("is_active", true)
      .order("effective_date", { ascending: false })
      .limit(1);

    if (region) {
      query = query.contains("regions", [region]);
    }

    const { data, error } = await query.single();

    if (error) {
      // Return default disclosure if not found
      if (error.code === "PGRST116") {
        const defaultDisclosure = DEFAULT_DISCLOSURES[type];
        if (defaultDisclosure) {
          return {
            id: `default_${type}`,
            type,
            title: defaultDisclosure.title,
            shortText: defaultDisclosure.shortText,
            fullText: defaultDisclosure.fullText,
            version: "1.0",
            effectiveDate: new Date(),
            isActive: true,
            regions: ["US"],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        return null;
      }
      throw new Error(`Failed to get disclosure: ${error.message}`);
    }

    return this.mapDisclosure(data);
  }

  /**
   * List all disclosures
   */
  async listDisclosures(filters?: {
    type?: DisclosureType;
    isActive?: boolean;
    region?: string;
    category?: OfferCategory;
    partnerId?: string;
  }): Promise<Disclosure[]> {
    let query = supabase.from("disclosures").select();

    if (filters?.type) {
      query = query.eq("type", filters.type);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }
    if (filters?.region) {
      query = query.contains("regions", [filters.region]);
    }
    if (filters?.category) {
      query = query.contains("categories", [filters.category]);
    }
    if (filters?.partnerId) {
      query = query.eq("partner_id", filters.partnerId);
    }

    const { data, error } = await query.order("effective_date", {
      ascending: false,
    });

    if (error) {
      throw new Error(`Failed to list disclosures: ${error.message}`);
    }

    return (data || []).map(this.mapDisclosure);
  }

  // ===========================================================================
  // Required Disclosures
  // ===========================================================================

  /**
   * Get all required disclosures for a page/context
   */
  async getRequiredDisclosures(context: {
    page: string;
    category?: OfferCategory;
    hasAffiliate?: boolean;
    region?: string;
  }): Promise<Disclosure[]> {
    const disclosures: Disclosure[] = [];
    const region = context.region || "US";

    // Always include advertiser disclosure on pages with offers
    if (
      context.page.includes("offer") ||
      context.page.includes("compare") ||
      context.page.includes("recommendation")
    ) {
      const advertiserDisclosure = await this.getDisclosureByType(
        "advertiser_disclosure",
        region,
      );
      if (advertiserDisclosure) disclosures.push(advertiserDisclosure);
    }

    // Include affiliate disclosure if affiliate links present
    if (context.hasAffiliate) {
      const affiliateDisclosure = await this.getDisclosureByType(
        "affiliate_disclosure",
        region,
      );
      if (affiliateDisclosure) disclosures.push(affiliateDisclosure);
    }

    // Include rate disclosure for loan/credit products
    if (
      context.category &&
      [
        "credit_card",
        "personal_loan",
        "mortgage",
        "auto_loan",
        "student_loan",
      ].includes(context.category)
    ) {
      const rateDisclosure = await this.getDisclosureByType(
        "rate_disclosure",
        region,
      );
      if (rateDisclosure) disclosures.push(rateDisclosure);
    }

    // Include FCRA disclosure for credit-related pages
    if (
      context.page.includes("credit") ||
      context.page.includes("score") ||
      context.page.includes("dispute")
    ) {
      const fcraDisclosure = await this.getDisclosureByType(
        "fcra_disclosure",
        region,
      );
      if (fcraDisclosure) disclosures.push(fcraDisclosure);
    }

    return disclosures;
  }

  /**
   * Generate disclosure banner content (structured data for frontend rendering)
   * Frontend components are responsible for rendering this data safely
   */
  generateDisclosureBannerContent(disclosures: Disclosure[]): {
    hasDisclosures: boolean;
    shortText: string;
    disclosures: Array<{
      id: string;
      type: DisclosureType;
      title: string;
      shortText: string;
      fullText: string;
    }>;
  } {
    if (disclosures.length === 0) {
      return {
        hasDisclosures: false,
        shortText: "",
        disclosures: [],
      };
    }

    return {
      hasDisclosures: true,
      shortText: disclosures.map((d) => d.shortText).join(" "),
      disclosures: disclosures.map((d) => ({
        id: d.id,
        type: d.type,
        title: d.title,
        shortText: d.shortText,
        fullText: d.fullText,
      })),
    };
  }

  /**
   * @deprecated Use generateDisclosureBannerContent instead - returns structured data for safe frontend rendering
   */
  generateDisclosureBanner(disclosures: Disclosure[]): string {
    // DisclosureService warning: generateDisclosureBanner is deprecated. Use generateDisclosureBannerContent for structured data.
    const content = this.generateDisclosureBannerContent(disclosures);
    // Return empty string to prevent HTML injection - frontend should migrate to the new method
    return content.hasDisclosures
      ? "[Disclosure content available - use generateDisclosureBannerContent]"
      : "";
  }

  /**
   * Format disclosure for API response
   */
  formatDisclosureForApi(disclosure: Disclosure): {
    id: string;
    type: string;
    title: string;
    short: string;
    full: string;
  } {
    return {
      id: disclosure.id,
      type: disclosure.type,
      title: disclosure.title,
      short: disclosure.shortText,
      full: disclosure.fullText,
    };
  }

  // ===========================================================================
  // Offer-Disclosure Linking
  // ===========================================================================

  /**
   * Link disclosure to an offer
   */
  async linkDisclosureToOffer(
    offerId: string,
    disclosureId: string,
    options?: {
      mustDisplay?: boolean;
      displayLocation?: "top" | "bottom" | "inline" | "modal";
    },
  ): Promise<void> {
    const { error } = await supabase.from("offer_disclosures").insert({
      offer_id: offerId,
      disclosure_id: disclosureId,
      must_display: options?.mustDisplay ?? true,
      display_location: options?.displayLocation ?? "bottom",
    });

    if (error) {
      throw new Error(`Failed to link disclosure: ${error.message}`);
    }
  }

  /**
   * Unlink disclosure from an offer
   */
  async unlinkDisclosureFromOffer(
    offerId: string,
    disclosureId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("offer_disclosures")
      .delete()
      .eq("offer_id", offerId)
      .eq("disclosure_id", disclosureId);

    if (error) {
      throw new Error(`Failed to unlink disclosure: ${error.message}`);
    }
  }

  // ===========================================================================
  // Compliance Checking
  // ===========================================================================

  /**
   * Check if an offer has all required disclosures
   */
  async checkOfferCompliance(offerId: string): Promise<{
    compliant: boolean;
    missingDisclosures: DisclosureType[];
    warnings: string[];
  }> {
    const missingDisclosures: DisclosureType[] = [];
    const warnings: string[] = [];

    // Get offer details
    const { data: offer } = await supabase
      .from("offers")
      .select("category, sponsored_content")
      .eq("id", offerId)
      .single();

    if (!offer) {
      return {
        compliant: false,
        missingDisclosures: [],
        warnings: ["Offer not found"],
      };
    }

    // Get linked disclosures
    const { data: linkedDisclosures } = await supabase
      .from("offer_disclosures")
      .select("disclosures(type)")
      .eq("offer_id", offerId);

    const linkedTypes = new Set(
      (linkedDisclosures || []).map(
        (d: Record<string, unknown>) =>
          (d.disclosures as Record<string, unknown>)?.type,
      ),
    );

    // Check required disclosures
    const requiredTypes: DisclosureType[] = [
      "advertiser_disclosure",
      "rate_disclosure",
    ];

    if (offer.sponsored_content) {
      requiredTypes.push("affiliate_disclosure");
    }

    for (const type of requiredTypes) {
      if (!linkedTypes.has(type)) {
        missingDisclosures.push(type);
      }
    }

    // Additional category-specific checks
    if (["credit_card", "personal_loan", "mortgage"].includes(offer.category)) {
      if (!linkedTypes.has("tila_disclosure")) {
        warnings.push("Consider adding TILA disclosure for lending products");
      }
    }

    return {
      compliant: missingDisclosures.length === 0,
      missingDisclosures,
      warnings,
    };
  }

  /**
   * Get compliance report for all offers
   */
  async getComplianceReport(): Promise<
    Array<{
      offerId: string;
      offerName: string;
      compliant: boolean;
      missingDisclosures: DisclosureType[];
      warnings: string[];
    }>
  > {
    const { data: offers } = await supabase
      .from("offers")
      .select("id, name")
      .eq("status", "active");

    const report = [];

    for (const offer of offers || []) {
      const compliance = await this.checkOfferCompliance(offer.id);
      report.push({
        offerId: offer.id,
        offerName: offer.name,
        ...compliance,
      });
    }

    return report;
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Map database row to Disclosure type
   */
  private mapDisclosure(row: Record<string, unknown>): Disclosure {
    return {
      id: row.id as string,
      type: row.type as DisclosureType,
      title: row.title as string,
      shortText: row.short_text as string,
      fullText: row.full_text as string,
      version: row.version as string,
      effectiveDate: new Date(row.effective_date as string),
      isActive: row.is_active as boolean,
      regions: row.regions as string[],
      categories: row.categories as OfferCategory[] | undefined,
      partnerId: row.partner_id as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

// Export singleton
export const disclosureService = new DisclosureService();
export default disclosureService;
