import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import FiverrChatBot from "@/components/ChatBot";
import { Button } from '@/components/ui/button';
import { ProfileSettings } from '@/components/ProfileSettings';
import { LogOut, User } from 'lucide-react';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 relative">
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-primary/10">
          <User className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{user.email}</span>
        </div>
        <ProfileSettings />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={signOut}
          className="bg-background/80 backdrop-blur-sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
      <FiverrChatBot />
    </div>
  );
};

export default Index;
