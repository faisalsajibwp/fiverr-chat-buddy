-- Enhanced template system with upload functionality and AI matching

-- Add new columns to message_templates for enhanced functionality
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS tone_style TEXT DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS industry_tags TEXT[],
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_variables JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS matching_keywords TEXT[],
ADD COLUMN IF NOT EXISTS client_type TEXT,
ADD COLUMN IF NOT EXISTS project_complexity TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;

-- Create template analytics table
CREATE TABLE IF NOT EXISTS template_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  client_message_context TEXT,
  response_effectiveness INTEGER CHECK (response_effectiveness >= 1 AND response_effectiveness <= 5),
  client_response_time INTERVAL,
  conversion_outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template upload sessions table
CREATE TABLE IF NOT EXISTS template_upload_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_filename TEXT,
  total_templates INTEGER DEFAULT 0,
  processed_templates INTEGER DEFAULT 0,
  failed_templates INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing',
  error_log JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create curated template library table
CREATE TABLE IF NOT EXISTS curated_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  template_content TEXT NOT NULL,
  category TEXT NOT NULL,
  tone_style TEXT NOT NULL,
  industry_tags TEXT[],
  client_type TEXT,
  project_complexity TEXT DEFAULT 'standard',
  template_variables JSONB DEFAULT '{}',
  matching_keywords TEXT[],
  usage_description TEXT,
  created_by TEXT DEFAULT 'system',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE template_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for template_analytics
CREATE POLICY "Users can view their own template analytics" 
ON template_analytics FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own template analytics" 
ON template_analytics FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own template analytics" 
ON template_analytics FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own template analytics" 
ON template_analytics FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for template_upload_sessions
CREATE POLICY "Users can view their own upload sessions" 
ON template_upload_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own upload sessions" 
ON template_upload_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upload sessions" 
ON template_upload_sessions FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for curated_templates
CREATE POLICY "Curated templates are viewable by everyone" 
ON curated_templates FOR SELECT 
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_template_analytics_user_template 
ON template_analytics(user_id, template_id, used_at DESC);

CREATE INDEX IF NOT EXISTS idx_template_analytics_effectiveness 
ON template_analytics(template_id, response_effectiveness);

CREATE INDEX IF NOT EXISTS idx_templates_enhanced_search 
ON message_templates(user_id, category, tone_style, client_type);

CREATE INDEX IF NOT EXISTS idx_templates_keywords_gin 
ON message_templates USING gin(matching_keywords);

CREATE INDEX IF NOT EXISTS idx_templates_industry_gin 
ON message_templates USING gin(industry_tags);

CREATE INDEX IF NOT EXISTS idx_curated_templates_search 
ON curated_templates(category, tone_style, client_type, project_complexity);

CREATE INDEX IF NOT EXISTS idx_curated_keywords_gin 
ON curated_templates USING gin(matching_keywords);

-- Insert curated templates
INSERT INTO curated_templates (title, template_content, category, tone_style, industry_tags, client_type, project_complexity, matching_keywords, usage_description) VALUES

-- Client Onboarding Templates
('Professional Welcome - Web Development', 
'Hi {{client_name}},

Thank you for choosing my web development services! I''m excited to work on {{project_name}} with you.

To ensure we deliver exactly what you envision, I''ve prepared a quick project checklist:

✅ **Project Requirements**: {{requirements}}
✅ **Timeline**: {{timeline}} 
✅ **Communication**: I''ll provide updates every {{update_frequency}}

I''ll start working on your project immediately and deliver the first milestone by {{first_milestone_date}}.

Looking forward to creating something amazing together!

Best regards,
{{freelancer_name}}', 
'client_onboarding', 'professional', ARRAY['web-development', 'programming'], 'business', 'standard', 
ARRAY['welcome', 'onboarding', 'requirements', 'timeline', 'project start'], 
'Professional welcome message for web development clients with project setup'),

('Warm Welcome - Design Projects', 
'Hello {{client_name}}! 🎨

Welcome to our creative journey together! I''m thrilled to work on {{project_name}} and bring your vision to life.

Here''s what happens next:
• **Discovery Call**: Let''s discuss your brand, style preferences, and goals
• **Design Concepts**: I''ll create {{concept_count}} initial concepts for your review
• **Refinement**: We''ll perfect your chosen design together
• **Final Delivery**: Complete files ready for implementation

I''m committed to exceeding your expectations and creating designs that truly represent your brand.

Ready to get started? 

Creative regards,
{{freelancer_name}}', 
'client_onboarding', 'warm', ARRAY['graphic-design', 'branding'], 'creative', 'standard', 
ARRAY['welcome', 'creative', 'design', 'brand', 'concepts'], 
'Warm and creative welcome for design and branding clients'),

-- Custom Offer Templates
('Premium Web Development Offer', 
'Hi {{client_name}},

Based on your requirements for {{project_description}}, I''ve crafted a comprehensive solution that will exceed your expectations.

**🚀 What You''ll Get:**
• Custom responsive website with {{features}}
• {{pages_count}} professionally designed pages
• SEO optimization for better search rankings
• Cross-browser compatibility testing
• {{revisions_count}} rounds of revisions included
• 30 days of post-launch support

**⏰ Timeline:** {{delivery_time}} days
**💰 Investment:** ${{price}} ({{savings}}% savings from standard pricing)

**🎁 Bonus:** Free {{bonus_feature}} (worth ${{bonus_value}})

This offer is valid for {{offer_validity}} and includes everything needed to establish your strong online presence.

Ready to get started? Click "Accept Offer" and let''s bring your vision to life!

{{freelancer_name}}', 
'custom_offer', 'premium', ARRAY['web-development'], 'business', 'complex', 
ARRAY['custom offer', 'web development', 'premium', 'features', 'timeline'], 
'Premium custom offer template for complex web development projects'),

('Consultative Marketing Offer', 
'Hello {{client_name}},

Thank you for sharing your marketing challenges with me. I''ve analyzed your needs and developed a strategic approach that will drive real results.

**📊 Situation Analysis:**
{{current_situation}}

**🎯 Recommended Strategy:**
{{strategy_overview}}

**📈 What''s Included:**
• {{deliverable_1}}
• {{deliverable_2}}
• {{deliverable_3}}
• Performance tracking and reporting
• {{consultation_hours}} hours of strategic consultation

**⏱️ Timeline:** {{project_duration}}
**💼 Investment:** ${{total_price}}

**🔥 Expected Results:**
• {{expected_result_1}}
• {{expected_result_2}}
• {{roi_projection}} ROI within {{roi_timeframe}}

I''m confident this approach will transform your marketing performance. Shall we schedule a brief call to discuss the details?

Best regards,
{{freelancer_name}}', 
'custom_offer', 'consultative', ARRAY['digital-marketing', 'strategy'], 'business', 'complex', 
ARRAY['marketing', 'strategy', 'consultation', 'analysis', 'results'], 
'Strategic consulting approach for marketing and business development projects'),

-- Revision Handling Templates
('Collaborative Revision Response', 
'Hi {{client_name}},

Thank you for your detailed feedback on {{deliverable_name}}. I appreciate you taking the time to review everything thoroughly!

**✅ I understand you''d like to adjust:**
{{revision_points}}

**🔄 My Approach:**
I''ll implement these changes while maintaining the core strength of our design. Here''s how I''ll address each point:

{{revision_plan}}

**⏰ Updated Timeline:**
I''ll have the revised version ready by {{revision_deadline}}. This keeps us on track for your {{final_deadline}} launch date.

**💡 Additional Thoughts:**
{{professional_suggestions}}

I''m excited to refine this further and ensure it perfectly matches your vision!

Best,
{{freelancer_name}}', 
'revision_handling', 'collaborative', ARRAY['design', 'development'], 'any', 'standard', 
ARRAY['revision', 'feedback', 'collaboration', 'timeline', 'refinement'], 
'Collaborative approach to handling client revisions and feedback'),

('Efficient Revision Management', 
'Hello {{client_name}},

Thanks for the revision request on {{project_name}}. I''ve reviewed your feedback and here''s the action plan:

**⚡ Quick Summary:**
• {{change_count}} changes requested
• Estimated time: {{estimated_hours}} hours
• Delivery: {{delivery_date}}

**🎯 Changes Breakdown:**
{{detailed_changes}}

**📋 What''s Next:**
1. I''ll start implementing these changes immediately
2. You''ll receive an updated version by {{preview_date}}
3. Final revision delivered by {{final_date}}

**💬 Questions?**
If you need any clarifications or have additional requests, please let me know before I begin.

Ready to move forward!

{{freelancer_name}}', 
'revision_handling', 'efficient', ARRAY['any'], 'any', 'standard', 
ARRAY['revision', 'changes', 'timeline', 'efficient', 'delivery'], 
'Streamlined and efficient revision handling for time-conscious clients');

-- Create function to update template usage statistics
CREATE OR REPLACE FUNCTION update_template_usage(template_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE message_templates 
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = now()
  WHERE id = template_id;
END;
$$;

-- Create function for AI template matching scoring
CREATE OR REPLACE FUNCTION calculate_template_match_score(
  template_id UUID,
  client_message TEXT,
  message_context JSONB DEFAULT '{}'
)
RETURNS DECIMAL(5,4)
LANGUAGE plpgsql
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