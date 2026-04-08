CREATE TYPE "agent_role" AS ENUM('user', 'admin', 'superadmin');--> statement-breakpoint
CREATE TYPE "cred_request_priority" AS ENUM('STAT', 'HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "cred_request_reason" AS ENUM('Remove from Facility', 'Add to Facility', 'Obtain License for Provider');--> statement-breakpoint
CREATE TYPE "cred_request_status" AS ENUM('Received', 'In Progress', 'Completed');--> statement-breakpoint
CREATE TYPE "cred_request_type" AS ENUM('facility', 'license');--> statement-breakpoint
CREATE TYPE "status" AS ENUM('Active', 'Inactive', 'In Progress');--> statement-breakpoint
CREATE TYPE "follow_up_status" AS ENUM('Completed', 'Pending Response', 'Not Completed');--> statement-breakpoint
CREATE TYPE "form_size" AS ENUM('small', 'medium', 'large', 'x-large', 'online');--> statement-breakpoint
CREATE TYPE "initial_or_renewal" AS ENUM('initial', 'renewal');--> statement-breakpoint
CREATE TYPE "privilege_tier" AS ENUM('Inactive', 'Full', 'Temp', 'In Progress');--> statement-breakpoint
CREATE TYPE "psv_status" AS ENUM('Not Started', 'Requested', 'Received', 'Inactive Rad', 'Closed', 'Not Affiliated', 'Old Request', 'Hold');--> statement-breakpoint
CREATE TYPE "psv_type" AS ENUM('Education', 'Work', 'Hospital', 'Peer', 'COI/Loss Run', 'Claims Document', 'Board Actions', 'Locums/Work', 'Vesta Practice Location', 'Vesta Hospital', 'Work COI', 'OPPE');--> statement-breakpoint
CREATE TYPE "facility_or_provider" AS ENUM('facility', 'provider');--> statement-breakpoint
CREATE TYPE "team_location" AS ENUM('IN', 'US');--> statement-breakpoint
CREATE TYPE "workflow_type" AS ENUM('pfc', 'state_licenses', 'prelive_pipeline', 'provider_vesta_privileges');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"team" "team_location",
	"team_num" bigint,
	"role" "agent_role" DEFAULT 'user'::"agent_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "agents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"table_name" text NOT NULL,
	"record_id" uuid,
	"action" text NOT NULL,
	"actor_id" uuid,
	"actor_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"old_data" jsonb DEFAULT '{}',
	"new_data" jsonb DEFAULT '{}'
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY,
	"email" text,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "comm_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"related_type" "facility_or_provider" NOT NULL,
	"related_id" uuid NOT NULL,
	"subject" text,
	"comm_type" text,
	"notes" text,
	"created_by" uuid,
	"last_updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "comm_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "credentialing_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_type" "cred_request_type" NOT NULL,
	"provider_id" uuid,
	"related_id" uuid NOT NULL,
	"related_name" text,
	"requester_name" text,
	"reason_for_request" "cred_request_reason" NOT NULL,
	"priority_level" "cred_request_priority" NOT NULL,
	"requested_due_date" date,
	"additional_notes" text,
	"status" "cred_request_status" DEFAULT 'Received'::"cred_request_status" NOT NULL,
	"agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "credentialing_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text,
	"state" text,
	"proxy" text,
	"status" "status",
	"yearly_volume" bigint,
	"modalities" text[],
	"tat_sla" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"email" text,
	"address" text
);
--> statement-breakpoint
ALTER TABLE "facilities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "facility_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"email" text,
	"phone" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "facility_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "facility_prelive_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facility_id" uuid,
	"priority" text,
	"medical_director_needed" boolean,
	"rso_needed" boolean,
	"lip_needed" boolean,
	"go_live_date" date,
	"board_meeting_date" date,
	"credentialing_due_date" date,
	"temps_possible" boolean,
	"roles_needed" jsonb,
	"payor_enrollment_required" boolean,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "facility_prelive_info" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "incident_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workflow_id" uuid NOT NULL,
	"who_reported" uuid NOT NULL,
	"staff_responsible" jsonb,
	"escalated_to" uuid NOT NULL,
	"date_identified" date NOT NULL,
	"resolution_date" date,
	"subcategory" text NOT NULL,
	"root_cause_identified" boolean,
	"root_cause_description" text,
	"critical" boolean NOT NULL,
	"incident_description" text,
	"immediate_resolution_attempt" text,
	"final_resolution" text,
	"preventative_action_taken" text,
	"follow_up_required" boolean,
	"follow_up_date" date,
	"final_notes" text,
	"discussed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "incident_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "missing_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"related_type" "facility_or_provider",
	"related_id" uuid,
	"information" text,
	"roadblocks" text,
	"next_follow_up_us" date,
	"last_follow_up_us" date,
	"next_follow_up_in" date,
	"last_follow_up_in" date,
	"follow_up_status" "follow_up_status",
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "missing_docs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pending_psv" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"provider_id" uuid NOT NULL,
	"agent_assigned" uuid NOT NULL,
	"supporting_agents" jsonb,
	"psv_status" "psv_status" NOT NULL,
	"psv_type" "psv_type" NOT NULL,
	"name" text NOT NULL,
	"date_requested" date NOT NULL,
	"last_follow_up" date,
	"next_follow_up" date,
	"date_received" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pending_psv" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "provider_facility_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"provider_id" uuid,
	"facility_id" uuid,
	"facility_type" text,
	"privileges" text,
	"decision" text,
	"notes" text,
	"priority" text,
	"form_size" "form_size",
	"application_required" boolean,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "provider_facility_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "provider_state_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"provider_id" uuid,
	"state" text,
	"status" text,
	"path" text,
	"priority" text,
	"notes" text,
	"initial_or_renewal" "initial_or_renewal",
	"expires_at" date,
	"starts_at" date,
	"email_subject_or_ticket_num" text,
	"number" text,
	"requested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "provider_state_licenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "provider_vesta_privileges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"provider_id" uuid,
	"privilege_tier" "privilege_tier",
	"current_priv_init_date" date,
	"current_priv_exp_date" date,
	"term_date" date,
	"term_reason" text,
	"past_privileges" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "provider_vesta_privileges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"first_name" text,
	"last_name" text,
	"middle_name" text,
	"degree" text,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "providers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workflow_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"agent_assigned" uuid,
	"supporting_agents" jsonb,
	"workflow_type" "workflow_type" NOT NULL,
	"related_id" uuid NOT NULL,
	"phase_number" integer,
	"status" text DEFAULT 'Pending',
	"phase_name" text NOT NULL,
	"start_date" date,
	"notes" text,
	"due_date" date,
	"completed_at" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "workflow_phases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_agents_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "agents"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "comm_logs" ADD CONSTRAINT "comm_logs_created_by_agents_id_fkey" FOREIGN KEY ("created_by") REFERENCES "agents"("id");--> statement-breakpoint
ALTER TABLE "comm_logs" ADD CONSTRAINT "comm_logs_last_updated_by_agents_id_fkey" FOREIGN KEY ("last_updated_by") REFERENCES "agents"("id");--> statement-breakpoint
ALTER TABLE "credentialing_requests" ADD CONSTRAINT "credentialing_requests_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id");--> statement-breakpoint
ALTER TABLE "credentialing_requests" ADD CONSTRAINT "credentialing_requests_agent_id_agents_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id");--> statement-breakpoint
ALTER TABLE "facility_contacts" ADD CONSTRAINT "facility_contacts_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id");--> statement-breakpoint
ALTER TABLE "facility_prelive_info" ADD CONSTRAINT "facility_prelive_info_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id");--> statement-breakpoint
ALTER TABLE "incident_logs" ADD CONSTRAINT "incident_logs_workflow_id_workflow_phases_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_phases"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "incident_logs" ADD CONSTRAINT "incident_logs_who_reported_agents_id_fkey" FOREIGN KEY ("who_reported") REFERENCES "agents"("id");--> statement-breakpoint
ALTER TABLE "incident_logs" ADD CONSTRAINT "incident_logs_escalated_to_agents_id_fkey" FOREIGN KEY ("escalated_to") REFERENCES "agents"("id");--> statement-breakpoint
ALTER TABLE "pending_psv" ADD CONSTRAINT "pending_psv_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id");--> statement-breakpoint
ALTER TABLE "pending_psv" ADD CONSTRAINT "pending_psv_agent_assigned_agents_id_fkey" FOREIGN KEY ("agent_assigned") REFERENCES "agents"("id");--> statement-breakpoint
ALTER TABLE "provider_facility_credentials" ADD CONSTRAINT "provider_facility_credentials_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id");--> statement-breakpoint
ALTER TABLE "provider_facility_credentials" ADD CONSTRAINT "provider_facility_credentials_facility_id_facilities_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id");--> statement-breakpoint
ALTER TABLE "provider_state_licenses" ADD CONSTRAINT "provider_state_licenses_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id");--> statement-breakpoint
ALTER TABLE "provider_vesta_privileges" ADD CONSTRAINT "provider_vesta_privileges_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id");--> statement-breakpoint
ALTER TABLE "workflow_phases" ADD CONSTRAINT "workflow_phases_agent_assigned_agents_id_fkey" FOREIGN KEY ("agent_assigned") REFERENCES "agents"("id");--> statement-breakpoint
CREATE POLICY "agents_authenticated_all" ON "agents" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "audit_log_authenticated_all" ON "audit_log" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "comm_logs_admin_all" ON "comm_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (
  select 1
  from public.agents a
  where a.user_id = ((auth.jwt() ->> 'sub')::uuid)
    and a.role in ('admin', 'superadmin')
));--> statement-breakpoint
CREATE POLICY "credentialing_requests_authenticated_all" ON "credentialing_requests" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "facilities_authenticated_all" ON "facilities" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "facility_contacts_authenticated_all" ON "facility_contacts" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "incident_logs_authenticated_all" ON "incident_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "missing_docs_authenticated_all" ON "missing_docs" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "provider_facility_credentials_authenticated_all" ON "provider_facility_credentials" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "facility_preline_info_authenticated_all" ON "facility_prelive_info" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "provider_vesta_privileges_authenticated_all" ON "provider_vesta_privileges" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "providers_authenticated_all" ON "providers" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "pendingPSV_authenticated_all" ON "pending_psv" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "provider_state_licenses_authenticated_all" ON "provider_state_licenses" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "workflow_phases_authenticated_all" ON "workflow_phases" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);