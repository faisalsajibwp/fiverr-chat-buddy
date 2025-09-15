-- Create refined_responses table for storing fine-tuned responses
CREATE TABLE public.refined_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_client_message TEXT NOT NULL,
  original_response TEXT NOT NULL,
  refined_response TEXT NOT NULL,
  message_type TEXT,
  similarity_keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.refined_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own refined responses" 
ON public.refined_responses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own refined responses" 
ON public.refined_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own refined responses" 
ON public.refined_responses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own refined responses" 
ON public.refined_responses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_refined_responses_updated_at
BEFORE UPDATE ON public.refined_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to find similar refined responses
CREATE OR REPLACE FUNCTION public.find_similar_refined_responses(
  user_id_param UUID,
  client_message_param TEXT,
  message_type_param TEXT DEFAULT NULL,
  similarity_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  original_client_message TEXT,
  refined_response TEXT,
  similarity_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rr.id,
    rr.original_client_message,
    rr.refined_response,
    -- Simple keyword-based similarity scoring
    CASE 
      WHEN rr.message_type = message_type_param THEN 0.3
      ELSE 0.0
    END +
    -- Count matching words (simple implementation)
    (
      SELECT COUNT(*)::NUMERIC / GREATEST(
        array_length(string_to_array(LOWER(client_message_param), ' '), 1),
        array_length(string_to_array(LOWER(rr.original_client_message), ' '), 1)
      ) * 0.7
      FROM unnest(string_to_array(LOWER(client_message_param), ' ')) AS word1
      WHERE word1 = ANY(string_to_array(LOWER(rr.original_client_message), ' '))
    ) AS similarity_score
  FROM public.refined_responses rr
  WHERE rr.user_id = user_id_param
  ORDER BY similarity_score DESC
  LIMIT similarity_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;