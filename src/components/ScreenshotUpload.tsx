import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, X, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ScreenshotUploadProps {
  onScreenshotUploaded: (url: string) => void;
  currentScreenshot?: string;
  onRemoveScreenshot: () => void;
}

export const ScreenshotUpload = ({ 
  onScreenshotUploaded, 
  currentScreenshot, 
  onRemoveScreenshot 
}: ScreenshotUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadScreenshot = async (file: File) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload screenshots.",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create unique filename
      const timestamp = Date.now();
      const filename = `${user.id}/${timestamp}-${file.name}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('screenshots')
        .upload(filename, file);

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('screenshots')
        .getPublicUrl(filename);

      onScreenshotUploaded(urlData.publicUrl);
      
      toast({
        title: "Screenshot uploaded",
        description: "Your screenshot has been uploaded successfully."
      });

    } catch (error) {
      console.error('Error uploading screenshot:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload screenshot. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadScreenshot(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadScreenshot(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Screenshot Context
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentScreenshot ? (
          <div className="space-y-3">
            <div className="relative border rounded-lg overflow-hidden">
              <img 
                src={currentScreenshot} 
                alt="Uploaded screenshot" 
                className="w-full h-32 object-cover"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={onRemoveScreenshot}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Badge variant="default" className="text-xs">
              Screenshot will be analyzed with your message
            </Badge>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="space-y-3">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Upload Screenshot</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag & drop or click to upload conversation screenshots
                </p>
              </div>
              
              <Button
                onClick={triggerFileSelect}
                disabled={isUploading}
                size="sm"
                variant="outline"
              >
                <Image className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : "Choose File"}
              </Button>
              
              <div className="text-xs text-muted-foreground">
                <p>• Supports JPG, PNG, GIF</p>
                <p>• Max file size: 5MB</p>
                <p>• AI will analyze image context</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};