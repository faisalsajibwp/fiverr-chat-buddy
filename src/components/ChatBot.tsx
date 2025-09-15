import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Send, Sparkles, MessageCircle, FileText, History, Settings, Edit, Save } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TemplateManager } from './TemplateManager';
import { ScreenshotUpload } from './ScreenshotUpload';
import { ConversationAnalytics } from './ConversationAnalytics';
import { ConversationSearch } from './ConversationSearch';
import { ExportData } from './ExportData';

interface ChatMessage {
  id: string;
  clientMessage: string;
  generatedResponse: string;
  timestamp: Date;
  screenshotUrl?: string;
}

interface DatabaseConversation {
  id: string;
  client_message: string;
  bot_response: string;
  message_type: string;
  created_at: string;
  screenshot_url?: string;
}

const FiverrChatBot = () => {
  const [clientMessage, setClientMessage] = useState("");
  const [generatedResponse, setGeneratedResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversations, setConversations] = useState<ChatMessage[]>([]);
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  const [messageType, setMessageType] = useState("custom_offer");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedResponse, setEditedResponse] = useState("");
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
        screenshotUrl: conv.screenshot_url,
      }));

      setConversations(formattedHistory);
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const saveConversationToDb = async (clientMsg: string, botResp: string, msgType: string, screenshotUrl?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          client_message: clientMsg,
          bot_response: botResp,
          message_type: msgType,
          screenshot_url: screenshotUrl,
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

  const generateResponse = async (template?: string) => {
    if (!clientMessage.trim()) {
      toast({
        title: "Missing message",
        description: "Please enter a client message first.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      if (template) {
        // Use template response
        const response = responseTemplates[template as keyof typeof responseTemplates];
        setGeneratedResponse(response);
      } else {
        // Call Gemini API via edge function
        const { data, error } = await supabase.functions.invoke('gemini-chat', {
          body: {
            clientMessage,
            messageType,
            screenshotUrl: screenshotUrl || null,
            userContext: {
              timestamp: new Date().toISOString()
            }
          }
        });

        if (error) {
          console.error('Error calling Gemini API:', error);
          throw error;
        }

        setGeneratedResponse(data.generatedResponse || data.fallback);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      toast({
        title: "Generation failed",
        description: "Failed to generate response. Using fallback.",
        variant: "destructive"
      });
      
      // Fallback response
      setGeneratedResponse("Thank you for your message! I understand your requirements and I'm here to help. Let me review the details and get back to you with a comprehensive response shortly.");
    } finally {
      setIsGenerating(false);
    }
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
        screenshotUrl,
      };
      
      setConversations([newConversation, ...conversations]);
      
      // Save to database
      await saveConversationToDb(clientMessage, generatedResponse, messageType, screenshotUrl);
      
      setClientMessage("");
      setGeneratedResponse("");
      setScreenshotUrl("");
      
      toast({
        title: "Conversation saved",
        description: "Added to your conversation history.",
      });
    }
  };

  const saveRefinedResponse = async () => {
    if (!clientMessage || !generatedResponse || !editedResponse) return;

    try {
      const { error } = await supabase
        .from('refined_responses')
        .insert({
          user_id: user?.id,
          original_client_message: clientMessage,
          original_response: generatedResponse,
          refined_response: editedResponse,
          message_type: messageType,
          similarity_keywords: clientMessage.toLowerCase().split(' ').filter(word => word.length > 3)
        });

      if (error) throw error;

      setGeneratedResponse(editedResponse);
      setIsEditing(false);
      setEditedResponse("");

      toast({
        title: "Response refined and saved",
        description: "Your refined response will be used as reference for similar future queries.",
      });
    } catch (error) {
      console.error('Error saving refined response:', error);
      toast({
        title: "Error",
        description: "Failed to save refined response.",
        variant: "destructive",
      });
    }
  };

  const startEditing = () => {
    setEditedResponse(generatedResponse);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedResponse("");
  };

  const useTemplate = (content: string) => {
    setGeneratedResponse(content);
    toast({
      title: "Template applied",
      description: "Template content has been loaded.",
    });
  };

  const handleScreenshotUploaded = (url: string) => {
    setScreenshotUrl(url);
  };

  const removeScreenshot = () => {
    setScreenshotUrl("");
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
          
          {/* Message Type and Screenshot Upload */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Message Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                >
                  <option value="greeting">Greeting</option>
                  <option value="custom_offer">Custom Offer</option>
                  <option value="revision">Revision Request</option>
                  <option value="delivery">Delivery</option>
                  <option value="timeline">Timeline Discussion</option>
                  <option value="pricing">Pricing Question</option>
                  <option value="question">General Question</option>
                </select>
              </CardContent>
            </Card>
            
            <ScreenshotUpload 
              onScreenshotUploaded={handleScreenshotUploaded}
              currentScreenshot={screenshotUrl}
              onRemoveScreenshot={removeScreenshot}
            />
          </div>
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
                {isEditing && <Badge variant="secondary" className="ml-2">Editing</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="min-h-[200px] p-4 bg-muted rounded-lg border-2 border-dashed border-border">
                {isEditing ? (
                  <Textarea
                    value={editedResponse}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    className="min-h-[200px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                    placeholder="Edit and refine your response..."
                  />
                ) : generatedResponse ? (
                  <div className="text-foreground leading-relaxed prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-code:text-foreground prose-pre:bg-background prose-pre:text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {generatedResponse}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">
                    {isGenerating ? "Generating professional response..." : "Your generated response will appear here"}
                  </p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="text-xs">Fiverr Policy Compliant</Badge>
                <Badge variant="outline" className="text-xs">Professional Tone</Badge>
                {isEditing && <Badge variant="secondary" className="text-xs">Fine-tuning Mode</Badge>}
              </div>
              
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    onClick={saveRefinedResponse}
                    disabled={!editedResponse.trim()}
                    className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Refined Response
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
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
                    onClick={startEditing}
                    disabled={!generatedResponse}
                    title="Fine-tune this response"
                  >
                    <Edit className="h-4 w-4" />
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
              )}
            </CardContent>
          </Card>
          </div>
          
          {/* Right Column - Templates and History */}
          <div className="space-y-6">
            {/* Tools Control Panel */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Tools & Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={showTemplates ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-xs"
                  >
                    Templates
                  </Button>
                  <Button
                    variant={showSearch ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowSearch(!showSearch)}
                    className="text-xs"
                  >
                    Search
                  </Button>
                  <Button
                    variant={showAnalytics ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className="text-xs"
                  >
                    Analytics
                  </Button>
                  <Button
                    variant={showExport ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowExport(!showExport)}
                    className="text-xs"
                  >
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Template Manager */}
            {showTemplates && (
              <TemplateManager onUseTemplate={useTemplate} />
            )}

            {/* Conversation Search */}
            {showSearch && (
              <ConversationSearch onUseResponse={useTemplate} />
            )}

            {/* Analytics Dashboard */}
            {showAnalytics && (
              <ConversationAnalytics />
            )}

            {/* Export Data */}
            {showExport && (
              <ExportData />
            )}
            
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
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          <strong>Client:</strong> {conversation.clientMessage.substring(0, 80)}...
                        </div>
                        <div className="text-xs line-clamp-3">
                          <strong>Response:</strong> {conversation.generatedResponse.substring(0, 120)}...
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No conversations yet</p>
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