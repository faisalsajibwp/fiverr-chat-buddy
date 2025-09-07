import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const ExportData = () => {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportType, setExportType] = useState<'conversations' | 'templates' | 'all'>('conversations');
  const [isExporting, setIsExporting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const exportData = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to export data.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      let data: any[] = [];
      let filename = '';

      // Fetch data based on export type
      if (exportType === 'conversations' || exportType === 'all') {
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (convError) throw convError;

        if (exportType === 'conversations') {
          data = conversations || [];
          filename = `fiverr-conversations-${new Date().toISOString().split('T')[0]}`;
        } else {
          data.push({ conversations: conversations || [] });
        }
      }

      if (exportType === 'templates' || exportType === 'all') {
        const { data: templates, error: tempError } = await supabase
          .from('message_templates')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (tempError) throw tempError;

        if (exportType === 'templates') {
          data = templates || [];
          filename = `fiverr-templates-${new Date().toISOString().split('T')[0]}`;
        } else if (exportType === 'all') {
          if (data.length > 0) {
            data[0].templates = templates || [];
          } else {
            data.push({ templates: templates || [] });
          }
          filename = `fiverr-data-${new Date().toISOString().split('T')[0]}`;
        }
      }

      // Generate file content
      let content = '';
      let mimeType = '';

      if (exportFormat === 'json') {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        filename += '.json';
      } else { // CSV format
        if (exportType === 'all') {
          toast({
            title: "Format not supported",
            description: "CSV export is not available for 'All Data'. Please select JSON format.",
            variant: "destructive"
          });
          return;
        }

        // Convert to CSV
        if (data.length === 0) {
          content = 'No data available';
        } else {
          const headers = Object.keys(data[0]).join(',');
          const rows = data.map(row => 
            Object.values(row).map(value => 
              typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
            ).join(',')
          );
          content = [headers, ...rows].join('\n');
        }
        mimeType = 'text/csv';
        filename += '.csv';
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Your ${exportType} data has been exported as ${exportFormat.toUpperCase()}.`
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Export Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Data Type</label>
            <Select value={exportType} onValueChange={(value: 'conversations' | 'templates' | 'all') => setExportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversations">Conversations Only</SelectItem>
                <SelectItem value="templates">Templates Only</SelectItem>
                <SelectItem value="all">All Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Format</label>
            <Select value={exportFormat} onValueChange={(value: 'csv' | 'json') => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>• CSV format is ideal for spreadsheet applications</p>
          <p>• JSON format preserves all data structure</p>
          <p>• Exported data includes all your conversations and templates</p>
        </div>

        <Button 
          onClick={exportData} 
          disabled={isExporting}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Exporting..." : `Export as ${exportFormat.toUpperCase()}`}
        </Button>
      </CardContent>
    </Card>
  );
};