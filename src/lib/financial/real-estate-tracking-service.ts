/**
 * Real Estate Tracking Service
 *
 * Comprehensive real estate portfolio tracking:
 * - Property management and valuation
 * - Mortgage tracking and amortization
 * - Rental income management
 * - ROI and equity calculations
 * - Market value estimates via Zillow/Redfin APIs
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type PropertyType =
  | "primary_residence"
  | "rental"
  | "vacation"
  | "investment"
  | "commercial"
  | "land"
  | "multi_family";

export type PropertyStatus = "owned" | "under_contract" | "sold" | "listed";
export type MortgageType = "fixed" | "arm" | "interest_only" | "balloon";

export interface Property {
  id: string;
  userId: string;
  name: string;
  type: PropertyType;
  status: PropertyStatus;

  // Address
  address: PropertyAddress;

  // Valuation
  purchasePrice: number;
  purchaseDate: Date;
  currentValue: number;
  lastValueUpdate: Date;
  valueSource: "manual" | "zillow" | "redfin" | "appraisal";

  // Property details
  details: PropertyDetails;

  // Mortgage
  mortgages: Mortgage[];

  // Rental (if applicable)
  rental?: RentalInfo;

  // Expenses
  annualTaxes: number;
  annualInsurance: number;
  annualHoa?: number;
  annualMaintenance?: number;

  // Metadata
  notes?: string;
  documents?: PropertyDocument[];
  imageUrls?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyAddress {
  street: string;
  unit?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface PropertyDetails {
  squareFeet?: number;
  lotSize?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  stories?: number;
  garage?: number;
  pool?: boolean;
  features?: string[];
}

export interface Mortgage {
  id: string;
  propertyId: string;
  lender: string;
  type: MortgageType;

  // Loan details
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  termMonths: number;
  startDate: Date;
  maturityDate: Date;

  // Payment
  monthlyPayment: number;
  escrowAmount?: number;
  pmiAmount?: number;

  // ARM details (if applicable)
  armDetails?: {
    initialFixedPeriod: number;
    adjustmentPeriod: number;
    rateCapPeriodic: number;
    rateCapLifetime: number;
    margin: number;
    index: string;
  };

  isActive: boolean;
}

export interface RentalInfo {
  isRented: boolean;
  monthlyRent: number;
  leaseStart?: Date;
  leaseEnd?: Date;
  tenantName?: string;
  securityDeposit?: number;
  vacancyRate?: number; // percentage
  managementFee?: number; // percentage or fixed
}

export interface PropertyDocument {
  id: string;
  name: string;
  type:
    | "deed"
    | "title"
    | "appraisal"
    | "insurance"
    | "tax"
    | "lease"
    | "other";
  url: string;
  uploadedAt: Date;
}

export interface PropertyValuation {
  date: Date;
  value: number;
  source: "manual" | "zillow" | "redfin" | "appraisal";
  notes?: string;
}

export interface PortfolioSummary {
  totalProperties: number;
  totalValue: number;
  totalEquity: number;
  totalDebt: number;
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  netMonthlyCashFlow: number;
  averageCapRate: number;
  totalAppreciation: number;
  appreciationPercent: number;
}

export interface PropertyAnalytics {
  propertyId: string;
  equity: number;
  equityPercent: number;
  ltv: number; // Loan to value
  monthlyExpenses: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  capRate: number;
  cashOnCashReturn: number;
  appreciation: number;
  appreciationPercent: number;
  totalReturn: number;
  amortizationSchedule: AmortizationEntry[];
}

export interface AmortizationEntry {
  month: number;
  date: Date;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class RealEstateTrackingService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // PROPERTY MANAGEMENT
  // ==========================================================================

  async addProperty(
    property: Omit<Property, "id" | "createdAt" | "updatedAt">,
  ): Promise<Property> {
    const now = new Date();
    const newProperty: Property = {
      ...property,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from("properties")
      .insert(this.propertyToDb(newProperty))
      .select()
      .single();

    if (error) throw error;
    return this.propertyFromDb(data);
  }

  async updateProperty(
    propertyId: string,
    updates: Partial<Property>,
  ): Promise<Property> {
    const { data, error } = await this.supabase
      .from("properties")
      .update({
        ...this.propertyToDb(updates),
        updated_at: new Date().toISOString(),
      })
      .eq("id", propertyId)
      .select()
      .single();

    if (error) throw error;
    return this.propertyFromDb(data);
  }

  async getProperty(propertyId: string): Promise<Property | null> {
    const { data } = await this.supabase
      .from("properties")
      .select("*")
      .eq("id", propertyId)
      .single();

    return data ? this.propertyFromDb(data) : null;
  }

  async getUserProperties(userId: string): Promise<Property[]> {
    const { data, error } = await this.supabase
      .from("properties")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "owned")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(this.propertyFromDb);
  }

  async deleteProperty(propertyId: string): Promise<void> {
    const { error } = await this.supabase
      .from("properties")
      .delete()
      .eq("id", propertyId);

    if (error) throw error;
  }

  // ==========================================================================
  // VALUATION
  // ==========================================================================

  async updateValuation(
    propertyId: string,
    value: number,
    source: PropertyValuation["source"],
  ): Promise<Property> {
    const now = new Date();

    // Store valuation history
    await this.supabase.from("property_valuations").insert({
      id: crypto.randomUUID(),
      property_id: propertyId,
      value,
      source,
      date: now.toISOString(),
    });

    // Update current value
    return this.updateProperty(propertyId, {
      currentValue: value,
      lastValueUpdate: now,
      valueSource: source,
    });
  }

  async getValuationHistory(propertyId: string): Promise<PropertyValuation[]> {
    const { data, error } = await this.supabase
      .from("property_valuations")
      .select("*")
      .eq("property_id", propertyId)
      .order("date", { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => ({
      date: new Date(row.date),
      value: row.value,
      source: row.source,
      notes: row.notes,
    }));
  }

  async estimateValue(
    address: PropertyAddress,
  ): Promise<{ estimate: number; range: { low: number; high: number } }> {
    // In production, this would call Zillow or Redfin API
    // For now, return mock estimate
    const baseEstimate = 350000;
    return {
      estimate: baseEstimate,
      range: {
        low: baseEstimate * 0.9,
        high: baseEstimate * 1.1,
      },
    };
  }

  // ==========================================================================
  // MORTGAGE MANAGEMENT
  // ==========================================================================

  async addMortgage(mortgage: Omit<Mortgage, "id">): Promise<Mortgage> {
    const newMortgage = {
      ...mortgage,
      id: crypto.randomUUID(),
    };

    const { data, error } = await this.supabase
      .from("mortgages")
      .insert(this.mortgageToDb(newMortgage))
      .select()
      .single();

    if (error) throw error;
    return this.mortgageFromDb(data);
  }

  async updateMortgageBalance(
    mortgageId: string,
    newBalance: number,
  ): Promise<void> {
    await this.supabase
      .from("mortgages")
      .update({ current_balance: newBalance })
      .eq("id", mortgageId);
  }

  async getPropertyMortgages(propertyId: string): Promise<Mortgage[]> {
    const { data, error } = await this.supabase
      .from("mortgages")
      .select("*")
      .eq("property_id", propertyId)
      .eq("is_active", true);

    if (error) throw error;
    return (data || []).map(this.mortgageFromDb);
  }

  generateAmortizationSchedule(mortgage: Mortgage): AmortizationEntry[] {
    const schedule: AmortizationEntry[] = [];
    const monthlyRate = mortgage.interestRate / 100 / 12;
    let balance = mortgage.originalAmount;
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;

    const startDate = new Date(mortgage.startDate);

    for (let month = 1; month <= mortgage.termMonths; month++) {
      const interest = balance * monthlyRate;
      const principal = mortgage.monthlyPayment - interest;
      balance -= principal;

      cumulativeInterest += interest;
      cumulativePrincipal += principal;

      const paymentDate = new Date(startDate);
      paymentDate.setMonth(paymentDate.getMonth() + month);

      schedule.push({
        month,
        date: paymentDate,
        payment: mortgage.monthlyPayment,
        principal,
        interest,
        balance: Math.max(0, balance),
        cumulativeInterest,
        cumulativePrincipal,
      });
    }

    return schedule;
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  async getPropertyAnalytics(propertyId: string): Promise<PropertyAnalytics> {
    const property = await this.getProperty(propertyId);
    if (!property) throw new Error("Property not found");

    const mortgages = await this.getPropertyMortgages(propertyId);
    const totalDebt = mortgages.reduce((sum, m) => sum + m.currentBalance, 0);
    const equity = property.currentValue - totalDebt;
    const equityPercent = (equity / property.currentValue) * 100;
    const ltv = (totalDebt / property.currentValue) * 100;

    // Monthly calculations
    const monthlyMortgagePayment = mortgages.reduce(
      (sum, m) => sum + m.monthlyPayment,
      0,
    );
    const monthlyExpenses =
      monthlyMortgagePayment +
      property.annualTaxes / 12 +
      property.annualInsurance / 12 +
      (property.annualHoa || 0) / 12 +
      (property.annualMaintenance || 0) / 12;

    const monthlyIncome = property.rental?.monthlyRent || 0;
    const monthlyCashFlow = monthlyIncome - monthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;

    // ROI calculations
    const annualNOI =
      monthlyIncome * 12 -
      (property.annualTaxes +
        property.annualInsurance +
        (property.annualHoa || 0) +
        (property.annualMaintenance || 0));
    const capRate =
      property.currentValue > 0 ? (annualNOI / property.currentValue) * 100 : 0;

    const initialInvestment = property.purchasePrice * 0.2; // Assume 20% down
    const cashOnCashReturn =
      initialInvestment > 0 ? (annualCashFlow / initialInvestment) * 100 : 0;

    // Appreciation
    const appreciation = property.currentValue - property.purchasePrice;
    const appreciationPercent = (appreciation / property.purchasePrice) * 100;

    // Total return = appreciation + cumulative cash flow (simplified)
    const holdingPeriodMonths = Math.floor(
      (Date.now() - property.purchaseDate.getTime()) /
        (30 * 24 * 60 * 60 * 1000),
    );
    const totalCashFlow = monthlyCashFlow * holdingPeriodMonths;
    const totalReturn = appreciation + totalCashFlow;

    // Generate amortization for primary mortgage
    const amortizationSchedule =
      mortgages.length > 0
        ? this.generateAmortizationSchedule(mortgages[0])
        : [];

    return {
      propertyId,
      equity,
      equityPercent,
      ltv,
      monthlyExpenses,
      monthlyCashFlow,
      annualCashFlow,
      capRate,
      cashOnCashReturn,
      appreciation,
      appreciationPercent,
      totalReturn,
      amortizationSchedule,
    };
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const properties = await this.getUserProperties(userId);

    let totalValue = 0;
    let totalDebt = 0;
    let totalMonthlyIncome = 0;
    let totalMonthlyExpenses = 0;
    let totalPurchasePrice = 0;
    let totalCapRateSum = 0;

    for (const property of properties) {
      totalValue += property.currentValue;
      totalPurchasePrice += property.purchasePrice;

      const mortgages = await this.getPropertyMortgages(property.id);
      const propertyDebt = mortgages.reduce(
        (sum, m) => sum + m.currentBalance,
        0,
      );
      totalDebt += propertyDebt;

      const mortgagePayment = mortgages.reduce(
        (sum, m) => sum + m.monthlyPayment,
        0,
      );
      const monthlyExpenses =
        mortgagePayment +
        property.annualTaxes / 12 +
        property.annualInsurance / 12 +
        (property.annualHoa || 0) / 12 +
        (property.annualMaintenance || 0) / 12;
      totalMonthlyExpenses += monthlyExpenses;

      if (property.rental?.monthlyRent) {
        totalMonthlyIncome += property.rental.monthlyRent;

        const annualNOI =
          property.rental.monthlyRent * 12 -
          (property.annualTaxes +
            property.annualInsurance +
            (property.annualHoa || 0));
        totalCapRateSum += (annualNOI / property.currentValue) * 100;
      }
    }

    const totalEquity = totalValue - totalDebt;
    const totalAppreciation = totalValue - totalPurchasePrice;

    return {
      totalProperties: properties.length,
      totalValue,
      totalEquity,
      totalDebt,
      totalMonthlyIncome,
      totalMonthlyExpenses,
      netMonthlyCashFlow: totalMonthlyIncome - totalMonthlyExpenses,
      averageCapRate:
        properties.length > 0 ? totalCapRateSum / properties.length : 0,
      totalAppreciation,
      appreciationPercent:
        totalPurchasePrice > 0
          ? (totalAppreciation / totalPurchasePrice) * 100
          : 0,
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private propertyToDb(property: Partial<Property>): Record<string, unknown> {
    return {
      id: property.id,
      user_id: property.userId,
      name: property.name,
      type: property.type,
      status: property.status,
      address: property.address,
      purchase_price: property.purchasePrice,
      purchase_date: property.purchaseDate?.toISOString(),
      current_value: property.currentValue,
      last_value_update: property.lastValueUpdate?.toISOString(),
      value_source: property.valueSource,
      details: property.details,
      rental: property.rental,
      annual_taxes: property.annualTaxes,
      annual_insurance: property.annualInsurance,
      annual_hoa: property.annualHoa,
      annual_maintenance: property.annualMaintenance,
      notes: property.notes,
      documents: property.documents,
      image_urls: property.imageUrls,
      created_at: property.createdAt?.toISOString(),
      updated_at: property.updatedAt?.toISOString(),
    };
  }

  private propertyFromDb(data: Record<string, unknown>): Property {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      type: data.type as PropertyType,
      status: data.status as PropertyStatus,
      address: data.address as PropertyAddress,
      purchasePrice: data.purchase_price as number,
      purchaseDate: new Date(data.purchase_date as string),
      currentValue: data.current_value as number,
      lastValueUpdate: new Date(data.last_value_update as string),
      valueSource: data.value_source as Property["valueSource"],
      details: data.details as PropertyDetails,
      mortgages: [],
      rental: data.rental as RentalInfo | undefined,
      annualTaxes: data.annual_taxes as number,
      annualInsurance: data.annual_insurance as number,
      annualHoa: data.annual_hoa as number | undefined,
      annualMaintenance: data.annual_maintenance as number | undefined,
      notes: data.notes as string | undefined,
      documents: data.documents as PropertyDocument[] | undefined,
      imageUrls: data.image_urls as string[] | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private mortgageToDb(mortgage: Mortgage): Record<string, unknown> {
    return {
      id: mortgage.id,
      property_id: mortgage.propertyId,
      lender: mortgage.lender,
      type: mortgage.type,
      original_amount: mortgage.originalAmount,
      current_balance: mortgage.currentBalance,
      interest_rate: mortgage.interestRate,
      term_months: mortgage.termMonths,
      start_date: mortgage.startDate.toISOString(),
      maturity_date: mortgage.maturityDate.toISOString(),
      monthly_payment: mortgage.monthlyPayment,
      escrow_amount: mortgage.escrowAmount,
      pmi_amount: mortgage.pmiAmount,
      arm_details: mortgage.armDetails,
      is_active: mortgage.isActive,
    };
  }

  private mortgageFromDb(data: Record<string, unknown>): Mortgage {
    return {
      id: data.id as string,
      propertyId: data.property_id as string,
      lender: data.lender as string,
      type: data.type as MortgageType,
      originalAmount: data.original_amount as number,
      currentBalance: data.current_balance as number,
      interestRate: data.interest_rate as number,
      termMonths: data.term_months as number,
      startDate: new Date(data.start_date as string),
      maturityDate: new Date(data.maturity_date as string),
      monthlyPayment: data.monthly_payment as number,
      escrowAmount: data.escrow_amount as number | undefined,
      pmiAmount: data.pmi_amount as number | undefined,
      armDetails: data.arm_details as Mortgage["armDetails"],
      isActive: data.is_active as boolean,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let realEstateServiceInstance: RealEstateTrackingService | null = null;

export function getRealEstateTrackingService(): RealEstateTrackingService {
  if (!realEstateServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    realEstateServiceInstance = new RealEstateTrackingService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return realEstateServiceInstance;
}
