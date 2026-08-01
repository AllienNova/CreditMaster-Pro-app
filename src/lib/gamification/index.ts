/**
 * Fynvita Gamification System - Public API
 */

export * from "./types";
export {
  GamificationEngine,
  getGamificationEngine,
} from "./gamification-engine";

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
} from "./financial-journey-service";

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
} from "./community-challenges-service";

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
} from "./shared-goals-service";
