import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Scan,
  Phone,
  Mail,
  Linkedin,
  Globe,
  Tag,
  Trash2,
  StickyNote,
  Camera,
  ChevronDown,
  ChevronUp,
  Loader2,
  Upload,
  RotateCcw,
  Edit2,
  Save,
  ArrowUpDown,
  Check,
  MoreHorizontal
} from 'lucide-react';
import { hapticFeedback } from '@/lib/haptics';
import { FaWhatsapp } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FloatingInput, FloatingPhoneInput, COUNTRY_CODES as PHONE_COUNTRY_CODES, extractPhoneNumber, getCountryCode } from '@/components/ui/floating-input';
import { cn, getContrastTextColor, getSubtleBackground } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useContacts, Contact } from '@/hooks/useContacts';
import { useTags } from '@/hooks/useTags';
import { useEvents } from '@/hooks/useEvents';
import { useTemplates } from '@/hooks/useTemplates';
import { useProfile } from '@/hooks/useProfile';
import { useSignatures } from '@/hooks/useSignatures';
import { supabase } from '@/integrations/supabase/client';
import { TagSelectorDialog } from '@/components/crm/TagSelectorDialog';
import { ContactAvatar } from '@/components/crm/ContactAvatar';
import {
  validateContactForm,
  normalizeContactData,
  isValidEmail,
  isValidPhone,
  isValidWebsite,
  isValidLinkedIn,
} from '@/lib/inputValidation';

// Public site URL - always use production URL for links
const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://synka.in';

const timeFilters = ['All', '7 days', '15 days', '30 days'];

// LocalStorage key for pending interactions
const PENDING_INTERACTION_KEY = 'pending_crm_interaction';
const RETURNING_FROM_INTERACTION_KEY = 'crm_returning_from_interaction';

interface PendingInteraction {
  contactId: string;
  contactName: string;
  interactionType: 'whatsapp' | 'email' | 'call';
  timestamp: string;
}

export default function CRM() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { contacts, loading: contactsLoading, createContact, updateContact, deleteContact, addTagToContact, removeTagFromContact, addEventToContact, refetch } = useContacts();
  // Initialize with contacts immediately (they come from cache)
  const [localContacts, setLocalContacts] = useState<Contact[]>(contacts);
  const { tags, createTag, updateTag, deleteTag } = useTags();
  const { events, getActiveEventsForDate } = useEvents();
  const { getSelectedEmailTemplate, getSelectedWhatsappTemplate, getEmailTemplates, getWhatsappTemplates } = useTemplates();
  const { getSelectedSignature } = useSignatures();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTimeFilter, setActiveTimeFilter] = useState<string>('All');
  const [activeTagFilter, setActiveTagFilter] = useState<string[]>([]);
  const [activeEventFilter, setActiveEventFilter] = useState<string[]>([]);
const [sortBy, setSortBy] = useState<'name' | 'date' | 'last_interaction'>(() => {
    const saved = localStorage.getItem('crm_sort_by');
    return (saved as 'name' | 'date' | 'last_interaction') || 'date';
  });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactDetail, setShowContactDetail] = useState(false);

  // Inline edit form state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    company: '',
    designation: '',
    phone: '',
    email: '',
    whatsapp: '',
    linkedin: '',
    website: '',
    notes: '',
    tags: [] as string[],
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const hasFocusedOnceRef = useRef(false);

  const editNameRef = useRef<HTMLInputElement | null>(null);
  const drawerScrollRef = useRef<HTMLDivElement | null>(null);

  // sync selectedContact into edit form when selectedContact or inline edit opens
  useEffect(() => {
    if (selectedContact) {
      setEditForm({
        name: selectedContact.name || '',
        company: selectedContact.company || '',
        designation: selectedContact.designation || '',
        phone: selectedContact.phone || '',
        email: selectedContact.email || '',
        whatsapp: selectedContact.whatsapp || '',
        linkedin: selectedContact.linkedin || '',
        website: selectedContact.website || '',
        notes: '', // Always start empty for adding new notes
        tags: selectedContact.tags?.map(t => t.id) || [],
      });
    }
  }, [selectedContact]);

  // focus name input when inline edit opens
  useEffect(() => {
    if (isEditOpen) {
      setTimeout(() => {
        editNameRef.current?.focus();
        const el = editNameRef.current as HTMLInputElement | null;
        if (el) el.setSelectionRange(el.value.length, el.value.length);
      }, 120);
    }
  }, [isEditOpen]);
  useEffect(() => {
  if (!isEditOpen && drawerScrollRef.current) {
    // Force Radix to re-enable gestures
    requestAnimationFrame(() => {
      drawerScrollRef.current.style.pointerEvents = 'auto';
    });
  }
}, [isEditOpen]);

  function updateEditField<K extends keyof typeof editForm>(key: K, value: typeof editForm[K]) {
    setEditForm(prev => ({ ...prev, [key]: value }));
  }

  // save edited contact using useContacts.updateContact
  async function saveEditedContact() {
    if (!selectedContact?.id) return;
    if (!editForm.name?.trim()) {
      setEditError('Name is required');
      return;
    }

    // Validate fields
    const validation = validateContactForm({
      email: editForm.email,
      phone: editForm.phone,
      website: editForm.website,
      linkedin: editForm.linkedin,
    });

    if (validation) {
      toast({
        title: validation.message,
        variant: 'destructive',
      });
      return;
    }

    setEditLoading(true);
    setEditError(null);

    try {
      // Normalize all contact fields
      const normalizedFields = normalizeContactData({
        email: editForm.email,
        phone: editForm.phone,
        whatsapp: editForm.whatsapp,
        website: editForm.website,
        linkedin: editForm.linkedin,
      });

      const updates: any = {
        name: editForm.name,
        company: editForm.company || null,
        designation: editForm.designation || null,
        phone: normalizedFields.phone || null,
        email: normalizedFields.email || null,
        whatsapp: normalizedFields.whatsapp || null,
        linkedin: normalizedFields.linkedin || null,
        website: normalizedFields.website || null,
      };

      // If notes field has content, add to notes_history
      if (editForm.notes?.trim()) {
        const newEntry = {
          text: editForm.notes.trim(),
          timestamp: new Date().toISOString(),
        };
        const currentHistory = selectedContact.notes_history || [];
        updates.notes_history = [newEntry, ...currentHistory];
      }

      const { error } = await updateContact(selectedContact.id, updates);

      if (error) throw error;

      // Update selectedContact immediately with form values
      setSelectedContact(prev => prev ? { ...prev, ...updates } : null);

      // Update localContacts too
      setLocalContacts(prev => prev.map(c => 
        c.id === selectedContact.id ? { ...c, ...updates } : c
      ));

      // Update notesHistory if we added a note
      if (updates.notes_history) {
        setNotesHistory(updates.notes_history);
      }

      // Clear the notes field after saving
      setEditForm(prev => ({ ...prev, notes: '' }));

      editNameRef.current?.blur();
      
      // Use setTimeout to ensure state is properly reset
      setTimeout(() => {
        setIsEditOpen(false);
      }, 0);
      
      toast({ title: 'Contact updated' });
    } catch (err: any) {
      console.error('Update error', err);
      setEditError(err?.message || 'Update failed');
    } finally {
      setEditLoading(false);
    }
  }


const [showNotesPopup, setShowNotesPopup] = useState(false);
const [notesInput, setNotesInput] = useState("");
const [notesHistory, setNotesHistory] = useState<any[]>([]);
const [editNoteDialog, setEditNoteDialog] = useState<{ open: boolean; index: number; systemText: string; userText: string }>({ open: false, index: -1, systemText: '', userText: '' });

// Helper to parse system text from notes
const SYSTEM_PREFIXES = ['WhatsApp Sent', 'Email Sent', 'Call Made'];
const parseNoteForEdit = (text: string) => {
  for (const prefix of SYSTEM_PREFIXES) {
    if (text.startsWith(prefix)) {
      const rest = text.slice(prefix.length);
      // Check if there's user text after " - " separator
      if (rest.startsWith(' - ')) {
        return { systemText: prefix, userText: rest.slice(3) };
      }
      return { systemText: prefix, userText: '' };
    }
  }
  return { systemText: '', userText: text };
};

// Load saved notes history when contact selected
useEffect(() => {
  if (selectedContact?.notes_history) {
    setNotesHistory(selectedContact.notes_history);
  } else {
    setNotesHistory([]);
  }
}, [selectedContact]);
  useEffect(() => {
  if (!isEditOpen && drawerScrollRef.current) {
    requestAnimationFrame(() => {
      drawerScrollRef.current.scrollTop = 0;
    });
  }
}, [isEditOpen]);

// Save note
const saveNote = async () => {
  if (!notesInput.trim()) {
    toast({ title: "Note cannot be empty", variant: "destructive" });
    return;
  }
  if (!selectedContact?.id) return;

  const newEntry = {
    text: notesInput,
    timestamp: new Date().toISOString(),
  };

  // NEWEST NOTE FIRST
  const updatedHistory = [newEntry, ...notesHistory];

  const { error } = await updateContact(selectedContact.id, {
    notes_history: updatedHistory,
  });

  if (!error) {
    setNotesHistory(updatedHistory);
    setNotesInput("");

    // Close only the popup (not contact card)
    setShowNotesPopup(false);

    toast({ title: "Note added" });
  }
};

  // Dialog states
  const [showAddContact, setShowAddContact] = useState(false);
  const [showScanCard, setShowScanCard] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [tagSelectorContactId, setTagSelectorContactId] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [templateSelectorType, setTemplateSelectorType] = useState<'email' | 'whatsapp'>('email');
  const [templateSelectorContact, setTemplateSelectorContact] = useState<Contact | null>(null);
  // Local optimistic state for tags and events (prevents refresh)
  const [localContactTags, setLocalContactTags] = useState<string[]>([]);
  const [localContactEvents, setLocalContactEvents] = useState<string[]>([]);

  // Interaction confirmation popup state
  const [pendingInteraction, setPendingInteraction] = useState<PendingInteraction | null>(null);
  const [showInteractionConfirm, setShowInteractionConfirm] = useState(false);
  const [interactionUserNotes, setInteractionUserNotes] = useState('');
  const [showInteractionNotes, setShowInteractionNotes] = useState(false);
  const [interactionConfirmed, setInteractionConfirmed] = useState(false);
  const [interactionSystemText, setInteractionSystemText] = useState('');

  // Sync tag popup with selectedContact
  useEffect(() => {
    if (selectedContact && showTagSelector) {
      setLocalContactTags(selectedContact.tags?.map(t => t.id) || []);
      setLocalContactEvents(selectedContact.events?.map(e => e.id) || []);
    }
  }, [selectedContact, showTagSelector]);

  // OCR scanning states
  const [isScanning, setIsScanning] = useState(false);
  const [scannedContact, setScannedContact] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  // New contact form
  const [newContact, setNewContact] = useState({
    name: '',
    company: '',
    designation: '',
    email: '',
    phone: '',
    whatsapp: '',
    linkedin: '',
    website: '',
    notes: '',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);
useEffect(() => {
  const returning = localStorage.getItem(RETURNING_FROM_INTERACTION_KEY);

  // Skip resetting contacts once when returning from call/email/whatsapp
  if (returning) {
    localStorage.removeItem(RETURNING_FROM_INTERACTION_KEY);
    return;
  }

  // Only update if contacts changed (prevents flash when same data)
  if (JSON.stringify(contacts) !== JSON.stringify(localContacts)) {
    setLocalContacts(contacts);
  }
}, [contacts]);

  // Check for pending interaction on mount and visibility change
  const checkPendingInteraction = useCallback(() => {
  try {
    const stored = localStorage.getItem(PENDING_INTERACTION_KEY);
    if (!stored) return;

    const pending = JSON.parse(stored) as PendingInteraction;

    // Only allow confirmation when user has returned (focus)
    const timeDiff = Date.now() - new Date(pending.timestamp).getTime();
    if (timeDiff < 24 * 60 * 60 * 1000) {
      setPendingInteraction(pending);
      setShowInteractionConfirm(true);
    } else {
      localStorage.removeItem(PENDING_INTERACTION_KEY);
    }
  } catch {
    localStorage.removeItem(PENDING_INTERACTION_KEY);
  }
}, []);

  useEffect(() => {
  const handleFocus = () => {
    // Skip first focus (initial page load)
    if (!hasFocusedOnceRef.current) {
      hasFocusedOnceRef.current = true;
      return;
    }

    checkPendingInteraction();
  };

  window.addEventListener('focus', handleFocus);

  return () => {
    window.removeEventListener('focus', handleFocus);
  };
}, [checkPendingInteraction]);

  // Store pending interaction
  const storePendingInteraction = (contact: Contact, type: 'whatsapp' | 'email' | 'call') => {
    const pending: PendingInteraction = {
      contactId: contact.id,
      contactName: contact.name,
      interactionType: type,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(PENDING_INTERACTION_KEY, JSON.stringify(pending));
  };

  // Clear pending interaction
  const clearPendingInteraction = () => {
    localStorage.removeItem(PENDING_INTERACTION_KEY);
    setPendingInteraction(null);
    setShowInteractionConfirm(false);
    setShowInteractionNotes(false);
    setInteractionUserNotes('');
    setInteractionConfirmed(false);
    setInteractionSystemText('');
  };

  // Handle confirmation Yes - auto-create note and open notes editor
  const handleInteractionConfirmYes = async () => {
    localStorage.removeItem(PENDING_INTERACTION_KEY);
    if (!pendingInteraction) return;

    const contact = localContacts.find(c => c.id === pendingInteraction.contactId);
    if (!contact) {
      clearPendingInteraction();
      return;
    }

    // Create default note based on interaction type
    const systemText = pendingInteraction.interactionType === 'whatsapp'
      ? 'WhatsApp Sent'
      : pendingInteraction.interactionType === 'email'
      ? 'Email Sent'
      : 'Call Made';

    const newEntry = {
      text: systemText,
      timestamp: new Date().toISOString(),
    };

    const currentHistory = (contact.notes_history as Array<{ text: string; timestamp: string }>) || [];
    const updatedHistory = [newEntry, ...currentHistory];

    // Update contact with new note
    const { error } = await updateContact(contact.id, {
      notes_history: updatedHistory,
    });

    if (!error) {
  // 1. Update notes popup immediately
  setNotesHistory(updatedHistory);

  // 2. Update selected contact (drawer UI)
  setSelectedContact(prev =>
    prev && prev.id === contact.id
      ? { ...prev, notes_history: updatedHistory }
      : prev
  );

  // 3. Update CRM list (main screen)
  setLocalContacts(prev =>
    prev.map(c =>
      c.id === contact.id
        ? { ...c, notes_history: updatedHistory, updated_at: new Date().toISOString() }
        : c
    )
  );

  // 4. Open notes editor
  setInteractionConfirmed(true);
  setInteractionSystemText(systemText);
  setInteractionUserNotes('');
  setShowInteractionNotes(true);
  setShowInteractionConfirm(false);
} else {
      toast({ title: 'Failed to save note', variant: 'destructive' });
      clearPendingInteraction();
    }
  };

  // Handle confirmation No - open notes editor empty
  const handleInteractionConfirmNo = () => {
    localStorage.removeItem(PENDING_INTERACTION_KEY);
    setInteractionConfirmed(false);
    setInteractionSystemText('');
    setInteractionUserNotes('');
    setShowInteractionNotes(true);
    setShowInteractionConfirm(false);
  };

  // Save interaction note (from notes popup after confirmation)
  const saveInteractionNote = async () => {
    if (!pendingInteraction) {
      clearPendingInteraction();
      return;
    }

    const contact = localContacts.find(c => c.id === pendingInteraction.contactId);
    if (!contact) {
      clearPendingInteraction();
      return;
    }

    // If confirmed (Yes was clicked), update the note with system text + user notes
    if (interactionConfirmed && interactionSystemText) {
      const currentHistory = (contact.notes_history as Array<{ text: string; timestamp: string }>) || [];
      // Update the most recent note (which we just added)
      if (currentHistory.length > 0) {
        const updatedHistory = [...currentHistory];
        // Always preserve system text, append user text if present
        const finalNote = interactionUserNotes.trim()
          ? `${interactionSystemText} - ${interactionUserNotes.trim()}`
          : interactionSystemText;
        updatedHistory[0] = { ...updatedHistory[0], text: finalNote };

        const { error } = await updateContact(contact.id, {
          notes_history: updatedHistory,
        });

        if (!error) {
          setLocalContacts(prev => prev.map(c =>
            c.id === contact.id ? { ...c, notes_history: updatedHistory } : c
          ));
          setNotesHistory(updatedHistory);

setSelectedContact(prev =>
  prev && prev.id === contact.id
    ? { ...prev, notes_history: updatedHistory }
    : prev
);
          if (interactionUserNotes.trim()) {
            toast({ title: 'Note updated' });
          }
        }
      }
    } else if (!interactionConfirmed && interactionUserNotes.trim()) {
      // User said No but wants to add a note anyway
      const newEntry = {
        text: interactionUserNotes.trim(),
        timestamp: new Date().toISOString(),
      };
      const currentHistory = (contact.notes_history as Array<{ text: string; timestamp: string }>) || [];
      const updatedHistory = [newEntry, ...currentHistory];

      const { error } = await updateContact(contact.id, {
        notes_history: updatedHistory,
      });

      if (!error) {
        setLocalContacts(prev => prev.map(c =>
          c.id === contact.id ? { ...c, notes_history: updatedHistory, updated_at: new Date().toISOString() } : c
        ));
        toast({ title: 'Note added' });
      }
    }

    clearPendingInteraction();
  };

  // Close interaction notes without saving (for No path)
  const closeInteractionNotes = () => {
    clearPendingInteraction();
  };
  // Helper to get last interaction timestamp
  const getLastInteractionTime = (contact: Contact): Date => {
    // Check notes_history for the most recent note
    const notesHistory = contact.notes_history as Array<{ text: string; timestamp: string }> | null;
    const lastNoteTime = notesHistory?.[0]?.timestamp 
      ? new Date(notesHistory[0].timestamp) 
      : null;
    
    // Use the most recent of: updated_at or last note timestamp
    const updatedAt = new Date(contact.updated_at);
    
    if (lastNoteTime && lastNoteTime > updatedAt) {
      return lastNoteTime;
    }
    return updatedAt;
  };

  const filteredContacts = localContacts
    .filter((contact) => {
      const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag =
  activeTagFilter.length === 0 ||
  contact.tags?.some(t => activeTagFilter.includes(t.id));
      const matchesEvent = activeEventFilter.length === 0 || contact.events?.some(e => activeEventFilter.includes(e.id));

      let matchesTime = true;
      if (activeTimeFilter !== 'All') {
        const days = parseInt(activeTimeFilter);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        matchesTime = new Date(contact.created_at) >= cutoff;
      }

      return matchesSearch && matchesTag && matchesEvent && matchesTime;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'last_interaction':
          return getLastInteractionTime(b).getTime() - getLastInteractionTime(a).getTime();
        default:
          return 0;
      }
    });

  const handleDeleteContact = async (contactId: string) => {
    await deleteContact(contactId);
    toast({ title: 'Contact deleted' });
  };
// --- SMART TIME FORMATTER ---
const formatSmartTime = (ts: string) => {
  const date = new Date(ts);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const time = date.toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};
// --- END SMART TIME FORMATTER ---

// --- SMART DATE (DATE ONLY) FOR CONTACT CARD ---
const formatSmartDate = (ts: string) => {
  const date = new Date(ts);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
// --- END SMART DATE ---

// --- SMART DATE GROUPING FOR CONTACTS LIST ---
type DateGroup = 'TODAY' | 'YESTERDAY' | 'THIS WEEK' | 'LAST WEEK' | 'THIS MONTH' | 'OLDER';

const getDateGroup = (dateStr: string): DateGroup => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (date >= today) return 'TODAY';
  if (date >= yesterday) return 'YESTERDAY';
  if (date >= startOfWeek) return 'THIS WEEK';
  if (date >= startOfLastWeek) return 'LAST WEEK';
  if (date >= startOfMonth) return 'THIS MONTH';
  return 'OLDER';
};

const groupOrder: DateGroup[] = ['TODAY', 'YESTERDAY', 'THIS WEEK', 'LAST WEEK', 'THIS MONTH', 'OLDER'];
// --- END SMART DATE GROUPING ---

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  // Apple-style avatar helpers
const getAvatarBg = () => {
  return "bg-[#F2F2F7]"; // light Apple grey
};

const getAvatarText = () => {
  return "text-[#1C1C1E]"; // Apple black
};
  // Opens tag selector smoothly without refreshing UI
  const openTagSelector = (contactId: string) => {
    const contact = localContacts.find(c => c.id === contactId);

    // Load the contact's tags and events into local UI state
    setLocalContactTags(contact?.tags?.map(t => t.id) || []);
    setLocalContactEvents(contact?.events?.map(e => e.id) || []);

    setTagSelectorContactId(contactId);
    setShowTagSelector(true);
  };
  const handleAddContact = async () => {
    if (!newContact.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    // Validate fields
    const validation = validateContactForm({
      email: newContact.email,
      phone: newContact.phone,
      website: newContact.website,
      linkedin: newContact.linkedin,
    });

    if (validation) {
      toast({
        title: validation.message,
        variant: 'destructive',
      });
      return;
    }

    // Normalize all contact fields
    const normalizedFields = normalizeContactData({
      email: newContact.email,
      phone: newContact.phone,
      whatsapp: newContact.whatsapp,
      website: newContact.website,
      linkedin: newContact.linkedin,
    });

    // Get active events to auto-tag
    const activeEvents = getActiveEventsForDate(new Date());
    const eventIds = activeEvents.map(e => e.id);

    const { error } = await createContact({
      ...newContact,
      ...normalizedFields,
      phone: normalizedFields.phone || normalizedFields.whatsapp || null,
      whatsapp: normalizedFields.whatsapp || normalizedFields.phone || null,
    }, eventIds);

    if (error) {
      toast({ title: 'Error creating contact', variant: 'destructive' });
    } else {
      setShowAddContact(false);
      setNewContact({ name: '', company: '', designation: '', email: '', phone: '', whatsapp: '', linkedin: '', website: '', notes: '' });
      toast({ title: 'Contact added!' });
    }
  };

  // Camera and OCR functions
  // Use native camera on Capacitor, fallback to web camera otherwise
  const startCamera = useCallback(async () => {
    // Check if we should use native camera
    const { shouldUseNativeCamera, captureOrPickImage } = await import('@/lib/nativeCamera');
    
    if (shouldUseNativeCamera()) {
      // Use native camera plugin
      const result = await captureOrPickImage();
      
      if (result.error === 'cancelled') {
        return; // User cancelled, no error to show
      }
      
      if (!result.success) {
        toast({ 
          title: 'Camera error', 
          description: result.error || 'Could not capture image.', 
          variant: 'destructive' 
        });
        return;
      }
      
      // Set captured image from base64
      if (result.base64) {
        setCapturedImage(`data:image/jpeg;base64,${result.base64}`);
      }
      return;
    }
    
    // Fallback to web camera API
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({ title: 'Camera not supported', description: 'Your browser does not support camera access.', variant: 'destructive' });
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      
      setIsCameraActive(true);
      
      const waitForVideo = () => {
        return new Promise<void>((resolve) => {
          const checkVideo = () => {
            if (videoRef.current) {
              resolve();
            } else {
              requestAnimationFrame(checkVideo);
            }
          };
          checkVideo();
        });
      };
      
      await waitForVideo();
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);
      if (err.name === 'NotAllowedError') {
        toast({ title: 'Camera access denied', description: 'Please allow camera access in your browser settings.', variant: 'destructive' });
      } else if (err.name === 'NotFoundError') {
        toast({ title: 'No camera found', description: 'Please connect a camera and try again.', variant: 'destructive' });
      } else {
        toast({ title: 'Camera error', description: err.message || 'Could not access camera.', variant: 'destructive' });
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageDataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageDataUrl = event.target?.result as string;
        setCapturedImage(imageDataUrl);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const processWithAI = async () => {
    if (!capturedImage) return;

    setIsScanning(true);
    try {
      // Use AI edge function for scanning
      const { data, error } = await supabase.functions.invoke('scan-business-card', {
        body: { image: capturedImage }
      });
      
      if (error) {
        console.error('AI scan error:', error);
        throw error;
      }

      if (data?.success && data?.contact) {
        const contact = data.contact;
        const hasData = Object.entries(contact)
          .filter(([key]) => key !== 'source')
          .some(([, value]) => value !== null && value !== undefined && value !== '');
        
        if (hasData) {
          setScannedContact(contact);
          const sourceMsg = contact.source === 'qr' ? ' (from QR)' : 
                           contact.source === 'mixed' ? ' (QR + text)' : '';
          toast({ 
            title: 'Card scanned!' + sourceMsg, 
            description: 'Review the extracted information.' 
          });
        } else {
          setScannedContact({ name: '', company: '', designation: '', email: '', phone: '', whatsapp: '', linkedin: '', website: '' });
          toast({ 
            title: "Couldn't read this card clearly", 
            description: 'Please fill in the details manually.',
            variant: 'destructive'
          });
        }
      } else {
        setScannedContact({ name: '', company: '', designation: '', email: '', phone: '', whatsapp: '', linkedin: '', website: '' });
        toast({ 
          title: "Couldn't read this card", 
          description: 'Please fill in manually.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScannedContact({ name: '', company: '', designation: '', email: '', phone: '', whatsapp: '', linkedin: '', website: '' });
      toast({ 
        title: "Couldn't read this card", 
        description: 'Please fill in manually.',
        variant: 'destructive'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const resetScan = () => {
    setCapturedImage(null);
    setScannedContact(null);
    setIsScanning(false);
  };

  const saveScannedContact = async () => {
    if (!scannedContact?.name) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    // Validate fields
    const validation = validateContactForm({
      email: scannedContact.email,
      phone: scannedContact.phone,
      website: scannedContact.website,
      linkedin: scannedContact.linkedin,
    });

    if (validation) {
      toast({ title: validation.message, variant: 'destructive' });
      return;
    }

    // Normalize all contact fields
    const normalizedFields = normalizeContactData({
      email: scannedContact.email,
      phone: scannedContact.phone,
      whatsapp: scannedContact.whatsapp || scannedContact.phone,
      website: scannedContact.website,
      linkedin: scannedContact.linkedin,
    });

    const activeEvents = getActiveEventsForDate(new Date());
    const eventIds = activeEvents.map(e => e.id);

    const { error } = await createContact({
      name: scannedContact.name,
      company: scannedContact.company || null,
      designation: scannedContact.designation || null,
      email: normalizedFields.email || null,
      phone: normalizedFields.phone || null,
      whatsapp: normalizedFields.whatsapp || normalizedFields.phone || null,
      linkedin: normalizedFields.linkedin || null,
      website: normalizedFields.website || null,
      notes: scannedContact.notes || null,
    }, eventIds);

    if (error) {
      toast({ title: 'Error saving contact', variant: 'destructive' });
    } else {
      setShowScanCard(false);
      resetScan();
      toast({ title: 'Contact saved!' });
    }
  };

  // Cleanup camera on dialog close
  useEffect(() => {
    if (!showScanCard) {
      stopCamera();
      resetScan();
    }
  }, [showScanCard, stopCamera]);

  const handleTagToggle = async (contactId: string, tagId: string) => {
  const isTagged = localContactTags.includes(tagId);

  // 1ï¸âƒ£ Update popup immediately
  const updatedLocalTags = isTagged
    ? localContactTags.filter(id => id !== tagId)
    : [...localContactTags, tagId];

  setLocalContactTags(updatedLocalTags);

  try {
    // 2ï¸âƒ£ Save to DB
    if (isTagged) {
      await removeTagFromContact(contactId, tagId);
    } else {
      await addTagToContact(contactId, tagId);
    }

    // 3ï¸âƒ£ ðŸ”¥ Update selectedContact (contact popup)
    if (selectedContact?.id === contactId) {
      const updatedTags = updatedLocalTags
        .map(id => tags.find(t => t.id === id))
        .filter(Boolean);

      setSelectedContact(prev => ({
        ...prev!,
        tags: updatedTags
      }));
    }

    // 4ï¸âƒ£ ðŸ”¥ Update localContacts (CRM list)
    setLocalContacts(prev =>
      prev.map(c =>
        c.id === contactId
          ? {
              ...c,
              tags: updatedLocalTags
                .map(id => tags.find(t => t.id === id))
                .filter(Boolean)
            }
          : c
      )
    );

  } catch (err) {
    setLocalContactTags(localContactTags);
    toast({ title: "Failed to update tag", variant: "destructive" });
  }
};
const handleEventToggle = async (contactId: string, eventId: string) => {
  const isLinked = localContactEvents.includes(eventId);

  // 1ï¸âƒ£ Update popup immediately
  const updatedLocalEvents = isLinked
    ? localContactEvents.filter(id => id !== eventId)
    : [...localContactEvents, eventId];

  setLocalContactEvents(updatedLocalEvents);

  try {
    // 2ï¸âƒ£ Update DB
    if (isLinked) {
      await supabase
        .from("contact_events")
        .delete()
        .eq("contact_id", contactId)
        .eq("event_id", eventId);
    } else {
      await addEventToContact(contactId, eventId);
    }

    // 3ï¸âƒ£ Update selectedContact instantly (contact popup)
    if (selectedContact?.id === contactId) {
      const updatedEvents = updatedLocalEvents
        .map(id => events.find(e => e.id === id))
        .filter(Boolean);

      setSelectedContact(prev => ({
        ...prev!,
        events: updatedEvents
      }));
    }

    // 4ï¸âƒ£ Update CRM list
    setLocalContacts(prev =>
      prev.map(c =>
        c.id === contactId
          ? {
              ...c,
              events: updatedLocalEvents
                .map(id => events.find(e => e.id === id))
                .filter(Boolean)
            }
          : c
      )
    );

  } catch (error) {
    setLocalContactEvents(localContactEvents);
    toast({ title: "Failed to update event", variant: "destructive" });
  }
};
  const applyTemplate = (template: any, contact: Contact) => {
    // Build public card link - always use production URL
    const publicCardLink = profile?.public_slug 
      ? `${PUBLIC_SITE_URL}/u/${profile.public_slug}`
      : '';

    const replacePlaceholders = (text: string) => {
      let result = text
        .replace(/{{name}}/g, contact.name || '')
        .replace(/{{company}}/g, contact.company || '')
        .replace(/{{designation}}/g, contact.designation || '')
        .replace(/{{myName}}/g, profile?.name || '')
        .replace(/{{myCompany}}/g, profile?.company || '')
        .replace(/{{myCardLink}}/g, publicCardLink);
      
      // Fix spacing: remove extra blank lines between consecutive lines
      // This ensures {{myName}} and {{myCompany}} don't have gaps
      result = result.replace(/\n{3,}/g, '\n\n');
      
      return result;
    };
    return {
      body: replacePlaceholders(template.body),
      subject: template.subject ? replacePlaceholders(template.subject) : `Hello ${contact.name}`,
    };
  };

  const handleEmailClick = (contact: Contact) => {
    // Always show template selector for all templates + no template option
    setTemplateSelectorType('email');
    setTemplateSelectorContact(contact);
    setShowTemplateSelector(true);
  };

  const handleWhatsappClick = (contact: Contact) => {
    // Always show template selector for all templates + no template option
    setTemplateSelectorType('whatsapp');
    setTemplateSelectorContact(contact);
    setShowTemplateSelector(true);
  };

  const sendEmail = (contact: Contact, template: any) => {
    if (!contact.email) {
      toast({ title: 'No email address', variant: 'destructive' });
      return;
    }
    const applied = template ? applyTemplate(template, contact) : { body: '', subject: `Hello ${contact.name}` };
    const signature = getSelectedSignature();

    // Add signature below the template body
    let fullBody = applied.body;
    if (signature?.html) {
      // Convert HTML signature to plain text for mailto
      const signatureText = signature.html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?(div|p|td|tr|table)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      fullBody = `${fullBody}\n\n---\n${signatureText}`;
    }

    // Store pending interaction before opening email
    storePendingInteraction(contact, 'email');
    localStorage.setItem(RETURNING_FROM_INTERACTION_KEY, '1');
    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(applied.subject)}&body=${encodeURIComponent(fullBody)}`;
    setShowTemplateSelector(false);
  };

  // WhatsApp link helper - adds +91 if no country code
  const getWhatsappLink = (rawNumber: string, text?: string) => {
    const digits = rawNumber.replace(/\D/g, '');
    // If only 10 digits, assume India (+91)
    const numberWithCountry = digits.length === 10 ? `91${digits}` : digits;
    const baseUrl = `https://api.whatsapp.com/send?phone=${numberWithCountry}`;
    return text ? `${baseUrl}&text=${encodeURIComponent(text)}` : baseUrl;
  };

  const sendWhatsapp = (contact: Contact, template: any) => {
    const number = contact.whatsapp || contact.phone;
    if (!number) {
      toast({ title: 'No WhatsApp number', variant: 'destructive' });
      return;
    }
    const applied = template ? applyTemplate(template, contact) : { body: '', subject: '' };
    
    storePendingInteraction(contact, 'whatsapp');
localStorage.setItem(RETURNING_FROM_INTERACTION_KEY, '1');
window.open(getWhatsappLink(number, applied.body), '_blank');
setShowTemplateSelector(false);
  };

  // Handle call click with pending interaction
  const handleCallClick = (contact: Contact) => {
    if (!contact.phone) {
      toast({ title: 'No phone number', variant: 'destructive' });
      return;
    }
    storePendingInteraction(contact, 'call');
localStorage.setItem(RETURNING_FROM_INTERACTION_KEY, '1');
window.location.href = `tel:${contact.phone}`;
  };
  // Group contacts by date for smart display - MUST be before early returns
  const groupedContacts = useMemo(() => {
    if (sortBy === 'name') return null; // No grouping for alphabetical sort
    
    const groups: Record<DateGroup, Contact[]> = {
      'TODAY': [],
      'YESTERDAY': [],
      'THIS WEEK': [],
      'LAST WEEK': [],
      'THIS MONTH': [],
      'OLDER': [],
    };
    
    filteredContacts.forEach(contact => {
      const dateToUse = sortBy === 'last_interaction' 
        ? getLastInteractionTime(contact).toISOString()
        : contact.created_at;
      const group = getDateGroup(dateToUse);
      groups[group].push(contact);
    });
    
    return groups;
  }, [filteredContacts, sortBy]);

  // âœ… Silent load â€” no spinner
if (authLoading) {
  return null;
}

// Allow empty CRM shell while contacts load
if (!contacts && contactsLoading) {
  return null;
}

  // Handle contact row tap with haptic
  const handleContactTap = (contact: Contact) => {
    hapticFeedback.light();
    setSelectedContact(contact);
    setShowContactDetail(true);
    setIsEditOpen(false);
  };

  // Handle sort change with haptic
  const handleSortChange = (newSort: 'name' | 'date' | 'last_interaction') => {
    hapticFeedback.light();
    setSortBy(newSort);
    localStorage.setItem('crm_sort_by', newSort);
  };

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden bg-background font-inter">
      {/* Apple-style Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="w-full py-3 sm:py-4 px-3 sm:px-4 md:px-6 max-w-7xl mx-auto">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight font-inter">
              Contacts
            </h1>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  hapticFeedback.light();
                  setShowScanCard(true);
                }}
                aria-label="Scan business card"
              >
                <Scan className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-primary"
                onClick={() => {
                  hapticFeedback.light();
                  setShowAddContact(true);
                }}
                aria-label="Add contact"
              >
                <Plus className="h-5 w-5" strokeWidth={2} />
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-20 h-9 bg-secondary/50 border-0 rounded-xl text-[15px] placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-border"
              />
            </div>

            {/* Sort icon */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => hapticFeedback.light()}
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <ArrowUpDown className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleSortChange('name')}>
                  Sort by Name
                  {sortBy === 'name' && <Check className="ml-auto h-4 w-4 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('date')}>
                  Date Added
                  {sortBy === 'date' && <Check className="ml-auto h-4 w-4 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('last_interaction')}>
                  Last Interaction
                  {sortBy === 'last_interaction' && <Check className="ml-auto h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filter icon */}
<DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
  <DropdownMenuTrigger asChild>
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => hapticFeedback.light()}
        className={cn(
          "h-9 w-9 rounded-xl",
          (activeTagFilter.length > 0 || activeEventFilter.length > 0)
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Filter className="h-4 w-4" strokeWidth={1.5} />
      </Button>

      {/* ðŸ”µ Active filter indicator */}
      {(activeTagFilter.length > 0 || activeEventFilter.length > 0) && (
        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </div>
  </DropdownMenuTrigger>

  <DropdownMenuContent align="end" className="w-56">

    {/* HEADER WITH CLEAR BUTTON */}
    <div className="flex items-center justify-between px-2 py-1.5">
      <DropdownMenuLabel className="p-0">Filters</DropdownMenuLabel>

      {(activeTagFilter.length > 0 || activeEventFilter.length > 0) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-destructive hover:text-destructive"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTagFilter([]);
            setActiveEventFilter([]);
            setIsFilterOpen(false);
          }}
        >
          Clear
        </Button>
      )}
    </div>

    <DropdownMenuSeparator />

    {/* TAG FILTER */}
    <DropdownMenuLabel className="text-xs text-muted-foreground">Tags</DropdownMenuLabel>
    {tags?.map(tag => (
      <DropdownMenuItem
        key={tag.id}
        onClick={() => {
          setActiveTagFilter(prev =>
            prev.includes(tag.id)
              ? prev.filter(id => id !== tag.id)
              : [...prev, tag.id]
          );
        }}
      >
        <span
          className="w-2 h-2 rounded-full mr-2"
          style={{ backgroundColor: tag.color || '#888' }}
        />
        {tag.name}
        {activeTagFilter.includes(tag.id) && (
          <Check className="ml-auto h-4 w-4 text-primary" />
        )}
      </DropdownMenuItem>
    ))}

    <DropdownMenuSeparator />

    {/* EVENT FILTER */}
    <DropdownMenuLabel className="text-xs text-muted-foreground">Events</DropdownMenuLabel>

    {/* EVENTS (MULTI-SELECT) */}
    {events?.map(event => (
      <DropdownMenuItem
        key={event.id}
        onClick={() => {
          setActiveEventFilter(prev =>
            prev.includes(event.id)
              ? prev.filter(id => id !== event.id)
              : [...prev, event.id]
          );
        }}
      >
        {event.title}
        {activeEventFilter.includes(event.id) && (
          <Check className="ml-auto h-4 w-4 text-primary" />
        )}
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
          </div>
        </div>
      </div>

      {/* Contacts List */}
      <div className="w-full px-3 sm:px-4 md:px-6 pb-24 max-w-7xl mx-auto">
        {sortBy === 'name' || !groupedContacts ? (
          // Simple list for alphabetical sort
          <div className="divide-y divide-border/30">
            {filteredContacts.map((contact, index) => (
              <div
                key={contact.id}
                className="group cursor-pointer transition-all duration-[120ms] active:bg-muted/40 active:scale-[0.985]"
                onClick={() => handleContactTap(contact)}
              >
                <div className="flex items-center gap-3.5 px-4 py-3">
                  {/* Avatar with dynamic photo support */}
                  <ContactAvatar 
                    name={contact.name}
                    photoUrl={contact.photo_url}
                    sharedCardId={contact.shared_card_id}
                    size="sm"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex items-center">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16.5px] font-medium leading-tight text-foreground truncate font-inter">
                        {contact.name}
                      </h3>
                      {(contact.company || contact.designation) && (
                        <p className="text-[13px] font-normal text-muted-foreground truncate mt-0.5 leading-tight font-inter">
                          {contact.company && contact.designation
                            ? `${contact.company} · ${contact.designation}`
                            : contact.company || contact.designation}
                        </p>
                      )}
                    </div>

                    {/* Action indicator */}
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                  </div>
                </div>
                {/* Divider starts after avatar */}
                {index < filteredContacts.length - 1 && (
                  <div className="ml-[56px] border-b border-border/30" />
                )}
              </div>
            ))}
          </div>
        ) : (
          // Grouped list for date-based sorts
          <div>
            {groupOrder.map(group => {
              const contacts = groupedContacts[group];
              if (contacts.length === 0) return null;
              
              return (
                <div key={group}>
                 {/* Group Header - Apple Smart Date style (tight + attached to search) */}
<div className="sticky top-[96px] z-[5] bg-background/90 backdrop-blur-sm px-4 py-1">
  <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
    {group.replace('_', ' ')}
  </span>
</div>

                  
                  <div className="divide-y divide-border/30">
                    {contacts.map((contact, index) => (
                      <div
                        key={contact.id}
                        className="group cursor-pointer transition-all duration-[120ms] active:bg-muted/40 active:scale-[0.985]"
                        onClick={() => handleContactTap(contact)}
                      >
                        <div className="flex items-center gap-3.5 px-4 py-3">
                          {/* Avatar with dynamic photo support */}
                          <ContactAvatar 
                            name={contact.name}
                            photoUrl={contact.photo_url}
                            sharedCardId={contact.shared_card_id}
                            size="sm"
                          />

                          {/* Info */}
                          <div className="flex-1 min-w-0 flex items-center">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[16.5px] font-medium leading-tight text-foreground truncate font-inter">
                                {contact.name}
                              </h3>
                              {(contact.company || contact.designation) && (
                                <p className="text-[13px] font-normal text-muted-foreground truncate mt-0.5 leading-tight font-inter">
                                  {contact.company && contact.designation
                                    ? `${contact.company} · ${contact.designation}`
                                    : contact.company || contact.designation}
                                </p>
                              )}
                            </div>

                            {/* Action indicator */}
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                          </div>
                        </div>
                        {/* Divider starts after avatar */}
                        {index < contacts.length - 1 && (
                          <div className="ml-[56px] border-b border-border/30" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredContacts.length === 0 && !contactsLoading && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-[15px]">No contacts found</p>
            <Button 
              variant="ghost" 
              className="mt-3 text-primary font-medium" 
              onClick={() => {
                hapticFeedback.light();
                setShowAddContact(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add your first contact
            </Button>
          </div>
        )}
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization/Brand</Label>
                <Input
                  value={newContact.company}
                  onChange={(e) => setNewContact(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Organization/Brand"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={newContact.designation}
                  onChange={(e) => setNewContact(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="Role"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 234 567 890"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={newContact.whatsapp}
                  onChange={(e) => setNewContact(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="+1 234 567 890"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input
                  value={newContact.linkedin}
                  onChange={(e) => setNewContact(prev => ({ ...prev, linkedin: e.target.value }))}
                  placeholder="username"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={newContact.website}
                  onChange={(e) => setNewContact(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newContact.notes}
                onChange={(e) => setNewContact(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any notes..."
                rows={3}
              />
            </div>
            <Button variant="gradient" className="w-full" onClick={handleAddContact}>
              Save Contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scan Card Dialog */}
      <Dialog open={showScanCard} onOpenChange={setShowScanCard}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Scan Business Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Hidden canvas for image capture */}
            <canvas ref={canvasRef} className="hidden" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Camera / Captured Image View */}
            {!scannedContact && (
              <>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                  {isCameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : capturedImage ? (
                    <img src={capturedImage} alt="Captured card" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">Capture or upload a business card</p>
                    </div>
                  )}
                  {isScanning && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Extracting contact info...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Camera Controls */}
                <div className="flex gap-2">
                  {!capturedImage ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                      {isCameraActive ? (
                        <Button variant="gradient" className="flex-1" onClick={captureImage}>
                          <Camera className="h-4 w-4 mr-2" />
                          Capture
                        </Button>
                      ) : (
                        <Button variant="gradient" className="flex-1" onClick={startCamera}>
                          <Camera className="h-4 w-4 mr-2" />
                          Open Camera
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="flex-1" onClick={resetScan}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retake
                      </Button>
                      <Button
                        variant="gradient"
                        className="flex-1"
                        onClick={processWithAI}
                        disabled={isScanning}
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Scanning...
                          </>
                        ) : (
                          <>
                            <Scan className="h-4 w-4 mr-2" />
                            Extract Info
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Scanned Contact Review */}
            {scannedContact && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-3">Review extracted information:</p>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={scannedContact.name || ''}
                        onChange={(e) => setScannedContact((prev: any) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Company</Label>
                        <Input
                          value={scannedContact.company || ''}
                          onChange={(e) => setScannedContact((prev: any) => ({ ...prev, company: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Designation</Label>
                        <Input
                          value={scannedContact.designation || ''}
                          onChange={(e) => setScannedContact((prev: any) => ({ ...prev, designation: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          value={scannedContact.email || ''}
                          onChange={(e) => setScannedContact((prev: any) => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone</Label>
                        <Input
                          value={scannedContact.phone || ''}
                          onChange={(e) => setScannedContact((prev: any) => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Website</Label>
                        <Input
                          value={scannedContact.website || ''}
                          onChange={(e) => setScannedContact((prev: any) => ({ ...prev, website: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">LinkedIn</Label>
                        <Input
                          value={scannedContact.linkedin || ''}
                          onChange={(e) => setScannedContact((prev: any) => ({ ...prev, linkedin: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={resetScan}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Scan Again
                  </Button>
                  <Button variant="gradient" className="flex-1" onClick={saveScannedContact}>
                    Save Contact
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tag Selector Dialog */}
      <TagSelectorDialog
        open={showTagSelector}
        onOpenChange={setShowTagSelector}
        contactId={tagSelectorContactId}
        tags={tags}
        events={events}
        localContactTags={localContactTags}
        localContactEvents={localContactEvents}
        onTagToggle={handleTagToggle}
        onEventToggle={handleEventToggle}
        onTagCreated={async (name, color) => {
          const { data, error } = await createTag(name, color);
          if (error || !data) return null;
          return data as import('@/hooks/useTags').Tag;
        }}
        onTagUpdated={async (id, name) => {
          await updateTag(id, { name });
        }}
        onTagDeleted={async (id) => {
          await deleteTag(id);
        }}
      />

      {/* Template Selector Dialog */}
      <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {/* No Template Option */}
            <button
              onClick={() => {
                if (templateSelectorContact) {
                  templateSelectorType === 'email'
                    ? sendEmail(templateSelectorContact, null)
                    : sendWhatsapp(templateSelectorContact, null);
                }
              }}
              className="w-full p-3 rounded-lg border border-border hover:border-primary/50 text-left transition-all bg-muted/30"
            >
              <p className="font-medium">No Template</p>
              <p className="text-xs text-muted-foreground">Send without using a template</p>
            </button>

            {/* All Templates for selected channel */}
            {(templateSelectorType === 'email' ? getEmailTemplates() : getWhatsappTemplates())
              .map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    if (templateSelectorContact) {
                      templateSelectorType === 'email'
                        ? sendEmail(templateSelectorContact, template)
                        : sendWhatsapp(templateSelectorContact, template);
                    }
                  }}
                  className="w-full p-3 rounded-lg border border-border hover:border-primary/50 text-left transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">{template.name}</p>
                    {(templateSelectorType === 'email' ? template.is_selected_for_email : template.is_selected_for_whatsapp) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Default</span>
                    )}
                  </div>
                  {templateSelectorType === 'email' && template.subject && (
                    <p className="text-xs text-muted-foreground mb-1">Subject: {template.subject}</p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2">{template.body}</p>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Detail Drawer */}
      <Drawer
        open={showContactDetail}
        onOpenChange={(val) => {
          // Use setTimeout to prevent state conflicts with child components
          setTimeout(() => {
            setShowContactDetail(val);
            if (!val) {
              setIsEditOpen(false);
              editNameRef.current?.blur();
            }
          }, 0);
        }}
      >
        <DrawerContent
  className="h-[90vh] max-h-[90vh] rounded-t-3xl border-0 shadow-none pt-0 backdrop-blur-xl bg-background/90 [&>div:first-child]:hidden overflow-hidden"
>
  {/* ðŸŽ iOS Drag Handle */}
  <div className="flex justify-center mb-1 flex-shrink-0">
    <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
  </div>
          {selectedContact && (
            <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out">
              <div
  ref={drawerScrollRef}
  className="flex-1 overflow-y-auto overscroll-contain space-y-6 px-4 pb-6 scrollbar-hide"
>
              <DrawerHeader className="text-center relative pt-0 mt-0">
                <ContactAvatar 
                  name={selectedContact.name}
                  photoUrl={selectedContact.photo_url}
                  sharedCardId={selectedContact.shared_card_id}
                  size="lg"
                  className="mx-auto mb-2"
                />
                <DrawerTitle className="text-[22px] font-semibold tracking-tight mt-1">
  {selectedContact.name}
</DrawerTitle>
{(selectedContact.company || selectedContact.designation) && (
  <p className="text-[14px] text-muted-foreground mt-0.5">
    {selectedContact.company && selectedContact.designation
      ? `${selectedContact.company} · ${selectedContact.designation}`
      : selectedContact.company || selectedContact.designation}
  </p>
)}
{selectedContact.about && (
  <p className="text-[13px] text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
    {selectedContact.about}
  </p>
)}
                {/* Right-side controls: edit + close (single X only) */}
                <div className="absolute right-4 top-3 flex items-center gap-2">
                  {/* Edit icon (hidden when editing) */}
                  {!isEditOpen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        // Use setTimeout to prevent state conflicts
                        setTimeout(() => {
                          setIsEditOpen(true);
                        }, 0);
                      }}
                      className="absolute right-4 top-4 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border/40 flex items-center justify-center active:scale-95"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </DrawerHeader>

              {/* --- Inline Edit Form inside Sheet --- */}
              {isEditOpen && selectedContact ? (
                <div className="space-y-3 p-4 mx-4">
                  <FloatingInput
                    label="Full name"
                    value={editForm.name}
                    onChange={(e) => updateEditField('name', e.target.value)}
                    inputRef={editNameRef}
                  />
                  <FloatingInput
                    label="Organization/Brand"
                    value={editForm.company}
                    onChange={(e) => updateEditField('company', e.target.value)}
                  />
                  <FloatingInput
                    label="Role"
                    value={editForm.designation}
                    onChange={(e) => updateEditField('designation', e.target.value)}
                  />
                  <FloatingPhoneInput
                    label="Mobile"
                    value={extractPhoneNumber(editForm.phone)}
                    onChange={(e) => {
                      const code = getCountryCode(editForm.phone);
                      updateEditField('phone', code + e.target.value);
                    }}
                    countryCode={getCountryCode(editForm.phone)}
                    onCountryCodeChange={(code) => {
                      const number = extractPhoneNumber(editForm.phone);
                      updateEditField('phone', code + number);
                    }}
                  />
                  <FloatingInput
                    label="Email"
                    value={editForm.email}
                    onChange={(e) => updateEditField('email', e.target.value)}
                    inputMode="email"
                  />
                  <FloatingPhoneInput
                    label="WhatsApp"
                    value={extractPhoneNumber(editForm.whatsapp)}
                    onChange={(e) => {
                      const code = getCountryCode(editForm.whatsapp);
                      updateEditField('whatsapp', code + e.target.value);
                    }}
                    countryCode={getCountryCode(editForm.whatsapp)}
                    onCountryCodeChange={(code) => {
                      const number = extractPhoneNumber(editForm.whatsapp);
                      updateEditField('whatsapp', code + number);
                    }}
                  />
                  <FloatingInput
                    label="LinkedIn"
                    value={editForm.linkedin}
                    onChange={(e) => updateEditField('linkedin', e.target.value)}
                  />
                  <FloatingInput
                    label="Website"
                    value={editForm.website}
                    onChange={(e) => updateEditField('website', e.target.value)}
                    inputMode="url"
                  />

                  <div>
                    <Label className="text-xs">Add Note</Label>
                    <Textarea
                      value={editForm.notes}
                      onChange={(e) => updateEditField('notes', e.target.value)}
                      placeholder="Add a new note..."
                      rows={3}
                    />
                  </div>

                  {editError && <div className="text-sm text-red-600">{editError}</div>}
                </div>
              ) : null}
{isEditOpen && (
  <div className="border-t bg-background px-4 py-3 flex justify-between">
    <Button
      variant="destructive"
      onClick={() => {
        setConfirmDialog({
          open: true,
          title: `Delete ${selectedContact.name}`,
          description: 'This action cannot be undone.',
          onConfirm: async () => {
            const { error } = await deleteContact(selectedContact.id);
            if (!error) {
              setShowContactDetail(false);
              setSelectedContact(null);
              editNameRef.current?.blur();
              setIsEditOpen(false);
              setConfirmDialog(prev => ({ ...prev, open: false }));
              toast({ title: 'Contact deleted' });
            } else {
              setConfirmDialog(prev => ({ ...prev, open: false }));
              toast({ title: 'Failed to delete contact', variant: 'destructive' });
            }
          }
        });
      }}
      disabled={editLoading}
    >
      <Trash2 className="w-4 h-4 mr-2" />
      Delete
    </Button>
    <div className="flex gap-2">
      <button
        onClick={() => {
          editNameRef.current?.blur();
          setIsEditOpen(false);
          if (selectedContact) {
            setEditForm({
              name: selectedContact.name || '',
              company: selectedContact.company || '',
              designation: selectedContact.designation || '',
              phone: selectedContact.phone || '',
              email: selectedContact.email || '',
              whatsapp: selectedContact.whatsapp || '',
              linkedin: selectedContact.linkedin || '',
              website: selectedContact.website || '',
              notes: '',
              tags: localContactTags,
            });
          }
        }}
        className="px-4 py-2 rounded-md border"
        disabled={editLoading}
      >
        Cancel
      </button>

      <button
        onClick={saveEditedContact}
        disabled={editLoading}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-primary text-white"
      >
        <Save className="w-4 h-4" />
        Save
      </button>
    </div>
  </div>
)}
{!isEditOpen && (
  <>
<div className="flex justify-center gap-2 mt-4">
  <button 
    onClick={() => {
      setTagSelectorContactId(selectedContact.id);
      setLocalContactTags(selectedContact.tags?.map(t => t.id) || []);
      setLocalContactEvents(selectedContact.events?.map(e => e.id) || []);
      setShowTagSelector(true);
    }}
    className="px-5 py-2 rounded-full bg-white text-black text-[14px] font-medium active:scale-95 transition-transform border border-border/50"
  >
    +Tag
  </button>

  <button 
    onClick={() => setShowNotesPopup(true)}
    className="px-5 py-2 rounded-full bg-white text-black text-[14px] font-medium active:scale-95 transition-transform border border-border/50"
  >
    +Notes
  </button>
</div>
{/* Tags & Events - centered below buttons */}
{((selectedContact.tags && selectedContact.tags.length > 0) || (selectedContact.events && selectedContact.events.length > 0)) && (
  <div className="flex flex-wrap justify-center gap-1.5 mt-3">
    {selectedContact.tags?.map((tag) => (
      <span
        key={tag.id}
        className="px-3 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary"
      >
        {tag.name}
      </span>
    ))}
    {selectedContact.events?.map((event) => (
      <span
        key={event.id}
        className="px-3 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground"
      >
        {event.title}
      </span>
    ))}
  </div>
)}
    <div className="space-y-3">
      {selectedContact.phone && (
        <button 
          onClick={() => handleCallClick(selectedContact)} 
          className="flex items-center gap-3 p-4 rounded-3xl bg-muted active:scale-[0.98] transition-transform w-full text-left"
        >
          <Phone className="h-5 w-5 text-foreground/70" strokeWidth={1.3} />
          <span className="text-foreground">{selectedContact.phone}</span>
        </button>
      )}
      {selectedContact.email && (
        <button 
          onClick={() => handleEmailClick(selectedContact)} 
          className="flex items-center gap-3 p-4 rounded-3xl bg-muted active:scale-[0.98] transition-transform w-full text-left"
        >
          <Mail className="h-5 w-5 text-foreground/70" strokeWidth={1.3} />
          <span className="text-foreground">{selectedContact.email}</span>
        </button>
      )}
      {(selectedContact.whatsapp || selectedContact.phone) && (
        <button 
          onClick={() => handleWhatsappClick(selectedContact)} 
          className="flex items-center gap-3 p-4 rounded-3xl bg-muted active:scale-[0.98] transition-transform w-full text-left"
        >
          <FaWhatsapp className="h-5 w-5 text-foreground/70" />
          <span className="text-foreground">Connect on WhatsApp</span>
        </button>
      )}
      {selectedContact.linkedin && (
        <a href={`https://linkedin.com/in/${selectedContact.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-3xl bg-muted active:scale-[0.98] transition-transform">
          <Linkedin className="h-5 w-5 text-foreground/70" strokeWidth={1.3} />
          <span className="text-foreground">Connect on LinkedIn</span>
        </a>
      )}
      {selectedContact.website && (
        <a href={`https://${selectedContact.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-3xl bg-muted active:scale-[0.98] transition-transform">
          <Globe className="h-5 w-5 text-foreground/70" strokeWidth={1.3} />
          <span className="text-foreground">Visit Website</span>
        </a>
      )}
    </div>
{/* Contact Added Date */}
<div className="text-center text-[10.5px] text-muted-foreground tracking-widest mt-4">
  <span className="uppercase tracking-wider">Contact Added</span>
  <span> · </span>
  <span>{formatSmartDate(selectedContact.created_at)}</span>
</div>
{notesHistory.length > 0 && (
  <div className="mx-2 mt-3 p-4 rounded-3xl bg-muted space-y-2">
    <p className="text-[11px] tracking-wider text-muted-foreground mb-3">
  NOTES
</p>

    {notesHistory.map((entry, i) => (
      <div key={i} className="flex items-start justify-between gap-2 border-b pb-2">
        <div className="flex-1">
          <p className="text-[15px] leading-relaxed text-foreground">{entry.text}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {formatSmartTime(entry.timestamp)}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => {
              const parsed = parseNoteForEdit(entry.text);
              setEditNoteDialog({ open: true, index: i, systemText: parsed.systemText, userText: parsed.userText });
            }}
            className="p-1 rounded hover:bg-muted"
            title="Edit note"
          >
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => {
              const noteIndex = i;
              setConfirmDialog({
                open: true,
                title: 'Delete Note',
                description: 'This action cannot be undone.',
                onConfirm: () => {
                  const updatedHistory = notesHistory.filter((_, idx) => idx !== noteIndex);
                  updateContact(selectedContact.id, { notes_history: updatedHistory });
                  setNotesHistory(updatedHistory);
                  setConfirmDialog(prev => ({ ...prev, open: false }));
                }
              });
            }}
            className="p-1 rounded hover:bg-muted"
            title="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    ))}
  </div>
)}
  </>
)}
                </div>
            </div>
          )}
<Dialog open={showNotesPopup} onOpenChange={setShowNotesPopup}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Notes</DialogTitle>
    </DialogHeader>

    <div className="flex gap-2">
      <Textarea
        value={notesInput}
        onChange={(e) => setNotesInput(e.target.value)}
        placeholder="Write a note..."
        className="flex-1"
      />
      <Button variant="gradient" onClick={saveNote}>
        <Save className="h-4 w-4" />
      </Button>
    </div>

    <div className="mt-4 space-y-3 max-h-[200px] overflow-y-auto">
      {notesHistory.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          No notes yet
        </p>
      )}

      {notesHistory.map((entry, i) => (
        <div key={i} className="p-3 rounded-lg bg-muted/40 border flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-[15px] leading-relaxed">{entry.text}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatSmartTime(entry.timestamp)}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => {
                const parsed = parseNoteForEdit(entry.text);
                setEditNoteDialog({ open: true, index: i, systemText: parsed.systemText, userText: parsed.userText });
              }}
              className="p-1 rounded hover:bg-muted"
              title="Edit note"
            >
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => {
                const noteIndex = i;
                setConfirmDialog({
                  open: true,
                  title: 'Delete Note',
                  description: 'This action cannot be undone.',
                  onConfirm: () => {
                    const updatedHistory = notesHistory.filter((_, idx) => idx !== noteIndex);
                    updateContact(selectedContact!.id, { notes_history: updatedHistory });
                    setNotesHistory(updatedHistory);
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                  }
                });
              }}
              className="p-1 rounded hover:bg-muted"
              title="Delete note"
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      ))}
    </div>
  </DialogContent>
</Dialog>
        </DrawerContent>
      </Drawer>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
      />

      {/* Edit Note Dialog */}
      <Dialog open={editNoteDialog.open} onOpenChange={(open) => setEditNoteDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* System text - read only */}
            {editNoteDialog.systemText && (
              <div className="inline-flex items-center px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {editNoteDialog.systemText}
              </div>
            )}
            {/* User text - editable */}
            <Textarea
              value={editNoteDialog.userText}
              onChange={(e) => setEditNoteDialog(prev => ({ ...prev, userText: e.target.value }))}
              placeholder={editNoteDialog.systemText ? "Add additional notes..." : "Edit note..."}
              rows={4}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditNoteDialog({ open: false, index: -1, systemText: '', userText: '' })}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={() => {
                if (selectedContact) {
                  const updatedHistory = [...notesHistory];
                  // Combine system text + user text
                  let finalText = editNoteDialog.systemText;
                  if (editNoteDialog.userText.trim()) {
                    finalText = editNoteDialog.systemText 
                      ? `${editNoteDialog.systemText} - ${editNoteDialog.userText.trim()}`
                      : editNoteDialog.userText.trim();
                  }
                  // Only save if there's something to save
                  if (finalText) {
                    updatedHistory[editNoteDialog.index] = { ...updatedHistory[editNoteDialog.index], text: finalText };
                    updateContact(selectedContact.id, { notes_history: updatedHistory });
                    setNotesHistory(updatedHistory);
                  }
                  setEditNoteDialog({ open: false, index: -1, systemText: '', userText: '' });
                }
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interaction Confirmation Popup */}
      <Dialog open={showInteractionConfirm} onOpenChange={(open) => !open && clearPendingInteraction()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">
              {pendingInteraction?.interactionType === 'whatsapp' && 'WhatsApp sent to'}
              {pendingInteraction?.interactionType === 'email' && 'Email sent to'}
              {pendingInteraction?.interactionType === 'call' && 'Call made to'}
              {' '}{pendingInteraction?.contactName}?
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              onClick={handleInteractionConfirmNo}
              className="min-w-[80px]"
            >
              No
            </Button>
            <Button
              variant="gradient"
              onClick={handleInteractionConfirmYes}
              className="min-w-[80px]"
            >
              Yes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interaction Notes Popup (after Yes/No confirmation) */}
      <Dialog open={showInteractionNotes} onOpenChange={(open) => !open && closeInteractionNotes()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {interactionConfirmed ? 'Add Details' : 'Add Note (Optional)'}
            </DialogTitle>
          </DialogHeader>
          
          {/* System text as read-only pill when confirmed */}
          {interactionConfirmed && interactionSystemText && (
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium">
                {interactionSystemText}
              </span>
              <span className="text-xs text-muted-foreground">(auto-logged)</span>
            </div>
          )}
          
          <Textarea
            value={interactionUserNotes}
            onChange={(e) => setInteractionUserNotes(e.target.value)}
            placeholder={interactionConfirmed ? 'Add additional notes...' : 'Add a note about this interaction...'}
            rows={4}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={closeInteractionNotes}>
              {interactionConfirmed ? 'Done' : 'Skip'}
            </Button>
            <Button
              variant="gradient"
              onClick={saveInteractionNote}
            >
              {interactionConfirmed ? 'Save' : 'Save Note'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
          }
