import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, MessageCircle, Clock, Target } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  totalConversations: number;
  messageTypes: { name: string; value: number; color: string }[];
  dailyActivity: { date: string; conversations: number }[];
  averageResponseLength: number;
  mostActiveHour: number;
}

const MESSAGE_TYPE_COLORS = {
  greeting: '#4F46E5',
  custom_offer: '#059669',
  revision: '#DC2626',
  delivery: '#7C3AED',
  timeline: '#EA580C',
  pricing: '#0891B2',
  question: '#6366F1'
};

export const ConversationAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get conversations from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading analytics:', error);
        return;
      }

      if (!conversations) {
        setAnalytics({
          totalConversations: 0,
          messageTypes: [],
          dailyActivity: [],
          averageResponseLength: 0,
          mostActiveHour: 0
        });
        return;
      }

      // Process analytics data
      const totalConversations = conversations.length;
      
      // Message types analysis
      const messageTypeCounts: Record<string, number> = {};
      conversations.forEach(conv => {
        const type = conv.message_type || 'other';
        messageTypeCounts[type] = (messageTypeCounts[type] || 0) + 1;
      });
      
      const messageTypes = Object.entries(messageTypeCounts).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value,
        color: MESSAGE_TYPE_COLORS[name as keyof typeof MESSAGE_TYPE_COLORS] || '#6B7280'
      }));

      // Daily activity
      const dailyActivityMap: Record<string, number> = {};
      conversations.forEach(conv => {
        const date = new Date(conv.created_at).toDateString();
        dailyActivityMap[date] = (dailyActivityMap[date] || 0) + 1;
      });
      
      const dailyActivity = Object.entries(dailyActivityMap)
        .map(([date, conversations]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          conversations
        }))
        .slice(-14); // Last 14 days

      // Average response length
      const totalResponseLength = conversations.reduce((sum, conv) => sum + (conv.bot_response?.length || 0), 0);
      const averageResponseLength = totalConversations > 0 ? Math.round(totalResponseLength / totalConversations) : 0;

      // Most active hour
      const hourCounts: Record<number, number> = {};
      conversations.forEach(conv => {
        const hour = new Date(conv.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      const mostActiveHour = Object.entries(hourCounts).reduce((mostActive, [hour, count]) => {
        return count > (hourCounts[mostActive] || 0) ? parseInt(hour) : mostActive;
      }, 0);

      setAnalytics({
        totalConversations,
        messageTypes,
        dailyActivity,
        averageResponseLength,
        mostActiveHour
      });

    } catch (error) {
      console.error('Error processing analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">No analytics data available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Conversations</p>
                <p className="text-lg font-bold">{analytics.totalConversations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-success" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Avg Response Length</p>
                <p className="text-lg font-bold">{analytics.averageResponseLength}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-accent" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Most Active Hour</p>
                <p className="text-lg font-bold">{analytics.mostActiveHour}:00</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-fiverr" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Message Types</p>
                <p className="text-lg font-bold">{analytics.messageTypes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Daily Activity (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="conversations" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Message Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Message Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.messageTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {analytics.messageTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-4">
              {analytics.messageTypes.map((type, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <div 
                    className="w-2 h-2 rounded-full mr-1" 
                    style={{ backgroundColor: type.color }}
                  />
                  {type.name} ({type.value})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};