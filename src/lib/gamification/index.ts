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

// Achievements — restored 2026-08-09. Deleted by b6f6efe as a "duplicate" of
// the badge system; it is a separate concept (achievement definitions with
// conditions/tiers) built by another session, so it is re-exported rather than
// left orphaned. See docs/qa/restored-services.md.
export {
  AchievementService,
  getAchievementService,
  type AchievementCategory,
  type BadgeTier,
  type AchievementStatus,
  type AchievementDefinition,
  type UserAchievement,
  type UserAchievementWithDefinition,
  type AchievementCheckResult,
  type AchievementAwardResult,
  type AchievementStats,
} from "./achievement-service";
