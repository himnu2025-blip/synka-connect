import { useState, useRef, useEffect } from 'react';
import type React from 'react';
import { FileText, Pencil, Trash2, Upload, Lock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DocumentLinksProps {
  documentName: string | null;
  documentUrl: string | null;
  isEditMode?: boolean;
  userId?: string;
  cardId?: string;
  isPremium?: boolean;
  onUpdate?: (updates: {
    document_name?: string | null;
    document_url?: string | null;
  }) => Promise<void>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function DocumentLinks({
  documentName,
  documentUrl,
  isEditMode = false,
  userId,
  cardId,
  isPremium = false,
  onUpdate,
}: DocumentLinksProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localName, setLocalName] = useState(documentName || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalName(documentName || '');
  }, [documentName]);

  const handleNameBlur = async () => {
    if (!onUpdate || !isPremium) return;
    const trimmed = localName.trim();
    if (trimmed !== (documentName || '')) {
      await onUpdate({ document_name: trimmed || null });
    }
  };

  const validateFile = (file: File) => {
    if (file.type !== 'application/pdf') return 'Only PDF files are allowed';
    if (file.size > MAX_FILE_SIZE) return 'Upload a file upto 5 MB';
    return null;
  };

  const uploadFile = async (file: File, filePath: string) => {
    setUploadProgress(30);

    if (documentUrl) {
      try {
        const oldPath = documentUrl.split('/documents/')[1]?.split('?')[0];
        if (oldPath) {
          await supabase.storage.from('documents').remove([oldPath]);
        }
      } catch {}
    }

    setUploadProgress(50);

    const { error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        upsert: true,
        contentType: 'application/pdf',
        cacheControl: '0',
      });

    if (error) throw new Error(error.message);

    setUploadProgress(90);

    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    setUploadProgress(100);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  const handleUploadClick = () => {
    if (!isPremium) {
      toast({
        title: 'Upgrade to Orange',
        description: 'Upgrade to Orange to unlock document uploads.',
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleUpload = async (file: File) => {
    if (!userId || !cardId || !onUpdate || !isPremium) return;

    const error = validateFile(file);
    if (error) {
      toast({ title: 'Upload failed', description: error, variant: 'destructive' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const path = `${userId}/${cardId}-document-${Date.now()}.pdf`;
      const publicUrl = await uploadFile(file, path);

      await onUpdate({
        document_name: localName.trim() || null,
        document_url: publicUrl,
      });

      toast({ title: 'Document uploaded', description: 'Your document has been saved.' });
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err?.message || 'Could not upload document.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemove = async () => {
    if (!onUpdate || !isPremium) return;

    if (documentUrl) {
      try {
        const path = documentUrl.split('/documents/')[1]?.split('?')[0];
        if (path) {
          await supabase.storage.from('documents').remove([path]);
        }
      } catch {}
    }

    await onUpdate({ document_name: null, document_url: null });
    setLocalName('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    toast({ title: 'Document removed' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  if (!isEditMode && !documentUrl) return null;

  if (!isEditMode) {
  return (
    <a
      href={documentUrl!}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 px-4 py-3 rounded-2xl
                 active:scale-[0.98]
                 transition-all duration-150
                 hover:bg-muted/30"
    >
      {/* Left icon – SAME pattern as WhatsApp / Email */}
      <div className="w-10 h-10 rounded-full bg-muted/60 backdrop-blur-sm flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-foreground" />
      </div>

      {/* Text */}
      <p className="text-[15px] font-medium text-foreground truncate">
        {documentName || 'Document'}
      </p>
    </a>
  );
}

  return (
    <div className="space-y-4">
      <Label className="font-semibold">Document</Label>

      <div className="flex flex-col gap-3 p-3 rounded-xl bg-muted/50">
        <Input
          placeholder="e.g. Pitch Deck, Catalogue, Menu..."
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          disabled={!isPremium}
          className="text-sm"
        />

        {documentUrl && isPremium && (
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-border/40"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {localName || 'Document'}
              </p>
              <p className="text-xs text-muted-foreground">PDF • Tap to view</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        )}

        <div
          className={
            documentUrl
              ? 'flex items-center justify-end gap-2'
              : 'flex justify-center'
          }
        >
          {!documentUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={uploading}
            >
              {!isPremium && <Lock className="h-3 w-3 mr-1" />}
              <Upload className="h-3 w-3 mr-1" />
              Upload a PDF
            </Button>
          )}

          {documentUrl && isPremium && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUploadClick}
                disabled={uploading}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            </>
          )}
        </div>

        {uploading && (
          <div className="flex items-center gap-2">
            <Progress value={uploadProgress} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground">
              {uploadProgress}%
            </span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
        }
