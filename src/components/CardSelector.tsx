import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Crown, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/hooks/useCards';
import { hapticFeedback } from '@/lib/haptics';

interface CardSelectorProps {
  cards: Card[];
  activeCard: Card | null;
  onSelect: (cardId: string) => void;
  onSetDefault: (cardId: string) => void;
  onAdd: (name: string) => Promise<{ data?: Card; error?: string }>;
  onDelete: (cardId: string) => Promise<{ success?: boolean; error?: string }>;
  onEditCard?: (cardId?: string) => void;
  onUpdateCardName?: (cardId: string, name: string) => Promise<void>;
  variant?: 'mobile' | 'desktop';
  isOrangePlan?: boolean;
}

export function CardSelector({
  cards,
  activeCard,
  onSelect,
  onSetDefault,
  onAdd,
  onDelete,
  onEditCard,
  onUpdateCardName,
  variant = 'desktop',
  isOrangePlan = false,
}: CardSelectorProps) {
  const navigate = useNavigate();
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCardId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCardId]);

  // Clear click timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handleStartEdit = (card: Card) => {
    setEditedName(card.name);
    setEditingCardId(card.id);
  };

  const handleSaveName = async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    const trimmedName = editedName.trim();
    
    if (!trimmedName) {
      setEditingCardId(null);
      return;
    }
    
    // If name unchanged, silently close (no toast)
    if (card && trimmedName === card.name) {
      setEditingCardId(null);
      return;
    }
    
    // Check for duplicate names (case-insensitive)
    const duplicateExists = cards.some(
      c => c.id !== cardId && c.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    if (duplicateExists) {
      toast({ title: 'Error', description: 'A card with this name already exists', variant: 'destructive' });
      setEditingCardId(null);
      return;
    }
    
    if (onUpdateCardName) {
      await onUpdateCardName(cardId, trimmedName);
      hapticFeedback.light();
      // Silent save - no toast for successful rename
    }
    setEditingCardId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, cardId: string) => {
    if (e.key === 'Enter') {
      handleSaveName(cardId);
    } else if (e.key === 'Escape') {
      setEditingCardId(null);
    }
  };

  const handleUpgrade = () => {
    setIsDropdownOpen(false);
    navigate('/settings/upgrade');
  };

  const handleSetDefault = async (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const card = cards.find(c => c.id === cardId);
    if (card?.is_default) return;

    await onSetDefault(cardId);
    setIsDropdownOpen(false);
    hapticFeedback.medium();
    toast({
      title: 'Default card updated',
      description: 'QR & link now point to this card',
    });
  };

  // Handle card name click - single tap to switch, double tap to rename
  const handleCardNameClick = useCallback((card: Card, e: React.MouseEvent) => {
    e.stopPropagation();
    
    clickCountRef.current += 1;
    
    if (clickCountRef.current === 1) {
      // Start timer for single click
      clickTimerRef.current = setTimeout(() => {
        // Single tap - switch card and close dropdown
        if (clickCountRef.current === 1) {
          onSelect(card.id);
          setIsDropdownOpen(false);
          hapticFeedback.light();
        }
        clickCountRef.current = 0;
      }, 250); // 250ms window for double click
    } else if (clickCountRef.current === 2) {
      // Double tap - enable rename mode
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
      clickCountRef.current = 0;
      handleStartEdit(card);
      hapticFeedback.light();
    }
  }, [onSelect]);

  const handleSelectCard = (cardId: string) => {
    onSelect(cardId);
    setIsDropdownOpen(false);
    hapticFeedback.light();
  };

  const handleEditCard = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(cardId);
    setIsDropdownOpen(false);
    onEditCard?.(cardId);
  };

  const handleCreateCard = async () => {
    if (!newCardName.trim()) {
      toast({ title: 'Error', description: 'Please enter a card name', variant: 'destructive' });
      return;
    }
    
    const result = await onAdd(newCardName.trim());
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Card created', description: `"${newCardName.trim()}" has been created` });
      setNewCardName('');
      setIsCreating(false);
      hapticFeedback.medium();
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteCardId) return;
    
    const card = cards.find(c => c.id === deleteCardId);
    if (cards.length <= 1) {
      toast({ title: 'Cannot delete', description: 'You must have at least one card', variant: 'destructive' });
      setDeleteCardId(null);
      return;
    }
    
    const result = await onDelete(deleteCardId);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Card deleted', description: `"${card?.name}" has been deleted` });
      hapticFeedback.medium();
    }
    setDeleteCardId(null);
  };

  const canCreateMoreCards = isOrangePlan;

  // Check if a card can be deleted
  const canDeleteCard = (card: Card) => {
    // Can't delete if only one card
    if (cards.length <= 1) return false;
    // Can't delete the default card
    if (card.is_default) return false;
    return true;
  };

  // Card row component
  const CardRow = ({ card }: { card: Card }) => {
    const isEditing = editingCardId === card.id;
    const isDefault = card.is_default;
    const isActive = activeCard?.id === card.id;
    const showDelete = canDeleteCard(card);

    return (
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-2.5 rounded-lg cursor-pointer transition-all duration-200",
          "hover:bg-muted/60",
          isActive && "bg-primary/5 ring-1 ring-primary/20"
        )}
      >
        {/* Star - Left side */}
        <button
          onClick={(e) => handleSetDefault(card.id, e)}
          className={cn(
            "flex-shrink-0 p-1 rounded-full transition-all duration-200 active:scale-90",
            isDefault 
              ? "text-orange-500 cursor-default" 
              : "text-muted-foreground/30 hover:text-orange-400 hover:bg-orange-500/10"
          )}
          disabled={isDefault}
          title={isDefault ? "Default card" : "Set as default"}
        >
          <Star 
            className={cn(
              "h-4 w-4 transition-all duration-300",
              isDefault && "fill-orange-500 drop-shadow-sm"
            )} 
          />
        </button>

        {/* Card Name - Center (single tap = switch, double tap = rename) */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, card.id)}
              onBlur={() => handleSaveName(card.id)}
              className="h-7 text-sm bg-background"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              onClick={(e) => handleCardNameClick(card, e)}
              className={cn(
                "text-sm text-left truncate w-full py-0.5 px-1 -mx-1 rounded select-none",
                "transition-colors duration-150",
                "hover:text-foreground",
                isActive ? "text-foreground font-medium" : "text-foreground/80"
              )}
              title="Tap to switch • Double-tap to rename"
            >
              <span className="truncate">{card.name}</span>
              {isDefault && (
                <span className="text-orange-500/70 text-xs ml-1.5 font-normal">(Default)</span>
              )}
            </div>
          )}
        </div>

        {/* Actions - Right side */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Edit icon - opens card editor */}
          <button
            onClick={(e) => handleEditCard(card.id, e)}
            className={cn(
              "p-1.5 rounded-md transition-all duration-150 active:scale-90",
              "text-muted-foreground/50 hover:text-foreground hover:bg-muted"
            )}
            title="Edit card details"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          {/* Delete icon - only shown for non-default cards */}
          {showDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteCardId(card.id);
              }}
              className={cn(
                "p-1.5 rounded-md transition-all duration-150 active:scale-90",
                "text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
              )}
              title="Delete card"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Mobile variant
  if (variant === 'mobile') {
    return (
      <>
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-background border border-border/60 shadow-sm active:scale-95 transition-transform">
              {activeCard?.is_default && (
                <Star className="h-3 w-3 text-orange-500 fill-orange-500" />
              )}
              <span className="truncate max-w-[100px]">
                {activeCard?.name || 'My Card'}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-background z-50 p-2 shadow-lg border">
            {/* Card List */}
            <div className="space-y-0.5">
              {cards.map((card) => (
                <CardRow key={card.id} card={card} />
              ))}
            </div>
            
            <DropdownMenuSeparator className="my-2" />
            
            {/* Create New Card */}
            {canCreateMoreCards ? (
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsCreating(true);
                }}
                className="flex items-center gap-2 w-full px-2 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-primary font-medium"
              >
                <Plus className="h-4 w-4" />
                Create New Card
              </button>
            ) : (
              <div>
                <button
                  onClick={handleUpgrade}
                  className="flex items-center gap-2 w-full px-2 py-2.5 text-sm rounded-lg hover:bg-orange-500/10 transition-colors text-orange-500 font-medium"
                >
                  <Crown className="h-4 w-4" />
                  Upgrade to Orange
                </button>
                <p className="px-2 pb-2 text-xs text-muted-foreground leading-snug">
                  Add multiple cards
                </p>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteCardId} onOpenChange={() => setDeleteCardId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Card</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{cards.find(c => c.id === deleteCardId)?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* New Card Creation Dialog - renders above nav with safe-area positioning */}
        {isCreating && (
          <div 
            className="fixed inset-0 bg-black/50 z-[2000] flex justify-center px-4"
            onClick={() => setIsCreating(false)}
          >
            <div 
              className="absolute left-4 right-4 max-w-72 mx-auto bg-background p-4 rounded-xl shadow-lg animate-scale-in"
              style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold mb-3">Create New Card</h3>
              <Input
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
                placeholder="Card name (e.g. Work, Personal)"
                className="mb-3"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCard()}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreateCard}>
                  Create
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop variant
  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 hover:bg-muted/60">
            {activeCard?.is_default && (
              <Star className="h-4 w-4 text-orange-500 fill-orange-500" />
            )}
            <span>
              {activeCard?.name || 'My Card'}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 bg-background z-50 p-2 shadow-lg border">
          {/* Card List */}
          <div className="space-y-0.5">
            {cards.map((card) => (
              <CardRow key={card.id} card={card} />
            ))}
          </div>
          
          <DropdownMenuSeparator className="my-2" />
          
          {/* Create New Card */}
          {canCreateMoreCards ? (
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                setIsCreating(true);
              }}
              className="flex items-center gap-2 w-full px-2 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-primary font-medium"
            >
              <Plus className="h-4 w-4" />
              Create New Card
            </button>
          ) : (
            <div>
              <button
                onClick={handleUpgrade}
                className="flex items-center gap-2 w-full px-2 py-2.5 text-sm rounded-lg hover:bg-orange-500/10 transition-colors text-orange-500 font-medium"
              >
                <Crown className="h-4 w-4" />
                Upgrade to Orange
              </button>
              <p className="px-2 pb-2 text-xs text-muted-foreground leading-snug">
                Add multiple cards
              </p>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCardId} onOpenChange={() => setDeleteCardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{cards.find(c => c.id === deleteCardId)?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Card Creation Dialog - renders above nav with safe-area positioning */}
      {isCreating && (
        <div 
          className="fixed inset-0 bg-black/50 z-[2000] flex justify-center"
          onClick={() => setIsCreating(false)}
        >
          <div 
            className="absolute left-1/2 -translate-x-1/2 bg-background p-6 rounded-xl shadow-lg w-80 animate-scale-in mx-4"
            style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-4">Create New Card</h3>
            <Input
              value={newCardName}
              onChange={(e) => setNewCardName(e.target.value)}
              placeholder="Card name (e.g. Work, Personal)"
              className="mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCard()}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCard}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
