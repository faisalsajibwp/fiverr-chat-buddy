import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Copy, Calendar, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SearchableConversation {
  id: string;
  client_message: string;
  bot_response: string;
  message_type: string;
  created_at: string;
  screenshot_url?: string;
}

interface ConversationSearchProps {
  onUseResponse?: (response: string) => void;
}

export const ConversationSearch = ({ onUseResponse }: ConversationSearchProps) => {
  const [conversations, setConversations] = useState<SearchableConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageTypeFilter, setMessageTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading conversations:', error);
        return;
      }

      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesClientMessage = conv.client_message.toLowerCase().includes(query);
        const matchesBotResponse = conv.bot_response.toLowerCase().includes(query);
        if (!matchesClientMessage && !matchesBotResponse) {
          return false;
        }
      }

      // Message type filter
      if (messageTypeFilter !== "all" && conv.message_type !== messageTypeFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== "all") {
        const convDate = new Date(conv.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            if (convDate.toDateString() !== now.toDateString()) return false;
            break;
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (convDate < weekAgo) return false;
            break;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (convDate < monthAgo) return false;
            break;
        }
      }

      return true;
    });
  }, [conversations, searchQuery, messageTypeFilter, dateFilter]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Response copied successfully!"
    });
  };

  const useResponse = (response: string) => {
    if (onUseResponse) {
      onUseResponse(response);
      toast({
        title: "Response applied",
        description: "Response has been loaded into the generator."
      });
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">{part}</mark> : 
        part
    );
  };

  const messageTypes = [...new Set(conversations.map(c => c.message_type))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Conversations
        </CardTitle>
        
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations and responses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={messageTypeFilter} onValueChange={setMessageTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Message Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {messageTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Loading conversations...</p>
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <div className="text-sm text-muted-foreground mb-3">
              Found {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
            </div>
            
            {filteredConversations.map((conversation) => (
              <div key={conversation.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {conversation.message_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(conversation.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(conversation.bot_response)}
                      title="Copy response"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {onUseResponse && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => useResponse(conversation.bot_response)}
                        title="Use this response"
                        className="text-primary hover:text-primary"
                      >
                        Use
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Client Message:</p>
                    <p className="text-sm bg-muted p-2 rounded text-muted-foreground">
                      {highlightText(conversation.client_message, searchQuery)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Generated Response:</p>
                    <p className="text-sm bg-primary/5 p-2 rounded">
                      {highlightText(conversation.bot_response, searchQuery)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations found</p>
            <p className="text-xs mt-1">
              {searchQuery || messageTypeFilter !== "all" || dateFilter !== "all" 
                ? "Try adjusting your search filters" 
                : "Start creating conversations to see them here"
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};