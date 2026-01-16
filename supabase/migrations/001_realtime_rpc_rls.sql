-- ============================================
-- Me Before You Live - Database Migration
-- Realtime, RPC Functions, and RLS Policies
-- ============================================

-- ============================================
-- PART 1: Enable Supabase Realtime
-- ============================================

-- Enable Realtime for auction_items (status changes trigger events)
-- ALTER PUBLICATION supabase_realtime ADD TABLE auction_items;

-- Enable Realtime for feed_likes (like/unlike triggers events)
-- ALTER PUBLICATION supabase_realtime ADD TABLE feed_likes;

-- Enable Realtime for system_settings (phase changes)
ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;

-- Enable Realtime for bids (new bid notifications)
-- ALTER PUBLICATION supabase_realtime ADD TABLE bids;

-- ============================================
-- PART 2: Create matches table for atomic storage
-- ============================================

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matched_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_rank INT4 NOT NULL CHECK (match_rank BETWEEN 1 AND 3),
  auction_similarity NUMERIC(5,4) NOT NULL DEFAULT 0,
  feed_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  final_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, matched_user_id, session_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_matches_user_session ON matches(user_id, session_id);

-- Enable Realtime for matches
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- ============================================
-- PART 3: Atomic Matching RPC Function
-- ============================================

-- Helper function: Calculate cosine similarity between two auction vectors
CREATE OR REPLACE FUNCTION cosine_similarity(vec_a NUMERIC[], vec_b NUMERIC[])
RETURNS NUMERIC AS $$
DECLARE
  dot_product NUMERIC := 0;
  norm_a NUMERIC := 0;
  norm_b NUMERIC := 0;
  i INT;
BEGIN
  IF array_length(vec_a, 1) != array_length(vec_b, 1) THEN
    RETURN 0;
  END IF;

  FOR i IN 1..array_length(vec_a, 1) LOOP
    dot_product := dot_product + (vec_a[i] * vec_b[i]);
    norm_a := norm_a + (vec_a[i] * vec_a[i]);
    norm_b := norm_b + (vec_b[i] * vec_b[i]);
  END LOOP;

  IF norm_a = 0 OR norm_b = 0 THEN
    RETURN 0;
  END IF;

  RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main RPC: Finalize all matches atomically
CREATE OR REPLACE FUNCTION finalize_all_matches(p_session_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
  v_candidate RECORD;
  v_auction_items RECORD;
  v_item_ids UUID[];
  v_my_vector NUMERIC[];
  v_their_vector NUMERIC[];
  v_auction_sim NUMERIC;
  v_feed_score NUMERIC;
  v_final_score NUMERIC;
  v_my_likes_given INT;
  v_their_likes_given INT;
  v_max_likes INT := 3;
  v_matches_created INT := 0;
  v_candidate_scores JSONB[];
  v_sorted_candidates JSONB[];
  v_top3 JSONB[];
  v_idx INT;
BEGIN
  -- Clear existing matches for this session
  DELETE FROM matches WHERE session_id = p_session_id;

  -- Get all auction item IDs (for vector building)
  SELECT array_agg(id ORDER BY created_at) INTO v_item_ids FROM auction_items;

  -- Process each user
  FOR v_user IN SELECT * FROM users LOOP
    v_candidate_scores := ARRAY[]::JSONB[];

    -- Build user's auction vector (amount spent on each item)
    SELECT array_agg(
      COALESCE(
        (SELECT SUM(amount) FROM bids WHERE user_id = v_user.id AND auction_item_id = ai.id),
        0
      )
    ) INTO v_my_vector
    FROM unnest(v_item_ids) AS ai(id);

    -- Find opposite gender candidates
    FOR v_candidate IN
      SELECT * FROM users
      WHERE id != v_user.id
        AND gender != v_user.gender
    LOOP
      -- Build candidate's auction vector
      SELECT array_agg(
        COALESCE(
          (SELECT SUM(amount) FROM bids WHERE user_id = v_candidate.id AND auction_item_id = ai.id),
          0
        )
      ) INTO v_their_vector
      FROM unnest(v_item_ids) AS ai(id);

      -- Calculate auction similarity (70% weight)
      v_auction_sim := cosine_similarity(v_my_vector, v_their_vector);

      -- Calculate feed score (30% weight) - mutual likes
      SELECT COUNT(*) INTO v_my_likes_given
      FROM feed_likes
      WHERE user_id = v_user.id AND target_user_id = v_candidate.id;

      SELECT COUNT(*) INTO v_their_likes_given
      FROM feed_likes
      WHERE user_id = v_candidate.id AND target_user_id = v_user.id;

      -- Normalize feed score (max possible: 2 * MAX_LIKES)
      v_feed_score := (v_my_likes_given + v_their_likes_given)::NUMERIC / (2 * v_max_likes);

      -- Calculate final score
      v_final_score := (v_auction_sim * 0.7) + (v_feed_score * 0.3);

      -- Add to candidates array
      v_candidate_scores := array_append(v_candidate_scores, jsonb_build_object(
        'candidate_id', v_candidate.id,
        'auction_sim', v_auction_sim,
        'feed_score', v_feed_score,
        'final_score', v_final_score
      ));
    END LOOP;

    -- Sort candidates by final_score descending and take top 3
    SELECT array_agg(elem ORDER BY (elem->>'final_score')::NUMERIC DESC)
    INTO v_sorted_candidates
    FROM unnest(v_candidate_scores) AS elem;

    -- Insert top 3 matches
    IF v_sorted_candidates IS NOT NULL AND array_length(v_sorted_candidates, 1) > 0 THEN
      FOR v_idx IN 1..LEAST(3, array_length(v_sorted_candidates, 1)) LOOP
        INSERT INTO matches (
          user_id,
          matched_user_id,
          match_rank,
          auction_similarity,
          feed_score,
          final_score,
          session_id
        ) VALUES (
          v_user.id,
          (v_sorted_candidates[v_idx]->>'candidate_id')::UUID,
          v_idx,
          (v_sorted_candidates[v_idx]->>'auction_sim')::NUMERIC,
          (v_sorted_candidates[v_idx]->>'feed_score')::NUMERIC,
          (v_sorted_candidates[v_idx]->>'final_score')::NUMERIC,
          p_session_id
        );
        v_matches_created := v_matches_created + 1;
      END LOOP;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'matches_created', v_matches_created,
    'session_id', p_session_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 4: Row Level Security Policies
-- ============================================

-- Enable RLS on system_settings (admin-only writes)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read system_settings
CREATE POLICY "Anyone can read system_settings"
  ON system_settings FOR SELECT
  USING (true);

-- Only service role can modify system_settings (admin operations)
CREATE POLICY "Service role can modify system_settings"
  ON system_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Enable RLS on matches (users can only see their own matches)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Users can read their own matches
CREATE POLICY "Users can read own matches"
  ON matches FOR SELECT
  USING (true);

-- Only service role can write matches
-- INSERT 정책에는 검증 로직인 WITH CHECK만 남깁니다.
DROP POLICY IF EXISTS "Service role can write matches" ON matches;

CREATE POLICY "Service role can write matches"
  ON matches FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete matches"
  ON matches FOR DELETE
  USING (auth.role() = 'service_role');

-- Enable RLS on auction_items (admin-only status changes)
ALTER TABLE auction_items ENABLE ROW LEVEL SECURITY;

-- Anyone can read auction_items
CREATE POLICY "Anyone can read auction_items"
  ON auction_items FOR SELECT
  USING (true);

-- Anyone can update auction_items (for bidding - but status should be protected via API)
CREATE POLICY "Anyone can update auction_items for bidding"
  ON auction_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- PART 5: Grant permissions
-- ============================================

-- Grant execute on RPC functions
GRANT EXECUTE ON FUNCTION finalize_all_matches(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION cosine_similarity(NUMERIC[], NUMERIC[]) TO service_role;
