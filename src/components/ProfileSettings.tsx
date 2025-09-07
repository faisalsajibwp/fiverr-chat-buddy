import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";

export const ProfileSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [fiverrUsername, setFiverrUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { profile, updateProfile, loading } = useProfile();
  const { toast } = useToast();

  const handleOpen = () => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setFiverrUsername(profile.fiverr_username || "");
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const success = await updateProfile({
        display_name: displayName.trim() || null,
        fiverr_username: fiverrUsername.trim() || null
      });

      if (success) {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully."
        });
        setIsOpen(false);
      } else {
        toast({
          title: "Update failed",
          description: "Failed to update profile. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "An error occurred while updating your profile.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Settings className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleOpen}>
          <Settings className="h-4 w-4 mr-2" />
          Profile Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This name will be shown in your profile
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fiverr-username">Fiverr Username</Label>
            <Input
              id="fiverr-username"
              placeholder="Your Fiverr username"
              value={fiverrUsername}
              onChange={(e) => setFiverrUsername(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used for personalized responses and context
            </p>
          </div>
          
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};