
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_processing_results": {
                  Row: {
                    "anonymised": NonNullable<Json>,"candidate_id": string,"created_at": string,"duration_ms": number | null,"extracted": NonNullable<Json>,"extraction_method": string | null,"id": string,"input_tokens": number | null,"is_ai": boolean,"job_id": string,"model": string | null,"output_tokens": number | null,"pii_findings": NonNullable<Json>,"provider": string,"warnings": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "anonymised": NonNullable<Json>,"candidate_id": string,"created_at"?: string,"duration_ms"?: number | null,"extracted": NonNullable<Json>,"extraction_method"?: string | null,"id"?: string,"input_tokens"?: number | null,"is_ai": boolean,"job_id": string,"model"?: string | null,"output_tokens"?: number | null,"pii_findings"?: NonNullable<Json>,"provider": string,"warnings"?: NonNullable<Json>
                  }
                  Update: {
                    "anonymised"?: NonNullable<Json>,"candidate_id"?: string,"created_at"?: string,"duration_ms"?: number | null,"extracted"?: NonNullable<Json>,"extraction_method"?: string | null,"id"?: string,"input_tokens"?: number | null,"is_ai"?: boolean,"job_id"?: string,"model"?: string | null,"output_tokens"?: number | null,"pii_findings"?: NonNullable<Json>,"provider"?: string,"warnings"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_processing_results_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_processing_results_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "cv_processing_jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"actor_role": string | null,"created_at": string,"entity_id": string | null,"entity_type": string,"id": number,"ip_hash": string | null,"metadata": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"actor_role"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: never,"ip_hash"?: string | null,"metadata"?: NonNullable<Json>
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"actor_role"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: never,"ip_hash"?: string | null,"metadata"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_certifications": {
                  Row: {
                    "candidate_id": string,"id": string,"issuer": string | null,"name": string,"sort_order": number,"year": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"id"?: string,"issuer"?: string | null,"name": string,"sort_order"?: number,"year"?: string | null
                  }
                  Update: {
                    "candidate_id"?: string,"id"?: string,"issuer"?: string | null,"name"?: string,"sort_order"?: number,"year"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_certifications_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_documents": {
                  Row: {
                    "candidate_id": string,"created_at": string,"extracted_text": string | null,"extraction_method": string | null,"id": string,"mime_type": string,"original_filename": string,"sha256": string,"size_bytes": number,"storage_path": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"extracted_text"?: string | null,"extraction_method"?: string | null,"id"?: string,"mime_type": string,"original_filename": string,"sha256": string,"size_bytes": number,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"extracted_text"?: string | null,"extraction_method"?: string | null,"id"?: string,"mime_type"?: string,"original_filename"?: string,"sha256"?: string,"size_bytes"?: number,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_documents_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidate_documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_education": {
                  Row: {
                    "candidate_id": string,"field_of_study": string | null,"id": string,"institution_descriptor": string | null,"qualification": string,"sort_order": number,"year": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"field_of_study"?: string | null,"id"?: string,"institution_descriptor"?: string | null,"qualification": string,"sort_order"?: number,"year"?: string | null
                  }
                  Update: {
                    "candidate_id"?: string,"field_of_study"?: string | null,"id"?: string,"institution_descriptor"?: string | null,"qualification"?: string,"sort_order"?: number,"year"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_education_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_experience": {
                  Row: {
                    "achievements": (string)[],"candidate_id": string,"end_date": string | null,"id": string,"is_current": boolean,"organisation_descriptor": string | null,"skills": (string)[],"sort_order": number,"start_date": string | null,"summary": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "achievements"?: (string)[],"candidate_id": string,"end_date"?: string | null,"id"?: string,"is_current"?: boolean,"organisation_descriptor"?: string | null,"skills"?: (string)[],"sort_order"?: number,"start_date"?: string | null,"summary"?: string | null,"title": string
                  }
                  Update: {
                    "achievements"?: (string)[],"candidate_id"?: string,"end_date"?: string | null,"id"?: string,"is_current"?: boolean,"organisation_descriptor"?: string | null,"skills"?: (string)[],"sort_order"?: number,"start_date"?: string | null,"summary"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_experience_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_private": {
                  Row: {
                    "candidate_id": string,"created_at": string,"email": string,"full_name": string,"internal_notes": string | null,"linkedin_url": string | null,"location_full": string | null,"phone": string | null,"right_to_work": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"email": string,"full_name": string,"internal_notes"?: string | null,"linkedin_url"?: string | null,"location_full"?: string | null,"phone"?: string | null,"right_to_work"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"email"?: string,"full_name"?: string,"internal_notes"?: string | null,"linkedin_url"?: string | null,"location_full"?: string | null,"phone"?: string | null,"right_to_work"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_private_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: true
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_profiles": {
                  Row: {
                    "availability": Database["public"]['Enums']["availability"] | null,"candidate_id": string,"headline": string | null,"highlights": (string)[],"industries": (string)[],"is_sample": boolean,"job_title": string | null,"location_region": string | null,"notice_period": string | null,"published": boolean,"published_at": string | null,"ref": string,"salary_currency": string,"salary_max": number | null,"salary_min": number | null,"search_vector": unknown,"seniority": string | null,"skills": (string)[],"summary": string | null,"updated_at": string,"work_modes": (Database["public"]['Enums']["work_mode"])[],"years_experience": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: Database["public"]['Enums']["availability"] | null,"candidate_id": string,"headline"?: string | null,"highlights"?: (string)[],"industries"?: (string)[],"is_sample"?: boolean,"job_title"?: string | null,"location_region"?: string | null,"notice_period"?: string | null,"published"?: boolean,"published_at"?: string | null,"ref": string,"salary_currency"?: string,"salary_max"?: number | null,"salary_min"?: number | null,"search_vector"?: never,"seniority"?: string | null,"skills"?: (string)[],"summary"?: string | null,"updated_at"?: string,"work_modes"?: (Database["public"]['Enums']["work_mode"])[],"years_experience"?: number | null
                  }
                  Update: {
                    "availability"?: Database["public"]['Enums']["availability"] | null,"candidate_id"?: string,"headline"?: string | null,"highlights"?: (string)[],"industries"?: (string)[],"is_sample"?: boolean,"job_title"?: string | null,"location_region"?: string | null,"notice_period"?: string | null,"published"?: boolean,"published_at"?: string | null,"ref"?: string,"salary_currency"?: string,"salary_max"?: number | null,"salary_min"?: number | null,"search_vector"?: never,"seniority"?: string | null,"skills"?: (string)[],"summary"?: string | null,"updated_at"?: string,"work_modes"?: (Database["public"]['Enums']["work_mode"])[],"years_experience"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_profiles_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: true
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"candidates": {
                  Row: {
                    "archived_at": string | null,"assigned_admin_id": string | null,"created_at": string,"id": string,"is_sample": boolean,"pipeline_status": Database["public"]['Enums']["processing_status"],"profile_status": Database["public"]['Enums']["profile_status"],"published_at": string | null,"ref": string,"reviewed_at": string | null,"reviewed_by": string | null,"source": string,"submission_ref": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"assigned_admin_id"?: string | null,"created_at"?: string,"id"?: string,"is_sample"?: boolean,"pipeline_status"?: Database["public"]['Enums']["processing_status"],"profile_status"?: Database["public"]['Enums']["profile_status"],"published_at"?: string | null,"ref"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source"?: string,"submission_ref"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"assigned_admin_id"?: string | null,"created_at"?: string,"id"?: string,"is_sample"?: boolean,"pipeline_status"?: Database["public"]['Enums']["processing_status"],"profile_status"?: Database["public"]['Enums']["profile_status"],"published_at"?: string | null,"ref"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source"?: string,"submission_ref"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidates_assigned_admin_id_fkey"
      columns: ["assigned_admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidates_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cms_sections": {
                  Row: {
                    "draft_content": NonNullable<Json>,"has_unpublished_changes": boolean,"id": string,"page": string,"published_at": string | null,"published_by": string | null,"published_content": Json | null,"section_key": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "draft_content"?: NonNullable<Json>,"has_unpublished_changes"?: boolean,"id"?: string,"page": string,"published_at"?: string | null,"published_by"?: string | null,"published_content"?: Json | null,"section_key": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "draft_content"?: NonNullable<Json>,"has_unpublished_changes"?: boolean,"id"?: string,"page"?: string,"published_at"?: string | null,"published_by"?: string | null,"published_content"?: Json | null,"section_key"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cms_sections_published_by_fkey"
      columns: ["published_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cms_sections_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"consent_records": {
                  Row: {
                    "candidate_id": string,"consent_text": string,"consent_type": string,"created_at": string,"granted": boolean,"id": string,"ip_hash": string | null,"policy_version": string,"recorded_by": string | null,"source": string,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"consent_text": string,"consent_type": string,"created_at"?: string,"granted": boolean,"id"?: string,"ip_hash"?: string | null,"policy_version": string,"recorded_by"?: string | null,"source"?: string,"user_agent"?: string | null
                  }
                  Update: {
                    "candidate_id"?: string,"consent_text"?: string,"consent_type"?: string,"created_at"?: string,"granted"?: boolean,"id"?: string,"ip_hash"?: string | null,"policy_version"?: string,"recorded_by"?: string | null,"source"?: string,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "consent_records_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consent_records_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_messages": {
                  Row: {
                    "company": string | null,"created_at": string,"email": string,"enquiry_type": string | null,"id": string,"ip_hash": string | null,"message": string,"name": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company"?: string | null,"created_at"?: string,"email": string,"enquiry_type"?: string | null,"id"?: string,"ip_hash"?: string | null,"message": string,"name": string,"status"?: string
                  }
                  Update: {
                    "company"?: string | null,"created_at"?: string,"email"?: string,"enquiry_type"?: string | null,"id"?: string,"ip_hash"?: string | null,"message"?: string,"name"?: string,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cv_processing_jobs": {
                  Row: {
                    "attempts": number,"candidate_id": string,"completed_at": string | null,"created_at": string,"created_by": string | null,"custom_instructions": string | null,"document_id": string,"id": string,"last_error": string | null,"locked_at": string | null,"max_attempts": number,"run_after": string,"started_at": string | null,"status": Database["public"]['Enums']["processing_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"candidate_id": string,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"custom_instructions"?: string | null,"document_id": string,"id"?: string,"last_error"?: string | null,"locked_at"?: string | null,"max_attempts"?: number,"run_after"?: string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["processing_status"],"updated_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"candidate_id"?: string,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"custom_instructions"?: string | null,"document_id"?: string,"id"?: string,"last_error"?: string | null,"locked_at"?: string | null,"max_attempts"?: number,"run_after"?: string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["processing_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cv_processing_jobs_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cv_processing_jobs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cv_processing_jobs_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "candidate_documents"
      referencedColumns: ["id"]
    }
                  ]
                },"email_log": {
                  Row: {
                    "created_at": string,"error": string | null,"id": string,"provider": string,"status": string,"subject": string,"template": string,"to_address": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"error"?: string | null,"id"?: string,"provider": string,"status": string,"subject": string,"template": string,"to_address": string
                  }
                  Update: {
                    "created_at"?: string,"error"?: string | null,"id"?: string,"provider"?: string,"status"?: string,"subject"?: string,"template"?: string,"to_address"?: string
                  }
                  Relationships: [
                    
                  ]
                },"employers": {
                  Row: {
                    "address_line": string | null,"approved_at": string | null,"approved_by": string | null,"city": string | null,"company_name": string,"company_number": string | null,"company_size": string | null,"country": string | null,"created_at": string,"description": string | null,"email_domain": string | null,"hiring_needs": string | null,"id": string,"industry": string | null,"status": Database["public"]['Enums']["employer_status"],"status_reason": string | null,"updated_at": string,"vat_number": string | null,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line"?: string | null,"approved_at"?: string | null,"approved_by"?: string | null,"city"?: string | null,"company_name": string,"company_number"?: string | null,"company_size"?: string | null,"country"?: string | null,"created_at"?: string,"description"?: string | null,"email_domain"?: string | null,"hiring_needs"?: string | null,"id"?: string,"industry"?: string | null,"status"?: Database["public"]['Enums']["employer_status"],"status_reason"?: string | null,"updated_at"?: string,"vat_number"?: string | null,"website"?: string | null
                  }
                  Update: {
                    "address_line"?: string | null,"approved_at"?: string | null,"approved_by"?: string | null,"city"?: string | null,"company_name"?: string,"company_number"?: string | null,"company_size"?: string | null,"country"?: string | null,"created_at"?: string,"description"?: string | null,"email_domain"?: string | null,"hiring_needs"?: string | null,"id"?: string,"industry"?: string | null,"status"?: Database["public"]['Enums']["employer_status"],"status_reason"?: string | null,"updated_at"?: string,"vat_number"?: string | null,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"enquiries": {
                  Row: {
                    "assigned_admin_id": string | null,"candidate_id": string,"closed_at": string | null,"contact_phone": string | null,"created_at": string,"created_by": string | null,"employer_id": string,"id": string,"ref": string,"requirement": string,"role_title": string,"salary_offer": string | null,"status": Database["public"]['Enums']["enquiry_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_admin_id"?: string | null,"candidate_id": string,"closed_at"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"created_by"?: string | null,"employer_id": string,"id"?: string,"ref"?: string,"requirement": string,"role_title": string,"salary_offer"?: string | null,"status"?: Database["public"]['Enums']["enquiry_status"],"updated_at"?: string
                  }
                  Update: {
                    "assigned_admin_id"?: string | null,"candidate_id"?: string,"closed_at"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"created_by"?: string | null,"employer_id"?: string,"id"?: string,"ref"?: string,"requirement"?: string,"role_title"?: string,"salary_offer"?: string | null,"status"?: Database["public"]['Enums']["enquiry_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "enquiries_assigned_admin_id_fkey"
      columns: ["assigned_admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enquiries_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enquiries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enquiries_employer_id_fkey"
      columns: ["employer_id"]
isOneToOne: false
      referencedRelation: "employers"
      referencedColumns: ["id"]
    }
                  ]
                },"enquiry_events": {
                  Row: {
                    "author_id": string | null,"body": string | null,"created_at": string,"enquiry_id": string,"from_status": Database["public"]['Enums']["enquiry_status"] | null,"id": string,"to_status": Database["public"]['Enums']["enquiry_status"] | null,"type": Database["public"]['Enums']["enquiry_event_type"],"visibility": Database["public"]['Enums']["event_visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body"?: string | null,"created_at"?: string,"enquiry_id": string,"from_status"?: Database["public"]['Enums']["enquiry_status"] | null,"id"?: string,"to_status"?: Database["public"]['Enums']["enquiry_status"] | null,"type": Database["public"]['Enums']["enquiry_event_type"],"visibility"?: Database["public"]['Enums']["event_visibility"]
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string | null,"created_at"?: string,"enquiry_id"?: string,"from_status"?: Database["public"]['Enums']["enquiry_status"] | null,"id"?: string,"to_status"?: Database["public"]['Enums']["enquiry_status"] | null,"type"?: Database["public"]['Enums']["enquiry_event_type"],"visibility"?: Database["public"]['Enums']["event_visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "enquiry_events_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enquiry_events_enquiry_id_fkey"
      columns: ["enquiry_id"]
isOneToOne: false
      referencedRelation: "enquiries"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"link": string | null,"read_at": string | null,"recipient_id": string | null,"title": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"link"?: string | null,"read_at"?: string | null,"recipient_id"?: string | null,"title": string,"type": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"link"?: string | null,"read_at"?: string | null,"recipient_id"?: string | null,"title"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string,"employer_id": string | null,"employer_role": string | null,"full_name": string | null,"id": string,"job_title": string | null,"last_seen_at": string | null,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"status": Database["public"]['Enums']["account_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"employer_id"?: string | null,"employer_role"?: string | null,"full_name"?: string | null,"id": string,"job_title"?: string | null,"last_seen_at"?: string | null,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"status"?: Database["public"]['Enums']["account_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"employer_id"?: string | null,"employer_role"?: string | null,"full_name"?: string | null,"id"?: string,"job_title"?: string | null,"last_seen_at"?: string | null,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"status"?: Database["public"]['Enums']["account_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_employer_id_fkey"
      columns: ["employer_id"]
isOneToOne: false
      referencedRelation: "employers"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"role_permissions": {
                  Row: {
                    "permission": string,"role": Database["public"]['Enums']["user_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "permission": string,"role": Database["public"]['Enums']["user_role"]
                  }
                  Update: {
                    "permission"?: string,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Relationships: [
                    
                  ]
                },"shortlists": {
                  Row: {
                    "candidate_id": string,"created_at": string,"created_by": string | null,"employer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"created_by"?: string | null,"employer_id": string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"created_by"?: string | null,"employer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shortlists_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shortlists_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shortlists_employer_id_fkey"
      columns: ["employer_id"]
isOneToOne: false
      referencedRelation: "employers"
      referencedColumns: ["id"]
    }
                  ]
                },"site_settings": {
                  Row: {
                    "is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "site_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"testimonials": {
                  Row: {
                    "author_role": string,"created_at": string,"id": string,"is_published": boolean,"is_sample": boolean,"organisation_descriptor": string | null,"quote": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "author_role": string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"is_sample"?: boolean,"organisation_descriptor"?: string | null,"quote": string,"sort_order"?: number
                  }
                  Update: {
                    "author_role"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"is_sample"?: boolean,"organisation_descriptor"?: string | null,"quote"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_dashboard_metrics":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_record_identity_consent":
{ Args: { "p_enquiry_id": string,"p_note": string }; Returns: undefined
                           },
"admin_save_candidate_profile":
{ Args: { "p": Json,"p_candidate_id": string }; Returns: undefined
                           },
"admin_set_employer_status":
{ Args: { "p_employer_id": string,"p_reason"?: string,"p_status": Database["public"]['Enums']["employer_status"] }; Returns: undefined
                           },
"admin_set_user_access":
{ Args: { "p_role": Database["public"]['Enums']["user_role"],"p_status": Database["public"]['Enums']["account_status"],"p_user_id": string }; Returns: undefined
                           },
"admin_update_enquiry":
{ Args: { "p_assigned_admin_id"?: string,"p_enquiry_id": string,"p_message"?: string,"p_status"?: Database["public"]['Enums']["enquiry_status"],"p_unassign"?: boolean,"p_visibility"?: Database["public"]['Enums']["event_visibility"] }; Returns: undefined
                           },
"admin_update_setting":
{ Args: { "p_key": string,"p_value": Json }; Returns: undefined
                           },
"approve_candidate_review":
{ Args: { "p_candidate_id": string }; Returns: undefined
                           },
"assign_candidate":
{ Args: { "p_admin_id": string,"p_candidate_id": string }; Returns: undefined
                           },
"candidate_facets":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"check_rate_limit":
{ Args: { "p_key": string,"p_limit": number,"p_window_seconds": number }; Returns: boolean
                           },
"claim_cv_job":
{ Args: Record<PropertyKey, never>; Returns: {
              "attempts": number,
"candidate_id": string,
"completed_at": string | null,
"created_at": string,
"created_by": string | null,
"custom_instructions": string | null,
"document_id": string,
"id": string,
"last_error": string | null,
"locked_at": string | null,
"max_attempts": number,
"run_after": string,
"started_at": string | null,
"status": Database["public"]['Enums']["processing_status"],
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "cv_processing_jobs"
        isOneToOne: false
        isSetofReturn: true
      } },
"cms_discard_draft":
{ Args: { "p_page": string,"p_section": string }; Returns: undefined
                           },
"cms_publish_section":
{ Args: { "p_page": string,"p_section": string }; Returns: undefined
                           },
"cms_save_draft":
{ Args: { "p_content": Json,"p_page": string,"p_section": string }; Returns: undefined
                           },
"complete_cv_job":
{ Args: { "p_job_id": string,"p_result": Json }; Returns: undefined
                           },
"create_candidate_submission":
{ Args: { "p": Json }; Returns: Json
                           },
"create_enquiry":
{ Args: { "p_candidate_ref": string,"p_contact_phone"?: string,"p_requirement": string,"p_role_title": string,"p_salary_offer"?: string }; Returns: Json
                           },
"current_employer_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_role_name":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"employer_post_enquiry_message":
{ Args: { "p_body": string,"p_enquiry_id": string }; Returns: undefined
                           },
"employer_withdraw_enquiry":
{ Args: { "p_enquiry_id": string }; Returns: undefined
                           },
"fail_cv_job":
{ Args: { "p_error": string,"p_job_id": string,"p_retryable"?: boolean }; Returns: string
                           },
"get_public_settings":
{ Args: Record<PropertyKey, never>; Returns: {
              "key": string,"value": Json
            }[]
                           },
"get_public_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_published_cms":
{ Args: Record<PropertyKey, never>; Returns: {
              "content": Json,"page": string,"section_key": string
            }[]
                           },
"get_published_testimonials":
{ Args: Record<PropertyKey, never>; Returns: {
              "author_role": string,"id": string,"is_sample": boolean,"organisation_descriptor": string,"quote": string
            }[]
                           },
"has_permission":
{ Args: { "p_permission": string }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_approved_employer":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_super_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"request_cv_reprocess":
{ Args: { "p_candidate_id": string,"p_instructions"?: string }; Returns: string
                           },
"search_candidate_profiles":
{ Args: { "p_availability"?: (Database["public"]['Enums']["availability"])[],"p_exp_max"?: number,"p_exp_min"?: number,"p_industries"?: (string)[],"p_limit"?: number,"p_location"?: string,"p_offset"?: number,"p_query"?: string,"p_salary_max"?: number,"p_salary_min"?: number,"p_skills"?: (string)[],"p_sort"?: string,"p_title"?: string,"p_work_modes"?: (Database["public"]['Enums']["work_mode"])[] }; Returns: {
              "availability": Database["public"]['Enums']["availability"],"candidate_id": string,"headline": string,"highlights": (string)[],"industries": (string)[],"is_sample": boolean,"job_title": string,"location_region": string,"notice_period": string,"published_at": string,"ref": string,"salary_currency": string,"salary_max": number,"salary_min": number,"seniority": string,"skills": (string)[],"summary": string,"total_count": number,"work_modes": (Database["public"]['Enums']["work_mode"])[],"years_experience": number
            }[]
                           },
"set_candidate_archived":
{ Args: { "p_archived": boolean,"p_candidate_id": string }; Returns: undefined
                           },
"set_candidate_publication":
{ Args: { "p_candidate_id": string,"p_publish": boolean }; Returns: undefined
                           },
"write_audit":
{ Args: { "p_action": string,"p_entity_id": string,"p_entity_type": string,"p_metadata"?: Json }; Returns: undefined
                           }
          }
          Enums: {
            "account_status": "active"|"suspended","availability": "immediate"|"two_weeks"|"one_month"|"three_months"|"not_looking","employer_status": "pending"|"approved"|"suspended"|"rejected","enquiry_event_type": "created"|"status_change"|"message"|"internal_note"|"assignment"|"introduction","enquiry_status": "new"|"under_review"|"candidate_contacted"|"candidate_consented"|"introduced"|"closed_placed"|"closed_declined"|"withdrawn","event_visibility": "internal"|"employer","processing_status": "uploaded"|"queued"|"processing"|"awaiting_review"|"approved"|"failed","profile_status": "draft"|"published"|"unpublished"|"archived","user_role": "super_admin"|"recruitment_admin"|"employer","work_mode": "remote"|"hybrid"|"onsite"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "account_status": ["active", "suspended"],"availability": ["immediate", "two_weeks", "one_month", "three_months", "not_looking"],"employer_status": ["pending", "approved", "suspended", "rejected"],"enquiry_event_type": ["created", "status_change", "message", "internal_note", "assignment", "introduction"],"enquiry_status": ["new", "under_review", "candidate_contacted", "candidate_consented", "introduced", "closed_placed", "closed_declined", "withdrawn"],"event_visibility": ["internal", "employer"],"processing_status": ["uploaded", "queued", "processing", "awaiting_review", "approved", "failed"],"profile_status": ["draft", "published", "unpublished", "archived"],"user_role": ["super_admin", "recruitment_admin", "employer"],"work_mode": ["remote", "hybrid", "onsite"]
          }
        }
} as const
