-- Fynvita - Gamification & AI Personalization Schema
-- Migration: 20260120000000_gamification_ai_personalization
-- Created: 2026-01-20
-- Description: Creates tables for gamification (XP, badges, streaks) and AI personalization

-- ============================================================================
-- GAMIFICATION TABLES
-- ============================================================================

-- User Progress (XP, Level, Streaks)
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_xp INTEGER DEFAULT 0 NOT NULL,
  total_xp_earned INTEGER DEFAULT 0 NOT NULL,
  current_level INTEGER DEFAULT 1 NOT NULL,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  last_activity_date DATE,
  streak_multiplier DECIMAL(3,2) DEFAULT 1.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badge Definitions (master list of all badges)
CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT CHECK (category IN ('savings', 'debt', 'budget', 'credit', 'investing', 'trading', 'streak', 'community', 'special')) NOT NULL,
  rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')) NOT NULL,
  xp_reward INTEGER DEFAULT 0 NOT NULL,
  criteria JSONB NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Badges (earned badges)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES badge_definitions(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 100,
  is_pinned BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, badge_id)
);

-- Badge Progress (for tracking progress toward unearned badges)
CREATE TABLE IF NOT EXISTS badge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES badge_definitions(id) ON DELETE CASCADE NOT NULL,
  current_value DECIMAL(15,2) DEFAULT 0,
  target_value DECIMAL(15,2) NOT NULL,
  progress_percent INTEGER GENERATED ALWAYS AS (
    CASE WHEN target_value > 0 
    THEN LEAST(100, FLOOR((current_value / target_value) * 100)::INTEGER)
    ELSE 0 END
  ) STORED,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- XP Transactions (audit log of XP earned)
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  event_type TEXT NOT NULL,
  multiplier DECIMAL(3,2) DEFAULT 1.00,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Level Definitions
CREATE TABLE IF NOT EXISTS level_definitions (
  level INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  xp_required INTEGER NOT NULL,
  perks JSONB,
  badge_id UUID REFERENCES badge_definitions(id)
);

-- Daily Quests
CREATE TABLE IF NOT EXISTS daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER NOT NULL,
  bonus_reward JSONB,
  quest_type TEXT CHECK (quest_type IN ('transaction', 'savings', 'budget', 'credit', 'education', 'engagement')) NOT NULL,
  criteria JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Daily Quest Progress
CREATE TABLE IF NOT EXISTS user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quest_id UUID REFERENCES daily_quests(id) ON DELETE CASCADE NOT NULL,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  progress_value DECIMAL(15,2) DEFAULT 0,
  UNIQUE(user_id, quest_id, quest_date)
);

-- Community Challenges
CREATE TABLE IF NOT EXISTS community_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT CHECK (challenge_type IN ('savings', 'no_spend', 'debt_payoff', 'credit_improvement', 'investment')) NOT NULL,
  target_value DECIMAL(15,2) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  badge_reward_id UUID REFERENCES badge_definitions(id),
  xp_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Challenge Participation
CREATE TABLE IF NOT EXISTS user_challenge_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES community_challenges(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  current_progress DECIMAL(15,2) DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  rank INTEGER,
  UNIQUE(user_id, challenge_id)
);

-- Leaderboard Snapshots (for historical leaderboards)
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_type TEXT CHECK (leaderboard_type IN ('weekly_xp', 'monthly_xp', 'streak', 'challenge')) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  rankings JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AI PERSONALIZATION TABLES
-- ============================================================================

-- User Financial Profiles (behavioral analysis)
CREATE TABLE IF NOT EXISTS user_financial_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  risk_tolerance_score DECIMAL(3,1) CHECK (risk_tolerance_score >= 0 AND risk_tolerance_score <= 10),
  financial_personality TEXT CHECK (financial_personality IN ('saver', 'spender', 'investor', 'balanced', 'cautious', 'aggressive')),
  primary_goals JSONB,
  spending_triggers JSONB,
  preferred_notification_time TIME,
  preferred_notification_days TEXT[],
  communication_tone TEXT CHECK (communication_tone IN ('supportive', 'direct', 'motivational', 'analytical')) DEFAULT 'supportive',
  biases JSONB,
  last_assessment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spending Patterns
CREATE TABLE IF NOT EXISTS spending_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pattern_type TEXT CHECK (pattern_type IN ('time_of_day', 'day_of_week', 'category', 'merchant', 'emotional', 'seasonal')) NOT NULL,
  pattern_key TEXT NOT NULL,
  average_amount DECIMAL(15,2),
  transaction_count INTEGER DEFAULT 0,
  risk_score DECIMAL(3,2) CHECK (risk_score >= 0 AND risk_score <= 1),
  metadata JSONB,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pattern_type, pattern_key, period_start)
);

-- Nudge Definitions
CREATE TABLE IF NOT EXISTS nudge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  nudge_type TEXT CHECK (nudge_type IN ('motivational', 'progress', 'warning', 'celebration', 'reminder', 'insight', 'coaching')) NOT NULL,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  trigger_conditions JSONB NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  cooldown_hours INTEGER DEFAULT 24,
  channels TEXT[] DEFAULT ARRAY['in_app'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nudge History
CREATE TABLE IF NOT EXISTS nudge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nudge_id UUID REFERENCES nudge_definitions(id) ON DELETE SET NULL,
  nudge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT CHECK (channel IN ('in_app', 'push', 'email', 'sms')) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  action_taken TEXT CHECK (action_taken IN ('accepted', 'dismissed', 'snoozed', 'ignored')),
  action_at TIMESTAMPTZ,
  context JSONB,
  ab_variant TEXT
);

-- AI Coaching Sessions
CREATE TABLE IF NOT EXISTS ai_coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT CHECK (session_type IN ('onboarding', 'weekly_review', 'goal_check', 'crisis', 'celebration', 'education')) NOT NULL,
  topic TEXT NOT NULL,
  content JSONB NOT NULL,
  user_response JSONB,
  sentiment_score DECIMAL(3,2),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal Progress Tracking (for AI insights)
CREATE TABLE IF NOT EXISTS goal_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  goal_type TEXT CHECK (goal_type IN ('savings', 'debt_payoff', 'emergency_fund', 'investment', 'credit_score', 'custom')) NOT NULL,
  goal_name TEXT NOT NULL,
  target_value DECIMAL(15,2) NOT NULL,
  current_value DECIMAL(15,2) DEFAULT 0,
  target_date DATE,
  start_date DATE DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'abandoned')) DEFAULT 'active',
  milestones JSONB,
  ai_recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emotional Spending Alerts
CREATE TABLE IF NOT EXISTS emotional_spending_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID,
  risk_score DECIMAL(3,2) NOT NULL,
  risk_factors JSONB NOT NULL,
  intervention_type TEXT CHECK (intervention_type IN ('none', 'soft_nudge', 'reflection_prompt', 'strong_intervention')) NOT NULL,
  user_response TEXT CHECK (user_response IN ('planned', 'will_wait', 'dismissed', 'no_response')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Gamification indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_level ON user_progress(current_level);
CREATE INDEX IF NOT EXISTS idx_user_progress_streak ON user_progress(current_streak DESC);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_badge_progress_user_id ON badge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_progress_badge_id ON badge_progress(badge_id);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_event_type ON xp_transactions(event_type);

CREATE INDEX IF NOT EXISTS idx_user_quest_progress_user_date ON user_quest_progress(user_id, quest_date);
CREATE INDEX IF NOT EXISTS idx_user_quest_progress_completed ON user_quest_progress(is_completed);

CREATE INDEX IF NOT EXISTS idx_user_challenge_participation_user ON user_challenge_participation(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_participation_challenge ON user_challenge_participation(challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_participation_rank ON user_challenge_participation(rank);

-- AI personalization indexes
CREATE INDEX IF NOT EXISTS idx_user_financial_profiles_user_id ON user_financial_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_spending_patterns_user_id ON spending_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_spending_patterns_type ON spending_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_spending_patterns_period ON spending_patterns(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_nudge_history_user_id ON nudge_history(user_id);
CREATE INDEX IF NOT EXISTS idx_nudge_history_sent_at ON nudge_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_nudge_history_action ON nudge_history(action_taken);

CREATE INDEX IF NOT EXISTS idx_ai_coaching_sessions_user_id ON ai_coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_coaching_sessions_type ON ai_coaching_sessions(session_type);

CREATE INDEX IF NOT EXISTS idx_goal_tracking_user_id ON goal_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_tracking_status ON goal_tracking(status);
CREATE INDEX IF NOT EXISTS idx_goal_tracking_type ON goal_tracking(goal_type);

CREATE INDEX IF NOT EXISTS idx_emotional_spending_alerts_user_id ON emotional_spending_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_emotional_spending_alerts_risk ON emotional_spending_alerts(risk_score DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_spending_alerts ENABLE ROW LEVEL SECURITY;

-- Public read access for definitions
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_definitions ENABLE ROW LEVEL SECURITY;

-- User progress policies
CREATE POLICY "Users can view own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User badges policies
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own badges" ON user_badges FOR UPDATE USING (auth.uid() = user_id);

-- Badge progress policies
CREATE POLICY "Users can view own badge progress" ON badge_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage badge progress" ON badge_progress FOR ALL USING (auth.uid() = user_id);

-- XP transactions policies
CREATE POLICY "Users can view own xp transactions" ON xp_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert xp transactions" ON xp_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quest progress policies
CREATE POLICY "Users can view own quest progress" ON user_quest_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage quest progress" ON user_quest_progress FOR ALL USING (auth.uid() = user_id);

-- Challenge participation policies
CREATE POLICY "Users can view own challenge participation" ON user_challenge_participation FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can join challenges" ON user_challenge_participation FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update challenge participation" ON user_challenge_participation FOR UPDATE USING (auth.uid() = user_id);

-- Public definitions policies (read-only for all authenticated users)
CREATE POLICY "Anyone can view badge definitions" ON badge_definitions FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "Anyone can view level definitions" ON level_definitions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Anyone can view active quests" ON daily_quests FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "Anyone can view active challenges" ON community_challenges FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "Anyone can view active nudges" ON nudge_definitions FOR SELECT TO authenticated USING (is_active = TRUE);

-- AI personalization policies
CREATE POLICY "Users can view own financial profile" ON user_financial_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own financial profile" ON user_financial_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert financial profile" ON user_financial_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own spending patterns" ON spending_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage spending patterns" ON spending_patterns FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own nudge history" ON nudge_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert nudge history" ON nudge_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nudge history" ON nudge_history FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own coaching sessions" ON ai_coaching_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage coaching sessions" ON ai_coaching_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own goals" ON goal_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own goals" ON goal_tracking FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own spending alerts" ON emotional_spending_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage spending alerts" ON emotional_spending_alerts FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to initialize user progress on profile creation
CREATE OR REPLACE FUNCTION public.initialize_user_gamification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_progress (user_id, current_xp, current_level, current_streak)
  VALUES (NEW.id, 0, 1, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_financial_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize gamification on profile creation
DROP TRIGGER IF EXISTS on_profile_created_gamification ON profiles;
CREATE TRIGGER on_profile_created_gamification
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_gamification();

-- Function to award XP and check for level up
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_xp INTEGER;
  v_current_level INTEGER;
  v_streak_multiplier DECIMAL(3,2);
  v_final_amount INTEGER;
  v_new_level INTEGER;
  v_level_up BOOLEAN := FALSE;
  v_new_title TEXT;
BEGIN
  -- Get current progress
  SELECT current_xp, current_level, streak_multiplier
  INTO v_current_xp, v_current_level, v_streak_multiplier
  FROM user_progress
  WHERE user_id = p_user_id;
  
  -- Apply streak multiplier
  v_final_amount := FLOOR(p_amount * v_streak_multiplier);
  
  -- Record XP transaction
  INSERT INTO xp_transactions (user_id, amount, reason, event_type, multiplier, metadata)
  VALUES (p_user_id, v_final_amount, p_reason, p_event_type, v_streak_multiplier, p_metadata);
  
  -- Update user progress
  UPDATE user_progress
  SET current_xp = current_xp + v_final_amount,
      total_xp_earned = total_xp_earned + v_final_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Check for level up
  SELECT level, title INTO v_new_level, v_new_title
  FROM level_definitions
  WHERE xp_required <= (v_current_xp + v_final_amount)
  ORDER BY level DESC
  LIMIT 1;
  
  IF v_new_level > v_current_level THEN
    v_level_up := TRUE;
    UPDATE user_progress
    SET current_level = v_new_level
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'xp_earned', v_final_amount,
    'multiplier', v_streak_multiplier,
    'level_up', v_level_up,
    'new_level', v_new_level,
    'new_title', v_new_title
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_new_multiplier DECIMAL(3,2);
  v_streak_broken BOOLEAN := FALSE;
BEGIN
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_progress
  WHERE user_id = p_user_id;
  
  IF v_last_activity IS NULL OR v_last_activity < CURRENT_DATE - 1 THEN
    -- Streak broken (missed more than 1 day)
    v_current_streak := 1;
    v_streak_broken := TRUE;
  ELSIF v_last_activity = CURRENT_DATE - 1 THEN
    -- Continue streak
    v_current_streak := v_current_streak + 1;
  ELSIF v_last_activity = CURRENT_DATE THEN
    -- Already logged today, no change
    RETURN jsonb_build_object('streak', v_current_streak, 'multiplier', 
      (SELECT streak_multiplier FROM user_progress WHERE user_id = p_user_id));
  END IF;
  
  -- Update longest streak
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  -- Calculate multiplier (max 2.0x at 30+ day streak)
  v_new_multiplier := LEAST(2.0, 1.0 + (v_current_streak * 0.033));
  
  UPDATE user_progress
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_activity_date = CURRENT_DATE,
      streak_multiplier = v_new_multiplier,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'streak', v_current_streak,
    'longest_streak', v_longest_streak,
    'multiplier', v_new_multiplier,
    'streak_broken', v_streak_broken
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION public.check_badge_eligibility(p_user_id UUID, p_badge_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_badge_id UUID;
  v_already_earned BOOLEAN;
  v_xp_reward INTEGER;
  v_badge_name TEXT;
BEGIN
  -- Get badge info
  SELECT id, xp_reward, name INTO v_badge_id, v_xp_reward, v_badge_name
  FROM badge_definitions
  WHERE code = p_badge_code AND is_active = TRUE;
  
  IF v_badge_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Badge not found');
  END IF;
  
  -- Check if already earned
  SELECT EXISTS(
    SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = v_badge_id
  ) INTO v_already_earned;
  
  IF v_already_earned THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Badge already earned');
  END IF;
  
  -- Award badge
  INSERT INTO user_badges (user_id, badge_id, earned_at)
  VALUES (p_user_id, v_badge_id, NOW());
  
  -- Award XP for badge
  IF v_xp_reward > 0 THEN
    PERFORM public.award_xp(p_user_id, v_xp_reward, 'Badge earned: ' || v_badge_name, 'badge_earned', 
      jsonb_build_object('badge_code', p_badge_code));
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'badge_name', v_badge_name,
    'xp_earned', v_xp_reward
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated timestamp triggers
DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_progress;
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_financial_profiles_updated_at ON user_financial_profiles;
CREATE TRIGGER update_user_financial_profiles_updated_at
  BEFORE UPDATE ON user_financial_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_goal_tracking_updated_at ON goal_tracking;
CREATE TRIGGER update_goal_tracking_updated_at
  BEFORE UPDATE ON goal_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SEED DATA: Level Definitions
-- ============================================================================

INSERT INTO level_definitions (level, title, xp_required, perks) VALUES
(1, 'Financial Newbie', 0, '{"features": ["basic_dashboard"]}'),
(2, 'Budget Beginner', 500, '{"features": ["basic_dashboard", "daily_quests"]}'),
(3, 'Savings Starter', 1200, '{"features": ["basic_dashboard", "daily_quests", "streak_bonus"]}'),
(4, 'Money Manager', 2100, '{"features": ["basic_dashboard", "daily_quests", "streak_bonus", "insights"]}'),
(5, 'Finance Fighter', 3200, '{"features": ["basic_dashboard", "daily_quests", "streak_bonus", "insights", "challenges"]}'),
(6, 'Debt Destroyer', 4500, '{"features": ["all_basic", "custom_badges"]}'),
(7, 'Credit Climber', 6000, '{"features": ["all_basic", "custom_badges", "priority_support"]}'),
(8, 'Wealth Builder', 8000, '{"features": ["all_basic", "custom_badges", "priority_support", "advanced_analytics"]}'),
(9, 'Investment Initiate', 10500, '{"features": ["all_basic", "custom_badges", "priority_support", "advanced_analytics"]}'),
(10, 'Portfolio Pro', 13500, '{"features": ["all_premium"]}'),
(15, 'Wealth Warrior', 28000, '{"features": ["all_premium", "beta_features"]}'),
(20, 'Finance Master', 52000, '{"features": ["all_premium", "beta_features", "vip_support"]}'),
(25, 'Money Maven', 85000, '{"features": ["all_premium", "beta_features", "vip_support", "exclusive_content"]}'),
(30, 'Financial Legend', 150000, '{"features": ["all_premium", "beta_features", "vip_support", "exclusive_content", "legend_badge"]}')
ON CONFLICT (level) DO NOTHING;

-- ============================================================================
-- SEED DATA: Badge Definitions
-- ============================================================================

INSERT INTO badge_definitions (code, name, description, icon, category, rarity, xp_reward, criteria, sort_order) VALUES
-- Savings badges
('SAVINGS_100', 'First $100', 'Save your first $100', '💵', 'savings', 'common', 100, '{"type": "savings_milestone", "value": 100}', 1),
('SAVINGS_1000', 'First $1,000', 'Save your first $1,000', '💰', 'savings', 'uncommon', 250, '{"type": "savings_milestone", "value": 1000}', 2),
('SAVINGS_5000', 'First $5,000', 'Save your first $5,000', '💎', 'savings', 'rare', 500, '{"type": "savings_milestone", "value": 5000}', 3),
('SAVINGS_10000', 'First $10,000', 'Save your first $10,000', '🏦', 'savings', 'epic', 1000, '{"type": "savings_milestone", "value": 10000}', 4),
('SAVINGS_50000', 'First $50,000', 'Save your first $50,000', '👑', 'savings', 'legendary', 2500, '{"type": "savings_milestone", "value": 50000}', 5),

-- Debt badges
('DEBT_FIRST_PAYMENT', 'Debt Slayer', 'Make your first extra debt payment', '⚔️', 'debt', 'common', 100, '{"type": "debt_payment", "count": 1}', 10),
('DEBT_1000_PAID', '$1K Crusher', 'Pay off $1,000 in debt', '💪', 'debt', 'uncommon', 250, '{"type": "debt_paid", "value": 1000}', 11),
('DEBT_5000_PAID', '$5K Destroyer', 'Pay off $5,000 in debt', '🔥', 'debt', 'rare', 500, '{"type": "debt_paid", "value": 5000}', 12),
('DEBT_FREE', 'Debt Free!', 'Pay off all tracked debt', '🎉', 'debt', 'legendary', 3000, '{"type": "debt_free"}', 13),

-- Budget badges
('BUDGET_FIRST', 'Budget Beginner', 'Create your first budget', '📊', 'budget', 'common', 50, '{"type": "budget_created", "count": 1}', 20),
('BUDGET_WEEK', 'Week Warrior', 'Stay under budget for 7 days', '🎯', 'budget', 'uncommon', 150, '{"type": "budget_streak", "days": 7}', 21),
('BUDGET_MONTH', 'Budget Boss', 'Stay under budget for 30 days', '👑', 'budget', 'epic', 500, '{"type": "budget_streak", "days": 30}', 22),
('BUDGET_MASTER', 'Budget Master', 'Stay under budget for 90 days', '🏆', 'budget', 'legendary', 1500, '{"type": "budget_streak", "days": 90}', 23),

-- Credit badges
('CREDIT_CHECK', 'Credit Curious', 'Check your credit score for the first time', '🔍', 'credit', 'common', 50, '{"type": "credit_check", "count": 1}', 30),
('CREDIT_650', 'Fair Start', 'Reach a 650 credit score', '📈', 'credit', 'common', 100, '{"type": "credit_score", "value": 650}', 31),
('CREDIT_700', '700 Club', 'Reach a 700 credit score', '🌟', 'credit', 'rare', 500, '{"type": "credit_score", "value": 700}', 32),
('CREDIT_750', '750 Elite', 'Reach a 750 credit score', '⭐', 'credit', 'epic', 1000, '{"type": "credit_score", "value": 750}', 33),
('CREDIT_800', '800 Club', 'Reach an 800 credit score', '💫', 'credit', 'legendary', 2000, '{"type": "credit_score", "value": 800}', 34),

-- Streak badges
('STREAK_7', '7-Day Streak', 'Log in 7 days in a row', '🔥', 'streak', 'common', 100, '{"type": "streak", "days": 7}', 40),
('STREAK_21', '21-Day Streak', 'Log in 21 days in a row', '🔥🔥', 'streak', 'uncommon', 250, '{"type": "streak", "days": 21}', 41),
('STREAK_30', '30-Day Streak', 'Log in 30 days in a row', '🔥🔥🔥', 'streak', 'rare', 500, '{"type": "streak", "days": 30}', 42),
('STREAK_100', '100-Day Streak', 'Log in 100 days in a row', '⭐🔥', 'streak', 'epic', 1500, '{"type": "streak", "days": 100}', 43),
('STREAK_365', '365-Day Streak', 'Log in every day for a year', '💫🔥', 'streak', 'legendary', 5000, '{"type": "streak", "days": 365}', 44),

-- Special badges
('EARLY_ADOPTER', 'Early Adopter', 'Joined Fynvita in the first month', '🚀', 'special', 'rare', 500, '{"type": "early_adopter"}', 50),
('FIRST_GOAL', 'Goal Getter', 'Complete your first financial goal', '🎯', 'special', 'uncommon', 200, '{"type": "goal_completed", "count": 1}', 51),
('REFERRAL', 'Friend Finder', 'Refer a friend to Fynvita', '🤝', 'community', 'uncommon', 250, '{"type": "referral", "count": 1}', 52)

ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED DATA: Daily Quests
-- ============================================================================

INSERT INTO daily_quests (code, name, description, xp_reward, bonus_reward, quest_type, criteria) VALUES
('LOG_TRANSACTION', 'Transaction Tracker', 'Log at least one transaction today', 25, '{"emoji": "📝"}', 'transaction', '{"type": "transaction_count", "min": 1}'),
('STAY_BUDGET', 'Budget Guardian', 'Stay under your daily budget', 50, '{"emoji": "🛡️"}', 'budget', '{"type": "under_budget", "categories": "all"}'),
('SAVE_MONEY', 'Savings Champion', 'Transfer money to savings', 100, '{"emoji": "💰"}', 'savings', '{"type": "savings_transfer", "min_amount": 1}'),
('CHECK_CREDIT', 'Credit Monitor', 'Review your credit score', 25, '{"emoji": "📊"}', 'credit', '{"type": "credit_view"}'),
('REVIEW_SPENDING', 'Spending Analyst', 'Review your spending summary', 25, '{"emoji": "📈"}', 'engagement', '{"type": "view_analytics"}'),
('SET_GOAL', 'Goal Setter', 'Create or update a financial goal', 50, '{"emoji": "🎯"}', 'engagement', '{"type": "goal_interaction"}')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_progress IS 'User gamification progress: XP, levels, streaks';
COMMENT ON TABLE badge_definitions IS 'Master list of all achievable badges';
COMMENT ON TABLE user_badges IS 'Badges earned by users';
COMMENT ON TABLE xp_transactions IS 'Audit log of all XP earned';
COMMENT ON TABLE user_financial_profiles IS 'AI-derived financial personality and behavior profiles';
COMMENT ON TABLE spending_patterns IS 'Analyzed spending patterns for AI insights';
COMMENT ON TABLE nudge_history IS 'History of nudges/notifications sent to users';
COMMENT ON TABLE goal_tracking IS 'User financial goals with AI recommendations';

COMMENT ON FUNCTION award_xp IS 'Awards XP to user with streak multiplier, returns level up info';
COMMENT ON FUNCTION update_user_streak IS 'Updates user streak, calculates multiplier';
COMMENT ON FUNCTION check_badge_eligibility IS 'Checks and awards badge if eligible';
