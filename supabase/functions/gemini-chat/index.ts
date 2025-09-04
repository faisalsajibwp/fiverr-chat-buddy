import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      clientMessage, 
      messageType = 'custom_offer',
      screenshotUrl = null,
      userContext = {}
    } = await req.json();

    console.log('Processing request with Gemini API');

    // Get user info from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get user's message templates and conversation history for context
    const [templatesRes, conversationsRes, profileRes] = await Promise.all([
      supabase.from('message_templates').select('*').eq('user_id', user.id),
      supabase.from('conversations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('*').eq('user_id', user.id).single()
    ]);

    const templates = templatesRes.data || [];
    const recentConversations = conversationsRes.data || [];
    const profile = profileRes.data;

    // Build context-aware prompt
    const systemPrompt = `You are a professional Fiverr assistant helping to craft responses to client messages. 

FIVERR CONTEXT:
- You're helping a freelancer respond to clients professionally
- Responses must be policy-compliant and maintain professional tone
- Focus on clear communication, setting expectations, and building trust

USER CONTEXT:
- Fiverr Username: ${profile?.fiverr_username || 'Not set'}
- User has ${templates.length} saved templates
- Recent conversation patterns: ${recentConversations.slice(0,3).map(c => c.message_type).join(', ')}

MESSAGE TYPE: ${messageType}

GUIDELINES:
1. Be professional but warm and approachable
2. Address client concerns directly
3. Set clear expectations for deliverables and timelines
4. Suggest next steps when appropriate
5. Keep responses concise but complete
6. Use a confident, expert tone

${screenshotUrl ? 'NOTE: The client has shared a screenshot - acknowledge this and reference it appropriately in your response.' : ''}

Generate a professional response to this client message: "${clientMessage}"`;

    // Call Google Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      })
    });

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', await geminiResponse.text());
      throw new Error('Failed to generate response with Gemini');
    }

    const geminiData = await geminiResponse.json();
    const generatedResponse = geminiData.candidates[0].content.parts[0].text;

    console.log('Generated response successfully');

    return new Response(JSON.stringify({ 
      generatedResponse,
      messageType,
      context: {
        templatesUsed: templates.length,
        conversationHistory: recentConversations.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback: "Thank you for your message! I understand your requirements and I'm here to help. Let me review the details and get back to you with a comprehensive response shortly."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});