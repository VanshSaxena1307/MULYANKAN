CREATE TABLE "academic_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"semester" varchar(50) NOT NULL,
	"academic_session" varchar(50) NOT NULL,
	"department" varchar(150) DEFAULT 'Department of Computer Science & Engineering' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid,
	"evaluation_stage" varchar(50) NOT NULL,
	"project_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" varchar(20) NOT NULL,
	"marked_by_teacher_id" uuid,
	"remarks" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_marks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid,
	"evaluation_stage" varchar(50) NOT NULL,
	"project_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"evaluated_by_teacher_id" uuid,
	"p1_novelty_score" numeric(5, 2),
	"p1_feasibility_score" numeric(5, 2),
	"p1_raw_total" numeric(5, 2),
	"p1_scaled_score" numeric(5, 2),
	"p2_literature_review" numeric(5, 2),
	"p2_methodology" numeric(5, 2),
	"p2_societal_ethics" numeric(5, 2),
	"p2_work_plan" numeric(5, 2),
	"p2_review_marks" numeric(5, 2),
	"e2_implementation" numeric(5, 2),
	"e2_troubleshooting" numeric(5, 2),
	"e2_contribution_teamwork" numeric(5, 2),
	"e2_ethics_compliance" numeric(5, 2),
	"e2_timeline_reporting" numeric(5, 2),
	"e2_total_marks" numeric(5, 2),
	"e3_objectives_quality" numeric(5, 2),
	"e3_testing_innovation" numeric(5, 2),
	"e3_report_documentation" numeric(5, 2),
	"e3_societal_impact" numeric(5, 2),
	"e3_viva_contribution" numeric(5, 2),
	"e3_total_marks" numeric(5, 2),
	"stage_total_marks" numeric(5, 2) NOT NULL,
	"remarks" text,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid,
	"stage" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"max_marks" numeric(5, 2) NOT NULL,
	"description" text,
	"is_locked" boolean DEFAULT false NOT NULL,
	"conducted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"is_team_leader" boolean DEFAULT false NOT NULL,
	"member_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar(50) NOT NULL,
	"title" text,
	"technology" varchar(200),
	"domain" varchar(200),
	"academic_year_id" uuid,
	"guide_teacher_id" uuid,
	"evaluator_teacher_id" uuid,
	"dprc_member1_teacher_id" uuid,
	"dprc_member2_teacher_id" uuid,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roll_number" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"department" varchar(150) DEFAULT 'Department of Computer Science & Engineering' NOT NULL,
	"academic_year_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"password_hash" varchar(255) NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"department" varchar(150) DEFAULT 'Department of Computer Science & Engineering' NOT NULL,
	"designation" varchar(100),
	"role" varchar(50) DEFAULT 'Teacher' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teachers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "evaluation_attendance" ADD CONSTRAINT "evaluation_attendance_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_attendance" ADD CONSTRAINT "evaluation_attendance_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_attendance" ADD CONSTRAINT "evaluation_attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_attendance" ADD CONSTRAINT "evaluation_attendance_marked_by_teacher_id_teachers_id_fk" FOREIGN KEY ("marked_by_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_marks" ADD CONSTRAINT "evaluation_marks_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_marks" ADD CONSTRAINT "evaluation_marks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_marks" ADD CONSTRAINT "evaluation_marks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_marks" ADD CONSTRAINT "evaluation_marks_evaluated_by_teacher_id_teachers_id_fk" FOREIGN KEY ("evaluated_by_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_guide_teacher_id_teachers_id_fk" FOREIGN KEY ("guide_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_evaluator_teacher_id_teachers_id_fk" FOREIGN KEY ("evaluator_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_dprc_member1_teacher_id_teachers_id_fk" FOREIGN KEY ("dprc_member1_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_dprc_member2_teacher_id_teachers_id_fk" FOREIGN KEY ("dprc_member2_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_academic_years_name" ON "academic_years" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_academic_years_session" ON "academic_years" USING btree ("academic_session");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_eval_attendance_unique" ON "evaluation_attendance" USING btree ("evaluation_stage","project_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_eval_attendance_project" ON "evaluation_attendance" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_eval_attendance_student" ON "evaluation_attendance" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_eval_attendance_stage" ON "evaluation_attendance" USING btree ("evaluation_stage");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_eval_marks_unique" ON "evaluation_marks" USING btree ("evaluation_stage","project_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_eval_marks_project" ON "evaluation_marks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_eval_marks_student" ON "evaluation_marks" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_eval_marks_stage" ON "evaluation_marks" USING btree ("evaluation_stage");--> statement-breakpoint
CREATE INDEX "idx_eval_marks_evaluator" ON "evaluation_marks" USING btree ("evaluated_by_teacher_id");--> statement-breakpoint
CREATE INDEX "idx_evaluations_academic_year" ON "evaluations" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "idx_evaluations_stage" ON "evaluations" USING btree ("stage");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_project_members_unique" ON "project_members" USING btree ("project_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_project_members_project" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_project_members_student" ON "project_members" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_projects_code" ON "projects" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_projects_guide" ON "projects" USING btree ("guide_teacher_id");--> statement-breakpoint
CREATE INDEX "idx_projects_evaluator" ON "projects" USING btree ("evaluator_teacher_id");--> statement-breakpoint
CREATE INDEX "idx_projects_academic_year" ON "projects" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "idx_students_roll_number" ON "students" USING btree ("roll_number");--> statement-breakpoint
CREATE INDEX "idx_students_academic_year" ON "students" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "idx_teachers_user_id" ON "teachers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_teachers_name" ON "teachers" USING btree ("name");