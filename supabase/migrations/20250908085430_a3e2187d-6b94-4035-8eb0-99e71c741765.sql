-- Fix security warnings: Set search_path for functions

-- Fix update_template_usage function
CREATE OR REPLACE FUNCTION update_template_usage(template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE message_templates 
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = now()
  WHERE id = template_id;
END;
$$;

-- Fix calculate_template_match_score function
CREATE OR REPLACE FUNCTION calculate_template_match_score(
  template_id UUID,
  client_message TEXT,
  message_context JSONB DEFAULT '{}'
)
RETURNS DECIMAL(5,4)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template_record RECORD;
  keyword_matches INTEGER := 0;
  total_keywords INTEGER := 0;
  content_similarity DECIMAL := 0.0;
  context_bonus DECIMAL := 0.0;
  final_score DECIMAL := 0.0;
BEGIN
  -- Get template details
  SELECT * INTO template_record
  FROM message_templates
  WHERE id = template_id;
  
  IF NOT FOUND THEN
    RETURN 0.0;
  END IF;
  
  -- Calculate keyword matching
  IF template_record.matching_keywords IS NOT NULL THEN
    total_keywords := array_length(template_record.matching_keywords, 1);
    
    -- Count keyword matches in client message
    SELECT COUNT(*) INTO keyword_matches
    FROM unnest(template_record.matching_keywords) AS keyword
    WHERE LOWER(client_message) LIKE '%' || LOWER(keyword) || '%';
    
    IF total_keywords > 0 THEN
      content_similarity := keyword_matches::DECIMAL / total_keywords::DECIMAL;
    END IF;
  END IF;
  
  -- Context bonuses
  IF message_context ? 'message_type' AND message_context->>'message_type' = template_record.category THEN
    context_bonus := context_bonus + 0.2;
  END IF;
  
  IF message_context ? 'client_type' AND message_context->>'client_type' = template_record.client_type THEN
    context_bonus := context_bonus + 0.1;
  END IF;
  
  -- Calculate final score (weighted average)
  final_score := (content_similarity * 0.6) + (context_bonus * 0.4);
  
  -- Boost score based on template success rate
  IF template_record.success_rating IS NOT NULL THEN
    final_score := final_score * (1 + (template_record.success_rating - 3) * 0.1);
  END IF;
  
  RETURN LEAST(final_score, 1.0);
END;
$$;