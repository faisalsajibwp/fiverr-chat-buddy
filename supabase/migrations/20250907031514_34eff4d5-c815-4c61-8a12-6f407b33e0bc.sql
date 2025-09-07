-- Add an index on conversations for better search performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_created 
ON conversations(user_id, created_at DESC);

-- Add an index on message_templates for better query performance
CREATE INDEX IF NOT EXISTS idx_templates_user_category 
ON message_templates(user_id, category);

-- Add full-text search capabilities for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_client_message_gin 
ON conversations USING gin(to_tsvector('english', client_message));

CREATE INDEX IF NOT EXISTS idx_conversations_bot_response_gin 
ON conversations USING gin(to_tsvector('english', bot_response));

-- Add a function to update profile timestamps automatically
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();