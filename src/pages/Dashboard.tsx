// Dashboard.tsx
import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  Eye,
  Users,
  Link2,
  Calendar,
  Mail,
  Tags,
  Sparkles,
  Plus,
  X,
  Copy,
  Check,
  Trash2,
  Edit,
  CalendarDays,
  Loader2,
  MessageCircle,
  Info,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, localToIST, formatIST, toDatetimeLocalIST, getContrastTextColor, getSubtleBackground } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useTags } from '@/hooks/useTags';
import { useEvents } from '@/hooks/useEvents';
import { useTemplates, Template } from '@/hooks/useTemplates';
import { useSignatures } from '@/hooks/useSignatures';
import { useAnalytics, AttendedEvent } from '@/hooks/useAnalytics';
import { useCards } from '@/hooks/useCards';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import EmailSignatureGenerator from '@/components/signature/EmailSignatureGenerator';

/**
 * Full Dashboard.tsx — merged with server-side RPC 'get_attended_events'
 *
 * - Make sure you've run the SQL RPC in Supabase:
 *   see the SQL provided in the chat.
 *
 * - The events tile shows: attendedCount / totalViews
 * - Clicking the tile opens a popup with per-event breakdown.
 *
 * - This file preserves all of your original UI blocks (templates, signatures, tags, events),
 *   only the event/analytics-related logic is updated (RPC-based).
 */

// helpers HSL <-> HEX
function hslToHex(h: number, s = 80, l = 50) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));

  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
// Convert Date → IST timestamptz string (+05:30)
function toISTTimestamp(date?: Date | null) {
  if (!date) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());

  // Explicit IST offset
  return `${y}-${m}-${d}T${h}:${min}:${s}+05:30`;
}

function hexToHsl(hex: string) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
  }
  return Math.round(h || 0);
}

const timeFilters = ['All', '7 days', '15 days', '30 days', 'Custom'];

export default function Dashboard() {
  const { profile } = useProfile();
  const { user } = useAuth();
  const { cards, activeCard } = useCards();
  const { tags, createTag, deleteTag } = useTags();
  const { events, addEvent, deleteEvent } = useEvents();
  const { templates, addTemplate, updateTemplate, deleteTemplate, getEmailTemplates, getWhatsappTemplates } = useTemplates();
  const { addSignature, getSelectedSignature } = useSignatures();
  const { analytics, loading: analyticsLoading, refetch: refetchAnalytics, fetchAttendedEvents } = useAnalytics();
  
  // Check if user is on Orange plan
  const isOrangePlan = profile?.plan?.toLowerCase() === 'orange';

  // Show upgrade toast for Orange features
  const showUpgradeToast = () => {
    toast({
      title: "Orange Feature",
      description: "Upgrade to Orange & unlock this premium feature",
      action: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.location.href = '/settings/upgrade'}
          className="border-orange-500 text-orange-600 hover:bg-orange-50"
        >
          Upgrade
        </Button>
      ),
    });
  };

  // Time filter
  const [activeFilter, setActiveFilter] = useState('All');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Events popup
  const [showEventsPopup, setShowEventsPopup] = useState(false);
  const [attendedEventsList, setAttendedEventsList] = useState<Array<{ id: string; title: string; views: number; start_time?: string | null; end_time?: string | null }>>([]);

  // tracked attended metrics
  const [attendedCount, setAttendedCount] = useState<number>(0);
  const [attendedViews, setAttendedViews] = useState<number>(0);

  const [loadingEventsList, setLoadingEventsList] = useState(false);

  // Get current date range for queries
  const getDateRange = () => {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (activeFilter === '7 days') {
      startDate = startOfDay(subDays(new Date(), 7));
      endDate = endOfDay(new Date());
    } else if (activeFilter === '15 days') {
      startDate = startOfDay(subDays(new Date(), 15));
      endDate = endOfDay(new Date());
    } else if (activeFilter === '30 days') {
      startDate = startOfDay(subDays(new Date(), 30));
      endDate = endOfDay(new Date());
    } else if (activeFilter.startsWith('Custom:') && customDateRange.from && customDateRange.to) {
      startDate = startOfDay(customDateRange.from);
      endDate = endOfDay(customDateRange.to);
    }

    return { startDate, endDate };
  };

  // ------------------------------
  // RPC-based event metrics: uses get_attended_events(start_ts, end_ts)
  // ------------------------------
  const updateEventMetrics = async () => {
    setLoadingEventsList(true);
    try {
      const { startDate, endDate } = getDateRange();
      // Prepare timestamptz values for the RPC
      const start_ts = toISTTimestamp(startDate);
const end_ts = toISTTimestamp(endDate);

      // Call RPC
      const { data, error } = await supabase.rpc('get_attended_events_list', { 
        p_user_id: user?.id || null, 
        p_start_date: start_ts, 
        p_end_date: end_ts 
      });

      if (error) {
        console.error('RPC get_attended_events error', error);
        toast({ title: 'Failed to fetch attended events', variant: 'destructive' });
        setAttendedEventsList([]);
        setAttendedCount(0);
        setAttendedViews(0);
        return;
      }

      const rows = Array.isArray(data) ? data : [];

      // Map rows into a consistent shape, coerce views to number
      const mapped = rows.map((r: any) => ({
        id: String(r.id),
        title: r.title || r.name || `Event ${r.id}`,
        views: Number(r.unique_views ?? 0), // Fixed: RPC returns 'unique_views', not 'views'
        start_time: r.start_time || null,
        end_time: r.end_time || null
      }));

      // Only consider attended events — events with at least 1 view
      const attendedOnly = mapped.filter((e) => Number(e.views) > 0);

      const totalViews = attendedOnly.reduce((s, it) => s + (it.views || 0), 0);
      setAttendedEventsList(attendedOnly);
      setAttendedCount(attendedOnly.length);
      setAttendedViews(totalViews);
    } catch (err) {
      console.error('updateEventMetrics error', err);
      toast({ title: 'Failed to update event metrics', variant: 'destructive' });
      setAttendedEventsList([]);
      setAttendedCount(0);
      setAttendedViews(0);
    } finally {
      setLoadingEventsList(false);
    }
  };

  // Refetch analytics when filter changes
  useEffect(() => {
    const { startDate, endDate } = getDateRange();
    refetchAnalytics(startDate, endDate);
    // update our attended-event metrics too
    updateEventMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, customDateRange, refetchAnalytics]);

  // Handle Events tile click
  const handleEventsTileClick = async () => {
    setShowEventsPopup(true);
    setLoadingEventsList(true);
    await updateEventMetrics();
    setLoadingEventsList(false);
  };

  // Template UI
  const [addTemplateMode, setAddTemplateMode] = useState<null | 'email' | 'whatsapp'>(null);
  const [newTemplateData, setNewTemplateData] = useState({ name: '', subject: '', body: '' });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [showAIEmailGenerator, setShowAIEmailGenerator] = useState(false);
  const [showAIWhatsAppGenerator, setShowAIWhatsAppGenerator] = useState(false);
  const [aiTemplatePrompt, setAITemplatePrompt] = useState('');
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);

  // Signature states and generation
  const [showSignatureEditor, setShowSignatureEditor] = useState(false);
  const [editingSigFields, setEditingSigFields] = useState({
    name: '',
    title: '',
    company: '',
    email: '',
    phone: ''
  });
  const [showSignatureGenerator, setShowSignatureGenerator] = useState(false);
  const [showSignaturePrompt, setShowSignaturePrompt] = useState(false);
  const [showSignatureExport, setShowSignatureExport] = useState(false);
  const [signaturePrompt, setSignaturePrompt] = useState('');
  const [generatedSignatures, setGeneratedSignatures] = useState<{ name: string; html: string }[]>([]);
  const [selectedSignatureIndex, setSelectedSignatureIndex] = useState(0);
  const [copiedSignature, setCopiedSignature] = useState(false);
  const [isGeneratingSignatures, setIsGeneratingSignatures] = useState(false);

  // Tag input (restored)
  const [newTag, setNewTag] = useState('');
  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    await createTag(newTag.trim());
    setNewTag('');
  };

  // Default event templates (local chips)
  const [defaultEventTemplates, setDefaultEventTemplates] = useState<Array<{ id: string; name: string; color?: string }>>([
    { id: 'expo', name: 'Expo', color: undefined },
    { id: 'tradefare', name: 'Tradefare', color: undefined }
  ]);
  const [newDefaultEventName, setNewDefaultEventName] = useState('');

  // Local lists so UI updates immediately
  const [localTags, setLocalTags] = useState<any[]>([]);
  const [localEvents, setLocalEvents] = useState<any[]>([]);

  // Event options dialog (for default events & DB events)
  const [showEventOptions, setShowEventOptions] = useState(false);
  const [selectedEventForOptions, setSelectedEventForOptions] = useState<any | null>(null);
  const [selectedEventHue, setSelectedEventHue] = useState<number>(200);

  // Tag options dialog (compact, single name)
  const [showTagOptions, setShowTagOptions] = useState(false);
  const [selectedTagForOptions, setSelectedTagForOptions] = useState<any | null>(null);
  const [selectedTagHue, setSelectedTagHue] = useState<number>(0);

  // Event delete dialog (only DB events deletion via list)
  const [showEventDeleteDialog, setShowEventDeleteDialog] = useState(false);
  const [selectedEventForDelete, setSelectedEventForDelete] = useState<any | null>(null);

  // Confirm dialog state (for tag/event delete confirmations)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  // Add event modal
  const [newEventData, setNewEventData] = useState({ title: '', start_time: '', end_time: '', description: '' });
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Refs
  const tagsContainerRef = useRef<HTMLDivElement | null>(null);
  const eventsContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync incoming hooks data
  useEffect(() => setLocalTags(tags || []), [tags]);
  useEffect(() => setLocalEvents(events || []), [events]);

  // Time filter helpers
  const handleFilterClick = (filter: string) => {
    if (filter === 'Custom') setShowCustomDatePicker(true);
    else {
      setActiveFilter(filter);
      setCustomDateRange({ from: undefined, to: undefined });
    }
  };
  const handleCustomDateSelect = () => {
    if (customDateRange.from && customDateRange.to) {
      setActiveFilter(`Custom: ${format(customDateRange.from, 'dd MMM')} – ${format(customDateRange.to, 'dd MMM')}`);
      setShowCustomDatePicker(false);
    }
  };

  // Add default event (local chip)
  const handleAddDefaultEvent = () => {
    const name = newDefaultEventName?.trim();
    if (!name) return;
    const id = `local-${Date.now()}`;
    setDefaultEventTemplates(prev => [...prev, { id, name, color: undefined }]);
    setNewDefaultEventName('');
  };

  // Remove default/local event
  const handleDeleteDefaultEvent = (idOrName: string) => {
    setDefaultEventTemplates(prev => prev.filter(e => e.id !== idOrName && e.name !== idOrName));
  };

  // Open event options for a chip (either a DB event object or a local default)
  const openEventOptions = (ev: any) => {
    setSelectedEventForOptions(ev);
    const colorHex = ev?.color || ev?.colorHex || ev?.color_hex || undefined;
    const hue = colorHex ? hexToHsl(colorHex) : 200;
    setSelectedEventHue(hue);
    setShowEventOptions(true);
  };

  // Event hue change handler (auto-saves)
  const handleEventHueChange = async (hue: number) => {
    setSelectedEventHue(hue);
    if (!selectedEventForOptions) return;
    const hex = hslToHex(hue, 80, 50);

    // Update local state only (events table doesn't have color column)
    const maybeDbEvent = localEvents.find((le) => String(le.id) === String(selectedEventForOptions.id));
    if (maybeDbEvent) {
      setLocalEvents(prev => prev.map(e => e.id === maybeDbEvent.id ? { ...e, color: hex } : e));
      setSelectedEventForOptions((s: any) => s ? ({ ...s, color: hex }) : s);
    } else {
      setDefaultEventTemplates(prev => prev.map(e => (e.id === selectedEventForOptions.id ? { ...e, color: hex } : e)));
      setSelectedEventForOptions((s: any) => s ? ({ ...s, color: hex }) : s);
    }
  };

  const handleDeleteEventFromOptions = async () => {
    if (!selectedEventForOptions) return;
    const maybeDbEvent = localEvents.find((le) => String(le.id) === String(selectedEventForOptions.id));
    if (maybeDbEvent) {
      setConfirmDialog({
        open: true,
        title: `Delete ${maybeDbEvent.title}`,
        description: 'This action cannot be undone.',
        onConfirm: async () => {
          await deleteEvent(maybeDbEvent.id);
          setShowEventOptions(false);
          setSelectedEventForOptions(null);
          setConfirmDialog(prev => ({ ...prev, open: false }));
          toast({ title: 'Event deleted' });
        }
      });
    } else {
      handleDeleteDefaultEvent(selectedEventForOptions.id);
      setShowEventOptions(false);
      setSelectedEventForOptions(null);
      toast({ title: 'Event removed' });
    }
  };

  // Open Tag options (existing behavior)
  const openTagOptions = (tag: any) => {
    setSelectedTagForOptions(tag);
    const hue = tag?.color ? hexToHsl(tag.color) : 200;
    setSelectedTagHue(hue);
    setShowTagOptions(true);
  };

  const handleTagHueChange = async (hue: number) => {
    setSelectedTagHue(hue);
    if (!selectedTagForOptions) return;
    const hex = hslToHex(hue, 80, 50);
    try {
      await supabase.from('tags').update({ color: hex }).eq('id', selectedTagForOptions.id);
      setLocalTags(prev => prev.map(t => (t.id === selectedTagForOptions.id ? { ...t, color: hex } : t)));
      setSelectedTagForOptions((s: any) => s ? ({ ...s, color: hex }) : s);
    } catch (err) {
      console.error('Failed to update tag color', err);
      toast({ title: 'Failed to update color', variant: 'destructive' });
    }
  };

  const handleDeleteTagConfirmed = async () => {
    if (!selectedTagForOptions) return;
    const id = selectedTagForOptions.id;
    setConfirmDialog({
      open: true,
      title: `Delete ${selectedTagForOptions.name}`,
      description: 'This action cannot be undone.',
      onConfirm: async () => {
        await deleteTag(id);
        setShowTagOptions(false);
        setSelectedTagForOptions(null);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        toast({ title: 'Tag deleted' });
      }
    });
  };

  // Event delete from events list (keeps old behavior)
  const openEventDeleteDialog = (ev: any) => {
    setSelectedEventForDelete(ev);
    setShowEventDeleteDialog(true);
  };

  const handleDeleteEventConfirmed = async () => {
    if (!selectedEventForDelete) return;
    const id = selectedEventForDelete.id;
    setConfirmDialog({
      open: true,
      title: `Delete ${selectedEventForDelete.title}`,
      description: 'This action cannot be undone.',
      onConfirm: async () => {
        await deleteEvent(id);
        setShowEventDeleteDialog(false);
        setSelectedEventForDelete(null);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        toast({ title: 'Event deleted' });
      }
    });
  };

  // ------------------------------
  // Helper: build timestamp that preserves wall-clock local time + local timezone offset
  // Example: datetime-local "2025-12-12T15:30" => "2025-12-12T15:30:00+05:30" (for IST)
  // ------------------------------
  function buildTimestampWithLocalOffset(datetimeLocal?: string | null) {
    if (!datetimeLocal) return null;

    // Ensure seconds are present: "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DDTHH:mm:00"
    const ts = datetimeLocal.length === 16 ? `${datetimeLocal}:00` : datetimeLocal;

    // getTimezoneOffset returns minutes *behind* UTC (e.g. IST -> -330), we want sign as +05:30
    const offsetMinutes = -new Date().getTimezoneOffset(); // e.g. 330
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absMin / 60)).padStart(2, '0');
    const minutes = String(absMin % 60).padStart(2, '0');

    return `${ts}${sign}${hours}:${minutes}`;
  }

  // Add Event modal create (interpret datetime-local in browser's timezone and save with offset)
  const handleAddEvent = async () => {
    if (!newEventData.title) {
      toast({ title: 'Please provide event name', variant: 'destructive' });
      return;
    }

    try {
      let startIso: string | null = null;
      let endIso: string | null = null;

      // Auto-set logic for dates
      if (newEventData.start_time && newEventData.end_time) {
        // Both provided
        startIso = buildTimestampWithLocalOffset(newEventData.start_time);
        endIso = buildTimestampWithLocalOffset(newEventData.end_time);
      } else if (newEventData.start_time && !newEventData.end_time) {
        // Only start provided → auto-set end to same day 11:59 PM
        startIso = buildTimestampWithLocalOffset(newEventData.start_time);
        const startDate = newEventData.start_time.split('T')[0];
        endIso = buildTimestampWithLocalOffset(`${startDate}T23:59`);
      } else if (!newEventData.start_time && newEventData.end_time) {
        // Only end provided → auto-set start to same day 12:00 AM
        const endDate = newEventData.end_time.split('T')[0];
        startIso = buildTimestampWithLocalOffset(`${endDate}T00:00`);
        endIso = buildTimestampWithLocalOffset(newEventData.end_time);
      }
      // If no date/time → both remain null (chip only)

      if (editingEventId) {
        // Update existing event
        const { updateEvent } = await import('@/hooks/useEvents').then(m => ({ updateEvent: m.useEvents }));
        await supabase.from('events').update({
          title: newEventData.title,
          start_time: startIso,
          end_time: endIso,
          description: newEventData.description || null,
        }).eq('id', editingEventId);
        
        setLocalEvents(prev => prev.map(e => e.id === editingEventId ? {
          ...e,
          title: newEventData.title,
          start_time: startIso,
          end_time: endIso,
          description: newEventData.description || null,
        } : e));
        
        toast({ title: 'Event updated!' });
      } else {
        await addEvent({
          title: newEventData.title,
          start_time: startIso,
          end_time: endIso,
          description: newEventData.description || null,
        });
        toast({ title: 'Event created!' });
      }

      setNewEventData({ title: '', start_time: '', end_time: '', description: '' });
      setEditingEventId(null);
      setShowAddEvent(false);
    } catch (err) {
      console.error('create/update event failed', err);
      toast({ title: 'Failed to save event', variant: 'destructive' });
    }
  };

  // Open edit event modal
  const openEditEventModal = (event: any) => {
    setEditingEventId(event.id);
    setNewEventData({
      title: event.title || '',
      start_time: event.start_time ? toDatetimeLocalIST(event.start_time) : '',
      end_time: event.end_time ? toDatetimeLocalIST(event.end_time) : '',
      description: event.description || '',
    });
    setShowAddEvent(true);
  };

  // AI template generation
  const handleGenerateAITemplate = async (channel: 'email' | 'whatsapp') => {
    if (!aiTemplatePrompt.trim()) {
      toast({ title: 'Please describe your template', variant: 'destructive' });
      return;
    }
    setIsGeneratingTemplate(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-template', {
        body: { prompt: aiTemplatePrompt, channel }
      });
      if (error) throw error;
      if (data?.template) {
        openAddTemplateModal(channel);
        setNewTemplateData({
          name: `AI: ${aiTemplatePrompt.slice(0, 30)}...`,
          subject: data.subject || '',
          body: data.template
        });
        toast({ title: 'Template generated!', description: 'Review and save your template.' });
      } else {
        toast({ title: 'No template returned', variant: 'destructive' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Generation failed', variant: 'destructive' });
    } finally {
      setIsGeneratingTemplate(false);
      setAITemplatePrompt('');
      setShowAIEmailGenerator(false);
      setShowAIWhatsAppGenerator(false);
    }
  };

  // Template helpers (unchanged)
  const openAddTemplateModal = (mode: 'email' | 'whatsapp', template?: Template) => {
    setAddTemplateMode(mode);
    if (template) {
      setEditingTemplateId(template.id);
      setNewTemplateData({
        name: template.name || '',
        subject: template.subject || '',
        body: template.body || ''
      });
    } else {
      setEditingTemplateId(null);
      setNewTemplateData({ name: '', subject: '', body: '' });
    }
  };
  const closeAddTemplateModal = () => {
    setAddTemplateMode(null);
    setEditingTemplateId(null);
    setNewTemplateData({ name: '', subject: '', body: '' });
  };
  const handleAddTemplate = async () => {
    if (!addTemplateMode) return toast({ title: 'Invalid mode', variant: 'destructive' });
    if (!newTemplateData.name || !newTemplateData.body) return toast({ title: 'Name and body required', variant: 'destructive' });

    if (editingTemplateId) {
      await updateTemplate(editingTemplateId, {
        name: newTemplateData.name,
        subject: addTemplateMode === 'email' ? (newTemplateData.subject || null) : null,
        body: newTemplateData.body,
        channel: addTemplateMode
      } as any);
      toast({ title: 'Template updated' });
    } else {
      await addTemplate({
        name: newTemplateData.name,
        subject: addTemplateMode === 'email' ? (newTemplateData.subject || null) : null,
        body: newTemplateData.body,
        channel: addTemplateMode,
        is_selected_for_email: false,
        is_selected_for_whatsapp: false
      } as any);
      toast({ title: 'Template created' });
    }
    closeAddTemplateModal();
  };

  // Signature generation and helpers - uses activeCard with fallback to profile
  const getSignatureData = () => ({
    name: activeCard?.full_name || profile?.full_name || profile?.name || 'Your Name',
    title: activeCard?.designation || profile?.designation || 'Your Title',
    company: activeCard?.company || profile?.company || 'Your Company',
    email: activeCard?.email || profile?.email || '',
    phone: activeCard?.phone || profile?.phone || '',
    website: activeCard?.website || profile?.website || '',
    linkedin: activeCard?.linkedin || profile?.linkedin || '',
    photo_url: activeCard?.photo_url || profile?.photo_url || '',
    logo_url: activeCard?.logo_url || profile?.logo_url || '',
  });

  const buildSignatureHtmlFromFields = (fields: { name: string; title: string; company: string; email: string; phone: string }) => {
    const signatureData = getSignatureData();
    return `
<table style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
  <tr>
    <td style="padding-right: 15px; border-right: 2px solid #4F46E5;">
      ${signatureData.photo_url ? `<img src="${signatureData.photo_url}" alt="${fields.name}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">` : ''}
    </td>
    <td style="padding-left: 15px;">
      <strong style="font-size: 16px; color: #1a1a1a;">${fields.name || 'Your Name'}</strong><br>
      <span style="color: #666;">${fields.title || 'Your Title'} | ${fields.company || 'Your Company'}</span><br>
      <span style="color: #4F46E5;">${fields.email || ''}</span><br>
      <span>${fields.phone || ''}</span>
    </td>
  </tr>
</table>`;
  };

  const handleSaveSignatureFromFields = async () => {
    const html = buildSignatureHtmlFromFields(editingSigFields);
    await addSignature({ name: editingSigFields.name || 'Custom Signature', html, is_selected: true });
    setShowSignatureEditor(false);
    toast({ title: 'Signature saved!' });
  };

  const generateFallbackSignatures = () => {
    const baseData = getSignatureData();
    const photoHtml = baseData.photo_url ? `<img src="${baseData.photo_url}" alt="${baseData.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-right: 10px;">` : '';
    const logoHtml = baseData.logo_url ? `<img src="${baseData.logo_url}" alt="${baseData.company}" style="height: 30px; max-width: 100px; object-fit: contain;">` : '';

    const variations = [
      {
        name: 'Minimal',
        html: `<div style="font-family: Arial, sans-serif; font-size: 13px;">${photoHtml}<strong>${baseData.name}</strong><br><span style="color: #666;">${baseData.title} | ${baseData.company}</span><br><a href="mailto:${baseData.email}" style="color: #4F46E5;">${baseData.email}</a> | ${baseData.phone}</div>`,
      },
      {
        name: 'Professional',
        html: `<table style="font-family: 'Segoe UI', Arial, sans-serif;"><tr>${baseData.photo_url ? `<td style="padding-right: 12px;"><img src="${baseData.photo_url}" alt="${baseData.name}" style="width: 70px; height: 70px; border-radius: 8px; object-fit: cover;"></td>` : ''}<td style="padding-right: 12px; border-right: 3px solid #4F46E5;"><strong style="font-size: 15px; color: #1a1a1a;">${baseData.name}</strong><br><em style="color: #666; font-size: 13px;">${baseData.title}</em></td><td style="padding-left: 12px; font-size: 12px;"><strong>${baseData.company}</strong>${logoHtml ? `<br>${logoHtml}` : ''}<br>${baseData.email}<br>${baseData.phone}</td></tr></table>`,
      },
      {
        name: 'Creative',
        html: `<div style="font-family: Georgia, serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 15px; border-radius: 8px;">${baseData.photo_url ? `<img src="${baseData.photo_url}" alt="${baseData.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; float: left; margin-right: 12px;">` : ''}<strong style="font-size: 16px; color: #2d3748;">${baseData.name}</strong><br><span style="color: #718096; font-style: italic;">${baseData.title} @ ${baseData.company}</span><br><a href="mailto:${baseData.email}" style="color: #4F46E5; text-decoration: none;">${baseData.email}</a>${logoHtml ? `<br>${logoHtml}` : ''}</div>`,
      },
      {
        name: 'Elegant',
        html: `<table style="font-family: 'Helvetica Neue', Arial, sans-serif; border-top: 2px solid #e2e8f0; padding-top: 10px;"><tr>${baseData.photo_url ? `<td style="padding-right: 15px;"><img src="${baseData.photo_url}" alt="${baseData.name}" style="width: 80px; height: 80px; border-radius: 10px; object-fit: cover;"></td>` : ''}<td><span style="font-size: 15px; font-weight: 600; color: #1a202c;">${baseData.name}</span><br><span style="font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 1px;">${baseData.title}</span><br><span style="font-size: 12px; color: #4a5568;">${baseData.company}</span>${logoHtml ? `<br>${logoHtml}` : ''}<br><span style="font-size: 12px; color: #4F46E5;">${baseData.email}</span></td></tr></table>`,
      },
    ];

    setGeneratedSignatures(variations);
    setSelectedSignatureIndex(0);
  };

  const handleGenerateSignatures = async () => {
    setIsGeneratingSignatures(true);
    setShowSignaturePrompt(false);
    setShowSignatureGenerator(true);

    const signatureData = getSignatureData();

    try {
      const { data, error } = await supabase.functions.invoke('generate-signatures', {
        body: {
          name: signatureData.name,
          company: signatureData.company,
          designation: signatureData.title,
          email: signatureData.email,
          phone: signatureData.phone,
          website: signatureData.website,
          linkedin: signatureData.linkedin,
          photo_url: signatureData.photo_url,
          logo_url: signatureData.logo_url,
          prompt: signaturePrompt || 'Premium professional signature'
        }
      });
      if (error) throw error;
      if (data?.signatures && Array.isArray(data.signatures)) {
        setGeneratedSignatures(data.signatures);
        setSelectedSignatureIndex(0);
      } else {
        generateFallbackSignatures();
      }
    } catch (error) {
      console.error('Error generating signatures:', error);
      generateFallbackSignatures();
      toast({ title: 'Using default signatures', description: 'AI generation failed, showing defaults.' });
    } finally {
      setIsGeneratingSignatures(false);
    }
  };

  const copySignatureHtml = () => {
    const sig = generatedSignatures[selectedSignatureIndex];
    if (sig) {
      navigator.clipboard.writeText(sig.html);
      setCopiedSignature(true);
      setTimeout(() => setCopiedSignature(false), 2000);
      toast({ title: 'Signature HTML copied!', description: 'Paste this into your email settings.' });
    }
  };

  const saveSelectedSignature = async () => {
    const sig = generatedSignatures[selectedSignatureIndex];
    if (sig) {
      await addSignature({ name: sig.name, html: sig.html, is_selected: true });
      toast({ title: 'Signature saved!' });
    }
  };

  const handleOpenSignaturePrompt = () => {
    setSignaturePrompt('');
    setShowSignaturePrompt(true);
  };

  const handleOpenSignatureExport = () => {
    const existingSig = getSelectedSignature();
    if (existingSig) {
      setGeneratedSignatures([{ name: existingSig.name, html: existingSig.html }]);
      setSelectedSignatureIndex(0);
    } else {
      generateFallbackSignatures();
    }
    setShowSignatureExport(true);
  };

  const openEmailWithSignature = () => {
    const sig = generatedSignatures[selectedSignatureIndex];
    if (sig) {
      const signatureText = sig.html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?(div|p|td|tr|table)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      window.location.href = `mailto:?body=${encodeURIComponent('\n\n---\n' + signatureText)}`;
    }
  };

  // ------------------------------
  // Render
  // ------------------------------
  return (
    <div className="w-full py-4 sm:py-6 px-3 sm:px-4 md:px-6 space-y-6 sm:space-y-8 animate-fade-up max-w-7xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! Here's your networking overview.
        </p>
      </div>

      {/* Time Filter */}
      <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center">
        {timeFilters.map((filter) => (
          <Button
            key={filter}
            variant={activeFilter === filter || (filter === 'Custom' && activeFilter.startsWith('Custom:')) ? 'default' : 'outline'}
            size="sm"
            className="text-xs sm:text-sm px-2 sm:px-3"
            onClick={() => handleFilterClick(filter)}
          >
            {filter}
          </Button>
        ))}
        {activeFilter.startsWith('Custom:') && (
          <span className="text-xs sm:text-sm text-muted-foreground ml-1 sm:ml-2 break-all">{activeFilter}</span>
        )}
      </div>

      {/* Custom Date Picker Dialog */}
      <Dialog open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {customDateRange.from ? format(customDateRange.from, 'PPP') : 'From date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customDateRange.from}
                    onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {customDateRange.to ? format(customDateRange.to, 'PPP') : 'To date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customDateRange.to}
                    onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleCustomDateSelect} className="w-full" disabled={!customDateRange.from || !customDateRange.to}>
              Apply Range
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Grid */}
      <TooltipProvider>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Views */}
          <Card className="card-hover opacity-0 animate-fade-up" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Unique QR scans and NFC taps.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">
                  {analyticsLoading ? '...' : (analytics?.card_views ?? 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Card Views</p>
              </div>
            </CardContent>
          </Card>

          {/* Contacts Saved */}
          <Card className="card-hover opacity-0 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>People who saved your contact to their device.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">
                  {analyticsLoading ? '...' : (analytics?.contact_saves ?? 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Contact Saves</p>
              </div>
            </CardContent>
          </Card>

          {/* Connections Added */}
          <Card className="card-hover opacity-0 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Contacts you added to your CRM (manual, scanned, auto-captured).</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">
                  {analyticsLoading ? '...' : (analytics?.connections_added ?? 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Connections Added</p>
              </div>
            </CardContent>
          </Card>

          {/* Events */}
          <Card 
            className="card-hover opacity-0 animate-fade-up cursor-pointer" 
            style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
            onClick={handleEventsTileClick}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Attended events / unique card views across attended events. Click to view event-level breakdown.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">
                  {analyticsLoading ? '...' : `${attendedCount} / ${attendedViews}`}
                </p>
                <p className="text-sm text-muted-foreground">Events</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Events Popup Modal */}
      <Dialog open={showEventsPopup} onOpenChange={setShowEventsPopup}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attended Events</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loadingEventsList ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : attendedEventsList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No attended events in this period.
              </p>
            ) : (
              <div className="space-y-3">
                {attendedEventsList.map((event) => (
                  <div key={event.id} className="p-3 rounded-lg border border-border/50 bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.start_time ? formatIST(event.start_time) : ''}
                          {event.end_time && ` - ${formatIST(event.end_time).split(', ')[1]}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{event.views}</p>
                        <p className="text-xs text-muted-foreground">unique views</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Email Templates */}
        <Card 
          className={cn(
            "opacity-0 animate-fade-up relative",
            !isOrangePlan && "opacity-80 cursor-pointer"
          )} 
          style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
          onClick={!isOrangePlan ? showUpgradeToast : undefined}
        >
          {/* Premium overlay for free users */}
          {!isOrangePlan && (
            <>
              <div className="absolute inset-0 bg-muted/40 backdrop-blur-[1px] rounded-lg z-10 pointer-events-none" />
              <div className="absolute top-3 right-3 z-20 pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-orange-500/90 flex items-center justify-center shadow-lg">
                  <Lock className="h-4 w-4 text-white" />
                </div>
              </div>
            </>
          )}

  <CardHeader className="pt-3">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5 text-primary" />
        </div>

        <div className="min-w-0">
          <CardTitle className="text-lg truncate">Email Templates</CardTitle>
          <CardDescription className="truncate">
            Quick templates for emails
          </CardDescription>
        </div>
      </div>

      <div className="flex gap-1 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAIEmailGenerator(true)}
          disabled={!isOrangePlan}
        >
          <Sparkles className="h-4 w-4 mr-1" /> AI
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => openAddTemplateModal('email')}
          disabled={!isOrangePlan}
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  </CardHeader>
          <CardContent className="space-y-3">
            {getEmailTemplates().map((t) => (
              <div key={t.id} className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-sm">{t.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAddTemplateModal('email', t)} disabled={!isOrangePlan}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTemplate(t.id)} disabled={!isOrangePlan}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
              </div>
            ))}
            {getEmailTemplates().length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No email templates yet</p>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Templates */}
        <Card 
          className={cn(
            "opacity-0 animate-fade-up relative",
            !isOrangePlan && "opacity-80 cursor-pointer"
          )} 
          style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
          onClick={!isOrangePlan ? showUpgradeToast : undefined}
        >
          {/* Premium overlay for free users */}
          {!isOrangePlan && (
            <>
              <div className="absolute inset-0 bg-muted/40 backdrop-blur-[1px] rounded-lg z-10 pointer-events-none" />
              <div className="absolute top-3 right-3 z-20 pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-orange-500/90 flex items-center justify-center shadow-lg">
                  <Lock className="h-4 w-4 text-white" />
                </div>
              </div>
            </>
          )}

  <CardHeader className="pt-3">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <MessageCircle className="h-5 w-5 text-emerald-500" />
        </div>

        <div className="min-w-0">
          <CardTitle className="text-lg truncate">WhatsApp Templates</CardTitle>
          <CardDescription className="truncate">
            Quick messages for WhatsApp
          </CardDescription>
        </div>
      </div>

      <div className="flex gap-1 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAIWhatsAppGenerator(true)}
          disabled={!isOrangePlan}
        >
          <Sparkles className="h-4 w-4 mr-1" /> AI
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => openAddTemplateModal('whatsapp')}
          disabled={!isOrangePlan}
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  </CardHeader>
          <CardContent className="space-y-3">
            {getWhatsappTemplates().map((t) => (
              <div key={t.id} className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-sm">{t.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAddTemplateModal('whatsapp', t)} disabled={!isOrangePlan}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTemplate(t.id)} disabled={!isOrangePlan}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
              </div>
            ))}
            {getWhatsappTemplates().length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No WhatsApp templates yet</p>}
          </CardContent>
        </Card>

        {/* Email Signature - Enhanced with Tabs */}
        <Card 
          className={cn(
            "opacity-0 animate-fade-up relative",
            !isOrangePlan && "opacity-80 cursor-pointer"
          )} 
          style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
          onClick={!isOrangePlan ? showUpgradeToast : undefined}
        >
          {/* Premium overlay for free users */}
          {!isOrangePlan && (
            <>
              <div className="absolute inset-0 bg-muted/40 backdrop-blur-[1px] rounded-lg z-10 pointer-events-none" />
              <div className="absolute top-3 right-3 z-20 pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-orange-500/90 flex items-center justify-center shadow-lg">
                  <Lock className="h-4 w-4 text-white" />
                </div>
              </div>
            </>
          )}
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center"><Mail className="h-5 w-5 text-violet-500" /></div>
                <div className="flex items-center gap-2">
                  <div>
                    <CardTitle className="text-lg">Email Signature</CardTitle>
                    <CardDescription>AI-powered & premium templates synced with your card</CardDescription>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isOrangePlan ? (
              <EmailSignatureGenerator activeCard={activeCard} />
            ) : (
              <div className="py-4 text-center text-muted-foreground text-sm">
                Upgrade to access email signatures
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="opacity-0 animate-fade-up" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Tags className="h-5 w-5 text-blue-500" /></div>
              <div>
                <CardTitle className="text-lg">Tags</CardTitle>
                  <CardDescription>Tap a tag to delete it.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={tagsContainerRef} className="flex flex-wrap gap-2">
              {localTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => openTagOptions(tag)}
                  className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm select-none cursor-pointer border")}
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderColor: '#111827',
                    color: '#111827'
                  }}
                >
                  <span>{tag.name}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Input placeholder="New tag..." value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} />
              <Button variant="outline" size="icon" onClick={handleAddTag}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Events */}
        <Card 
          className={cn(
            "lg:col-span-2 opacity-0 animate-fade-up relative",
            !isOrangePlan && "opacity-80 cursor-pointer"
          )} 
          style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
          onClick={!isOrangePlan ? showUpgradeToast : undefined}
        >
          {/* Premium overlay for free users */}
          {!isOrangePlan && (
            <>
              <div className="absolute inset-0 bg-muted/40 backdrop-blur-[1px] rounded-lg z-10 pointer-events-none" />
              <div className="absolute top-3 right-3 z-20 pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-orange-500/90 flex items-center justify-center shadow-lg">
                  <Lock className="h-4 w-4 text-white" />
                </div>
              </div>
            </>
          )}
          <CardHeader>
    <div className="w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-amber-500" />
          </div>

          <div className="flex items-center gap-2">
            <div>
              <CardTitle className="text-lg">Events</CardTitle>
              <CardDescription>
                Schedule an event.
              </CardDescription>
            </div>
          </div>
        </div>
      </div>

      {/* Event chips (events without dates) */}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        {localEvents.filter(e => !e.start_time && !e.end_time).map((event) => (
          <button
            key={event.id}
            onClick={() => isOrangePlan && openEventOptions(event)}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm cursor-pointer"
            style={{
              backgroundColor: event.color ? `${event.color}20` : '#f3f4f6',
              border: `1px solid ${event.color ? `${event.color}40` : '#e5e7eb'}`,
              color: event.color || undefined
            }}
            disabled={!isOrangePlan}
          >
            {event.title}
          </button>
        ))}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => { 
            setEditingEventId(null); 
            setNewEventData({ title: '', start_time: '', end_time: '', description: '' }); 
            setShowAddEvent(true); 
          }}
          disabled={!isOrangePlan}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Event
        </Button>
      </div>
    </div>
  </CardHeader>

          <CardContent>
            {/* Scheduled Events (with dates) */}
            {localEvents.filter(e => e.start_time || e.end_time).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Scheduled Events</h4>
                <div ref={eventsContainerRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {localEvents.filter(e => e.start_time || e.end_time).map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-xl border border-border/50 bg-muted/30"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium">{event.title}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => isOrangePlan && openEditEventModal(event)}
                            className="p-1 hover:bg-muted rounded"
                            disabled={!isOrangePlan}
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => isOrangePlan && openEventDeleteDialog(event)}
                            className="p-1 hover:bg-destructive/10 rounded"
                            disabled={!isOrangePlan}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.start_time ? formatIST(event.start_time) : 'No start time'}
                        {event.end_time && ` – ${formatIST(event.end_time)}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {localEvents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No events yet. Add events to auto-tag contacts created during event times.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------
          Dialogs: Event Options, Tag Options (compact), Event Delete, Add Event Modal, AI & Signature dialogs, Add/Edit Template Modal
         --------------------------- */}

      {/* EVENT OPTIONS (new) */}
      <Dialog
        open={showEventOptions}
        onOpenChange={(open) => {
          if (!open) {
            setShowEventOptions(false);
            setSelectedEventForOptions(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Event options</span>
              {/* intentionally no internal X — overlay click closes */}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <p className="font-medium text-lg">{selectedEventForOptions?.name || selectedEventForOptions?.title}</p>
            </div>

            <div>
              <Label>Change color</Label>
              <div className="mt-2">
                <div className="rounded-md overflow-hidden" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' }}>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={selectedEventHue}
                    onChange={(e) => handleEventHueChange(Number(e.target.value))}
                    className="w-full h-6 appearance-none"
                    style={{
                      background: 'linear-gradient(90deg, #ff0000 0%, #ff9900 12.5%, #ffff00 25%, #00ff00 37.5%, #00ffff 50%, #0066ff 62.5%, #7a00ff 75%, #ff00ff 87.5%, #ff0000 100%)',
                      outline: 'none'
                    }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="inline-flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-md border"
                      style={{ background: hslToHex(selectedEventHue, 80, 50) }}
                    />
                    <div className="text-sm">
                      <div className="font-medium">{selectedEventForOptions?.name || selectedEventForOptions?.title}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Color saved automatically</div>
                </div>
              </div>
            </div>

            <div className="mt-2">
              <Button variant="destructive" className="w-full" onClick={handleDeleteEventFromOptions}>Delete event</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* TAG OPTIONS (compact - single name, no internal X) */}
      <Dialog
        open={showTagOptions}
        onOpenChange={(open) => {
          if (!open) {
            setShowTagOptions(false);
            setSelectedTagForOptions(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Tag options</span>
              {/* intentionally no internal close button — overlay click closes dialog */}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-lg">{selectedTagForOptions?.name}</p>
            </div>

            <Button variant="destructive" className="w-full" onClick={handleDeleteTagConfirmed}>Delete tag</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EVENT DELETE (list) */}
      <Dialog open={showEventDeleteDialog} onOpenChange={(open) => { if (!open) { setShowEventDeleteDialog(false); setSelectedEventForDelete(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selectedEventForDelete?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>

            <div className="mt-4">
              <Button variant="destructive" className="w-full" onClick={handleDeleteEventConfirmed}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD EVENT MODAL (restored & wired) */}
      <Dialog open={showAddEvent} onOpenChange={(open) => { if (!open) { setShowAddEvent(false); setEditingEventId(null); setNewEventData({ title: '', start_time: '', end_time: '', description: '' }); } else { setShowAddEvent(true); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEventId ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input value={newEventData.title} onChange={(e) => setNewEventData(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., Tech Summit 2025" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date & Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input type="datetime-local" value={newEventData.start_time} onChange={(e) => setNewEventData(prev => ({ ...prev, start_time: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Date & Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input type="datetime-local" value={newEventData.end_time} onChange={(e) => setNewEventData(prev => ({ ...prev, end_time: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave dates empty to create an event chip only. If only start is set, end defaults to 11:59 PM same day.
            </p>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={newEventData.description} onChange={(e) => setNewEventData(prev => ({ ...prev, description: e.target.value }))} rows={2} />
            </div>
            <Button onClick={handleAddEvent} className="w-full">{editingEventId ? 'Save Changes' : 'Create Event'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Email Template Generator */}
      <Dialog open={showAIEmailGenerator} onOpenChange={setShowAIEmailGenerator}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Create Email Template with AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Describe your email template</Label>
              <Textarea
                value={aiTemplatePrompt}
                onChange={(e) => setAITemplatePrompt(e.target.value)}
                placeholder="e.g., A professional follow-up email after meeting at a conference, asking to schedule a call..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">AI will generate a professional email with subject line and body.</p>
            </div>
            <Button
              onClick={() => handleGenerateAITemplate('email')}
              className="w-full"
              disabled={isGeneratingTemplate || !aiTemplatePrompt.trim()}
            >
              {isGeneratingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Email Template
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI WhatsApp Template Generator */}
      <Dialog open={showAIWhatsAppGenerator} onOpenChange={setShowAIWhatsAppGenerator}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-500" />
              Create WhatsApp Template with AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Describe your message</Label>
              <Textarea
                value={aiTemplatePrompt}
                onChange={(e) => setAITemplatePrompt(e.target.value)}
                placeholder="e.g., A quick follow-up message after meeting someone, casual and friendly..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">AI will generate a short, casual WhatsApp message.</p>
            </div>
            <Button
              onClick={() => handleGenerateAITemplate('whatsapp')}
              className="w-full"
              disabled={isGeneratingTemplate || !aiTemplatePrompt.trim()}
            >
              {isGeneratingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate WhatsApp Template
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Prompt (ask style) */}
      <Dialog open={showSignaturePrompt} onOpenChange={setShowSignaturePrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Email Signature
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Design Style (optional)</Label>
              <Textarea
                value={signaturePrompt}
                onChange={(e) => setSignaturePrompt(e.target.value)}
                placeholder="e.g., Minimal with accent color, creative gradient style, corporate blue theme... Leave blank for random professional design"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Describe your preferred style or leave blank for AI to choose.</p>
            </div>
            <Button onClick={handleGenerateSignatures} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Signatures
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Generator */}
      <Dialog open={showSignatureGenerator} onOpenChange={setShowSignatureGenerator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Your Signature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isGeneratingSignatures ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Generating signatures with AI...</p>
              </div>
            ) : generatedSignatures.length > 0 ? (
              <>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {generatedSignatures.map((sig, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedSignatureIndex(i)}
                      className={cn(
                        "flex-shrink-0 px-4 py-2 rounded-lg border transition-all",
                        selectedSignatureIndex === i ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                      )}
                    >
                      {sig.name}
                    </button>
                  ))}
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedSignatures[selectedSignatureIndex]?.html || '') }} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={copySignatureHtml} className="flex-1">
                    {copiedSignature ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copiedSignature ? 'Copied!' : 'Copy HTML'}
                  </Button>
                  <Button onClick={saveSelectedSignature} variant="outline" className="flex-1">Save Signature</Button>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Export */}
      <Dialog open={showSignatureExport} onOpenChange={setShowSignatureExport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Signature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-border bg-card">
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedSignatures[selectedSignatureIndex]?.html || getSelectedSignature()?.html || buildSignatureHtmlFromFields({
                name: profile?.name || '',
                title: profile?.designation || '',
                company: profile?.company || '',
                email: profile?.email || '',
                phone: profile?.phone || ''
              })) }} />
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={copySignatureHtml} className="w-full">
                {copiedSignature ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copiedSignature ? 'Copied!' : 'Copy HTML'}
              </Button>
              <Button onClick={openEmailWithSignature} variant="outline" className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Open Email with Signature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Editor (fields only) */}
      <Dialog open={showSignatureEditor} onOpenChange={setShowSignatureEditor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Signature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editingSigFields.name} onChange={(e) => setEditingSigFields(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={editingSigFields.title} onChange={(e) => setEditingSigFields(prev => ({ ...prev, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={editingSigFields.company} onChange={(e) => setEditingSigFields(prev => ({ ...prev, company: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editingSigFields.email} onChange={(e) => setEditingSigFields(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editingSigFields.phone} onChange={(e) => setEditingSigFields(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-4 rounded-lg border border-border bg-card" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(buildSignatureHtmlFromFields(editingSigFields)) }} />
            </div>
            <Button onClick={handleSaveSignatureFromFields} className="w-full">Save Signature</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Template Dialog */}
      <Dialog open={!!addTemplateMode} onOpenChange={(open) => { if (!open) closeAddTemplateModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplateId ? 'Edit Template' : 'Add Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={newTemplateData.name} onChange={(e) => setNewTemplateData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Follow-up" />
            </div>

            {addTemplateMode === 'email' && (
              <div className="space-y-2">
                <Label>Subject (for email)</Label>
                <Input value={newTemplateData.subject} onChange={(e) => setNewTemplateData(prev => ({ ...prev, subject: e.target.value }))} placeholder="e.g., Great meeting you, {{name}}!" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea value={newTemplateData.body} onChange={(e) => setNewTemplateData(prev => ({ ...prev, body: e.target.value }))} rows={5} placeholder={addTemplateMode === 'email' ? "Hi {{name}}, ..." : "Hey {{name}}, ..."} />
              <p className="text-xs text-muted-foreground">
                Placeholders: {'{{name}}'}, {'{{company}}'}, {'{{designation}}'}, {'{{myName}}'}, {'{{myCompany}}'}
              </p>
            </div>

            <Button onClick={handleAddTemplate} className="w-full">{editingTemplateId ? 'Save Changes' : 'Save Template'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
      />

    </div>
  );
}
