/**
 * Fynvita Gamification System - Public API
 */

export * from './types';
export {
  GamificationEngine,
  getGamificationEngine,
} from './gamification-engine';

// Financial Journey Map
export {
  FinancialJourneyService,
  getFinancialJourneyService,
  type FinancialJourney,
  type Waypoint,
  type WaypointRequirement,
  type JourneyPhase,
  type WaypointType,
  type WaypointStatus,
  type JourneyTemplate,
} from './financial-journey-service';

// Community Challenges
export {
  CommunityChallengesService,
  getCommunityChallengesService,
  type Challenge,
  type ChallengeParticipant,
  type ChallengeType,
  type ChallengeStatus,
  type ParticipantStatus,
  type Leaderboard,
  type LeaderboardEntry,
  type ChallengeTemplate,
} from './community-challenges-service';

// Anonymous Leaderboards
export {
  AnonymousLeaderboardService,
  getAnonymousLeaderboardService,
  type LeaderboardCategory,
  type TimeFrame,
  type LeaderboardParticipation,
  type LeaderboardStats,
} from './anonymous-leaderboard-service';

// Accountability Partners
export {
  AccountabilityPartnersService,
  getAccountabilityPartnersService,
  type Partnership,
  type PartnershipStatus,
  type ShareLevel,
  type NudgeType,
  type PartnerProfile,
  type SharedProgress,
  type Nudge,
  type PartnerInvitation,
} from './accountability-partners-service';

// Commitment Devices
export {
  CommitmentDeviceService,
  getCommitmentDeviceService,
  type CommitmentContract,
  type CommitmentType,
  type CommitmentStatus,
  type CheckIn,
  type Charity,
  type CommitmentTemplate,
  type CommitmentStats,
} from './commitment-device-service';

// Shared Family/Friend Goals
export {
  SharedGoalsService,
  getSharedGoalsService,
  type SharedGoal,
  type SharedGoalMember,
  type Contribution,
  type GoalInvitation,
  type GoalUpdate,
  type MemberRole,
  type GoalVisibility,
  type SharedGoalStatus,
  SHARED_GOAL_TEMPLATES,
  RELATIONSHIP_TYPES,
} from './shared-goals-service';
