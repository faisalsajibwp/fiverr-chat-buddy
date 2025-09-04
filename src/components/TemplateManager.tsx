import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Copy, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface MessageTemplate {
  id: string;
  title: string;
  template_content: string;
  category: string;
  created_at: string;
}

interface TemplateManagerProps {
  onUseTemplate: (content: string) => void;
}

export const TemplateManager = ({ onUseTemplate }: TemplateManagerProps) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("greeting");
  const { user } = useAuth();
  const { toast } = useToast();

  const categories = [
    "greeting", "custom_offer", "revision", "delivery", "timeline", "pricing", "question", "custom"
  ];

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading templates:', error);
        return;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const saveTemplate = async () => {
    if (!user || !title.trim() || !content.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in both title and content.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('message_templates')
          .update({
            title: title.trim(),
            template_content: content.trim(),
            category
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;

        toast({
          title: "Template updated",
          description: "Your template has been updated successfully."
        });
      } else {
        // Create new template
        const { error } = await supabase
          .from('message_templates')
          .insert({
            user_id: user.id,
            title: title.trim(),
            template_content: content.trim(),
            category
          });

        if (error) throw error;

        toast({
          title: "Template saved",
          description: "Your template has been saved successfully."
        });
      }

      // Reset form and reload templates
      setTitle("");
      setContent("");
      setCategory("greeting");
      setEditingTemplate(null);
      setIsDialogOpen(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Template deleted",
        description: "Template has been removed successfully."
      });

      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive"
      });
    }
  };

  const editTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTitle(template.title);
    setContent(template.template_content);
    setCategory(template.category);
    setIsDialogOpen(true);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Template content copied successfully!"
    });
  };

  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTitle("");
    setContent("");
    setCategory("greeting");
    setIsDialogOpen(true);
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Message Templates
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNewTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Edit Template" : "Create New Template"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Title</label>
                  <Input
                    placeholder="Template title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Content</label>
                  <Textarea
                    placeholder="Template content..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[200px]"
                  />
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveTemplate}>
                    {editingTemplate ? "Update" : "Save"} Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-3 space-y-2 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{template.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {template.category.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUseTemplate(template.template_content)}
                      title="Use template"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(template.template_content)}
                      title="Copy to clipboard"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editTemplate(template)}
                      title="Edit template"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
                      title="Delete template"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.template_content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No templates yet</p>
            <p className="text-xs mt-1">Create your first template to save time on common responses</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};