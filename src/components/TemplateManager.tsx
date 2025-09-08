import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Copy, BookOpen, Upload, Star, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TemplateUpload } from './TemplateUpload';
import { CuratedTemplatesLibrary } from './CuratedTemplatesLibrary';

interface MessageTemplate {
  id: string;
  title: string;
  template_content: string;
  category: string;
  created_at: string;
  tone_style?: string;
  industry_tags?: string[];
  usage_count?: number;
  success_rating?: number;
  is_ai_generated?: boolean;
  template_variables?: any;
  matching_keywords?: string[];
  client_type?: string;
  project_complexity?: string;
  last_used_at?: string;
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
  const [category, setCategory] = useState("client_onboarding");
  const [toneStyle, setToneStyle] = useState("professional");
  const [clientType, setClientType] = useState("");
  const [projectComplexity, setProjectComplexity] = useState("standard");
  const [industryTags, setIndustryTags] = useState("");
  const [matchingKeywords, setMatchingKeywords] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const categories = [
    { value: "client_onboarding", label: "Client Onboarding" },
    { value: "custom_offer", label: "Custom Offers" },
    { value: "revision_handling", label: "Revision Handling" },
    { value: "delivery", label: "Delivery & Completion" },
    { value: "timeline_management", label: "Timeline Management" },
    { value: "pricing_discussion", label: "Pricing Discussion" },
    { value: "issue_resolution", label: "Issue Resolution" },
    { value: "relationship_building", label: "Relationship Building" },
    { value: "custom", label: "Custom" }
  ];

  const toneStyles = [
    { value: "professional", label: "Professional" },
    { value: "warm", label: "Warm & Friendly" },
    { value: "consultative", label: "Consultative" },
    { value: "collaborative", label: "Collaborative" },
    { value: "efficient", label: "Direct & Efficient" },
    { value: "premium", label: "Premium Service" }
  ];

  const complexityLevels = [
    { value: "simple", label: "Simple" },
    { value: "standard", label: "Standard" },
    { value: "complex", label: "Complex" }
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
      const templateData = {
        title: title.trim(),
        template_content: content.trim(),
        category,
        tone_style: toneStyle,
        client_type: clientType.trim() || null,
        project_complexity: projectComplexity,
        industry_tags: industryTags.trim() ? industryTags.split(',').map(tag => tag.trim()) : [],
        matching_keywords: matchingKeywords.trim() ? matchingKeywords.split(',').map(kw => kw.trim()) : [],
        is_ai_generated: false
      };

      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('message_templates')
          .update(templateData)
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
            ...templateData
          });

        if (error) throw error;

        toast({
          title: "Template saved",
          description: "Your template has been saved successfully."
        });
      }

      resetForm();
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

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("client_onboarding");
    setToneStyle("professional");
    setClientType("");
    setProjectComplexity("standard");
    setIndustryTags("");
    setMatchingKeywords("");
    setEditingTemplate(null);
    setIsDialogOpen(false);
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
    setToneStyle(template.tone_style || "professional");
    setClientType(template.client_type || "");
    setProjectComplexity(template.project_complexity || "standard");
    setIndustryTags(template.industry_tags?.join(', ') || "");
    setMatchingKeywords(template.matching_keywords?.join(', ') || "");
    setIsDialogOpen(true);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Template content copied successfully!"
    });
  };

  const useTemplateAndTrack = async (template: MessageTemplate) => {
    // Track template usage
    try {
      await supabase.rpc('update_template_usage', { template_id: template.id });
    } catch (error) {
      console.error('Error tracking template usage:', error);
    }
    onUseTemplate(template.template_content);
  };

  const openNewTemplate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleCuratedTemplateAdd = () => {
    loadTemplates(); // Refresh the list when a curated template is added
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            My Templates
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Curated Library
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-6">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  My Templates
                  <Badge variant="secondary" className="ml-2">
                    {templates.length}
                  </Badge>
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={openNewTemplate}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate ? "Edit Template" : "Create New Template"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
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
                          <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Tone Style</label>
                          <Select value={toneStyle} onValueChange={setToneStyle}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {toneStyles.map(tone => (
                                <SelectItem key={tone.value} value={tone.value}>
                                  {tone.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium mb-2 block">Project Complexity</label>
                          <Select value={projectComplexity} onValueChange={setProjectComplexity}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {complexityLevels.map(level => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Client Type (optional)</label>
                        <Input
                          placeholder="e.g., business, startup, individual, agency"
                          value={clientType}
                          onChange={(e) => setClientType(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Industry Tags (comma-separated)</label>
                        <Input
                          placeholder="e.g., web-development, design, marketing"
                          value={industryTags}
                          onChange={(e) => setIndustryTags(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Matching Keywords (comma-separated)</label>
                        <Input
                          placeholder="e.g., welcome, proposal, revision, delivery"
                          value={matchingKeywords}
                          onChange={(e) => setMatchingKeywords(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Template Content</label>
                        <Textarea
                          placeholder="Write your template content here. Use {{variable_name}} for dynamic content..."
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className="min-h-[200px]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Tip: Use variables like {`{{client_name}}, {{project_name}}, {{deadline}}`} for personalization
                        </p>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm">{template.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {template.category.replace(/_/g, ' ')}
                          </Badge>
                          {template.tone_style && (
                            <Badge variant="secondary" className="text-xs">
                              {template.tone_style}
                            </Badge>
                          )}
                          {template.usage_count && template.usage_count > 0 && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {template.usage_count}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => useTemplateAndTrack(template)}
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

                      {(template.industry_tags?.length || template.matching_keywords?.length) && (
                        <div className="flex gap-1 flex-wrap">
                          {template.industry_tags?.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700">
                              {tag}
                            </Badge>
                          ))}
                          {template.matching_keywords?.slice(0, 3).map((keyword, index) => (
                            <Badge key={`kw-${index}`} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
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
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          <CuratedTemplatesLibrary 
            onUseTemplate={onUseTemplate} 
            onAddToPersonal={handleCuratedTemplateAdd}
          />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <TemplateUpload onUploadComplete={loadTemplates} />
        </TabsContent>
      </Tabs>
    </div>
  );
};