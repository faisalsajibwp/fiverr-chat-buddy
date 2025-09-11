import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, AlertTriangle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TemplateUploadProps {
  onUploadComplete?: () => void;
}

interface ParsedTemplate {
  title: string;
  content: string;
  category: string;
  tone_style?: string;
  industry_tags?: string[];
  client_type?: string;
  project_complexity?: string;
  matching_keywords?: string[];
}

export const TemplateUpload = ({ onUploadComplete }: TemplateUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const downloadSampleCSV = () => {
    const sampleData = `title,content,category,tone_style,industry_tags,client_type,project_complexity,matching_keywords
"Welcome Message","Thank you for choosing our services! We're excited to work with you.","greeting","professional","web-development,design","business","standard","welcome,thank you,excited"
"Custom Offer Template","Based on your requirements, here's my custom proposal...","custom_offer","consultative","marketing","business","complex","proposal,custom,requirements"
"Revision Response","Thank you for your feedback. I'll implement the requested changes...","revision_handling","collaborative","any","any","standard","feedback,changes,revision"`;
    
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const parseCSVContent = (csvContent: string): ParsedTemplate[] => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    const templates: ParsedTemplate[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row.trim()) continue;
      
      // Simple CSV parsing (handles quoted values)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < row.length; j++) {
        const char = row[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const template: Partial<ParsedTemplate> = {};
      headers.forEach((header, index) => {
        const value = values[index]?.replace(/"/g, '') || '';
        
        switch (header) {
          case 'title':
            template.title = value;
            break;
          case 'content':
            template.content = value;
            break;
          case 'category':
            template.category = value || 'custom';
            break;
          case 'tone_style':
            template.tone_style = value || 'professional';
            break;
          case 'industry_tags':
            template.industry_tags = value ? value.split(',').map(t => t.trim()) : [];
            break;
          case 'client_type':
            template.client_type = value;
            break;
          case 'project_complexity':
            template.project_complexity = value || 'standard';
            break;
          case 'matching_keywords':
            template.matching_keywords = value ? value.split(',').map(k => k.trim()) : [];
            break;
        }
      });
      
      if (template.title && template.content) {
        templates.push(template as ParsedTemplate);
      }
    }
    
    return templates;
  };

  const parseJSONContent = (jsonContent: string): ParsedTemplate[] => {
    const data = JSON.parse(jsonContent);
    if (!Array.isArray(data)) {
      throw new Error('JSON must contain an array of templates');
    }
    
    return data.map((item: any) => ({
      title: item.title || '',
      content: item.content || item.template_content || '',
      category: item.category || 'custom',
      tone_style: item.tone_style || 'professional',
      industry_tags: Array.isArray(item.industry_tags) ? item.industry_tags : [],
      client_type: item.client_type,
      project_complexity: item.project_complexity || 'standard',
      matching_keywords: Array.isArray(item.matching_keywords) ? item.matching_keywords : []
    })).filter(template => template.title && template.content);
  };

  const formatTemplateContent = (content: string): string => {
    // Auto-format content for consistency
    let formatted = content.trim();
    
    // Normalize line breaks
    formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remove excessive whitespace
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    formatted = formatted.replace(/[ \t]+/g, ' ');
    
    // Capitalize first letter of sentences
    formatted = formatted.replace(/(^|[.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
    
    // Fix common spacing issues
    formatted = formatted.replace(/\s+([.,!?])/g, '$1');
    formatted = formatted.replace(/([.!?])([A-Z])/g, '$1 $2');
    
    // Ensure proper greeting format
    if (formatted.toLowerCase().startsWith('hi ') || formatted.toLowerCase().startsWith('hello ')) {
      formatted = formatted.replace(/^(hi|hello)\s*/i, (match) => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase());
    }
    
    return formatted;
  };

  const analyzeTemplateContent = (content: string): { keywords: string[], category: string, tone: string, complexity: string, clientType: string } => {
    const lowerContent = content.toLowerCase();
    
    // Enhanced keyword extraction
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'your', 'our', 'their'];
    const words = content.match(/\b\w+\b/g) || [];
    const significantWords = words
      .filter(word => word.length > 3 && !commonWords.includes(word.toLowerCase()))
      .map(word => word.toLowerCase())
      .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
      .slice(0, 12);
    
    // Enhanced category detection with scoring
    const categoryScores = {
      'client_onboarding': 0,
      'custom_offer': 0,
      'revision_handling': 0,
      'delivery': 0,
      'follow_up': 0,
      'upselling': 0,
      'requirements_gathering': 0
    };
    
    // Onboarding indicators
    if (/(welcome|hello|thank you for choosing|excited to work|get started|onboard)/i.test(content)) {
      categoryScores.client_onboarding += 3;
    }
    
    // Custom offer indicators
    if (/(proposal|custom offer|price|investment|budget|quote|estimate)/i.test(content)) {
      categoryScores.custom_offer += 3;
    }
    
    // Revision handling indicators
    if (/(revision|feedback|changes|modify|update|adjust)/i.test(content)) {
      categoryScores.revision_handling += 3;
    }
    
    // Delivery indicators
    if (/(delivery|completed|final|finished|ready|done)/i.test(content)) {
      categoryScores.delivery += 3;
    }
    
    // Follow-up indicators
    if (/(follow up|check in|progress|status|update)/i.test(content)) {
      categoryScores.follow_up += 2;
    }
    
    // Upselling indicators
    if (/(additional|upgrade|premium|extra|more|enhance)/i.test(content)) {
      categoryScores.upselling += 2;
    }
    
    // Requirements gathering indicators
    if (/(requirements|clarify|understand|details|specific|information)/i.test(content)) {
      categoryScores.requirements_gathering += 2;
    }
    
    const category = Object.entries(categoryScores)
      .sort(([,a], [,b]) => b - a)[0][0] || 'custom';
    
    // Enhanced tone detection with multiple indicators
    let tone = 'professional';
    const warmIndicators = /(excited|amazing|wonderful|fantastic|love|passion|!{2,})/i;
    const consultativeIndicators = /(strategic|analysis|recommend|suggest|best practice|optimize)/i;
    const efficientIndicators = /(quickly|efficient|fast|immediate|asap|urgent)/i;
    const formalIndicators = /(sincerely|respectfully|formal|official|regards)/i;
    const collaborativeIndicators = /(together|collaborate|partnership|team|work with)/i;
    
    if (warmIndicators.test(content)) tone = 'warm';
    else if (consultativeIndicators.test(content)) tone = 'consultative';
    else if (efficientIndicators.test(content)) tone = 'efficient';
    else if (formalIndicators.test(content)) tone = 'formal';
    else if (collaborativeIndicators.test(content)) tone = 'collaborative';
    
    // Project complexity detection
    let complexity = 'standard';
    if (/(complex|advanced|enterprise|large scale|sophisticated)/i.test(content)) {
      complexity = 'complex';
    } else if (/(simple|basic|quick|small|minor)/i.test(content)) {
      complexity = 'simple';
    }
    
    // Client type detection
    let clientType = 'business';
    if (/(startup|new business|entrepreneur)/i.test(content)) {
      clientType = 'startup';
    } else if (/(enterprise|corporation|large company)/i.test(content)) {
      clientType = 'enterprise';
    } else if (/(individual|personal|freelancer)/i.test(content)) {
      clientType = 'individual';
    } else if (/(agency|marketing|design)/i.test(content)) {
      clientType = 'agency';
    }
    
    return { keywords: significantWords, category, tone, complexity, clientType };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'json', 'txt'].includes(fileExtension || '')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV, JSON, or TXT file.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    try {
      const fileContent = await file.text();
      let templates: ParsedTemplate[] = [];

      // Parse based on file type
      if (fileExtension === 'csv') {
        templates = parseCSVContent(fileContent);
      } else if (fileExtension === 'json') {
        templates = parseJSONContent(fileContent);
      } else if (fileExtension === 'txt') {
        // For TXT files, treat each paragraph as a template with smart formatting
        const paragraphs = fileContent.split('\n\n').filter(p => p.trim());
        templates = paragraphs.map((content, index) => {
          const formattedContent = formatTemplateContent(content);
          const analysis = analyzeTemplateContent(formattedContent);
          
          // Generate smarter titles based on content
          let smartTitle = `Template ${index + 1}`;
          const firstLine = formattedContent.split('\n')[0].substring(0, 50);
          if (firstLine.length > 10) {
            smartTitle = firstLine.replace(/[^\w\s]/g, '').trim();
            if (smartTitle.length > 40) {
              smartTitle = smartTitle.substring(0, 37) + '...';
            }
          }
          
          return {
            title: smartTitle,
            content: formattedContent,
            category: analysis.category,
            tone_style: analysis.tone,
            project_complexity: analysis.complexity,
            client_type: analysis.clientType,
            matching_keywords: analysis.keywords
          };
        });
      }

      if (templates.length === 0) {
        throw new Error('No valid templates found in the file');
      }

      // Create upload session
      const { data: session, error: sessionError } = await supabase
        .from('template_upload_sessions')
        .insert({
          user_id: user.id,
          original_filename: file.name,
          total_templates: templates.length,
          status: 'processing'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Process templates in batches
      const batchSize = 5;
      const errors: string[] = [];
      let successful = 0;

      for (let i = 0; i < templates.length; i += batchSize) {
        const batch = templates.slice(i, i + batchSize);
        
        for (const template of batch) {
          try {
            // Enhanced template with AI analysis and auto-formatting
            const formattedContent = formatTemplateContent(template.content);
            const analysis = analyzeTemplateContent(formattedContent);
            
            const enhancedTemplate = {
              user_id: user.id,
              title: template.title,
              template_content: formattedContent,
              category: template.category || analysis.category,
              tone_style: template.tone_style || analysis.tone,
              industry_tags: template.industry_tags || [],
              client_type: template.client_type || analysis.clientType,
              project_complexity: template.project_complexity || analysis.complexity,
              matching_keywords: template.matching_keywords || analysis.keywords,
              is_ai_generated: false
            };

            const { error } = await supabase
              .from('message_templates')
              .insert(enhancedTemplate);

            if (error) {
              errors.push(`Template "${template.title}": ${error.message}`);
            } else {
              successful++;
            }
          } catch (error) {
            errors.push(`Template "${template.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Update progress
        const processed = Math.min(i + batchSize, templates.length);
        setUploadProgress((processed / templates.length) * 100);
      }

      // Update session
      await supabase
        .from('template_upload_sessions')
        .update({
          processed_templates: successful,
          failed_templates: templates.length - successful,
          status: 'completed',
          completed_at: new Date().toISOString(),
          error_log: errors
        })
        .eq('id', session.id);

      setUploadResults({
        total: templates.length,
        successful,
        failed: templates.length - successful,
        errors
      });

      if (successful > 0) {
        toast({
          title: "Upload completed",
          description: `Successfully imported ${successful} template(s).`
        });
        onUploadComplete?.();
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Template Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Upload your existing templates in CSV, JSON, or TXT format. The system will automatically analyze and categorize them.
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadSampleCSV}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Download Sample CSV
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-file">Choose File</Label>
          <Input
            id="template-file"
            type="file"
            accept=".csv,.json,.txt"
            onChange={handleFileUpload}
            disabled={isUploading}
            ref={fileInputRef}
          />
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Processing templates...
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {uploadResults && (
          <Alert>
            <div className="flex items-center gap-2">
              {uploadResults.failed === 0 ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
              <AlertDescription>
                <div className="space-y-1">
                  <div>
                    <strong>Upload Complete:</strong> {uploadResults.successful} successful, {uploadResults.failed} failed out of {uploadResults.total} total templates.
                  </div>
                  {uploadResults.errors.length > 0 && (
                    <div className="mt-2">
                      <strong>Errors:</strong>
                      <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                        {uploadResults.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {uploadResults.errors.length > 5 && (
                          <li>... and {uploadResults.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div><strong>Supported formats:</strong></div>
          <div>• <strong>CSV:</strong> title, content, category, tone_style, industry_tags, client_type, project_complexity, matching_keywords</div>
          <div>• <strong>JSON:</strong> Array of template objects with the same fields</div>
          <div>• <strong>TXT:</strong> Paragraph-separated templates (auto-analyzed)</div>
        </div>
      </CardContent>
    </Card>
  );
};