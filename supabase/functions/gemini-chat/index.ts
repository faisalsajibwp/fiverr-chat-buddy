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

    console.log('Processing request with Gemini API and refined response context');

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

    // Get user's templates, conversation history, and refined responses for enhanced AI context
    const [templatesRes, conversationsRes, profileRes, refinedResponsesRes] = await Promise.all([
      supabase.from('message_templates').select('*').eq('user_id', user.id).order('usage_count', { ascending: false }),
      supabase.from('conversations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.rpc('find_similar_refined_responses', {
        user_id_param: user.id,
        client_message_param: clientMessage,
        message_type_param: messageType,
        similarity_limit: 2
      })
    ]);

    const templates = templatesRes.data || [];
    const recentConversations = conversationsRes.data || [];
    const profile = profileRes.data;
    const similarRefinedResponses = refinedResponsesRes.data || [];

    console.log(`Found ${similarRefinedResponses.length} similar refined responses for context`);

    // Find best matching templates using AI scoring
    const templateMatches = await Promise.all(
      templates.slice(0, 5).map(async (template) => {
        try {
          const { data: score } = await supabase.rpc('calculate_template_match_score', {
            template_id: template.id,
            client_message: clientMessage,
            message_context: { message_type: messageType, client_type: userContext.client_type }
          });
          return { template, score: score || 0 };
        } catch (error) {
          return { template, score: 0 };
        }
      })
    );

    const bestMatches = templateMatches
      .filter(match => match.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Build enhanced context-aware prompt with refined response examples
    let systemPrompt = `You are a professional Fiverr assistant helping to craft responses to client messages. 

FIVERR CONTEXT:
- You're helping a freelancer respond to clients professionally
- Responses must be policy-compliant and maintain professional tone
- Focus on clear communication, setting expectations, and building trust

USER CONTEXT:
- Fiverr Username: ${profile?.fiverr_username || 'Not set'}
- User has ${templates.length} saved templates
- Recent conversation patterns: ${recentConversations.slice(0,3).map(c => c.message_type).join(', ')}

MESSAGE TYPE: ${messageType}

REFINED RESPONSE EXAMPLES (Learn from these successful refined responses):
${similarRefinedResponses.length > 0 ? 
  similarRefinedResponses.map((resp, idx) => 
    `Example ${idx + 1} (Similarity: ${(resp.similarity_score * 100).toFixed(0)}%):
    Client Query: "${resp.original_client_message.substring(0, 100)}..."
    Refined Response: "${resp.refined_response.substring(0, 300)}..."
    
    `
  ).join('\n') : 
  'No similar refined responses available - generate based on general guidelines.'}

IMPORTANT: ${similarRefinedResponses.length > 0 ? 
  'Use the refined response examples above as your primary style and formatting reference. These represent the user\'s preferred communication style for similar situations. Match their tone, structure, and approach.' : 
  'Generate a response following standard professional guidelines.'}

GUIDELINES:
1. Be professional but warm and approachable
2. Address client concerns directly
3. Set clear expectations for deliverables and timelines
4. Suggest next steps when appropriate
5. Keep responses concise but complete
6. Use a confident, expert tone
${similarRefinedResponses.length > 0 ? 
  '7. PRIORITY: Match the style and formatting patterns from the refined response examples above' : 
  '7. Follow standard professional communication practices'}

${screenshotUrl ? 'NOTE: The client has shared a screenshot - acknowledge this and reference it appropriately in your response.' : ''}

Generate a professional response to this client message: "${clientMessage}"`;

    console.log('Calling Gemini API with enhanced context');

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

    console.log('Generated response successfully with refined context');

    return new Response(JSON.stringify({ 
      generatedResponse,
      messageType,
      context: {
        templatesUsed: templates.length,
        conversationHistory: recentConversations.length,
        similarRefinedResponses: similarRefinedResponses.length,
        refinedResponseInfluence: similarRefinedResponses.length > 0
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