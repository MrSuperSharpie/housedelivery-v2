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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_events: {
        Row: {
          action: string
          actor_id: string
          actor_role: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          session_id: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_role?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id: string
          ip_address?: string | null
          metadata?: Json | null
          session_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          session_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_role_assignments: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          revoked_at: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id: string
          revoked_at?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          label: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      authority_access_grants: {
        Row: {
          access_scope: string
          expires_at: string
          id: string
          issued_at: string
          issued_by_id: string | null
          last_accessed_at: string | null
          metadata: Json
          package_seal_id: string | null
          recipient_identity: string | null
          recipient_type: string
          record_id: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          access_scope?: string
          expires_at: string
          id: string
          issued_at?: string
          issued_by_id?: string | null
          last_accessed_at?: string | null
          metadata?: Json
          package_seal_id?: string | null
          recipient_identity?: string | null
          recipient_type: string
          record_id: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          access_scope?: string
          expires_at?: string
          id?: string
          issued_at?: string
          issued_by_id?: string | null
          last_accessed_at?: string | null
          metadata?: Json
          package_seal_id?: string | null
          recipient_identity?: string | null
          recipient_type?: string
          record_id?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "authority_access_grants_package_seal_id_fkey"
            columns: ["package_seal_id"]
            isOneToOne: false
            referencedRelation: "compliance_package_seals"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string | null
          id: string
          inspector_id: string | null
          locked: boolean | null
          price_total: number | null
          project_id: string
          report_hash: string | null
          report_url: string | null
          stage_type: string
          status: Database["public"]["Enums"]["inspection_status"] | null
          tier: string | null
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inspector_id?: string | null
          locked?: boolean | null
          price_total?: number | null
          project_id: string
          report_hash?: string | null
          report_url?: string | null
          stage_type: string
          status?: Database["public"]["Enums"]["inspection_status"] | null
          tier?: string | null
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inspector_id?: string | null
          locked?: boolean | null
          price_total?: number | null
          project_id?: string
          report_hash?: string | null
          report_url?: string | null
          stage_type?: string
          status?: Database["public"]["Enums"]["inspection_status"] | null
          tier?: string | null
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_approval_events: {
        Row: {
          actor_id: string
          actor_role: string | null
          created_at: string
          from_status: string | null
          id: string
          permitted_families_snap: string[] | null
          reason: string | null
          to_status: string | null
          user_id: string
        }
        Insert: {
          actor_id: string
          actor_role?: string | null
          created_at?: string
          from_status?: string | null
          id: string
          permitted_families_snap?: string[] | null
          reason?: string | null
          to_status?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string
          actor_role?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          permitted_families_snap?: string[] | null
          reason?: string | null
          to_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      builder_documents: {
        Row: {
          document_type: string
          expires_at: string | null
          file_name: string
          id: string
          is_required: boolean
          reviewer_note: string | null
          status: string
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          document_type: string
          expires_at?: string | null
          file_name: string
          id: string
          is_required?: boolean
          reviewer_note?: string | null
          status?: string
          storage_path: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          document_type?: string
          expires_at?: string | null
          file_name?: string
          id?: string
          is_required?: boolean
          reviewer_note?: string | null
          status?: string
          storage_path?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      builder_onboarding_status: {
        Row: {
          address: string | null
          business_number: string | null
          city: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          jurisdictions: string[]
          permitted_families: string[]
          postal_code: string | null
          province: string
          requested_families: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_number?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          jurisdictions?: string[]
          permitted_families?: string[]
          postal_code?: string | null
          province?: string
          requested_families?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_number?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          jurisdictions?: string[]
          permitted_families?: string[]
          postal_code?: string | null
          province?: string
          requested_families?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      builder_refund_credit_hooks: {
        Row: {
          admin_note: string | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          amount: number
          assignment_id: string | null
          audit_trail: Json
          builder_id: string | null
          created_at: string
          currency: string
          enforcement_mode: string
          funding_source: string
          id: string
          job_id: string
          metadata: Json
          policy_version_id: string | null
          requires_admin_approval: boolean
          status: string
          trigger_reason: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          amount?: number
          assignment_id?: string | null
          audit_trail?: Json
          builder_id?: string | null
          created_at?: string
          currency?: string
          enforcement_mode?: string
          funding_source?: string
          id?: string
          job_id: string
          metadata?: Json
          policy_version_id?: string | null
          requires_admin_approval?: boolean
          status?: string
          trigger_reason: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          amount?: number
          assignment_id?: string | null
          audit_trail?: Json
          builder_id?: string | null
          created_at?: string
          currency?: string
          enforcement_mode?: string
          funding_source?: string
          id?: string
          job_id?: string
          metadata?: Json
          policy_version_id?: string | null
          requires_admin_approval?: boolean
          status?: string
          trigger_reason?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_refund_credit_hooks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "admin_standby_reassignment_status"
            referencedColumns: ["primary_assignment_id"]
          },
          {
            foreignKeyName: "builder_refund_credit_hooks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "job_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_refund_credit_hooks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_refund_credit_hooks_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "reliability_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_results: {
        Row: {
          booking_id: string
          created_at: string | null
          evidence_required_text: string | null
          id: string
          inspector_note: string | null
          reason_category: string | null
          result: Database["public"]["Enums"]["check_result"] | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          template_item_id: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          evidence_required_text?: string | null
          id?: string
          inspector_note?: string | null
          reason_category?: string | null
          result?: Database["public"]["Enums"]["check_result"] | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          template_item_id?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          evidence_required_text?: string | null
          id?: string
          inspector_note?: string | null
          reason_category?: string | null
          result?: Database["public"]["Enums"]["check_result"] | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          template_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_results_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_results_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          category: string | null
          id: string
          item_text: string
          requirements_text: string | null
          stage_type: string
          version: number | null
        }
        Insert: {
          category?: string | null
          id?: string
          item_text: string
          requirements_text?: string | null
          stage_type: string
          version?: number | null
        }
        Update: {
          category?: string | null
          id?: string
          item_text?: string
          requirements_text?: string | null
          stage_type?: string
          version?: number | null
        }
        Relationships: []
      }
      compliance_completed_records: {
        Row: {
          address: string
          authority_name: string | null
          builder_id: string | null
          builder_name: string | null
          cert_ref: string
          city: string | null
          completed_at: string
          created_at: string | null
          discipline: string | null
          evidence_items: Json
          fail_items: number
          hold_history: Json
          hold_id: string | null
          id: string
          inspector_id: string | null
          inspector_license: string
          inspector_name: string
          job_ref: string | null
          jurisdiction_id: string | null
          jurisdiction_name: string | null
          pass_items: number
          permit_number: string | null
          project_id: string | null
          project_name: string
          region: string | null
          result: string
          sealed: boolean
          stage: number
          stage_name: string
        }
        Insert: {
          address: string
          authority_name?: string | null
          builder_id?: string | null
          builder_name?: string | null
          cert_ref: string
          city?: string | null
          completed_at: string
          created_at?: string | null
          discipline?: string | null
          evidence_items?: Json
          fail_items?: number
          hold_history?: Json
          hold_id?: string | null
          id: string
          inspector_id?: string | null
          inspector_license: string
          inspector_name: string
          job_ref?: string | null
          jurisdiction_id?: string | null
          jurisdiction_name?: string | null
          pass_items?: number
          permit_number?: string | null
          project_id?: string | null
          project_name: string
          region?: string | null
          result: string
          sealed?: boolean
          stage: number
          stage_name: string
        }
        Update: {
          address?: string
          authority_name?: string | null
          builder_id?: string | null
          builder_name?: string | null
          cert_ref?: string
          city?: string | null
          completed_at?: string
          created_at?: string | null
          discipline?: string | null
          evidence_items?: Json
          fail_items?: number
          hold_history?: Json
          hold_id?: string | null
          id?: string
          inspector_id?: string | null
          inspector_license?: string
          inspector_name?: string
          job_ref?: string | null
          jurisdiction_id?: string | null
          jurisdiction_name?: string | null
          pass_items?: number
          permit_number?: string | null
          project_id?: string | null
          project_name?: string
          region?: string | null
          result?: string
          sealed?: boolean
          stage?: number
          stage_name?: string
        }
        Relationships: []
      }
      compliance_deficiencies: {
        Row: {
          checklist_item_ref: string | null
          created_at: string
          evidence_item_ref: string | null
          id: string
          record_id: string
          resolved_in_version: number | null
          response: string | null
          reviewer_comment: string
          status: string
          updated_at: string
        }
        Insert: {
          checklist_item_ref?: string | null
          created_at: string
          evidence_item_ref?: string | null
          id: string
          record_id: string
          resolved_in_version?: number | null
          response?: string | null
          reviewer_comment: string
          status: string
          updated_at: string
        }
        Update: {
          checklist_item_ref?: string | null
          created_at?: string
          evidence_item_ref?: string | null
          id?: string
          record_id?: string
          resolved_in_version?: number | null
          response?: string | null
          reviewer_comment?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_package_exports: {
        Row: {
          destination: string | null
          export_hash: string | null
          export_method: string | null
          export_scope: string
          exported_at: string
          exported_by_id: string | null
          id: string
          metadata: Json
          package_seal_id: string
          recipient_identity: string | null
          recipient_type: string | null
          record_id: string
        }
        Insert: {
          destination?: string | null
          export_hash?: string | null
          export_method?: string | null
          export_scope: string
          exported_at?: string
          exported_by_id?: string | null
          id?: string
          metadata?: Json
          package_seal_id: string
          recipient_identity?: string | null
          recipient_type?: string | null
          record_id: string
        }
        Update: {
          destination?: string | null
          export_hash?: string | null
          export_method?: string | null
          export_scope?: string
          exported_at?: string
          exported_by_id?: string | null
          id?: string
          metadata?: Json
          package_seal_id?: string
          recipient_identity?: string | null
          recipient_type?: string | null
          record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_package_exports_package_seal_id_fkey"
            columns: ["package_seal_id"]
            isOneToOne: false
            referencedRelation: "compliance_package_seals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_package_exports_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "compliance_completed_records"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_package_seals: {
        Row: {
          created_at: string
          export_count: number
          id: string
          manifest: Json
          package_hash: string
          record_id: string
          seal_status: string
          sealed_at: string
          sealed_by_id: string | null
          sealed_by_name: string | null
          updated_at: string
          verification_code: string
          version_number: number
        }
        Insert: {
          created_at?: string
          export_count?: number
          id: string
          manifest?: Json
          package_hash: string
          record_id: string
          seal_status?: string
          sealed_at: string
          sealed_by_id?: string | null
          sealed_by_name?: string | null
          updated_at?: string
          verification_code: string
          version_number?: number
        }
        Update: {
          created_at?: string
          export_count?: number
          id?: string
          manifest?: Json
          package_hash?: string
          record_id?: string
          seal_status?: string
          sealed_at?: string
          sealed_by_id?: string | null
          sealed_by_name?: string | null
          updated_at?: string
          verification_code?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "compliance_package_seals_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: true
            referencedRelation: "compliance_completed_records"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_package_versions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          record_id: string
          version: number
        }
        Insert: {
          created_at: string
          id: string
          note?: string | null
          record_id: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          record_id?: string
          version?: number
        }
        Relationships: []
      }
      credential_types: {
        Row: {
          authority_level: string
          can_design_signoff: boolean
          can_field_review: boolean
          can_generate_schedule_cb: boolean
          can_place_hold: boolean
          can_release_hold: boolean
          can_submit_permit_package: boolean
          created_at: string
          disciplines: string[]
          display_name: string
          governing_body: string
          id: string
          jurisdiction: string
          observe_only: boolean
          required_documents: string[]
          requires_expiry_tracking: boolean
          requires_insurance: boolean
        }
        Insert: {
          authority_level: string
          can_design_signoff?: boolean
          can_field_review?: boolean
          can_generate_schedule_cb?: boolean
          can_place_hold?: boolean
          can_release_hold?: boolean
          can_submit_permit_package?: boolean
          created_at?: string
          disciplines?: string[]
          display_name: string
          governing_body: string
          id: string
          jurisdiction?: string
          observe_only?: boolean
          required_documents?: string[]
          requires_expiry_tracking?: boolean
          requires_insurance?: boolean
        }
        Update: {
          authority_level?: string
          can_design_signoff?: boolean
          can_field_review?: boolean
          can_generate_schedule_cb?: boolean
          can_place_hold?: boolean
          can_release_hold?: boolean
          can_submit_permit_package?: boolean
          created_at?: string
          disciplines?: string[]
          display_name?: string
          governing_body?: string
          id?: string
          jurisdiction?: string
          observe_only?: boolean
          required_documents?: string[]
          requires_expiry_tracking?: boolean
          requires_insurance?: boolean
        }
        Relationships: []
      }
      departure_monitoring_events: {
        Row: {
          actor_id: string | null
          actor_role: string
          assignment_id: string | null
          builder_id: string | null
          confidence_score: number | null
          confidence_status: string | null
          created_at: string
          event_type: string
          id: string
          inspector_id: string | null
          job_id: string
          metadata: Json
          monitoring_state_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string
          assignment_id?: string | null
          builder_id?: string | null
          confidence_score?: number | null
          confidence_status?: string | null
          created_at?: string
          event_type: string
          id?: string
          inspector_id?: string | null
          job_id: string
          metadata?: Json
          monitoring_state_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          assignment_id?: string | null
          builder_id?: string | null
          confidence_score?: number | null
          confidence_status?: string | null
          created_at?: string
          event_type?: string
          id?: string
          inspector_id?: string | null
          job_id?: string
          metadata?: Json
          monitoring_state_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departure_monitoring_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "admin_standby_reassignment_status"
            referencedColumns: ["primary_assignment_id"]
          },
          {
            foreignKeyName: "departure_monitoring_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "job_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departure_monitoring_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departure_monitoring_events_monitoring_state_id_fkey"
            columns: ["monitoring_state_id"]
            isOneToOne: false
            referencedRelation: "job_departure_monitoring_states"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          booking_id: string
          captured_at: string | null
          checklist_result_id: string | null
          created_at: string | null
          file_hash: string | null
          file_type: string | null
          file_url: string
          geo_stamp: Json | null
          id: string
        }
        Insert: {
          booking_id: string
          captured_at?: string | null
          checklist_result_id?: string | null
          created_at?: string | null
          file_hash?: string | null
          file_type?: string | null
          file_url: string
          geo_stamp?: Json | null
          id?: string
        }
        Update: {
          booking_id?: string
          captured_at?: string | null
          checklist_result_id?: string | null
          created_at?: string | null
          file_hash?: string | null
          file_type?: string | null
          file_url?: string
          geo_stamp?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_checklist_result_id_fkey"
            columns: ["checklist_result_id"]
            isOneToOne: false
            referencedRelation: "checklist_results"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_audit_trail: {
        Row: {
          captured_at: string
          device_metadata: Json | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: number
          inspection_id: number | null
          media_url: string
          verification_status: string | null
        }
        Insert: {
          captured_at: string
          device_metadata?: Json | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: never
          inspection_id?: number | null
          media_url: string
          verification_status?: string | null
        }
        Update: {
          captured_at?: string
          device_metadata?: Json | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: never
          inspection_id?: number | null
          media_url?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_audit_trail_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      field_geo_anomalies: {
        Row: {
          admin_decision: string | null
          admin_note: string | null
          anomaly_type: string
          assignment_id: string
          created_at: string
          distance_meters: number | null
          document_id: string | null
          explanation: string | null
          id: string
          inspector_id: string | null
          job_id: string
          metadata: Json
          report_id: string | null
          review_status: string
          reviewed_at: string | null
          threshold_meters: number | null
        }
        Insert: {
          admin_decision?: string | null
          admin_note?: string | null
          anomaly_type: string
          assignment_id: string
          created_at?: string
          distance_meters?: number | null
          document_id?: string | null
          explanation?: string | null
          id: string
          inspector_id?: string | null
          job_id: string
          metadata?: Json
          report_id?: string | null
          review_status?: string
          reviewed_at?: string | null
          threshold_meters?: number | null
        }
        Update: {
          admin_decision?: string | null
          admin_note?: string | null
          anomaly_type?: string
          assignment_id?: string
          created_at?: string
          distance_meters?: number | null
          document_id?: string | null
          explanation?: string | null
          id?: string
          inspector_id?: string | null
          job_id?: string
          metadata?: Json
          report_id?: string | null
          review_status?: string
          reviewed_at?: string | null
          threshold_meters?: number | null
        }
        Relationships: []
      }
      governance_audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after_state: Json
          before_state: Json
          blocker_type: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          reason: string | null
          rule_ids: string[]
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after_state?: Json
          before_state?: Json
          blocker_type?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          reason?: string | null
          rule_ids?: string[]
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after_state?: Json
          before_state?: Json
          blocker_type?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          reason?: string | null
          rule_ids?: string[]
        }
        Relationships: []
      }
      governed_projects: {
        Row: {
          address: string
          builder_id: string
          builder_onboarding_status: string
          city: string
          completeness_blockers: Json
          completeness_status: string
          created_at: string
          id: string
          metadata: Json
          name: string
          permit_number: string | null
          rule_snapshot: Json
          updated_at: string
        }
        Insert: {
          address: string
          builder_id: string
          builder_onboarding_status?: string
          city: string
          completeness_blockers?: Json
          completeness_status?: string
          created_at?: string
          id: string
          metadata?: Json
          name: string
          permit_number?: string | null
          rule_snapshot?: Json
          updated_at?: string
        }
        Update: {
          address?: string
          builder_id?: string
          builder_onboarding_status?: string
          city?: string
          completeness_blockers?: Json
          completeness_status?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          permit_number?: string | null
          rule_snapshot?: Json
          updated_at?: string
        }
        Relationships: []
      }
      hold_time_logs: {
        Row: {
          billable_minutes: number | null
          created_at: string
          end_time: string | null
          hold_id: string
          id: string
          rate_applied: number | null
          start_time: string
          total_cost: number | null
        }
        Insert: {
          billable_minutes?: number | null
          created_at?: string
          end_time?: string | null
          hold_id: string
          id?: string
          rate_applied?: number | null
          start_time: string
          total_cost?: number | null
        }
        Update: {
          billable_minutes?: number | null
          created_at?: string
          end_time?: string | null
          hold_id?: string
          id?: string
          rate_applied?: number | null
          start_time?: string
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hold_time_logs_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "inspection_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_appointments: {
        Row: {
          arrived_at: string | null
          assignment_id: string
          builder_id: string | null
          checked_in_at: string | null
          commitment_accepted_at: string
          commitment_version: string
          completed_at: string | null
          confirmation_status: string
          created_at: string
          en_route_at: string | null
          id: string
          inspector_confirmed_at: string | null
          inspector_id: string
          job_id: string
          metadata: Json
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          site_ready_status: string
          status: string
          updated_at: string
        }
        Insert: {
          arrived_at?: string | null
          assignment_id: string
          builder_id?: string | null
          checked_in_at?: string | null
          commitment_accepted_at: string
          commitment_version: string
          completed_at?: string | null
          confirmation_status?: string
          created_at?: string
          en_route_at?: string | null
          id?: string
          inspector_confirmed_at?: string | null
          inspector_id: string
          job_id: string
          metadata?: Json
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          site_ready_status?: string
          status?: string
          updated_at?: string
        }
        Update: {
          arrived_at?: string | null
          assignment_id?: string
          builder_id?: string | null
          checked_in_at?: string | null
          commitment_accepted_at?: string
          commitment_version?: string
          completed_at?: string | null
          confirmation_status?: string
          created_at?: string
          en_route_at?: string | null
          id?: string
          inspector_confirmed_at?: string | null
          inspector_id?: string
          job_id?: string
          metadata?: Json
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          site_ready_status?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      inspection_cancellation_requests: {
        Row: {
          admin_note: string | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          appeal_note: string | null
          appeal_status: string
          appealed_at: string | null
          appointment_id: string | null
          assignment_id: string | null
          audit_trail: Json
          builder_notified_at: string | null
          builder_resolution_status: string
          created_at: string
          enforcement_mode: string
          evidence: Json
          evidence_required: boolean
          final_classification: string | null
          financial_consequence_status: string
          id: string
          inspector_notified_at: string | null
          is_late: boolean
          job_id: string
          payout_blocked: boolean
          policy_version_id: string | null
          preliminary_classification: string | null
          reason_category: string | null
          reason_code: string
          reason_note: string | null
          reassignment_triggered_at: string | null
          requested_at: string
          requested_by_id: string
          requested_by_role: string
          scheduled_start_at: string | null
          updated_at: string
          validity_status: string
        }
        Insert: {
          admin_note?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          appeal_note?: string | null
          appeal_status?: string
          appealed_at?: string | null
          appointment_id?: string | null
          assignment_id?: string | null
          audit_trail?: Json
          builder_notified_at?: string | null
          builder_resolution_status?: string
          created_at?: string
          enforcement_mode?: string
          evidence?: Json
          evidence_required?: boolean
          final_classification?: string | null
          financial_consequence_status?: string
          id?: string
          inspector_notified_at?: string | null
          is_late?: boolean
          job_id: string
          payout_blocked?: boolean
          policy_version_id?: string | null
          preliminary_classification?: string | null
          reason_category?: string | null
          reason_code: string
          reason_note?: string | null
          reassignment_triggered_at?: string | null
          requested_at?: string
          requested_by_id: string
          requested_by_role: string
          scheduled_start_at?: string | null
          updated_at?: string
          validity_status?: string
        }
        Update: {
          admin_note?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          appeal_note?: string | null
          appeal_status?: string
          appealed_at?: string | null
          appointment_id?: string | null
          assignment_id?: string | null
          audit_trail?: Json
          builder_notified_at?: string | null
          builder_resolution_status?: string
          created_at?: string
          enforcement_mode?: string
          evidence?: Json
          evidence_required?: boolean
          final_classification?: string | null
          financial_consequence_status?: string
          id?: string
          inspector_notified_at?: string | null
          is_late?: boolean
          job_id?: string
          payout_blocked?: boolean
          policy_version_id?: string | null
          preliminary_classification?: string | null
          reason_category?: string | null
          reason_code?: string
          reason_note?: string | null
          reassignment_triggered_at?: string | null
          requested_at?: string
          requested_by_id?: string
          requested_by_role?: string
          scheduled_start_at?: string | null
          updated_at?: string
          validity_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_cancellation_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "inspection_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_cancellation_requests_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "reliability_policy_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_cancellation_requests_reason_code_fkey"
            columns: ["reason_code"]
            isOneToOne: false
            referencedRelation: "valid_cancellation_reasons"
            referencedColumns: ["code"]
          },
        ]
      }
      inspection_holds: {
        Row: {
          builder_acknowledged: boolean
          builder_acknowledged_at: string | null
          created_at: string
          created_by: Database["public"]["Enums"]["inspection_hold_created_by"]
          ended_at: string | null
          estimated_fix_minutes: number | null
          id: string
          inspection_id: string
          is_blocking: boolean
          linked_reinspection_id: string | null
          notes: string | null
          reason_code: Database["public"]["Enums"]["inspection_hold_reason_code"]
          return_window_end: string | null
          return_window_start: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["inspection_hold_status"]
          type: Database["public"]["Enums"]["inspection_hold_type"]
          updated_at: string
        }
        Insert: {
          builder_acknowledged?: boolean
          builder_acknowledged_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["inspection_hold_created_by"]
          ended_at?: string | null
          estimated_fix_minutes?: number | null
          id?: string
          inspection_id: string
          is_blocking?: boolean
          linked_reinspection_id?: string | null
          notes?: string | null
          reason_code: Database["public"]["Enums"]["inspection_hold_reason_code"]
          return_window_end?: string | null
          return_window_start?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["inspection_hold_status"]
          type: Database["public"]["Enums"]["inspection_hold_type"]
          updated_at?: string
        }
        Update: {
          builder_acknowledged?: boolean
          builder_acknowledged_at?: string | null
          created_at?: string
          created_by?: Database["public"]["Enums"]["inspection_hold_created_by"]
          ended_at?: string | null
          estimated_fix_minutes?: number | null
          id?: string
          inspection_id?: string
          is_blocking?: boolean
          linked_reinspection_id?: string | null
          notes?: string | null
          reason_code?: Database["public"]["Enums"]["inspection_hold_reason_code"]
          return_window_end?: string | null
          return_window_start?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["inspection_hold_status"]
          type?: Database["public"]["Enums"]["inspection_hold_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_holds_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_holds_linked_reinspection_id_fkey"
            columns: ["linked_reinspection_id"]
            isOneToOne: false
            referencedRelation: "reinspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_jobs: {
        Row: {
          base_fee: number
          builder_id: string | null
          completed_at: string | null
          created_at: string
          current_hold_id: string | null
          hold_fee_total: number
          id: string
          inspector_id: string | null
          project_id: string
          return_fee_total: number
          started_at: string | null
          status: Database["public"]["Enums"]["inspection_job_status"]
          updated_at: string
        }
        Insert: {
          base_fee?: number
          builder_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_hold_id?: string | null
          hold_fee_total?: number
          id?: string
          inspector_id?: string | null
          project_id: string
          return_fee_total?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["inspection_job_status"]
          updated_at?: string
        }
        Update: {
          base_fee?: number
          builder_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_hold_id?: string | null
          hold_fee_total?: number
          id?: string
          inspector_id?: string | null
          project_id?: string
          return_fee_total?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["inspection_job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_jobs_current_hold_id_fkey"
            columns: ["current_hold_id"]
            isOneToOne: false
            referencedRelation: "inspection_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          chain_of_custody_hash: string | null
          created_at: string | null
          digital_signature_timestamp: string | null
          discipline: string | null
          field_review: Json | null
          geofence_verified: boolean | null
          id: number
          inspection_date: string
          project_id: number | null
          stage: string
          stage_key: string | null
          standby_hours: number | null
          status: string | null
          tier: string
        }
        Insert: {
          chain_of_custody_hash?: string | null
          created_at?: string | null
          digital_signature_timestamp?: string | null
          discipline?: string | null
          field_review?: Json | null
          geofence_verified?: boolean | null
          id?: number
          inspection_date: string
          project_id?: number | null
          stage: string
          stage_key?: string | null
          standby_hours?: number | null
          status?: string | null
          tier: string
        }
        Update: {
          chain_of_custody_hash?: string | null
          created_at?: string | null
          digital_signature_timestamp?: string | null
          discipline?: string | null
          field_review?: Json | null
          geofence_verified?: boolean | null
          id?: number
          inspection_date?: string
          project_id?: number | null
          stage?: string
          stage_key?: string | null
          standby_hours?: number | null
          status?: string | null
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_completion_documents: {
        Row: {
          anomaly_flags: Json
          assignment_id: string
          capture_geo: Json
          created_at: string
          evidence_checksum: string | null
          file_name: string
          file_size: number | null
          id: string
          integrity_status: string
          item_code: string
          manual_location_note: string | null
          media_type: string
          mime_type: string | null
          original_captured_at: string | null
          report_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          anomaly_flags?: Json
          assignment_id: string
          capture_geo?: Json
          created_at?: string
          evidence_checksum?: string | null
          file_name: string
          file_size?: number | null
          id: string
          integrity_status?: string
          item_code: string
          manual_location_note?: string | null
          media_type?: string
          mime_type?: string | null
          original_captured_at?: string | null
          report_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          anomaly_flags?: Json
          assignment_id?: string
          capture_geo?: Json
          created_at?: string
          evidence_checksum?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          integrity_status?: string
          item_code?: string
          manual_location_note?: string | null
          media_type?: string
          mime_type?: string | null
          original_captured_at?: string | null
          report_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspector_completion_documents_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "inspector_completion_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_completion_reports: {
        Row: {
          address: string
          ahj_overlay_label: string
          ahj_overlay_type: string
          assignment_id: string
          checklist_snapshot: Json
          city: string | null
          created_at: string
          current_stage: number
          id: string
          inspector_id: string
          inspector_license_no: string | null
          job_id: string
          jurisdiction_name: string | null
          last_saved_at: string
          overlay_snapshot: Json
          project_id: string | null
          project_name: string
          project_type: string | null
          region: string | null
          seal_applied: boolean
          seal_payload: Json
          seal_reference: string | null
          sealed_at: string | null
          stage_count: number
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          address: string
          ahj_overlay_label: string
          ahj_overlay_type: string
          assignment_id: string
          checklist_snapshot?: Json
          city?: string | null
          created_at?: string
          current_stage?: number
          id: string
          inspector_id: string
          inspector_license_no?: string | null
          job_id: string
          jurisdiction_name?: string | null
          last_saved_at?: string
          overlay_snapshot?: Json
          project_id?: string | null
          project_name: string
          project_type?: string | null
          region?: string | null
          seal_applied?: boolean
          seal_payload?: Json
          seal_reference?: string | null
          sealed_at?: string | null
          stage_count?: number
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          ahj_overlay_label?: string
          ahj_overlay_type?: string
          assignment_id?: string
          checklist_snapshot?: Json
          city?: string | null
          created_at?: string
          current_stage?: number
          id?: string
          inspector_id?: string
          inspector_license_no?: string | null
          job_id?: string
          jurisdiction_name?: string | null
          last_saved_at?: string
          overlay_snapshot?: Json
          project_id?: string | null
          project_name?: string
          project_type?: string | null
          region?: string | null
          seal_applied?: boolean
          seal_payload?: Json
          seal_reference?: string | null
          sealed_at?: string | null
          stage_count?: number
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inspector_completion_stage_items: {
        Row: {
          ahj_notes: string | null
          assignment_id: string
          created_at: string
          dependencies: string[]
          document_upload_required: boolean
          id: string
          inspection_status: string
          is_required: Json
          item_code: string
          item_label: string
          metadata: Json
          permit_type: string
          report_id: string
          response_note: string | null
          responsible_party: string
          sort_order: number
          stage_name: string
          stage_number: number
          updated_at: string
        }
        Insert: {
          ahj_notes?: string | null
          assignment_id: string
          created_at?: string
          dependencies?: string[]
          document_upload_required?: boolean
          id: string
          inspection_status?: string
          is_required?: Json
          item_code: string
          item_label: string
          metadata?: Json
          permit_type: string
          report_id: string
          response_note?: string | null
          responsible_party: string
          sort_order: number
          stage_name: string
          stage_number: number
          updated_at?: string
        }
        Update: {
          ahj_notes?: string | null
          assignment_id?: string
          created_at?: string
          dependencies?: string[]
          document_upload_required?: boolean
          id?: string
          inspection_status?: string
          is_required?: Json
          item_code?: string
          item_label?: string
          metadata?: Json
          permit_type?: string
          report_id?: string
          response_note?: string | null
          responsible_party?: string
          sort_order?: number
          stage_name?: string
          stage_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspector_completion_stage_items_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "inspector_completion_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_credentials: {
        Row: {
          credential_type: string
          expires_at: string | null
          file_name: string
          id: string
          is_required: boolean
          reviewer_note: string | null
          status: string
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          credential_type: string
          expires_at?: string | null
          file_name: string
          id: string
          is_required?: boolean
          reviewer_note?: string | null
          status?: string
          storage_path: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          credential_type?: string
          expires_at?: string | null
          file_name?: string
          id?: string
          is_required?: boolean
          reviewer_note?: string | null
          status?: string
          storage_path?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inspector_held_credentials: {
        Row: {
          created_at: string
          credential_type_id: string
          discipline_scope: string[]
          expires_at: string | null
          id: string
          inspector_id: string
          insurance_expires_at: string | null
          insurance_policy_number: string | null
          issued_at: string | null
          license_number: string | null
          rejection_reason: string | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          credential_type_id: string
          discipline_scope?: string[]
          expires_at?: string | null
          id?: string
          inspector_id: string
          insurance_expires_at?: string | null
          insurance_policy_number?: string | null
          issued_at?: string | null
          license_number?: string | null
          rejection_reason?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          credential_type_id?: string
          discipline_scope?: string[]
          expires_at?: string | null
          id?: string
          inspector_id?: string
          insurance_expires_at?: string | null
          insurance_policy_number?: string | null
          issued_at?: string | null
          license_number?: string | null
          rejection_reason?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspector_held_credentials_credential_type_id_fkey"
            columns: ["credential_type_id"]
            isOneToOne: false
            referencedRelation: "credential_types"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_location_snapshots: {
        Row: {
          accuracy_meters: number | null
          assignment_id: string
          captured_at: string
          created_at: string
          distance_to_site_meters: number | null
          id: string
          inspector_id: string
          job_id: string
          latitude: number
          location_permission_active: boolean | null
          longitude: number
          metadata: Json
          monitoring_state_id: string | null
          retention_expires_at: string
          route_opened: boolean
          source: string
        }
        Insert: {
          accuracy_meters?: number | null
          assignment_id: string
          captured_at: string
          created_at?: string
          distance_to_site_meters?: number | null
          id?: string
          inspector_id: string
          job_id: string
          latitude: number
          location_permission_active?: boolean | null
          longitude: number
          metadata?: Json
          monitoring_state_id?: string | null
          retention_expires_at?: string
          route_opened?: boolean
          source?: string
        }
        Update: {
          accuracy_meters?: number | null
          assignment_id?: string
          captured_at?: string
          created_at?: string
          distance_to_site_meters?: number | null
          id?: string
          inspector_id?: string
          job_id?: string
          latitude?: number
          location_permission_active?: boolean | null
          longitude?: number
          metadata?: Json
          monitoring_state_id?: string | null
          retention_expires_at?: string
          route_opened?: boolean
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspector_location_snapshots_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "admin_standby_reassignment_status"
            referencedColumns: ["primary_assignment_id"]
          },
          {
            foreignKeyName: "inspector_location_snapshots_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "job_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspector_location_snapshots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspector_location_snapshots_monitoring_state_id_fkey"
            columns: ["monitoring_state_id"]
            isOneToOne: false
            referencedRelation: "job_departure_monitoring_states"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_onboarding_status: {
        Row: {
          approved_role_lanes: string[]
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          credential_expires_at: string | null
          designation: string | null
          disciplines: string[] | null
          license_number: string | null
          region: string | null
          regions: string[]
          requested_role_lanes: string[]
          reviewer_note: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_role_lanes?: string[]
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          credential_expires_at?: string | null
          designation?: string | null
          disciplines?: string[] | null
          license_number?: string | null
          region?: string | null
          regions?: string[]
          requested_role_lanes?: string[]
          reviewer_note?: string | null
          status: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_role_lanes?: string[]
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          credential_expires_at?: string | null
          designation?: string | null
          disciplines?: string[] | null
          license_number?: string | null
          region?: string | null
          regions?: string[]
          requested_role_lanes?: string[]
          reviewer_note?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inspector_reliability_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          admin_note: string | null
          admin_review_status: string
          appointment_id: string | null
          assignment_id: string | null
          created_at: string
          enforcement_mode: string
          event_type: string
          evidence: Json
          id: string
          inspector_id: string
          job_id: string | null
          metadata: Json
          policy_version_id: string | null
          score_after: number | null
          score_delta: number
          tier_after: string | null
          tier_before: string | null
          valid_reason_code: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          admin_note?: string | null
          admin_review_status?: string
          appointment_id?: string | null
          assignment_id?: string | null
          created_at?: string
          enforcement_mode?: string
          event_type: string
          evidence?: Json
          id?: string
          inspector_id: string
          job_id?: string | null
          metadata?: Json
          policy_version_id?: string | null
          score_after?: number | null
          score_delta?: number
          tier_after?: string | null
          tier_before?: string | null
          valid_reason_code?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          admin_note?: string | null
          admin_review_status?: string
          appointment_id?: string | null
          assignment_id?: string | null
          created_at?: string
          enforcement_mode?: string
          event_type?: string
          evidence?: Json
          id?: string
          inspector_id?: string
          job_id?: string | null
          metadata?: Json
          policy_version_id?: string | null
          score_after?: number | null
          score_delta?: number
          tier_after?: string | null
          tier_before?: string | null
          valid_reason_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspector_reliability_events_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "reliability_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_reliability_profiles: {
        Row: {
          builder_site_not_ready_count: number
          claim_commitment_count: number
          completed_professional_work_count: number
          created_at: string
          inspector_id: string
          internal_score: number
          invalid_late_cancellation_count: number
          last_event_at: string | null
          manual_tier_override: string | null
          metadata: Json
          no_show_count: number
          override_at: string | null
          override_by: string | null
          override_reason: string | null
          policy_version_id: string | null
          tier_key: string
          updated_at: string
          valid_cancellation_count: number
        }
        Insert: {
          builder_site_not_ready_count?: number
          claim_commitment_count?: number
          completed_professional_work_count?: number
          created_at?: string
          inspector_id: string
          internal_score?: number
          invalid_late_cancellation_count?: number
          last_event_at?: string | null
          manual_tier_override?: string | null
          metadata?: Json
          no_show_count?: number
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          policy_version_id?: string | null
          tier_key?: string
          updated_at?: string
          valid_cancellation_count?: number
        }
        Update: {
          builder_site_not_ready_count?: number
          claim_commitment_count?: number
          completed_professional_work_count?: number
          created_at?: string
          inspector_id?: string
          internal_score?: number
          invalid_late_cancellation_count?: number
          last_event_at?: string | null
          manual_tier_override?: string | null
          metadata?: Json
          no_show_count?: number
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          policy_version_id?: string | null
          tier_key?: string
          updated_at?: string
          valid_cancellation_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspector_reliability_profiles_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "reliability_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_reserve_ledger_entries: {
        Row: {
          admin_approved_at: string | null
          admin_approved_by: string | null
          admin_decision_status: string | null
          amount: number
          assignment_id: string | null
          audit_trail: Json
          created_at: string
          currency: string
          enforcement_mode: string
          entry_type: string
          id: string
          inspector_id: string
          job_id: string | null
          legal_review_required: boolean
          metadata: Json
          reason: string
          release_eligible_at: string | null
          reliability_event_id: string | null
          status: string
        }
        Insert: {
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_decision_status?: string | null
          amount?: number
          assignment_id?: string | null
          audit_trail?: Json
          created_at?: string
          currency?: string
          enforcement_mode?: string
          entry_type: string
          id?: string
          inspector_id: string
          job_id?: string | null
          legal_review_required?: boolean
          metadata?: Json
          reason: string
          release_eligible_at?: string | null
          reliability_event_id?: string | null
          status?: string
        }
        Update: {
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_decision_status?: string | null
          amount?: number
          assignment_id?: string | null
          audit_trail?: Json
          created_at?: string
          currency?: string
          enforcement_mode?: string
          entry_type?: string
          id?: string
          inspector_id?: string
          job_id?: string | null
          legal_review_required?: boolean
          metadata?: Json
          reason?: string
          release_eligible_at?: string | null
          reliability_event_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspector_reserve_ledger_entries_reliability_event_id_fkey"
            columns: ["reliability_event_id"]
            isOneToOne: false
            referencedRelation: "inspector_reliability_events"
            referencedColumns: ["id"]
          },
        ]
      }
      inspector_tracking_acknowledgements: {
        Row: {
          acknowledged_at: string | null
          acknowledged_policy_version: string
          created_at: string
          inspector_id: string
          location_retention_acknowledged: boolean
          location_use_acknowledged: boolean
          metadata: Json
          revoked_at: string | null
          tracking_purpose_acknowledged: boolean
          tracking_window_acknowledged: boolean
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_policy_version?: string
          created_at?: string
          inspector_id: string
          location_retention_acknowledged?: boolean
          location_use_acknowledged?: boolean
          metadata?: Json
          revoked_at?: string | null
          tracking_purpose_acknowledged?: boolean
          tracking_window_acknowledged?: boolean
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_policy_version?: string
          created_at?: string
          inspector_id?: string
          location_retention_acknowledged?: boolean
          location_use_acknowledged?: boolean
          metadata?: Json
          revoked_at?: string | null
          tracking_purpose_acknowledged?: boolean
          tracking_window_acknowledged?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      inspectors: {
        Row: {
          created_at: string | null
          digital_seal_url: string | null
          email: string
          id: string
          is_certified_professional: boolean | null
          license_number: string | null
          name: string
          permit_to_practice_number: string | null
          professional_designation: string | null
        }
        Insert: {
          created_at?: string | null
          digital_seal_url?: string | null
          email: string
          id?: string
          is_certified_professional?: boolean | null
          license_number?: string | null
          name: string
          permit_to_practice_number?: string | null
          professional_designation?: string | null
        }
        Update: {
          created_at?: string | null
          digital_seal_url?: string | null
          email?: string
          id?: string
          is_certified_professional?: boolean | null
          license_number?: string | null
          name?: string
          permit_to_practice_number?: string | null
          professional_designation?: string | null
        }
        Relationships: []
      }
      job_assignments: {
        Row: {
          admin_note: string | null
          arrived_at: string | null
          assigned_at: string
          assigned_by: string | null
          cancelled_at: string | null
          claimed_slot: Json | null
          commitment_accepted: boolean
          commitment_accepted_at: string | null
          commitment_version: string | null
          confirmation_status: string
          confirmed_at: string | null
          created_at: string | null
          en_route_at: string | null
          escrow_amount: number | null
          escrow_status: string | null
          id: string
          inspector_confirmed_at: string | null
          inspector_id: string | null
          invalidated_at: string | null
          job_id: string | null
          objected_at: string | null
          objection_note: string | null
          objection_reason: string | null
          objection_state: string
          objection_window_closes_at: string | null
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          arrived_at?: string | null
          assigned_at?: string
          assigned_by?: string | null
          cancelled_at?: string | null
          claimed_slot?: Json | null
          commitment_accepted?: boolean
          commitment_accepted_at?: string | null
          commitment_version?: string | null
          confirmation_status?: string
          confirmed_at?: string | null
          created_at?: string | null
          en_route_at?: string | null
          escrow_amount?: number | null
          escrow_status?: string | null
          id?: string
          inspector_confirmed_at?: string | null
          inspector_id?: string | null
          invalidated_at?: string | null
          job_id?: string | null
          objected_at?: string | null
          objection_note?: string | null
          objection_reason?: string | null
          objection_state?: string
          objection_window_closes_at?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          arrived_at?: string | null
          assigned_at?: string
          assigned_by?: string | null
          cancelled_at?: string | null
          claimed_slot?: Json | null
          commitment_accepted?: boolean
          commitment_accepted_at?: string | null
          commitment_version?: string | null
          confirmation_status?: string
          confirmed_at?: string | null
          created_at?: string | null
          en_route_at?: string | null
          escrow_amount?: number | null
          escrow_status?: string | null
          id?: string
          inspector_confirmed_at?: string | null
          inspector_id?: string | null
          invalidated_at?: string | null
          job_id?: string | null
          objected_at?: string | null
          objection_note?: string | null
          objection_reason?: string | null
          objection_state?: string
          objection_window_closes_at?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      job_attendance_confirmations: {
        Row: {
          accuracy_meters: number | null
          appointment_id: string | null
          assignment_id: string
          builder_id: string | null
          checkpoint: string
          confirmation_method: string | null
          confirmation_token: string
          confirmed_at: string | null
          created_at: string
          critical_alert_on_miss: boolean
          distance_from_site_meters: number | null
          escalation_status: string
          evidence: Json
          evidence_required: boolean
          id: string
          inspector_id: string
          job_id: string
          latitude: number | null
          longitude: number | null
          metadata: Json
          missed_at: string | null
          proximity_status: string | null
          reminder_scheduled_at: string | null
          reminder_sent_at: string | null
          required_at: string | null
          scheduled_start_at: string | null
          standby_activate_on_miss: boolean
          standby_prepare_on_miss: boolean
          status: string
          updated_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          appointment_id?: string | null
          assignment_id: string
          builder_id?: string | null
          checkpoint: string
          confirmation_method?: string | null
          confirmation_token?: string
          confirmed_at?: string | null
          created_at?: string
          critical_alert_on_miss?: boolean
          distance_from_site_meters?: number | null
          escalation_status?: string
          evidence?: Json
          evidence_required?: boolean
          id?: string
          inspector_id: string
          job_id: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          missed_at?: string | null
          proximity_status?: string | null
          reminder_scheduled_at?: string | null
          reminder_sent_at?: string | null
          required_at?: string | null
          scheduled_start_at?: string | null
          standby_activate_on_miss?: boolean
          standby_prepare_on_miss?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          appointment_id?: string | null
          assignment_id?: string
          builder_id?: string | null
          checkpoint?: string
          confirmation_method?: string | null
          confirmation_token?: string
          confirmed_at?: string | null
          created_at?: string
          critical_alert_on_miss?: boolean
          distance_from_site_meters?: number | null
          escalation_status?: string
          evidence?: Json
          evidence_required?: boolean
          id?: string
          inspector_id?: string
          job_id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          missed_at?: string | null
          proximity_status?: string | null
          reminder_scheduled_at?: string | null
          reminder_sent_at?: string | null
          required_at?: string | null
          scheduled_start_at?: string | null
          standby_activate_on_miss?: boolean
          standby_prepare_on_miss?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_attendance_confirmations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "inspection_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_attendance_confirmations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "admin_standby_reassignment_status"
            referencedColumns: ["primary_assignment_id"]
          },
          {
            foreignKeyName: "job_attendance_confirmations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "job_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_attendance_confirmations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      job_departure_monitoring_states: {
        Row: {
          admin_disabled_at: string | null
          appointment_id: string | null
          assignment_id: string
          audit_trail: Json
          builder_id: string | null
          confidence_score: number
          confidence_status: string
          created_at: string
          critical_notification_sent_at: string | null
          estimated_travel_seconds: number
          gps_accuracy_meters: number | null
          hard_ping_responded_at: string | null
          hard_ping_response: string | null
          hard_ping_response_due_at: string | null
          hard_ping_sent_at: string | null
          id: string
          inspector_id: string
          job_id: string
          last_distance_to_site_meters: number | null
          last_location_at: string | null
          last_route_estimated_at: string | null
          last_snapshot_id: string | null
          location_permission_active: boolean | null
          location_retention_acknowledged: boolean
          location_use_acknowledged: boolean
          metadata: Json
          monitoring_expires_at: string
          monitoring_starts_at: string
          prep_notification_sent_at: string | null
          previous_distance_to_site_meters: number | null
          protected_issue_reason: string | null
          protected_issue_submitted: boolean
          required_departure_at: string
          retention_policy: string
          route_opened_at: string | null
          route_provider: string | null
          scheduled_start_at: string
          status: string
          stop_reason: string | null
          stopped_at: string | null
          tracking_active: boolean
          tracking_purpose_acknowledged: boolean
          tracking_window_acknowledged: boolean
          updated_at: string
        }
        Insert: {
          admin_disabled_at?: string | null
          appointment_id?: string | null
          assignment_id: string
          audit_trail?: Json
          builder_id?: string | null
          confidence_score?: number
          confidence_status?: string
          created_at?: string
          critical_notification_sent_at?: string | null
          estimated_travel_seconds?: number
          gps_accuracy_meters?: number | null
          hard_ping_responded_at?: string | null
          hard_ping_response?: string | null
          hard_ping_response_due_at?: string | null
          hard_ping_sent_at?: string | null
          id?: string
          inspector_id: string
          job_id: string
          last_distance_to_site_meters?: number | null
          last_location_at?: string | null
          last_route_estimated_at?: string | null
          last_snapshot_id?: string | null
          location_permission_active?: boolean | null
          location_retention_acknowledged?: boolean
          location_use_acknowledged?: boolean
          metadata?: Json
          monitoring_expires_at: string
          monitoring_starts_at: string
          prep_notification_sent_at?: string | null
          previous_distance_to_site_meters?: number | null
          protected_issue_reason?: string | null
          protected_issue_submitted?: boolean
          required_departure_at: string
          retention_policy?: string
          route_opened_at?: string | null
          route_provider?: string | null
          scheduled_start_at: string
          status?: string
          stop_reason?: string | null
          stopped_at?: string | null
          tracking_active?: boolean
          tracking_purpose_acknowledged?: boolean
          tracking_window_acknowledged?: boolean
          updated_at?: string
        }
        Update: {
          admin_disabled_at?: string | null
          appointment_id?: string | null
          assignment_id?: string
          audit_trail?: Json
          builder_id?: string | null
          confidence_score?: number
          confidence_status?: string
          created_at?: string
          critical_notification_sent_at?: string | null
          estimated_travel_seconds?: number
          gps_accuracy_meters?: number | null
          hard_ping_responded_at?: string | null
          hard_ping_response?: string | null
          hard_ping_response_due_at?: string | null
          hard_ping_sent_at?: string | null
          id?: string
          inspector_id?: string
          job_id?: string
          last_distance_to_site_meters?: number | null
          last_location_at?: string | null
          last_route_estimated_at?: string | null
          last_snapshot_id?: string | null
          location_permission_active?: boolean | null
          location_retention_acknowledged?: boolean
          location_use_acknowledged?: boolean
          metadata?: Json
          monitoring_expires_at?: string
          monitoring_starts_at?: string
          prep_notification_sent_at?: string | null
          previous_distance_to_site_meters?: number | null
          protected_issue_reason?: string | null
          protected_issue_submitted?: boolean
          required_departure_at?: string
          retention_policy?: string
          route_opened_at?: string | null
          route_provider?: string | null
          scheduled_start_at?: string
          status?: string
          stop_reason?: string | null
          stopped_at?: string | null
          tracking_active?: boolean
          tracking_purpose_acknowledged?: boolean
          tracking_window_acknowledged?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_departure_monitoring_states_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "inspection_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_departure_monitoring_states_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "admin_standby_reassignment_status"
            referencedColumns: ["primary_assignment_id"]
          },
          {
            foreignKeyName: "job_departure_monitoring_states_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "job_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_departure_monitoring_states_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      job_disputes: {
        Row: {
          assignment_id: string | null
          commercial_block: boolean
          id: string
          job_id: string
          metadata: Json
          opened_at: string
          opened_by_id: string | null
          opened_by_role: string | null
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          assignment_id?: string | null
          commercial_block?: boolean
          id?: string
          job_id: string
          metadata?: Json
          opened_at?: string
          opened_by_id?: string | null
          opened_by_role?: string | null
          reason: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          assignment_id?: string | null
          commercial_block?: boolean
          id?: string
          job_id?: string
          metadata?: Json
          opened_at?: string
          opened_by_id?: string | null
          opened_by_role?: string | null
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      job_hold_events: {
        Row: {
          actor_id: string | null
          actor_role: string
          created_at: string
          event_type: string
          hold_id: string
          id: string
          job_id: string
          metadata: Json
          note: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role: string
          created_at?: string
          event_type: string
          hold_id: string
          id: string
          job_id: string
          metadata?: Json
          note?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          event_type?: string
          hold_id?: string
          id?: string
          job_id?: string
          metadata?: Json
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_hold_events_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "job_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_hold_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      job_hold_evidence: {
        Row: {
          capture_geo: Json
          captured_at: string | null
          checklist_item_id: string | null
          created_at: string
          created_by_user_id: string
          evidence_role: string
          evidence_type: string
          file_name: string | null
          file_size: number | null
          hold_id: string
          id: string
          job_id: string
          mime_type: string | null
          note_text: string | null
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          capture_geo?: Json
          captured_at?: string | null
          checklist_item_id?: string | null
          created_at?: string
          created_by_user_id: string
          evidence_role?: string
          evidence_type: string
          file_name?: string | null
          file_size?: number | null
          hold_id: string
          id: string
          job_id: string
          mime_type?: string | null
          note_text?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          capture_geo?: Json
          captured_at?: string | null
          checklist_item_id?: string | null
          created_at?: string
          created_by_user_id?: string
          evidence_role?: string
          evidence_type?: string
          file_name?: string | null
          file_size?: number | null
          hold_id?: string
          id?: string
          job_id?: string
          mime_type?: string | null
          note_text?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_hold_evidence_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "job_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_hold_evidence_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      job_hold_retention_sessions: {
        Row: {
          builder_id: string
          completed_at: string | null
          created_at: string
          dispatch_tier: string
          elapsed_seconds: number
          hold_id: string
          hourly_rate: number
          id: string
          initial_hours: number
          inspector_id: string
          job_id: string
          resolved_defect_ids: Json
          started_at: string | null
          status: string
          total_hours_booked: number
          updated_at: string
        }
        Insert: {
          builder_id: string
          completed_at?: string | null
          created_at?: string
          dispatch_tier: string
          elapsed_seconds?: number
          hold_id: string
          hourly_rate: number
          id: string
          initial_hours?: number
          inspector_id: string
          job_id: string
          resolved_defect_ids?: Json
          started_at?: string | null
          status?: string
          total_hours_booked?: number
          updated_at?: string
        }
        Update: {
          builder_id?: string
          completed_at?: string | null
          created_at?: string
          dispatch_tier?: string
          elapsed_seconds?: number
          hold_id?: string
          hourly_rate?: number
          id?: string
          initial_hours?: number
          inspector_id?: string
          job_id?: string
          resolved_defect_ids?: Json
          started_at?: string | null
          status?: string
          total_hours_booked?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_hold_retention_sessions_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: true
            referencedRelation: "job_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_hold_retention_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      job_holds: {
        Row: {
          accepted_at: string | null
          actual_retained_minutes: number
          affected_item_summaries: Json
          builder_accepted_at: string | null
          builder_declined_at: string | null
          builder_id: string
          builder_note: string | null
          builder_selected_correction_minutes: number | null
          checklist_item_ids: Json
          created_at: string
          created_by_inspector_id: string
          declined_at: string | null
          deficiency_reason: string | null
          estimated_correction_minutes: number
          expired_at: string | null
          expires_at: string
          extension_count: number
          hold_cap_amount: number
          hold_category: string
          hold_correction_tier: string | null
          hold_eligible_for_on_site_correction: boolean
          hold_ended_at: string | null
          hold_resolution: string | null
          hold_resolution_notes: string | null
          hold_resolved_by_user_id: string | null
          hold_started_at: string | null
          id: string
          inspector_id: string
          job_id: string
          last_builder_response_at: string | null
          last_notified_at: string | null
          linked_correction_evidence_ids: Json
          placed_at: string
          premium_charge_amount: number
          premium_rate_amount: number
          premium_rate_type: string
          reason: string
          related_inspection_id: string
          resolution_summary: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          actual_retained_minutes?: number
          affected_item_summaries?: Json
          builder_accepted_at?: string | null
          builder_declined_at?: string | null
          builder_id: string
          builder_note?: string | null
          builder_selected_correction_minutes?: number | null
          checklist_item_ids?: Json
          created_at?: string
          created_by_inspector_id: string
          declined_at?: string | null
          deficiency_reason?: string | null
          estimated_correction_minutes?: number
          expired_at?: string | null
          expires_at: string
          extension_count?: number
          hold_cap_amount?: number
          hold_category?: string
          hold_correction_tier?: string | null
          hold_eligible_for_on_site_correction?: boolean
          hold_ended_at?: string | null
          hold_resolution?: string | null
          hold_resolution_notes?: string | null
          hold_resolved_by_user_id?: string | null
          hold_started_at?: string | null
          id?: string
          inspector_id: string
          job_id: string
          last_builder_response_at?: string | null
          last_notified_at?: string | null
          linked_correction_evidence_ids?: Json
          placed_at?: string
          premium_charge_amount?: number
          premium_rate_amount?: number
          premium_rate_type?: string
          reason: string
          related_inspection_id: string
          resolution_summary?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          actual_retained_minutes?: number
          affected_item_summaries?: Json
          builder_accepted_at?: string | null
          builder_declined_at?: string | null
          builder_id?: string
          builder_note?: string | null
          builder_selected_correction_minutes?: number | null
          checklist_item_ids?: Json
          created_at?: string
          created_by_inspector_id?: string
          declined_at?: string | null
          deficiency_reason?: string | null
          estimated_correction_minutes?: number
          expired_at?: string | null
          expires_at?: string
          extension_count?: number
          hold_cap_amount?: number
          hold_category?: string
          hold_correction_tier?: string | null
          hold_eligible_for_on_site_correction?: boolean
          hold_ended_at?: string | null
          hold_resolution?: string | null
          hold_resolution_notes?: string | null
          hold_resolved_by_user_id?: string | null
          hold_started_at?: string | null
          id?: string
          inspector_id?: string
          job_id?: string
          last_builder_response_at?: string | null
          last_notified_at?: string | null
          linked_correction_evidence_ids?: Json
          placed_at?: string
          premium_charge_amount?: number
          premium_rate_amount?: number
          premium_rate_type?: string
          reason?: string
          related_inspection_id?: string
          resolution_summary?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_holds_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      job_opportunities: {
        Row: {
          address: string | null
          available_slots: Json
          base_hourly_rate: number | null
          billable_hours: number | null
          builder_id: string | null
          builder_name: string
          builder_onboarding_status: string | null
          city: string | null
          created_at: string | null
          credential_class: string | null
          departure_monitoring_state: string
          dispatch_tier: string | null
          effective_hourly_rate: number | null
          escrow_authorized: boolean
          escrow_estimate_total: number | null
          estimated_duration_minutes: number | null
          hold_cost: number
          hold_hours: number
          id: string
          inspection_type: string | null
          notes: string | null
          offered_rate: number | null
          permit_family: string | null
          permit_number: string | null
          platform_commission_amount: number | null
          pricing_mode: string
          project_id: string | null
          project_name: string | null
          project_type: string | null
          published_at: string | null
          region: string | null
          requested_at: string
          required_discipline: string | null
          requires_cp: boolean
          requires_professional_seal: boolean
          scheduled_for: string | null
          specialist_role: string | null
          stage: number | null
          stage_name: string | null
          status: string | null
          updated_at: string
          urgency_multiplier: number
          validation_blockers: Json
          validation_completed_at: string | null
          validation_status: string
        }
        Insert: {
          address?: string | null
          available_slots?: Json
          base_hourly_rate?: number | null
          billable_hours?: number | null
          builder_id?: string | null
          builder_name?: string
          builder_onboarding_status?: string | null
          city?: string | null
          created_at?: string | null
          credential_class?: string | null
          departure_monitoring_state?: string
          dispatch_tier?: string | null
          effective_hourly_rate?: number | null
          escrow_authorized?: boolean
          escrow_estimate_total?: number | null
          estimated_duration_minutes?: number | null
          hold_cost?: number
          hold_hours?: number
          id?: string
          inspection_type?: string | null
          notes?: string | null
          offered_rate?: number | null
          permit_family?: string | null
          permit_number?: string | null
          platform_commission_amount?: number | null
          pricing_mode?: string
          project_id?: string | null
          project_name?: string | null
          project_type?: string | null
          published_at?: string | null
          region?: string | null
          requested_at?: string
          required_discipline?: string | null
          requires_cp?: boolean
          requires_professional_seal?: boolean
          scheduled_for?: string | null
          specialist_role?: string | null
          stage?: number | null
          stage_name?: string | null
          status?: string | null
          updated_at?: string
          urgency_multiplier?: number
          validation_blockers?: Json
          validation_completed_at?: string | null
          validation_status?: string
        }
        Update: {
          address?: string | null
          available_slots?: Json
          base_hourly_rate?: number | null
          billable_hours?: number | null
          builder_id?: string | null
          builder_name?: string
          builder_onboarding_status?: string | null
          city?: string | null
          created_at?: string | null
          credential_class?: string | null
          departure_monitoring_state?: string
          dispatch_tier?: string | null
          effective_hourly_rate?: number | null
          escrow_authorized?: boolean
          escrow_estimate_total?: number | null
          estimated_duration_minutes?: number | null
          hold_cost?: number
          hold_hours?: number
          id?: string
          inspection_type?: string | null
          notes?: string | null
          offered_rate?: number | null
          permit_family?: string | null
          permit_number?: string | null
          platform_commission_amount?: number | null
          pricing_mode?: string
          project_id?: string | null
          project_name?: string | null
          project_type?: string | null
          published_at?: string | null
          region?: string | null
          requested_at?: string
          required_discipline?: string | null
          requires_cp?: boolean
          requires_professional_seal?: boolean
          scheduled_for?: string | null
          specialist_role?: string | null
          stage?: number | null
          stage_name?: string | null
          status?: string | null
          updated_at?: string
          urgency_multiplier?: number
          validation_blockers?: Json
          validation_completed_at?: string | null
          validation_status?: string
        }
        Relationships: []
      }
      job_payment_decisions: {
        Row: {
          admin_review_status: string
          assignment_id: string | null
          audit_trail: Json
          base_fee_amount: number
          blocked_reason: string | null
          builder_credit_amount: number
          decided_at: string
          decided_by_id: string | null
          decision_note: string | null
          enforcement_mode: string
          hold_premium_amount: number
          id: string
          job_id: string
          metadata: Json
          payment_status: string
          payout_block_reason_code: string | null
          payout_reduction_amount: number
          payout_status: string
          policy_version_id: string | null
          release_eligible_at: string | null
          released_at: string | null
          released_by_admin_id: string | null
          reliability_event_ids: Json
          reserve_withheld_amount: number
          siteline_commission_amount: number
        }
        Insert: {
          admin_review_status?: string
          assignment_id?: string | null
          audit_trail?: Json
          base_fee_amount?: number
          blocked_reason?: string | null
          builder_credit_amount?: number
          decided_at?: string
          decided_by_id?: string | null
          decision_note?: string | null
          enforcement_mode?: string
          hold_premium_amount?: number
          id?: string
          job_id: string
          metadata?: Json
          payment_status: string
          payout_block_reason_code?: string | null
          payout_reduction_amount?: number
          payout_status: string
          policy_version_id?: string | null
          release_eligible_at?: string | null
          released_at?: string | null
          released_by_admin_id?: string | null
          reliability_event_ids?: Json
          reserve_withheld_amount?: number
          siteline_commission_amount?: number
        }
        Update: {
          admin_review_status?: string
          assignment_id?: string | null
          audit_trail?: Json
          base_fee_amount?: number
          blocked_reason?: string | null
          builder_credit_amount?: number
          decided_at?: string
          decided_by_id?: string | null
          decision_note?: string | null
          enforcement_mode?: string
          hold_premium_amount?: number
          id?: string
          job_id?: string
          metadata?: Json
          payment_status?: string
          payout_block_reason_code?: string | null
          payout_reduction_amount?: number
          payout_status?: string
          policy_version_id?: string | null
          release_eligible_at?: string | null
          released_at?: string | null
          released_by_admin_id?: string | null
          reliability_event_ids?: Json
          reserve_withheld_amount?: number
          siteline_commission_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_payment_decisions_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "reliability_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string | null
          from_status: string | null
          id: string
          job_id: string | null
          reason: string | null
          status: string | null
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          job_id?: string | null
          reason?: string | null
          status?: string | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          job_id?: string | null
          reason?: string | null
          status?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_status_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      job_validation_results: {
        Row: {
          blockers: Json
          builder_id: string | null
          id: string
          job_id: string
          metadata: Json
          project_id: string | null
          validated_at: string
          validation_status: string
          validator_version: string
          warnings: Json
        }
        Insert: {
          blockers?: Json
          builder_id?: string | null
          id?: string
          job_id: string
          metadata?: Json
          project_id?: string | null
          validated_at?: string
          validation_status: string
          validator_version?: string
          warnings?: Json
        }
        Update: {
          blockers?: Json
          builder_id?: string | null
          id?: string
          job_id?: string
          metadata?: Json
          project_id?: string | null
          validated_at?: string
          validation_status?: string
          validator_version?: string
          warnings?: Json
        }
        Relationships: []
      }
      notification_events: {
        Row: {
          channel: string
          created_at: string
          dedupe_key: string | null
          delivery_attempted_at: string | null
          error: string | null
          event_key: string
          id: string
          payload: Json
          recipient_role: string | null
          recipient_user_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          template_key: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          delivery_attempted_at?: string | null
          error?: string | null
          event_key: string
          id?: string
          payload?: Json
          recipient_role?: string | null
          recipient_user_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_key?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          delivery_attempted_at?: string | null
          error?: string | null
          event_key?: string
          id?: string
          payload?: Json
          recipient_role?: string | null
          recipient_user_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_key?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_address: string | null
          created_at: string | null
          digital_seal_url: string | null
          discipline: string | null
          email: string | null
          firm_name: string | null
          first_name: string | null
          full_name: string | null
          id: string
          inspector_license_no: string | null
          inspector_status: string | null
          insurance_expiry: string | null
          last_name: string | null
          license_expiry: string | null
          license_number: string | null
          logo_url: string | null
          onboarding_status: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          verified: boolean | null
        }
        Insert: {
          business_address?: string | null
          created_at?: string | null
          digital_seal_url?: string | null
          discipline?: string | null
          email?: string | null
          firm_name?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          inspector_license_no?: string | null
          inspector_status?: string | null
          insurance_expiry?: string | null
          last_name?: string | null
          license_expiry?: string | null
          license_number?: string | null
          logo_url?: string | null
          onboarding_status?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          verified?: boolean | null
        }
        Update: {
          business_address?: string | null
          created_at?: string | null
          digital_seal_url?: string | null
          discipline?: string | null
          email?: string | null
          firm_name?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          inspector_license_no?: string | null
          inspector_status?: string | null
          insurance_expiry?: string | null
          last_name?: string | null
          license_expiry?: string | null
          license_number?: string | null
          logo_url?: string | null
          onboarding_status?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          verified?: boolean | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string
          builder_id: string | null
          city: string | null
          created_at: string | null
          id: number
          name: string
          permit_number: string | null
          project_type: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          address: string
          builder_id?: string | null
          city?: string | null
          created_at?: string | null
          id?: number
          name: string
          permit_number?: string | null
          project_type: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string
          builder_id?: string | null
          city?: string | null
          created_at?: string | null
          id?: number
          name?: string
          permit_number?: string | null
          project_type?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reinspections: {
        Row: {
          created_at: string
          hold_id: string | null
          id: string
          inspector_id: string | null
          original_inspection_id: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["reinspection_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          hold_id?: string | null
          id?: string
          inspector_id?: string | null
          original_inspection_id: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["reinspection_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          hold_id?: string | null
          id?: string
          inspector_id?: string | null
          original_inspection_id?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["reinspection_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reinspections_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "inspection_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reinspections_original_inspection_id_fkey"
            columns: ["original_inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      reliability_policy_rules: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          enforcement_mode: string
          id: string
          legal_review_required: boolean
          policy_version_id: string
          rule_key: string
          rule_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          enforcement_mode?: string
          id?: string
          legal_review_required?: boolean
          policy_version_id: string
          rule_key: string
          rule_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          enforcement_mode?: string
          id?: string
          legal_review_required?: boolean
          policy_version_id?: string
          rule_key?: string
          rule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reliability_policy_rules_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "reliability_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      reliability_policy_versions: {
        Row: {
          config: Json
          created_at: string
          enforcement_mode: string
          id: string
          legal_review_required: boolean
          legal_reviewed_at: string | null
          legal_reviewed_by: string | null
          notes: string | null
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enforcement_mode?: string
          id?: string
          legal_review_required?: boolean
          legal_reviewed_at?: string | null
          legal_reviewed_by?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          version: string
        }
        Update: {
          config?: Json
          created_at?: string
          enforcement_mode?: string
          id?: string
          legal_review_required?: boolean
          legal_reviewed_at?: string | null
          legal_reviewed_by?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      reliability_tier_definitions: {
        Row: {
          active: boolean
          benefits: Json
          created_at: string
          id: string
          label: string
          max_score: number
          min_score: number
          opportunity_rank: number
          policy_version_id: string
          restrictions: Json
          tier_key: string
        }
        Insert: {
          active?: boolean
          benefits?: Json
          created_at?: string
          id?: string
          label: string
          max_score?: number
          min_score?: number
          opportunity_rank?: number
          policy_version_id: string
          restrictions?: Json
          tier_key: string
        }
        Update: {
          active?: boolean
          benefits?: Json
          created_at?: string
          id?: string
          label?: string
          max_score?: number
          min_score?: number
          opportunity_rank?: number
          policy_version_id?: string
          restrictions?: Json
          tier_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "reliability_tier_definitions_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "reliability_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_readiness_incidents: {
        Row: {
          admin_note: string | null
          admin_review_status: string
          appointment_id: string | null
          assignment_id: string | null
          builder_id: string | null
          builder_note: string | null
          created_at: string
          evidence: Json
          id: string
          incident_type: string
          inspector_id: string
          inspector_note: string | null
          inspector_protected: boolean
          job_id: string
          reported_at: string
          resolved_at: string | null
        }
        Insert: {
          admin_note?: string | null
          admin_review_status?: string
          appointment_id?: string | null
          assignment_id?: string | null
          builder_id?: string | null
          builder_note?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          incident_type: string
          inspector_id: string
          inspector_note?: string | null
          inspector_protected?: boolean
          job_id: string
          reported_at?: string
          resolved_at?: string | null
        }
        Update: {
          admin_note?: string | null
          admin_review_status?: string
          appointment_id?: string | null
          assignment_id?: string | null
          builder_id?: string | null
          builder_note?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          incident_type?: string
          inspector_id?: string
          inspector_note?: string | null
          inspector_protected?: boolean
          job_id?: string
          reported_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_readiness_incidents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "inspection_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      standby_inspector_invites: {
        Row: {
          accepted_at: string | null
          audit_trail: Json
          candidate_rank: number | null
          created_at: string
          expires_at: string
          id: string
          inspector_id: string
          invite_reason: string
          job_id: string
          metadata: Json
          offered_at: string | null
          original_assignment_id: string | null
          priority_rank: number
          responded_at: string | null
          rush_multiplier_offered: number | null
          soft_alerted_at: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          audit_trail?: Json
          candidate_rank?: number | null
          created_at?: string
          expires_at: string
          id?: string
          inspector_id: string
          invite_reason: string
          job_id: string
          metadata?: Json
          offered_at?: string | null
          original_assignment_id?: string | null
          priority_rank?: number
          responded_at?: string | null
          rush_multiplier_offered?: number | null
          soft_alerted_at?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          audit_trail?: Json
          candidate_rank?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          inspector_id?: string
          invite_reason?: string
          job_id?: string
          metadata?: Json
          offered_at?: string | null
          original_assignment_id?: string | null
          priority_rank?: number
          responded_at?: string | null
          rush_multiplier_offered?: number | null
          soft_alerted_at?: string | null
          status?: string
        }
        Relationships: []
      }
      valid_cancellation_reasons: {
        Row: {
          active: boolean
          actor_scope: string[]
          code: string
          label: string
          metadata: Json
          protects_reliability_score: boolean
          requires_admin_review: boolean
          requires_evidence: boolean
        }
        Insert: {
          active?: boolean
          actor_scope?: string[]
          code: string
          label: string
          metadata?: Json
          protects_reliability_score?: boolean
          requires_admin_review?: boolean
          requires_evidence?: boolean
        }
        Update: {
          active?: boolean
          actor_scope?: string[]
          code?: string
          label?: string
          metadata?: Json
          protects_reliability_score?: boolean
          requires_admin_review?: boolean
          requires_evidence?: boolean
        }
        Relationships: []
      }
      vault_archive_events: {
        Row: {
          archived_at: string
          archived_by_id: string | null
          event_type: string
          id: string
          metadata: Json
          package_seal_id: string | null
          record_id: string
          retention_tier: string
        }
        Insert: {
          archived_at?: string
          archived_by_id?: string | null
          event_type: string
          id?: string
          metadata?: Json
          package_seal_id?: string | null
          record_id: string
          retention_tier: string
        }
        Update: {
          archived_at?: string
          archived_by_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          package_seal_id?: string | null
          record_id?: string
          retention_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_archive_events_package_seal_id_fkey"
            columns: ["package_seal_id"]
            isOneToOne: false
            referencedRelation: "compliance_package_seals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_archive_events_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "compliance_completed_records"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_payout_review_queue: {
        Row: {
          admin_review_status: string | null
          assignment_id: string | null
          audit_trail: Json | null
          base_fee_amount: number | null
          builder_credit_amount: number | null
          builder_id: string | null
          decided_at: string | null
          enforcement_mode: string | null
          hold_premium_amount: number | null
          inspector_id: string | null
          job_id: string | null
          payment_decision_id: string | null
          payment_status: string | null
          payout_block_reason_code: string | null
          payout_reduction_amount: number | null
          payout_status: string | null
          reliability_event_ids: Json | null
          reserve_withheld_amount: number | null
        }
        Relationships: []
      }
      admin_standby_reassignment_status: {
        Row: {
          job_id: string | null
          missed_confirmations: Json | null
          primary_assignment_id: string | null
          primary_assignment_status: string | null
          primary_confirmation_status: string | null
          primary_inspector_id: string | null
          standby_candidates: Json | null
          updated_at: string | null
        }
        Insert: {
          job_id?: string | null
          missed_confirmations?: never
          primary_assignment_id?: string | null
          primary_assignment_status?: string | null
          primary_confirmation_status?: string | null
          primary_inspector_id?: string | null
          standby_candidates?: never
          updated_at?: string | null
        }
        Update: {
          job_id?: string | null
          missed_confirmations?: never
          primary_assignment_id?: string | null
          primary_assignment_status?: string | null
          primary_confirmation_status?: string | null
          primary_inspector_id?: string | null
          standby_candidates?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_standby_offer: {
        Args: { p_standby_invite_id: string }
        Returns: Json
      }
      activate_standby_candidates: {
        Args: { p_assignment_id: string; p_manual?: boolean; p_reason?: string }
        Returns: Json
      }
      admin_activate_standby_candidates: {
        Args: { p_assignment_id: string; p_reason?: string }
        Returns: Json
      }
      admin_disable_reliability_enforcement: {
        Args: { p_admin_note: string; p_policy_version_id: string }
        Returns: Json
      }
      admin_request_cancellation_information: {
        Args: { p_admin_note: string; p_cancellation_request_id: string }
        Returns: Json
      }
      admin_review_inspection_cancellation: {
        Args: {
          p_admin_note: string
          p_apply_financial_consequence?: boolean
          p_cancellation_request_id: string
          p_decision: string
          p_trigger_reassignment?: boolean
          p_waive_financial_consequence?: boolean
        }
        Returns: Json
      }
      admin_review_payout_hook: {
        Args: {
          p_admin_note: string
          p_apply_reserve?: boolean
          p_assignment_id: string
          p_builder_credit_amount?: number
          p_decision: string
          p_issue_builder_credit?: boolean
          p_payout_reduction_amount?: number
          p_waive_consequence?: boolean
        }
        Returns: Json
      }
      admin_update_reliability_policy_config: {
        Args: {
          p_admin_note?: string
          p_config_patch?: Json
          p_enforcement_mode?: string
          p_policy_version_id: string
        }
        Returns: Json
      }
      atomic_departure_reassign_to_standby: {
        Args: {
          p_assignment_id: string
          p_reason?: string
          p_standby_invite_id: string
        }
        Returns: Json
      }
      calculate_objection_expiry: { Args: { p_tier: string }; Returns: string }
      check_credential_authority: {
        Args: { p_action: string; p_discipline: string; p_inspector_id: string }
        Returns: Json
      }
      claim_live_job_if_eligible: {
        Args: {
          p_claim_commitment?: Json
          p_claimed_slot?: Json
          p_job_id: string
        }
        Returns: Json
      }
      current_jwt_role: { Args: never; Returns: string }
      decline_hold_and_stop_job:
        | {
            Args: {
              p_actor_id?: string
              p_builder_note?: string
              p_hold_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_actor_id: string
              p_builder_note: string
              p_hold_id: string
            }
            Returns: undefined
          }
      enqueue_reliability_notification: {
        Args: {
          p_channel?: string
          p_context?: Json
          p_recipient_role: string
          p_recipient_user_id: string
          p_scheduled_for?: string
          p_template_key: string
        }
        Returns: Json
      }
      escalate_aged_holds: { Args: never; Returns: undefined }
      evaluate_assignment_payout_hooks: {
        Args: { p_assignment_id: string; p_context?: Json }
        Returns: Json
      }
      identify_standby_candidates_for_assignment: {
        Args: { p_assignment_id: string; p_limit?: number }
        Returns: Json
      }
      inspector_verified_disciplines: {
        Args: { p_inspector_id: string }
        Returns: string[]
      }
      mark_notification_delivery_status: {
        Args: { p_error?: string; p_notification_id: string; p_status: string }
        Returns: Json
      }
      process_departure_monitoring: {
        Args: { p_as_of?: string; p_limit?: number }
        Returns: Json
      }
      process_due_attendance_confirmations: {
        Args: { p_as_of?: string }
        Returns: Json
      }
      record_departure_hard_ping_response: {
        Args: {
          p_action: string
          p_assignment_id: string
          p_issue_reason?: string
          p_metadata?: Json
        }
        Returns: Json
      }
      record_departure_route_estimate: {
        Args: {
          p_assignment_id: string
          p_estimated_travel_seconds: number
          p_metadata?: Json
          p_route_provider?: string
        }
        Returns: Json
      }
      record_inspection_no_show: {
        Args: {
          p_assignment_id: string
          p_detected_at?: string
          p_note?: string
        }
        Returns: Json
      }
      record_inspector_departure_location_snapshot: {
        Args: {
          p_accuracy_meters?: number
          p_assignment_id: string
          p_captured_at?: string
          p_distance_to_site_meters?: number
          p_latitude: number
          p_location_permission_active?: boolean
          p_longitude: number
          p_metadata?: Json
          p_route_opened?: boolean
        }
        Returns: Json
      }
      record_job_attendance_confirmation: {
        Args: {
          p_accuracy_meters?: number
          p_confirmation_id: string
          p_confirmation_token?: string
          p_eta_minutes?: number
          p_latitude?: number
          p_longitude?: number
          p_metadata?: Json
          p_method?: string
        }
        Returns: Json
      }
      request_inspection_cancellation: {
        Args: {
          p_assignment_id: string
          p_evidence?: Json
          p_explanation: string
          p_reason_code: string
        }
        Returns: Json
      }
      resolve_reliability_notification_template: {
        Args: { p_template_key: string }
        Returns: Json
      }
      seed_departure_monitoring_state_for_assignment: {
        Args: {
          p_assignment_id: string
          p_estimated_travel_seconds: number
          p_monitoring_lead_minutes?: number
          p_retention_days?: number
        }
        Returns: Json
      }
      seed_job_attendance_confirmation_ladder: {
        Args: {
          p_appointment_id: string
          p_assignment_id: string
          p_builder_id: string
          p_claimed_at?: string
          p_inspector_id: string
          p_job_id: string
          p_metadata?: Json
          p_scheduled_start_at: string
        }
        Returns: undefined
      }
      soft_alert_standby_candidates: {
        Args: { p_assignment_id: string; p_reason?: string }
        Returns: Json
      }
      submit_cancellation_appeal: {
        Args: {
          p_appeal_note: string
          p_cancellation_request_id: string
          p_evidence?: Json
        }
        Returns: Json
      }
      verify_inspector_credential: {
        Args: { p_credential_id: string; p_new_status: string; p_note?: string }
        Returns: Json
      }
    }
    Enums: {
      check_result: "pass" | "fail" | "na"
      inspection_hold_created_by: "inspector" | "builder"
      inspection_hold_reason_code:
        | "framing"
        | "foundation"
        | "envelope"
        | "electrical"
        | "plumbing"
        | "other"
      inspection_hold_status:
        | "proposed"
        | "acknowledged"
        | "declined"
        | "active"
        | "awaiting_return"
        | "converted"
        | "resolved_pass"
        | "resolved_fail"
      inspection_hold_type: "onsite" | "same_day_return" | "reinspection"
      inspection_job_status:
        | "confirmed"
        | "in_progress"
        | "hold_active"
        | "awaiting_return"
        | "closed_mod_required"
        | "submitted"
        | "sealed"
      inspection_status:
        | "requested"
        | "assigned"
        | "in_progress"
        | "completed"
        | "failed_recheck_needed"
        | "cancelled"
      reinspection_status: "scheduled" | "completed" | "failed" | "passed"
      severity_level: "minor" | "major" | "critical"
      user_role: "builder" | "inspector" | "admin"
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
      check_result: ["pass", "fail", "na"],
      inspection_hold_created_by: ["inspector", "builder"],
      inspection_hold_reason_code: [
        "framing",
        "foundation",
        "envelope",
        "electrical",
        "plumbing",
        "other",
      ],
      inspection_hold_status: [
        "proposed",
        "acknowledged",
        "declined",
        "active",
        "awaiting_return",
        "converted",
        "resolved_pass",
        "resolved_fail",
      ],
      inspection_hold_type: ["onsite", "same_day_return", "reinspection"],
      inspection_job_status: [
        "confirmed",
        "in_progress",
        "hold_active",
        "awaiting_return",
        "closed_mod_required",
        "submitted",
        "sealed",
      ],
      inspection_status: [
        "requested",
        "assigned",
        "in_progress",
        "completed",
        "failed_recheck_needed",
        "cancelled",
      ],
      reinspection_status: ["scheduled", "completed", "failed", "passed"],
      severity_level: ["minor", "major", "critical"],
      user_role: ["builder", "inspector", "admin"],
    },
  },
} as const
