-- =============================================
-- FitnessMate - Supabase Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PROFILES - User profile data
-- =============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    streak_days INT NOT NULL DEFAULT 0,
    total_workouts INT NOT NULL DEFAULT 0,
    preferred_types TEXT[] DEFAULT '{}',
    preferred_location TEXT DEFAULT 'בבית'
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 2. WORKOUTS - Core workout log
-- =============================================
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
    workout_type TEXT NOT NULL,
    difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
    feeling TEXT NOT NULL,
    equipment TEXT[] DEFAULT '{}',
    training_type TEXT NOT NULL CHECK (training_type IN ('כוח', 'סיבולת')),
    target_muscle TEXT,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    location TEXT NOT NULL,
    company TEXT NOT NULL,
    template_id TEXT,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workouts_user_date ON workouts(user_id, workout_date DESC);
CREATE INDEX idx_workouts_date ON workouts(workout_date);

-- =============================================
-- 3. COACH_MESSAGES - Chat history
-- =============================================
CREATE TABLE coach_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('coach', 'user')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coach_messages_user ON coach_messages(user_id, created_at DESC);

-- =============================================
-- 4. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Workouts: users can only access their own
CREATE POLICY "Users can view own workouts"
    ON workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workouts"
    ON workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts"
    ON workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts"
    ON workouts FOR DELETE USING (auth.uid() = user_id);

-- Coach messages: users can only access their own
CREATE POLICY "Users can view own messages"
    ON coach_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages"
    ON coach_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 5. HELPER FUNCTIONS
-- =============================================

-- Get weekly summary for a user
CREATE OR REPLACE FUNCTION get_weekly_summary(p_user_id UUID)
RETURNS TABLE(
    workout_date DATE,
    workout_count INT,
    avg_difficulty NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.workout_date,
        COUNT(*)::INT AS workout_count,
        ROUND(AVG(w.difficulty), 1) AS avg_difficulty
    FROM workouts w
    WHERE w.user_id = p_user_id
        AND w.workout_date >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY w.workout_date
    ORDER BY w.workout_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user stats after workout
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET total_workouts = (
            SELECT COUNT(*) FROM workouts WHERE user_id = NEW.user_id
        ),
        streak_days = (
            SELECT COUNT(DISTINCT workout_date)
            FROM workouts
            WHERE user_id = NEW.user_id
                AND workout_date >= CURRENT_DATE - INTERVAL '30 days'
        )
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workout_inserted
    AFTER INSERT ON workouts
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();
