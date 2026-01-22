import { useState, useRef } from 'react';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Tag } from '@/hooks/useTags';

interface Event {
  id: string;
  title: string;
}

interface TagSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  tags: Tag[];
  events: Event[];
  localContactTags: string[];
  localContactEvents: string[];
  onTagToggle: (contactId: string, tagId: string) => void;
  onEventToggle: (contactId: string, eventId: string) => void;
  onTagCreated?: (name: string, color: string) => Promise<Tag | null>;
  onTagUpdated?: (id: string, name: string) => Promise<void>;
  onTagDeleted?: (id: string) => Promise<void>;
}

// Default tag color
const DEFAULT_TAG_COLOR = '#6366f1';
const LONG_PRESS_DURATION = 500; // ms

export function TagSelectorDialog({
  open,
  onOpenChange,
  contactId,
  tags,
  events,
  localContactTags,
  localContactEvents,
  onTagToggle,
  onEventToggle,
  onTagCreated,
  onTagUpdated,
  onTagDeleted,
}: TagSelectorDialogProps) {
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Edit tag state
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Long press handling
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast({ title: 'Tag name required', variant: 'destructive' });
      return;
    }

    // Check for duplicate (case-insensitive)
    const duplicate = tags.find(
      t => t.name.toLowerCase() === newTagName.trim().toLowerCase()
    );
    if (duplicate) {
      toast({ title: 'Tag already exists', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      const newTag = await onTagCreated?.(newTagName.trim(), DEFAULT_TAG_COLOR);
      
      if (newTag) {
        toast({ title: 'Tag created' });
        // Auto-toggle the new tag on for this contact
        if (contactId) {
          onTagToggle(contactId, newTag.id);
        }
        setNewTagName('');
        setIsAddingTag(false);
      }
    } catch (err: any) {
      toast({ 
        title: 'Failed to create tag', 
        description: err?.message,
        variant: 'destructive' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Long press handlers
  const handleTagPressStart = (tag: Tag) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setEditingTag(tag);
      setEditTagName(tag.name);
    }, LONG_PRESS_DURATION);
  };

  const handleTagPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTagClick = (tag: Tag) => {
    // Only toggle if it wasn't a long press
    if (!isLongPress.current && contactId) {
      onTagToggle(contactId, tag.id);
    }
    isLongPress.current = false;
  };

  const handleSaveTag = async () => {
    if (!editingTag || !editTagName.trim()) {
      toast({ title: 'Tag name required', variant: 'destructive' });
      return;
    }

    // Check for duplicate (case-insensitive, excluding current tag)
    const duplicate = tags.find(
      t => t.id !== editingTag.id && t.name.toLowerCase() === editTagName.trim().toLowerCase()
    );
    if (duplicate) {
      toast({ title: 'Tag already exists', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      await onTagUpdated?.(editingTag.id, editTagName.trim());
      toast({ title: 'Tag updated' });
      setEditingTag(null);
      setEditTagName('');
    } catch (err: any) {
      toast({ 
        title: 'Failed to update tag', 
        description: err?.message,
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!editingTag) return;

    setIsDeleting(true);
    try {
      await onTagDeleted?.(editingTag.id);
      toast({ title: 'Tag deleted' });
      setEditingTag(null);
      setEditTagName('');
    } catch (err: any) {
      toast({ 
        title: 'Failed to delete tag', 
        description: err?.message,
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Tags & Events</DialogTitle>
          </DialogHeader>
          
          {contactId && (
            <div className="space-y-5">
              {/* Tags Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    Tags <span className="text-xs text-muted-foreground font-normal">(long press to edit)</span>
                  </p>
                  {!isAddingTag && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingTag(true)}
                      className="h-7 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Tag
                    </Button>
                  )}
                </div>

                {/* Add Tag Form */}
                {isAddingTag && (
                  <div className="mb-3 p-3 rounded-lg border border-border bg-muted/30 space-y-3">
                    <Input
                      placeholder="Tag name..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="h-9"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateTag();
                        if (e.key === 'Escape') {
                          setIsAddingTag(false);
                          setNewTagName('');
                        }
                      }}
                    />

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAddingTag(false);
                          setNewTagName('');
                        }}
                        disabled={isCreating}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreateTag}
                        disabled={isCreating || !newTagName.trim()}
                        className="flex-1"
                      >
                        {isCreating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Create'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tag List */}
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isTagged = localContactTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleTagClick(tag)}
                        onMouseDown={() => handleTagPressStart(tag)}
                        onMouseUp={handleTagPressEnd}
                        onMouseLeave={handleTagPressEnd}
                        onTouchStart={() => handleTagPressStart(tag)}
                        onTouchEnd={handleTagPressEnd}
                        onTouchCancel={handleTagPressEnd}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm border transition-all select-none",
                          isTagged
                            ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 underline underline-offset-2 decoration-blue-500"
                            : "border-border hover:border-primary/50 bg-background"
                        )}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                  {tags.length === 0 && !isAddingTag && (
                    <p className="text-sm text-muted-foreground">No tags yet</p>
                  )}
                </div>
              </div>

              {/* Events Section */}
              <div>
                <p className="text-sm font-medium mb-2">Events</p>
                <div className="flex flex-wrap gap-2">
                  {events.map((event) => {
                    const isLinked = localContactEvents.includes(event.id);
                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventToggle(contactId, event.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm border transition-all",
                          isLinked
                            ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 underline underline-offset-2 decoration-blue-500"
                            : "border-border hover:border-accent/50 bg-background"
                        )}
                      >
                        {event.title}
                      </button>
                    );
                  })}
                  {events.length === 0 && (
                    <p className="text-sm text-muted-foreground">No events created</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <Input
              placeholder="Tag name..."
              value={editTagName}
              onChange={(e) => setEditTagName(e.target.value)}
              className="h-10"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTag();
                if (e.key === 'Escape') setEditingTag(null);
              }}
            />

            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteTag}
                disabled={isSaving || isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveTag}
                disabled={isSaving || isDeleting || !editTagName.trim()}
                className="flex-1"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
