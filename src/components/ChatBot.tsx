import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Send, Sparkles, MessageCircle, FileText, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  clientMessage: string;
  generatedResponse: string;
  timestamp: Date;
}

interface DatabaseConversation {
  id: string;
  client_message: string;
  bot_response: string;
  message_type: string;
  created_at: string;
}

const FiverrChatBot = () => {
  const [clientMessage, setClientMessage] = useState("");
  const [generatedResponse, setGeneratedResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversations, setConversations] = useState<ChatMessage[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load conversation history on component mount
  useEffect(() => {
    if (user) {
      loadConversationHistory();
    }
  }, [user]);

  const loadConversationHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading conversation history:', error);
        return;
      }

      const formattedHistory: ChatMessage[] = data.map((conv: DatabaseConversation) => ({
        id: conv.id,
        clientMessage: conv.client_message,
        generatedResponse: conv.bot_response,
        timestamp: new Date(conv.created_at),
      }));

      setConversations(formattedHistory);
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const saveConversationToDb = async (clientMsg: string, botResp: string, msgType: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          client_message: clientMsg,
          bot_response: botResp,
          message_type: msgType,
        });

      if (error) {
        console.error('Error saving conversation:', error);
      } else {
        // Reload conversation history
        loadConversationHistory();
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const responseTemplates = {
    greeting: "Thank you for reaching out! I'm excited to help you with your project. Could you please provide more details about what you're looking for?",
    customOffer: "Based on your requirements, I'd be happy to create a custom offer for you. This will ensure the scope and pricing are tailored specifically to your needs. Please share more details about your project timeline and specific requirements.",
    revision: "Thank you for your feedback! I understand you'd like some revisions. I'm committed to delivering exactly what you're looking for. Could you please specify what changes you'd like to see?",
    delivery: "I'm pleased to inform you that your order is ready for delivery! I've completed all the work according to your specifications. Please review the delivery and let me know if you need any adjustments.",
    timeline: "I appreciate your patience with the timeline. I want to ensure I deliver the highest quality work for you. I'll have this completed by [specific date] and will keep you updated on the progress."
  };

  const generateResponse = (template?: string) => {
    setIsGenerating(true);
    
    // Simulate AI response generation
    setTimeout(() => {
      let response = "";
      
      if (template) {
        response = responseTemplates[template as keyof typeof responseTemplates];
      } else {
        // Basic response generation based on client message
        const message = clientMessage.toLowerCase();
        
        if (message.includes("hello") || message.includes("hi") || message.includes("hey")) {
          response = responseTemplates.greeting;
        } else if (message.includes("price") || message.includes("cost") || message.includes("quote")) {
          response = responseTemplates.customOffer;
        } else if (message.includes("change") || message.includes("revision") || message.includes("modify")) {
          response = responseTemplates.revision;
        } else if (message.includes("when") || message.includes("timeline") || message.includes("deadline")) {
          response = responseTemplates.timeline;
        } else {
          response = "Thank you for your message! I understand your requirements and I'm here to help. Let me know if you need any clarification or have additional questions about the project.";
        }
      }
      
      setGeneratedResponse(response);
      setIsGenerating(false);
    }, 1500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Response copied successfully!",
    });
  };

  const saveConversation = async () => {
    if (clientMessage && generatedResponse) {
      const newConversation: ChatMessage = {
        id: Date.now().toString(),
        clientMessage,
        generatedResponse,
        timestamp: new Date(),
      };
      
      setConversations([newConversation, ...conversations]);
      
      // Save to database
      await saveConversationToDb(clientMessage, generatedResponse, 'custom_offer');
      
      setClientMessage("");
      setGeneratedResponse("");
      
      toast({
        title: "Conversation saved",
        description: "Added to your conversation history.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MessageCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Fiverr Chat Assistant
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Professional response generator for Fiverr communications. Paste client messages and get policy-compliant, professional replies.
          </p>
        </div>

        {/* Main Interface */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Input and Templates */}
          <div className="lg:col-span-2 space-y-6">
          {/* Input Panel */}
          <Card className="shadow-soft transition-all duration-300 hover:shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Client Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your client's message here..."
                value={clientMessage}
                onChange={(e) => setClientMessage(e.target.value)}
                className="min-h-[200px] resize-none"
              />
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">Tip: Copy entire client message</Badge>
                <Badge variant="outline" className="text-xs">Maintain context</Badge>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Quick Templates:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(responseTemplates).map((template) => (
                    <Button
                      key={template}
                      variant="outline"
                      size="sm"
                      onClick={() => generateResponse(template)}
                      className="text-xs capitalize"
                    >
                      {template.replace(/([A-Z])/g, ' $1').trim()}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Panel */}
          <Card className="shadow-soft transition-all duration-300 hover:shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generated Response
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="min-h-[200px] p-4 bg-muted rounded-lg border-2 border-dashed border-border">
                {generatedResponse ? (
                  <p className="text-foreground leading-relaxed">{generatedResponse}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    {isGenerating ? "Generating professional response..." : "Your generated response will appear here"}
                  </p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="text-xs">Fiverr Policy Compliant</Badge>
                <Badge variant="outline" className="text-xs">Professional Tone</Badge>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => generateResponse()}
                  disabled={!clientMessage || isGenerating}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isGenerating ? "Generating..." : "Generate Response"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(generatedResponse)}
                  disabled={!generatedResponse}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="default"
                  onClick={saveConversation}
                  disabled={!clientMessage || !generatedResponse}
                  className="bg-success hover:bg-success/90 text-success-foreground"
                >
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
          
          {/* Right Column - Conversation History Sidebar */}
          <div className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Conversations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {conversations.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {conversations.map((conversation) => (
                      <div key={conversation.id} className="border rounded-lg p-3 space-y-2 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {conversation.timestamp.toLocaleDateString()}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(conversation.generatedResponse)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Client:</p>
                            <p className="text-xs bg-muted p-2 rounded text-muted-foreground line-clamp-2">
                              {conversation.clientMessage}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Response:</p>
                            <p className="text-xs bg-primary/5 p-2 rounded line-clamp-3">
                              {conversation.generatedResponse}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">Your chat history will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiverrChatBot;