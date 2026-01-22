import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Template {
  id: string;
  user_id: string;
  name: string;
  channel: 'email' | 'whatsapp' | 'both';
  subject?: string | null;
  body: string;
  is_selected_for_email: boolean;
  is_selected_for_whatsapp: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * DEFAULT TEMPLATES
 * - No template is auto-selected
 * - "My Digital Card" is the clickable text
 * - {{myCardLink}} is the actual hyperlink
 */
const DEFAULT_TEMPLATES: Omit<
  Template,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>[] = [
  // ─────────────────────────────
  // WhatsApp — Introduction
  // ─────────────────────────────
  {
    name: 'Introduction',
    channel: 'whatsapp',
    subject: null,
    body: `Hi {{name}}, It was nice connecting with you.
Sharing my details here: My Digital Card {{myCardLink}}
Happy to stay in touch.

{{myName}}
{{myCompany}}`,
    is_selected_for_email: false,
    is_selected_for_whatsapp: false,
  },

  // ─────────────────────────────
  // WhatsApp — Follow-up
  // ─────────────────────────────
  {
    name: 'Follow-up',
    channel: 'whatsapp',
    subject: null,
    body: `Hello {{name}}, I hope you are keeping well.
Would be glad to connect at a time convenient for you.

{{myName}}
My Digital Card {{myCardLink}}`,
    is_selected_for_email: false,
    is_selected_for_whatsapp: false,
  },

  // ─────────────────────────────
  // Email — Introduction
  // ─────────────────────────────
  {
    name: 'Introduction',
    channel: 'email',
    subject: 'Connecting after our introduction',
    body: `Hello {{name}},

It was a pleasure connecting with you.

Please find my contact details below.
My Digital Card {{myCardLink}}

I look forward to continuing the conversation.

Warm regards,
{{myName}}
{{myCompany}}`,
    is_selected_for_email: false,
    is_selected_for_whatsapp: false,
  },

  // ─────────────────────────────
  // Email — Follow-up
  // ─────────────────────────────
  {
    name: 'Follow-up',
    channel: 'email',
    subject: 'Connecting further',
    body: `Hello {{name}},

I hope you are keeping well.
I thought this might be a good moment to reconnect.
Would be glad to connect at a time convenient for you.

My Digital Card {{myCardLink}}

Kind regards,
{{myName}}
{{myCompany}}`,
    is_selected_for_email: false,
    is_selected_for_whatsapp: false,
  },
];

// Auto-convert names and company references to placeholders
export const convertToPlaceholders = (text: string): string => {
  const patterns = [
    { regex: /\b(their|the|recipient's?)\s*(name|first\s*name)\b/gi, placeholder: '{{name}}' },
    { regex: /\b(their|the|recipient's?)\s*(company|organization|firm)\b/gi, placeholder: '{{company}}' },
    { regex: /\b(their|the|recipient's?)\s*(title|designation|role|position)\b/gi, placeholder: '{{designation}}' },
    { regex: /\b(my|your|sender's?)\s*(name|first\s*name)\b/gi, placeholder: '{{myName}}' },
    { regex: /\b(my|your|sender's?)\s*(company|organization|firm)\b/gi, placeholder: '{{myCompany}}' },
  ];

  let result = text;
  patterns.forEach(({ regex, placeholder }) => {
    result = result.replace(regex, placeholder);
  });

  return result;
};

// Module-level flag to prevent duplicate seeding across component instances
let isSeedingTemplates = false;

const TEMPLATES_CACHE_KEY = 'synka_templates_cache';

const getCachedTemplates = (userId: string): Template[] => {
  try {
    const cached = localStorage.getItem(`${TEMPLATES_CACHE_KEY}_${userId}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 30 * 60 * 1000) return data;
    }
  } catch { /* ignore */ }
  return [];
};

const setCachedTemplates = (userId: string, data: Template[]) => {
  try {
    localStorage.setItem(`${TEMPLATES_CACHE_KEY}_${userId}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* ignore */ }
};

export function useTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>(() => user ? getCachedTemplates(user.id) : []);
  const [loading, setLoading] = useState(() => user ? getCachedTemplates(user.id).length === 0 : false);

  useEffect(() => {
    if (user) {
      const cached = getCachedTemplates(user.id);
      if (cached.length > 0 && templates.length === 0) {
        setTemplates(cached);
        setLoading(false);
      }
      fetchTemplates();
    } else {
      setTemplates([]);
      setLoading(false);
    }
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('contact_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    } else if (data && data.length === 0) {
      // Seed default templates for new users (with guard against race condition)
      if (!isSeedingTemplates) {
        isSeedingTemplates = true;
        await seedDefaultTemplates();
        isSeedingTemplates = false;
      }
    } else {
      setTemplates(data as Template[]);
      if (user) setCachedTemplates(user.id, data as Template[]);
    }
    setLoading(false);
  };

  const seedDefaultTemplates = async () => {
    if (!user) return;

    const templatesWithUser = DEFAULT_TEMPLATES.map(t => ({
      ...t,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('contact_templates')
      .insert(templatesWithUser)
      .select();

    if (error) {
      console.error('Error seeding templates:', error);
    } else {
      setTemplates(data as Template[]);
    }
  };

  const addTemplate = async (
    template: Omit<Template, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const processedTemplate = {
      ...template,
      body: convertToPlaceholders(template.body),
      subject: template.subject ? convertToPlaceholders(template.subject) : null,
    };

    const { data, error } = await supabase
      .from('contact_templates')
      .insert({ ...processedTemplate, user_id: user.id })
      .select()
      .single();

    if (!error && data) {
      setTemplates(prev => [...prev, data as Template]);
    }

    return { data, error };
  };

  const updateTemplate = async (id: string, updates: Partial<Template>) => {
    const { error } = await supabase
      .from('contact_templates')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setTemplates(prev =>
        prev.map(t => (t.id === id ? { ...t, ...updates } : t))
      );
    }

    return { error };
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('contact_templates')
      .delete()
      .eq('id', id);

    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }

    return { error };
  };

  const getEmailTemplates = () =>
    templates.filter(t => t.channel === 'email' || t.channel === 'both');

  const getWhatsappTemplates = () =>
    templates.filter(t => t.channel === 'whatsapp' || t.channel === 'both');

  const getSelectedEmailTemplate = () =>
    templates.find(t => t.is_selected_for_email);

  const getSelectedWhatsappTemplate = () =>
    templates.find(t => t.is_selected_for_whatsapp);

  return {
    templates,
    loading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getEmailTemplates,
    getWhatsappTemplates,
    getSelectedEmailTemplate,
    getSelectedWhatsappTemplate,
    refetch: fetchTemplates,
  };
}