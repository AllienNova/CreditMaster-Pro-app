/**
 * Expert Financial Sessions Service
 *
 * Marketplace for certified financial professionals to offer sessions:
 * - CFP, CFA, CPA verification and profiles
 * - Session booking and scheduling
 * - Video session integration
 * - Reviews and ratings
 * - Compliance disclaimers
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
export type ExpertStatus = 'pending' | 'verified' | 'suspended' | 'rejected';
export type SessionType =
  | 'one_on_one'
  | 'group_webinar'
  | 'qa_session'
  | 'review';
export type SessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';
export type Certification =
  | 'CFP'
  | 'CFA'
  | 'CPA'
  | 'ChFC'
  | 'CLU'
  | 'AFC'
  | 'FFC'
  | 'other';

export interface Expert {
  id: string;
  userId: string;

  // Profile
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio: string;
  headline: string;

  // Credentials
  certifications: ExpertCertification[];
  yearsExperience: number;
  licenseNumber?: string;
  firmName?: string;

  // Specialties
  specialties: Specialty[];

  // Availability
  timezone: string;
  availableSlots: AvailabilitySlot[];

  // Pricing
  hourlyRate: number;
  currency: string;
  offersFreeConsult: boolean;
  freeConsultMinutes: number;

  // Stats
  totalSessions: number;
  averageRating: number;
  reviewCount: number;
  responseRate: number;

  // Status
  status: ExpertStatus;
  verifiedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface ExpertCertification {
  type: Certification;
  name: string;
  issuingBody: string;
  licenseNumber?: string;
  issueDate: Date;
  expirationDate?: Date;
  isVerified: boolean;
  verificationDocUrl?: string;
}

export interface Specialty {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface AvailabilitySlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string;
  isRecurring: boolean;
}

export interface Session {
  id: string;
  expertId: string;
  expertName: string;
  clientId: string;
  clientName: string;

  // Session details
  type: SessionType;
  title: string;
  description?: string;

  // Scheduling
  scheduledAt: Date;
  durationMinutes: number;
  timezone: string;

  // Meeting
  meetingUrl?: string;
  meetingProvider?: 'zoom' | 'google_meet' | 'teams' | 'custom';

  // Pricing
  price: number;
  currency: string;
  isPaid: boolean;

  // Status
  status: SessionStatus;

  // Notes
  expertNotes?: string;
  clientNotes?: string;
  followUpActions?: string[];

  // Review
  hasReview: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface SessionReview {
  id: string;
  sessionId: string;
  expertId: string;
  clientId: string;

  rating: number; // 1-5
  title?: string;
  content: string;

  // Specific ratings
  knowledgeRating?: number;
  communicationRating?: number;
  helpfulnessRating?: number;

  isPublic: boolean;
  expertResponse?: string;

  createdAt: Date;
}

export interface ExpertApplication {
  id: string;
  userId: string;
  email: string;

  // Personal info
  firstName: string;
  lastName: string;
  phone: string;

  // Professional info
  certifications: ExpertCertification[];
  yearsExperience: number;
  firmName?: string;
  bio: string;

  // Documents
  resumeUrl?: string;
  certificationDocsUrls: string[];

  // Status
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;

  createdAt: Date;
}

// Specialty categories
export const SPECIALTIES: Specialty[] = [
  { id: 'retirement', name: 'Retirement Planning', category: 'Planning' },
  { id: 'investment', name: 'Investment Strategy', category: 'Investing' },
  { id: 'tax', name: 'Tax Optimization', category: 'Tax' },
  { id: 'estate', name: 'Estate Planning', category: 'Planning' },
  { id: 'debt', name: 'Debt Management', category: 'Debt' },
  { id: 'budgeting', name: 'Budgeting & Cash Flow', category: 'Budgeting' },
  { id: 'credit', name: 'Credit Building', category: 'Credit' },
  { id: 'insurance', name: 'Insurance Planning', category: 'Insurance' },
  { id: 'college', name: 'College Savings', category: 'Education' },
  { id: 'business', name: 'Small Business Finance', category: 'Business' },
  {
    id: 'divorce',
    name: 'Divorce Financial Planning',
    category: 'Life Events',
  },
  { id: 'inheritance', name: 'Inheritance Planning', category: 'Life Events' },
];

export const CERTIFICATIONS_INFO: Record<
  Certification,
  { name: string; body: string; description: string }
> = {
  CFP: {
    name: 'Certified Financial Planner',
    body: 'CFP Board',
    description: 'Comprehensive financial planning',
  },
  CFA: {
    name: 'Chartered Financial Analyst',
    body: 'CFA Institute',
    description: 'Investment analysis and portfolio management',
  },
  CPA: {
    name: 'Certified Public Accountant',
    body: 'State Board',
    description: 'Accounting and tax expertise',
  },
  ChFC: {
    name: 'Chartered Financial Consultant',
    body: 'American College',
    description: 'Advanced financial planning',
  },
  CLU: {
    name: 'Chartered Life Underwriter',
    body: 'American College',
    description: 'Life insurance planning',
  },
  AFC: {
    name: 'Accredited Financial Counselor',
    body: 'AFCPE',
    description: 'Personal financial counseling',
  },
  FFC: {
    name: 'Fee-only Financial Consultant',
    body: 'NAPFA',
    description: 'Fee-only advisory',
  },
  other: {
    name: 'Other Certification',
    body: 'Various',
    description: 'Other financial credentials',
  },
};

export class ExpertSessionsService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Expert Applications
  async submitApplication(
    app: Omit<ExpertApplication, 'id' | 'status' | 'createdAt'>
  ): Promise<ExpertApplication> {
    const newApp = {
      id: crypto.randomUUID(),
      ...app,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    const { data, error } = await this.supabase
      .from('expert_applications')
      .insert(this.appToDb(newApp))
      .select()
      .single();
    if (error) throw error;
    return this.appFromDb(data);
  }

  async getApplication(appId: string): Promise<ExpertApplication | null> {
    const { data } = await this.supabase
      .from('expert_applications')
      .select('*')
      .eq('id', appId)
      .single();
    return data ? this.appFromDb(data) : null;
  }

  async approveApplication(appId: string, reviewerId: string): Promise<Expert> {
    const app = await this.getApplication(appId);
    if (!app) throw new Error('Application not found');

    await this.supabase
      .from('expert_applications')
      .update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', appId);

    // Create expert profile
    return this.createExpert(app);
  }

  private async createExpert(app: ExpertApplication): Promise<Expert> {
    const expert: Omit<Expert, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: app.userId,
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email,
      phone: app.phone,
      bio: app.bio,
      headline: `${app.certifications[0]?.type || 'Financial'} Professional`,
      certifications: app.certifications,
      yearsExperience: app.yearsExperience,
      firmName: app.firmName,
      specialties: [],
      timezone: 'America/New_York',
      availableSlots: [],
      hourlyRate: 150,
      currency: 'USD',
      offersFreeConsult: true,
      freeConsultMinutes: 15,
      totalSessions: 0,
      averageRating: 0,
      reviewCount: 0,
      responseRate: 100,
      status: 'verified',
      verifiedAt: new Date(),
    };

    const { data, error } = await this.supabase
      .from('experts')
      .insert(this.expertToDb(expert))
      .select()
      .single();
    if (error) throw error;
    return this.expertFromDb(data);
  }

  // Expert Profiles
  async getExpert(expertId: string): Promise<Expert | null> {
    const { data } = await this.supabase
      .from('experts')
      .select('*')
      .eq('id', expertId)
      .single();
    return data ? this.expertFromDb(data) : null;
  }

  async getExperts(filters?: {
    specialties?: string[];
    minRating?: number;
    maxRate?: number;
  }): Promise<Expert[]> {
    let query = this.supabase
      .from('experts')
      .select('*')
      .eq('status', 'verified');
    if (filters?.minRating)
      query = query.gte('average_rating', filters.minRating);
    if (filters?.maxRate) query = query.lte('hourly_rate', filters.maxRate);

    const { data, error } = await query.order('average_rating', {
      ascending: false,
    });
    if (error) throw error;
    return (data || []).map(this.expertFromDb);
  }

  async updateExpertProfile(
    expertId: string,
    updates: Partial<Expert>
  ): Promise<Expert> {
    const { data, error } = await this.supabase
      .from('experts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', expertId)
      .select()
      .single();
    if (error) throw error;
    return this.expertFromDb(data);
  }

  async setAvailability(
    expertId: string,
    slots: AvailabilitySlot[]
  ): Promise<void> {
    await this.supabase
      .from('experts')
      .update({ available_slots: slots })
      .eq('id', expertId);
  }

  // Sessions
  async bookSession(
    session: Omit<
      Session,
      'id' | 'status' | 'hasReview' | 'createdAt' | 'updatedAt'
    >
  ): Promise<Session> {
    const newSession = {
      id: crypto.randomUUID(),
      ...session,
      status: 'scheduled',
      has_review: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.supabase
      .from('expert_sessions')
      .insert(this.sessionToDb(newSession))
      .select()
      .single();
    if (error) throw error;
    return this.sessionFromDb(data);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const { data } = await this.supabase
      .from('expert_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    return data ? this.sessionFromDb(data) : null;
  }

  async getExpertSessions(
    expertId: string,
    status?: SessionStatus
  ): Promise<Session[]> {
    let query = this.supabase
      .from('expert_sessions')
      .select('*')
      .eq('expert_id', expertId);
    if (status) query = query.eq('status', status);
    const { data } = await query.order('scheduled_at', { ascending: true });
    return (data || []).map(this.sessionFromDb);
  }

  async getClientSessions(clientId: string): Promise<Session[]> {
    const { data } = await this.supabase
      .from('expert_sessions')
      .select('*')
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: false });
    return (data || []).map(this.sessionFromDb);
  }

  async updateSessionStatus(
    sessionId: string,
    status: SessionStatus
  ): Promise<void> {
    await this.supabase
      .from('expert_sessions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  async completeSession(
    sessionId: string,
    expertNotes?: string,
    followUpActions?: string[]
  ): Promise<void> {
    await this.supabase
      .from('expert_sessions')
      .update({
        status: 'completed',
        expert_notes: expertNotes,
        follow_up_actions: followUpActions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // Increment expert session count
    const session = await this.getSession(sessionId);
    if (session) {
      const expert = await this.getExpert(session.expertId);
      if (expert) {
        await this.supabase
          .from('experts')
          .update({ total_sessions: expert.totalSessions + 1 })
          .eq('id', expert.id);
      }
    }
  }

  // Reviews
  async submitReview(
    review: Omit<SessionReview, 'id' | 'createdAt'>
  ): Promise<SessionReview> {
    const newReview = {
      id: crypto.randomUUID(),
      ...review,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await this.supabase
      .from('expert_reviews')
      .insert(this.reviewToDb(newReview))
      .select()
      .single();
    if (error) throw error;

    // Update session
    await this.supabase
      .from('expert_sessions')
      .update({ has_review: true })
      .eq('id', review.sessionId);

    // Update expert average rating
    await this.updateExpertRating(review.expertId);

    return this.reviewFromDb(data);
  }

  async getExpertReviews(expertId: string): Promise<SessionReview[]> {
    const { data } = await this.supabase
      .from('expert_reviews')
      .select('*')
      .eq('expert_id', expertId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    return (data || []).map(this.reviewFromDb);
  }

  private async updateExpertRating(expertId: string): Promise<void> {
    const reviews = await this.getExpertReviews(expertId);
    if (reviews.length === 0) return;

    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await this.supabase
      .from('experts')
      .update({ average_rating: avgRating, review_count: reviews.length })
      .eq('id', expertId);
  }

  // Helpers
  getSpecialties() {
    return SPECIALTIES;
  }
  getCertificationsInfo() {
    return CERTIFICATIONS_INFO;
  }

  private appToDb(a: Record<string, unknown>): Record<string, unknown> {
    return {
      id: a.id,
      user_id: a.userId,
      email: a.email,
      first_name: a.firstName,
      last_name: a.lastName,
      phone: a.phone,
      certifications: a.certifications,
      years_experience: a.yearsExperience,
      firm_name: a.firmName,
      bio: a.bio,
      resume_url: a.resumeUrl,
      certification_docs_urls: a.certificationDocsUrls,
      status: a.status,
      created_at: a.created_at,
    };
  }

  private appFromDb(d: Record<string, unknown>): ExpertApplication {
    return {
      id: d.id as string,
      userId: d.user_id as string,
      email: d.email as string,
      firstName: d.first_name as string,
      lastName: d.last_name as string,
      phone: d.phone as string,
      certifications: d.certifications as ExpertCertification[],
      yearsExperience: d.years_experience as number,
      firmName: d.firm_name as string,
      bio: d.bio as string,
      resumeUrl: d.resume_url as string,
      certificationDocsUrls: d.certification_docs_urls as string[],
      status: d.status as ExpertApplication['status'],
      reviewNotes: d.review_notes as string,
      reviewedBy: d.reviewed_by as string,
      reviewedAt: d.reviewed_at ? new Date(d.reviewed_at as string) : undefined,
      createdAt: new Date(d.created_at as string),
    };
  }

  private expertToDb(
    e: Omit<Expert, 'id' | 'createdAt' | 'updatedAt'>
  ): Record<string, unknown> {
    return {
      id: crypto.randomUUID(),
      user_id: e.userId,
      first_name: e.firstName,
      last_name: e.lastName,
      email: e.email,
      phone: e.phone,
      avatar_url: e.avatarUrl,
      bio: e.bio,
      headline: e.headline,
      certifications: e.certifications,
      years_experience: e.yearsExperience,
      firm_name: e.firmName,
      specialties: e.specialties,
      timezone: e.timezone,
      available_slots: e.availableSlots,
      hourly_rate: e.hourlyRate,
      currency: e.currency,
      offers_free_consult: e.offersFreeConsult,
      free_consult_minutes: e.freeConsultMinutes,
      total_sessions: e.totalSessions,
      average_rating: e.averageRating,
      review_count: e.reviewCount,
      response_rate: e.responseRate,
      status: e.status,
      verified_at: e.verifiedAt?.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  private expertFromDb(d: Record<string, unknown>): Expert {
    return {
      id: d.id as string,
      userId: d.user_id as string,
      firstName: d.first_name as string,
      lastName: d.last_name as string,
      email: d.email as string,
      phone: d.phone as string,
      avatarUrl: d.avatar_url as string,
      bio: d.bio as string,
      headline: d.headline as string,
      certifications: d.certifications as ExpertCertification[],
      yearsExperience: d.years_experience as number,
      licenseNumber: d.license_number as string,
      firmName: d.firm_name as string,
      specialties: d.specialties as Specialty[],
      timezone: d.timezone as string,
      availableSlots: d.available_slots as AvailabilitySlot[],
      hourlyRate: d.hourly_rate as number,
      currency: d.currency as string,
      offersFreeConsult: d.offers_free_consult as boolean,
      freeConsultMinutes: d.free_consult_minutes as number,
      totalSessions: d.total_sessions as number,
      averageRating: d.average_rating as number,
      reviewCount: d.review_count as number,
      responseRate: d.response_rate as number,
      status: d.status as ExpertStatus,
      verifiedAt: d.verified_at ? new Date(d.verified_at as string) : undefined,
      createdAt: new Date(d.created_at as string),
      updatedAt: new Date(d.updated_at as string),
    };
  }

  private sessionToDb(s: Record<string, unknown>): Record<string, unknown> {
    return {
      id: s.id,
      expert_id: s.expertId,
      expert_name: s.expertName,
      client_id: s.clientId,
      client_name: s.clientName,
      type: s.type,
      title: s.title,
      description: s.description,
      scheduled_at: s.scheduledAt,
      duration_minutes: s.durationMinutes,
      timezone: s.timezone,
      meeting_url: s.meetingUrl,
      meeting_provider: s.meetingProvider,
      price: s.price,
      currency: s.currency,
      is_paid: s.isPaid,
      status: s.status,
      expert_notes: s.expertNotes,
      client_notes: s.clientNotes,
      follow_up_actions: s.followUpActions,
      has_review: s.has_review,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  }

  private sessionFromDb(d: Record<string, unknown>): Session {
    return {
      id: d.id as string,
      expertId: d.expert_id as string,
      expertName: d.expert_name as string,
      clientId: d.client_id as string,
      clientName: d.client_name as string,
      type: d.type as SessionType,
      title: d.title as string,
      description: d.description as string,
      scheduledAt: new Date(d.scheduled_at as string),
      durationMinutes: d.duration_minutes as number,
      timezone: d.timezone as string,
      meetingUrl: d.meeting_url as string,
      meetingProvider: d.meeting_provider as Session['meetingProvider'],
      price: d.price as number,
      currency: d.currency as string,
      isPaid: d.is_paid as boolean,
      status: d.status as SessionStatus,
      expertNotes: d.expert_notes as string,
      clientNotes: d.client_notes as string,
      followUpActions: d.follow_up_actions as string[],
      hasReview: d.has_review as boolean,
      createdAt: new Date(d.created_at as string),
      updatedAt: new Date(d.updated_at as string),
    };
  }

  private reviewToDb(r: Record<string, unknown>): Record<string, unknown> {
    return {
      id: r.id,
      session_id: r.sessionId,
      expert_id: r.expertId,
      client_id: r.clientId,
      rating: r.rating,
      title: r.title,
      content: r.content,
      knowledge_rating: r.knowledgeRating,
      communication_rating: r.communicationRating,
      helpfulness_rating: r.helpfulnessRating,
      is_public: r.isPublic,
      expert_response: r.expertResponse,
      created_at: r.created_at,
    };
  }

  private reviewFromDb(d: Record<string, unknown>): SessionReview {
    return {
      id: d.id as string,
      sessionId: d.session_id as string,
      expertId: d.expert_id as string,
      clientId: d.client_id as string,
      rating: d.rating as number,
      title: d.title as string,
      content: d.content as string,
      knowledgeRating: d.knowledge_rating as number,
      communicationRating: d.communication_rating as number,
      helpfulnessRating: d.helpfulness_rating as number,
      isPublic: d.is_public as boolean,
      expertResponse: d.expert_response as string,
      createdAt: new Date(d.created_at as string),
    };
  }
}

let instance: ExpertSessionsService | null = null;
export function getExpertSessionsService(): ExpertSessionsService {
  if (!instance) {
    instance = new ExpertSessionsService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return instance;
}
