import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Library, Search, Copy, Plus, Star, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface CuratedTemplate {
  id: string;
  title: string;
  template_content: string;
  category: string;
  tone_style: string;
  industry_tags: string[];
  client_type: string;
  project_complexity: string;
  template_variables: any;
  matching_keywords: string[];
  usage_description: string;
}

interface CuratedTemplatesLibraryProps {
  onUseTemplate: (content: string) => void;
  onAddToPersonal: (template: CuratedTemplate) => void;
}

export const CuratedTemplatesLibrary = ({ onUseTemplate, onAddToPersonal }: CuratedTemplatesLibraryProps) => {
  const [templates, setTemplates] = useState<CuratedTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<CuratedTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTone, setSelectedTone] = useState("all");
  const [selectedComplexity, setSelectedComplexity] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "client_onboarding", label: "Client Onboarding" },
    { value: "custom_offer", label: "Custom Offers" },
    { value: "revision_handling", label: "Revision Handling" },
    { value: "delivery", label: "Delivery & Completion" },
    { value: "timeline_management", label: "Timeline Management" },
    { value: "issue_resolution", label: "Issue Resolution" }
  ];

  const toneStyles = [
    { value: "all", label: "All Tones" },
    { value: "professional", label: "Professional" },
    { value: "warm", label: "Warm & Friendly" },
    { value: "consultative", label: "Consultative" },
    { value: "collaborative", label: "Collaborative" },
    { value: "efficient", label: "Direct & Efficient" },
    { value: "premium", label: "Premium Service" }
  ];

  const complexityLevels = [
    { value: "all", label: "All Levels" },
    { value: "simple", label: "Simple Projects" },
    { value: "standard", label: "Standard Projects" },
    { value: "complex", label: "Complex Projects" }
  ];

  useEffect(() => {
    loadCuratedTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, selectedTone, selectedComplexity]);

  const loadCuratedTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('curated_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading curated templates:', error);
        return;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading curated templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.title.toLowerCase().includes(query) ||
        template.template_content.toLowerCase().includes(query) ||
        template.usage_description.toLowerCase().includes(query) ||
        template.matching_keywords.some(keyword => keyword.toLowerCase().includes(query)) ||
        template.industry_tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Tone filter
    if (selectedTone !== "all") {
      filtered = filtered.filter(template => template.tone_style === selectedTone);
    }

    // Complexity filter
    if (selectedComplexity !== "all") {
      filtered = filtered.filter(template => template.project_complexity === selectedComplexity);
    }

    setFilteredTemplates(filtered);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Template content copied successfully!"
    });
  };

  const handleAddToPersonal = async (template: CuratedTemplate) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add templates to your personal library.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('message_templates')
        .insert({
          user_id: user.id,
          title: template.title,
          template_content: template.template_content,
          category: template.category,
          tone_style: template.tone_style,
          industry_tags: template.industry_tags,
          client_type: template.client_type,
          project_complexity: template.project_complexity,
          template_variables: template.template_variables,
          matching_keywords: template.matching_keywords,
          is_ai_generated: false
        });

      if (error) throw error;

      toast({
        title: "Template added",
        description: "Template has been added to your personal library!"
      });

      onAddToPersonal(template);
    } catch (error) {
      console.error('Error adding template to personal library:', error);
      toast({
        title: "Error",
        description: "Failed to add template to your library.",
        variant: "destructive"
      });
    }
  };

  const processTemplateVariables = (content: string, variables: any) => {
    let processed = content;
    
    // Replace template variables with placeholder text
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      const replacement = `[${key.replace(/_/g, ' ').toUpperCase()}]`;
      processed = processed.replace(new RegExp(placeholder, 'g'), replacement);
    });
    
    return processed;
  };

  const getIndustryColor = (tags: string[]) => {
    if (tags.includes('web-development') || tags.includes('programming')) return 'bg-blue-100 text-blue-800';
    if (tags.includes('graphic-design') || tags.includes('branding')) return 'bg-purple-100 text-purple-800';
    if (tags.includes('digital-marketing') || tags.includes('strategy')) return 'bg-green-100 text-green-800';
    if (tags.includes('writing') || tags.includes('content')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Template Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Library className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Loading curated templates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Library className="h-5 w-5" />
          Curated Template Library
          <Badge variant="secondary" className="ml-auto">
            {filteredTemplates.length} templates
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates, keywords, or industry tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedTone} onValueChange={setSelectedTone}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tone" />
              </SelectTrigger>
              <SelectContent>
                {toneStyles.map(tone => (
                  <SelectItem key={tone.value} value={tone.value}>
                    {tone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedComplexity} onValueChange={setSelectedComplexity}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Complexity" />
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

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">{template.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {template.category.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {template.tone_style}
                      </Badge>
                      {template.project_complexity !== 'standard' && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                          {template.project_complexity}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {template.usage_description}
                    </p>
                    
                    {template.industry_tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {template.industry_tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className={`text-xs ${getIndustryColor(template.industry_tags)}`}>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUseTemplate(processTemplateVariables(template.template_content, template.template_variables))}
                      title="Use template"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(processTemplateVariables(template.template_content, template.template_variables))}
                      title="Copy to clipboard"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddToPersonal(template)}
                      title="Add to personal library"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded p-3">
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {processTemplateVariables(template.template_content, template.template_variables)}
                  </p>
                </div>
                
                {template.matching_keywords.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">Keywords:</span>
                    {template.matching_keywords.slice(0, 5).map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                        {keyword}
                      </Badge>
                    ))}
                    {template.matching_keywords.length > 5 && (
                      <span className="text-xs text-muted-foreground">+{template.matching_keywords.length - 5} more</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No templates match your current filters</p>
            <p className="text-xs mt-1">Try adjusting your search criteria</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};