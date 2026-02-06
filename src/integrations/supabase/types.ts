export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bot_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      card_templates: {
        Row: {
          asset_url: string | null
          created_at: string
          id: string
          is_system: boolean
          meta: Json
          name: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          asset_url?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          meta?: Json
          name: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          asset_url?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          meta?: Json
          name?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cards: {
        Row: {
          about: string | null
          calendly: string | null
          calendly_text: string | null
          card_design: string | null
          catalogue_url: string | null
          company: string | null
          created_at: string
          designation: string | null
          document_name: string | null
          document_url: string | null
          email: string | null
          face_x: number | null
          face_y: number | null
          facebook: string | null
          facebook_text: string | null
          full_name: string | null
          id: string
          instagram: string | null
          instagram_text: string | null
          is_default: boolean
          layout: string | null
          layout_template_id: string | null
          linkedin: string | null
          logo_url: string | null
          logo_x: number | null
          logo_y: number | null
          name: string
          phone: string | null
          photo_url: string | null
          pitch_deck_url: string | null
          title: string | null
          twitter: string | null
          twitter_text: string | null
          updated_at: string
          user_id: string
          website: string | null
          whatsapp: string | null
          youtube: string | null
          youtube_text: string | null
        }
        Insert: {
          about?: string | null
          calendly?: string | null
          calendly_text?: string | null
          card_design?: string | null
          catalogue_url?: string | null
          company?: string | null
          created_at?: string
          designation?: string | null
          document_name?: string | null
          document_url?: string | null
          email?: string | null
          face_x?: number | null
          face_y?: number | null
          facebook?: string | null
          facebook_text?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          instagram_text?: string | null
          is_default?: boolean
          layout?: string | null
          layout_template_id?: string | null
          linkedin?: string | null
          logo_url?: string | null
          logo_x?: number | null
          logo_y?: number | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          pitch_deck_url?: string | null
          title?: string | null
          twitter?: string | null
          twitter_text?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
          youtube_text?: string | null
        }
        Update: {
          about?: string | null
          calendly?: string | null
          calendly_text?: string | null
          card_design?: string | null
          catalogue_url?: string | null
          company?: string | null
          created_at?: string
          designation?: string | null
          document_name?: string | null
          document_url?: string | null
          email?: string | null
          face_x?: number | null
          face_y?: number | null
          facebook?: string | null
          facebook_text?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          instagram_text?: string | null
          is_default?: boolean
          layout?: string | null
          layout_template_id?: string | null
          linkedin?: string | null
          logo_url?: string | null
          logo_x?: number | null
          logo_y?: number | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          pitch_deck_url?: string | null
          title?: string | null
          twitter?: string | null
          twitter_text?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
          youtube_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_layout_template_id_fkey"
            columns: ["layout_template_id"]
            isOneToOne: false
            referencedRelation: "card_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_learning_signals: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_knowledge_id: string | null
          frequency_count: number | null
          id: string
          matched_knowledge_id: string | null
          metadata: Json | null
          query_embedding: string | null
          query_text: string
          response_text: string | null
          reviewed: boolean | null
          session_id: string | null
          signal_type: string
          similarity_score: number | null
          status: string
          suggested_answer: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_knowledge_id?: string | null
          frequency_count?: number | null
          id?: string
          matched_knowledge_id?: string | null
          metadata?: Json | null
          query_embedding?: string | null
          query_text: string
          response_text?: string | null
          reviewed?: boolean | null
          session_id?: string | null
          signal_type: string
          similarity_score?: number | null
          status?: string
          suggested_answer?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_knowledge_id?: string | null
          frequency_count?: number | null
          id?: string
          matched_knowledge_id?: string | null
          metadata?: Json | null
          query_embedding?: string | null
          query_text?: string
          response_text?: string | null
          reviewed?: boolean | null
          session_id?: string | null
          signal_type?: string
          similarity_score?: number | null
          status?: string
          suggested_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_learning_signals_created_knowledge_id_fkey"
            columns: ["created_knowledge_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_learning_signals_matched_knowledge_id_fkey"
            columns: ["matched_knowledge_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: []
      }
      chat_session_memory: {
        Row: {
          context_data: Json | null
          conversation_summary: string | null
          created_at: string
          detected_intents: string[] | null
          ended: boolean | null
          followups_done: string[] | null
          id: string
          last_assistant_response: string | null
          last_intent: string | null
          last_user_message: string | null
          message_count: number | null
          pending_followup: Json | null
          session_id: string
          updated_at: string
          user_info: Json | null
        }
        Insert: {
          context_data?: Json | null
          conversation_summary?: string | null
          created_at?: string
          detected_intents?: string[] | null
          ended?: boolean | null
          followups_done?: string[] | null
          id?: string
          last_assistant_response?: string | null
          last_intent?: string | null
          last_user_message?: string | null
          message_count?: number | null
          pending_followup?: Json | null
          session_id: string
          updated_at?: string
          user_info?: Json | null
        }
        Update: {
          context_data?: Json | null
          conversation_summary?: string | null
          created_at?: string
          detected_intents?: string[] | null
          ended?: boolean | null
          followups_done?: string[] | null
          id?: string
          last_assistant_response?: string | null
          last_intent?: string | null
          last_user_message?: string | null
          message_count?: number | null
          pending_followup?: Json | null
          session_id?: string
          updated_at?: string
          user_info?: Json | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          email: string | null
          ended_at: string | null
          id: string
          is_user: boolean | null
          last_message_at: string
          message_count: number
          mobile: string | null
          name: string | null
          session_id: string
          started_at: string
          status: string
          timeout_reason: string | null
          work_status: string
        }
        Insert: {
          email?: string | null
          ended_at?: string | null
          id?: string
          is_user?: boolean | null
          last_message_at?: string
          message_count?: number
          mobile?: string | null
          name?: string | null
          session_id: string
          started_at?: string
          status?: string
          timeout_reason?: string | null
          work_status?: string
        }
        Update: {
          email?: string | null
          ended_at?: string | null
          id?: string
          is_user?: boolean | null
          last_message_at?: string
          message_count?: number
          mobile?: string | null
          name?: string | null
          session_id?: string
          started_at?: string
          status?: string
          timeout_reason?: string | null
          work_status?: string
        }
        Relationships: []
      }
      contact_events: {
        Row: {
          contact_id: string
          event_id: string
        }
        Insert: {
          contact_id: string
          event_id: string
        }
        Update: {
          contact_id?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          author_user_id: string | null
          contact_id: string
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          author_user_id?: string | null
          contact_id: string
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          author_user_id?: string | null
          contact_id?: string
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_saves: {
        Row: {
          card_id: string | null
          created_at: string
          device_hash: string
          event_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          device_hash: string
          event_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          device_hash?: string
          event_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_saves_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_saves_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          is_selected_for_email: boolean | null
          is_selected_for_whatsapp: boolean | null
          name: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          id?: string
          is_selected_for_email?: boolean | null
          is_selected_for_whatsapp?: boolean | null
          name: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          is_selected_for_email?: boolean | null
          is_selected_for_whatsapp?: boolean | null
          name?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          about: string | null
          company: string | null
          created_at: string
          designation: string | null
          email: string | null
          event_id: string | null
          id: string
          linkedin: string | null
          name: string
          notes_history: Json | null
          owner_id: string
          phone: string | null
          photo_url: string | null
          shared_card_id: string | null
          source: string | null
          synka_user_id: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          about?: string | null
          company?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          event_id?: string | null
          id?: string
          linkedin?: string | null
          name: string
          notes_history?: Json | null
          owner_id: string
          phone?: string | null
          photo_url?: string | null
          shared_card_id?: string | null
          source?: string | null
          synka_user_id?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          about?: string | null
          company?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          event_id?: string | null
          id?: string
          linkedin?: string | null
          name?: string
          notes_history?: Json | null
          owner_id?: string
          phone?: string | null
          photo_url?: string | null
          shared_card_id?: string | null
          source?: string | null
          synka_user_id?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_shared_card_id_fkey"
            columns: ["shared_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_users: {
        Row: {
          created_at: string | null
          deleted_at: string
          email: string | null
          id: string
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string
          email?: string | null
          id?: string
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string
          email?: string | null
          id?: string
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          reason: string | null
          reference_number: string
          requested_at: string
          scheduled_deletion_at: string
          status: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reference_number: string
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reference_number?: string
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      email_signatures: {
        Row: {
          created_at: string
          html: string
          id: string
          is_selected: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          html: string
          id?: string
          is_selected?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          html?: string
          id?: string
          is_selected?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          start_time: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          start_time: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          start_time?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          category: string | null
          content: string
          created_at: string
          embedding: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          card_variant: string | null
          created_at: string
          currency: string | null
          id: string
          notes: Json | null
          order_number: string | null
          product_type: string
          quantity: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          card_variant?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          notes?: Json | null
          order_number?: string | null
          product_type: string
          quantity?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_variant?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          notes?: Json | null
          order_number?: string | null
          product_type?: string
          quantity?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          error_code: string | null
          error_description: string | null
          id: string
          metadata: Json | null
          method: string | null
          order_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          error_code?: string | null
          error_description?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          order_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          error_code?: string | null
          error_description?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          order_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_plan: string
          old_plan: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_plan: string
          old_plan: string
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_plan?: string
          old_plan?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about: string | null
          card_design: string | null
          card_name: string | null
          company: string | null
          created_at: string
          designation: string | null
          email: string | null
          full_name: string | null
          id: string
          layout: string | null
          linkedin: string | null
          logo_url: string | null
          onboarding_completed: boolean
          onboarding_step: string | null
          phone: string | null
          photo_url: string | null
          pin_attempts: number
          pin_hash: string | null
          pin_locked_until: string | null
          plan: string
          slug: string | null
          title: string | null
          updated_at: string
          user_id: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          about?: string | null
          card_design?: string | null
          card_name?: string | null
          company?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          layout?: string | null
          linkedin?: string | null
          logo_url?: string | null
          onboarding_completed?: boolean
          onboarding_step?: string | null
          phone?: string | null
          photo_url?: string | null
          pin_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          plan?: string
          slug?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          about?: string | null
          card_design?: string | null
          card_name?: string | null
          company?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          layout?: string | null
          linkedin?: string | null
          logo_url?: string | null
          onboarding_completed?: boolean
          onboarding_step?: string | null
          phone?: string | null
          photo_url?: string | null
          pin_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          plan?: string
          slug?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      scan_events: {
        Row: {
          card_id: string | null
          created_at: string
          device_hash: string
          event_id: string | null
          id: string
          ip_address: string | null
          source: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          device_hash: string
          event_id?: string | null
          id?: string
          ip_address?: string | null
          source?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          device_hash?: string
          event_id?: string | null
          id?: string
          ip_address?: string | null
          source?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean | null
          billing_cycle: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          end_date: string
          id: string
          mandate_created: boolean | null
          mandate_id: string | null
          notes: Json | null
          payment_status: string | null
          plan_type: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          razorpay_subscription_id: string | null
          start_date: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          auto_renew?: boolean | null
          billing_cycle?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          end_date: string
          id?: string
          mandate_created?: boolean | null
          mandate_id?: string | null
          notes?: Json | null
          payment_status?: string | null
          plan_type: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          razorpay_subscription_id?: string | null
          start_date?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_renew?: boolean | null
          billing_cycle?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          end_date?: string
          id?: string
          mandate_created?: boolean | null
          mandate_id?: string | null
          notes?: Json | null
          payment_status?: string | null
          plan_type?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          razorpay_subscription_id?: string | null
          start_date?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_user_subscription: {
        Args: { p_end_date: string; p_plan_type: string; p_user_id: string }
        Returns: boolean
      }
      get_active_event_id: { Args: { p_user_id: string }; Returns: string }
      get_attended_events: {
        Args: { end_ts: string; start_ts: string }
        Returns: {
          end_time: string
          id: string
          start_time: string
          title: string
          views: number
        }[]
      }
      get_attended_events_list: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: Json
      }
      get_dashboard_analytics: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      match_knowledge: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          title: string
        }[]
      }
      match_learning_signal: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          frequency_count: number
          id: string
          query_text: string
          signal_type: string
          similarity: number
          status: string
        }[]
      }
      mutual_exchange_contact: {
        Args: {
          p_owner_id: string
          p_viewer_about?: string
          p_viewer_company?: string
          p_viewer_designation?: string
          p_viewer_email: string
          p_viewer_id: string
          p_viewer_linkedin?: string
          p_viewer_name: string
          p_viewer_phone?: string
          p_viewer_photo_url?: string
          p_viewer_shared_card_id?: string
          p_viewer_synka_user_id?: string
          p_viewer_website?: string
          p_viewer_whatsapp?: string
        }
        Returns: Json
      }
      upgrade_user_plan: {
        Args: { _new_plan: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "free" | "orange" | "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["free", "orange", "admin", "user"],
    },
  },
} as const
