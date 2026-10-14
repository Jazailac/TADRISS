export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      announcement_reads: {
        Row: {
          announcement_id: string;
          institution_id: string;
          read_at: string;
          user_id: string;
        };
        Insert: {
          announcement_id: string;
          institution_id: string;
          read_at?: string;
          user_id?: string;
        };
        Update: {
          announcement_id?: string;
          institution_id?: string;
          read_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'announcement_reads_announcement_id_institution_id_fkey';
            columns: ['announcement_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'announcements';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'announcement_reads_institution_id_user_id_fkey';
            columns: ['institution_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
        ];
      };
      announcements: {
        Row: {
          audience: string;
          author_id: string;
          body: string;
          class_id: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          institution_id: string;
          pinned: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          audience: string;
          author_id?: string;
          body: string;
          class_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          institution_id: string;
          pinned?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          audience?: string;
          author_id?: string;
          body?: string;
          class_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          institution_id?: string;
          pinned?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'announcements_class_id_institution_id_fkey';
            columns: ['class_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'announcements_institution_id_author_id_fkey';
            columns: ['institution_id', 'author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
        ];
      };
      attendance_records: {
        Row: {
          created_at: string;
          id: string;
          institution_id: string;
          note: string | null;
          session_id: string;
          status: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          institution_id: string;
          note?: string | null;
          session_id: string;
          status: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          institution_id?: string;
          note?: string | null;
          session_id?: string;
          status?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_records_institution_id_student_id_fkey';
            columns: ['institution_id', 'student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
          {
            foreignKeyName: 'attendance_records_session_id_institution_id_fkey';
            columns: ['session_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'attendance_sessions';
            referencedColumns: ['id', 'institution_id'];
          },
        ];
      };
      attendance_sessions: {
        Row: {
          class_id: string;
          created_at: string;
          ends_min: number;
          id: string;
          institution_id: string;
          session_date: string;
          slot_id: string | null;
          starts_min: number;
          subject_id: string;
          taken_by: string;
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          ends_min: number;
          id?: string;
          institution_id: string;
          session_date: string;
          slot_id?: string | null;
          starts_min: number;
          subject_id: string;
          taken_by?: string;
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          ends_min?: number;
          id?: string;
          institution_id?: string;
          session_date?: string;
          slot_id?: string | null;
          starts_min?: number;
          subject_id?: string;
          taken_by?: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_sessions_class_id_institution_id_fkey';
            columns: ['class_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'attendance_sessions_institution_id_teacher_id_fkey';
            columns: ['institution_id', 'teacher_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
          {
            foreignKeyName: 'attendance_sessions_slot_id_institution_id_fkey';
            columns: ['slot_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'timetable_slots';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'attendance_sessions_subject_id_institution_id_fkey';
            columns: ['subject_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id', 'institution_id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: NonNullable<Json>;
          entity: string;
          entity_id: string | null;
          id: string;
          institution_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          entity: string;
          entity_id?: string | null;
          id?: string;
          institution_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          institution_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
        ];
      };
      class_teachers: {
        Row: {
          class_id: string;
          created_at: string;
          institution_id: string;
          teacher_id: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          institution_id: string;
          teacher_id: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          institution_id?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_teachers_class_id_institution_id_fkey';
            columns: ['class_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'class_teachers_institution_id_teacher_id_fkey';
            columns: ['institution_id', 'teacher_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
        ];
      };
      classes: {
        Row: {
          capacity: number | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          institution_id: string;
          level: string | null;
          name: string;
          school_year: string;
          updated_at: string;
        };
        Insert: {
          capacity?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          institution_id: string;
          level?: string | null;
          name: string;
          school_year: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          institution_id?: string;
          level?: string | null;
          name?: string;
          school_year?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'classes_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
        ];
      };
      document_counters: {
        Row: {
          institution_id: string;
          kind: string;
          last_number: number;
          year: number;
        };
        Insert: {
          institution_id: string;
          kind: string;
          last_number?: number;
          year: number;
        };
        Update: {
          institution_id?: string;
          kind?: string;
          last_number?: number;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'document_counters_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          audience: string;
          class_id: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          file_name: string;
          id: string;
          institution_id: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          title: string;
          updated_at: string;
          uploader_id: string;
        };
        Insert: {
          audience: string;
          class_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          file_name: string;
          id?: string;
          institution_id: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          title: string;
          updated_at?: string;
          uploader_id?: string;
        };
        Update: {
          audience?: string;
          class_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          file_name?: string;
          id?: string;
          institution_id?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          title?: string;
          updated_at?: string;
          uploader_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_class_id_institution_id_fkey';
            columns: ['class_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'documents_institution_id_uploader_id_fkey';
            columns: ['institution_id', 'uploader_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
        ];
      };
      enrolments: {
        Row: {
          class_id: string;
          created_at: string;
          enrolled_on: string;
          id: string;
          institution_id: string;
          school_year: string;
          status: string;
          student_id: string;
          updated_at: string;
          withdrawn_on: string | null;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          enrolled_on?: string;
          id?: string;
          institution_id: string;
          school_year: string;
          status?: string;
          student_id: string;
          updated_at?: string;
          withdrawn_on?: string | null;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          enrolled_on?: string;
          id?: string;
          institution_id?: string;
          school_year?: string;
          status?: string;
          student_id?: string;
          updated_at?: string;
          withdrawn_on?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'enrolments_class_id_institution_id_fkey';
            columns: ['class_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'enrolments_class_id_school_year_fkey';
            columns: ['class_id', 'school_year'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id', 'school_year'];
          },
          {
            foreignKeyName: 'enrolments_institution_id_student_id_fkey';
            columns: ['institution_id', 'student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
        ];
      };
      exams: {
        Row: {
          class_id: string;
          coefficient: number;
          created_at: string;
          deleted_at: string | null;
          exam_date: string;
          id: string;
          institution_id: string;
          max_score: number;
          published_at: string | null;
          subject_id: string;
          teacher_id: string;
          term: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          class_id: string;
          coefficient?: number;
          created_at?: string;
          deleted_at?: string | null;
          exam_date: string;
          id?: string;
          institution_id: string;
          max_score?: number;
          published_at?: string | null;
          subject_id: string;
          teacher_id?: string;
          term?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string;
          coefficient?: number;
          created_at?: string;
          deleted_at?: string | null;
          exam_date?: string;
          id?: string;
          institution_id?: string;
          max_score?: number;
          published_at?: string | null;
          subject_id?: string;
          teacher_id?: string;
          term?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exams_class_id_institution_id_fkey';
            columns: ['class_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'exams_class_id_teacher_id_fkey';
            columns: ['class_id', 'teacher_id'];
            isOneToOne: false;
            referencedRelation: 'class_teachers';
            referencedColumns: ['class_id', 'teacher_id'];
          },
          {
            foreignKeyName: 'exams_subject_id_institution_id_fkey';
            columns: ['subject_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id', 'institution_id'];
          },
        ];
      };
      fee_plans: {
        Row: {
          amount_centimes: number;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          institution_id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          amount_centimes: number;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          institution_id: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          amount_centimes?: number;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          institution_id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fee_plans_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
        ];
      };
      grades: {
        Row: {
          absent: boolean;
          created_at: string;
          exam_id: string;
          id: string;
          institution_id: string;
          remark: string | null;
          score: number | null;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          absent?: boolean;
          created_at?: string;
          exam_id: string;
          id?: string;
          institution_id: string;
          remark?: string | null;
          score?: number | null;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          absent?: boolean;
          created_at?: string;
          exam_id?: string;
          id?: string;
          institution_id?: string;
          remark?: string | null;
          score?: number | null;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'grades_exam_id_institution_id_fkey';
            columns: ['exam_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'exams';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'grades_institution_id_student_id_fkey';
            columns: ['institution_id', 'student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
        ];
      };
      homework: {
        Row: {
          class_id: string;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          due_date: string;
          id: string;
          institution_id: string;
          subject_id: string;
          teacher_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          due_date: string;
          id?: string;
          institution_id: string;
          subject_id: string;
          teacher_id?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          due_date?: string;
          id?: string;
          institution_id?: string;
          subject_id?: string;
          teacher_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'homework_class_id_institution_id_fkey';
            columns: ['class_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'homework_class_id_teacher_id_fkey';
            columns: ['class_id', 'teacher_id'];
            isOneToOne: false;
            referencedRelation: 'class_teachers';
            referencedColumns: ['class_id', 'teacher_id'];
          },
          {
            foreignKeyName: 'homework_subject_id_institution_id_fkey';
            columns: ['subject_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id', 'institution_id'];
          },
        ];
      };
      homework_completions: {
        Row: {
          completed_at: string;
          homework_id: string;
          id: string;
          institution_id: string;
          student_id: string;
        };
        Insert: {
          completed_at?: string;
          homework_id: string;
          id?: string;
          institution_id: string;
          student_id?: string;
        };
        Update: {
          completed_at?: string;
          homework_id?: string;
          id?: string;
          institution_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'homework_completions_homework_id_institution_id_fkey';
            columns: ['homework_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'homework';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'homework_completions_institution_id_student_id_fkey';
            columns: ['institution_id', 'student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
        ];
      };
      institutions: {
        Row: {
          address: string | null;
          city: string | null;
          created_at: string;
          default_locale: string;
          deleted_at: string | null;
          id: string;
          name: string;
          phone: string | null;
          plan: string;
          slug: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          created_at?: string;
          default_locale?: string;
          deleted_at?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          plan?: string;
          slug: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          created_at?: string;
          default_locale?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          plan?: string;
          slug?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          first_name: string;
          id: string;
          institution_id: string;
          invited_by: string;
          last_name: string;
          revoked_at: string | null;
          role: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          first_name: string;
          id?: string;
          institution_id: string;
          invited_by?: string;
          last_name: string;
          revoked_at?: string | null;
          role: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          first_name?: string;
          id?: string;
          institution_id?: string;
          invited_by?: string;
          last_name?: string;
          revoked_at?: string | null;
          role?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      invoices: {
        Row: {
          amount_centimes: number;
          created_at: string;
          created_by: string | null;
          description: string;
          due_date: string;
          fee_plan_id: string | null;
          id: string;
          institution_id: string;
          issued_on: string;
          number: string;
          student_id: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
        };
        Insert: {
          amount_centimes: number;
          created_at?: string;
          created_by?: string | null;
          description: string;
          due_date: string;
          fee_plan_id?: string | null;
          id?: string;
          institution_id: string;
          issued_on?: string;
          number?: string;
          student_id: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Update: {
          amount_centimes?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          due_date?: string;
          fee_plan_id?: string | null;
          id?: string;
          institution_id?: string;
          issued_on?: string;
          number?: string;
          student_id?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_fee_plan_id_institution_id_fkey';
            columns: ['fee_plan_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'fee_plans';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'invoices_institution_id_student_id_fkey';
            columns: ['institution_id', 'student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          institution_id: string;
          read_at: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          institution_id: string;
          read_at?: string | null;
          recipient_id: string;
          sender_id?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          institution_id?: string;
          read_at?: string | null;
          recipient_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_institution_id_recipient_id_fkey';
            columns: ['institution_id', 'recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
          {
            foreignKeyName: 'messages_institution_id_sender_id_fkey';
            columns: ['institution_id', 'sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
        ];
      };
      module_access: {
        Row: {
          enabled: boolean;
          institution_id: string;
          module: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          enabled: boolean;
          institution_id: string;
          module: string;
          role: string;
          updated_at?: string;
        };
        Update: {
          enabled?: boolean;
          institution_id?: string;
          module?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'module_access_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount_centimes: number;
          created_at: string;
          created_by: string | null;
          id: string;
          institution_id: string;
          invoice_id: string;
          method: string;
          paid_on: string;
          receipt_number: string;
          reference: string | null;
          student_id: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
        };
        Insert: {
          amount_centimes: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id: string;
          invoice_id: string;
          method: string;
          paid_on: string;
          receipt_number?: string;
          reference?: string | null;
          student_id: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Update: {
          amount_centimes?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          institution_id?: string;
          invoice_id?: string;
          method?: string;
          paid_on?: string;
          receipt_number?: string;
          reference?: string | null;
          student_id?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_invoice_id_institution_id_fkey';
            columns: ['invoice_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'invoice_balances';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'payments_invoice_id_institution_id_fkey';
            columns: ['invoice_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'payments_invoice_id_student_id_fkey';
            columns: ['invoice_id', 'student_id'];
            isOneToOne: false;
            referencedRelation: 'invoice_balances';
            referencedColumns: ['id', 'student_id'];
          },
          {
            foreignKeyName: 'payments_invoice_id_student_id_fkey';
            columns: ['invoice_id', 'student_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id', 'student_id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          first_name: string;
          id: string;
          institution_id: string | null;
          is_active: boolean;
          last_name: string;
          locale: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          first_name: string;
          id: string;
          institution_id?: string | null;
          is_active?: boolean;
          last_name: string;
          locale?: string | null;
          role: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          first_name?: string;
          id?: string;
          institution_id?: string | null;
          is_active?: boolean;
          last_name?: string;
          locale?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
        ];
      };
      subjects: {
        Row: {
          color: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          institution_id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          institution_id: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          institution_id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subjects_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
        ];
      };
      timetable_slots: {
        Row: {
          class_id: string;
          created_at: string;
          ends_min: number;
          id: string;
          institution_id: string;
          room: string | null;
          starts_min: number;
          subject_id: string;
          teacher_id: string;
          updated_at: string;
          weekday: number;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          ends_min: number;
          id?: string;
          institution_id: string;
          room?: string | null;
          starts_min: number;
          subject_id: string;
          teacher_id: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          ends_min?: number;
          id?: string;
          institution_id?: string;
          room?: string | null;
          starts_min?: number;
          subject_id?: string;
          teacher_id?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'timetable_slots_class_id_institution_id_fkey';
            columns: ['class_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'timetable_slots_class_id_teacher_id_fkey';
            columns: ['class_id', 'teacher_id'];
            isOneToOne: false;
            referencedRelation: 'class_teachers';
            referencedColumns: ['class_id', 'teacher_id'];
          },
          {
            foreignKeyName: 'timetable_slots_subject_id_institution_id_fkey';
            columns: ['subject_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id', 'institution_id'];
          },
        ];
      };
    };
    Views: {
      invoice_balances: {
        Row: {
          amount_centimes: number | null;
          balance_centimes: number | null;
          created_at: string | null;
          description: string | null;
          due_date: string | null;
          fee_plan_id: string | null;
          id: string | null;
          institution_id: string | null;
          issued_on: string | null;
          number: string | null;
          paid_centimes: number | null;
          student_id: string | null;
          void_reason: string | null;
          voided_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_fee_plan_id_institution_id_fkey';
            columns: ['fee_plan_id', 'institution_id'];
            isOneToOne: false;
            referencedRelation: 'fee_plans';
            referencedColumns: ['id', 'institution_id'];
          },
          {
            foreignKeyName: 'invoices_institution_id_student_id_fkey';
            columns: ['institution_id', 'student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['institution_id', 'id'];
          },
        ];
      };
    };
    Functions: {
      announcement_reach: {
        Args: { p_ids: string[] };
        Returns: {
          announcement_id: string;
          audience_count: number;
          read_count: number;
        }[];
      };
      attendance_class_summary: {
        Args: { p_from: string; p_to: string };
        Returns: {
          absent: number;
          class_id: string;
          excused: number;
          late: number;
          present: number;
        }[];
      };
      attendance_day: {
        Args: { p_date: string };
        Returns: {
          absent: number;
          class_id: string;
          ends_min: number;
          excused: number;
          late: number;
          present: number;
          session_id: string;
          slot_id: string;
          starts_min: number;
          subject_id: string;
          teacher_id: string;
        }[];
      };
      conversations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          first_name: string;
          last_at: string;
          last_body: string;
          last_from_me: boolean;
          last_name: string;
          other_id: string;
          role: string;
          unread_count: number;
        }[];
      };
      enrol_students: { Args: { p_class_id: string; p_student_ids: string[] }; Returns: number };
      enrolable_students: {
        Args: { p_limit?: number; p_query?: string; p_school_year: string };
        Returns: {
          email: string;
          first_name: string;
          id: string;
          last_name: string;
        }[];
      };
      exam_summary: {
        Args: { p_class_id?: string };
        Returns: {
          absent: number;
          avg20: number;
          exam_id: string;
          graded: number;
          max20: number;
          min20: number;
        }[];
      };
      finance_summary: {
        Args: { p_today: string };
        Returns: {
          billed: number;
          collected: number;
          invoices: number;
          outstanding: number;
          overdue: number;
          overdue_invoices: number;
        }[];
      };
      generate_invoices: {
        Args: {
          p_class_id: string;
          p_description?: string;
          p_due_date: string;
          p_fee_plan_id: string;
        };
        Returns: number;
      };
      mark_announcements_read: { Args: { p_ids: string[] }; Returns: number };
      plan_usage: {
        Args: Record<PropertyKey, never>;
        Returns: {
          plan: string;
          students_limit: number;
          students_used: number;
          teachers_limit: number;
          teachers_used: number;
        }[];
      };
      platform_institutions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          admins: number;
          created_at: string;
          default_locale: string;
          id: string;
          name: string;
          plan: string;
          slug: string;
          students: number;
          suspended: boolean;
          teachers: number;
        }[];
      };
      record_payment: {
        Args: {
          p_amount_centimes: number;
          p_invoice_id: string;
          p_method: string;
          p_paid_on: string;
          p_reference?: string;
        };
        Returns: {
          payment_id: string;
          receipt_number: string;
        }[];
      };
      save_grades: { Args: { p_exam_id: string; p_grades: Json }; Returns: number };
      set_class_teachers: {
        Args: { p_class_id: string; p_teacher_ids: string[] };
        Returns: undefined;
      };
      set_module_access: {
        Args: { p_enabled: boolean; p_module: string; p_role: string };
        Returns: undefined;
      };
      submit_attendance: {
        Args: { p_date: string; p_records: Json; p_slot_id: string };
        Returns: string;
      };
      unread_counts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          announcements: number;
          messages: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
