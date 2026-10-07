export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
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
      institutions: {
        Row: {
          created_at: string;
          default_locale: string;
          deleted_at: string | null;
          id: string;
          name: string;
          slug: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_locale?: string;
          deleted_at?: string | null;
          id?: string;
          name: string;
          slug: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_locale?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
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
      set_class_teachers: {
        Args: { p_class_id: string; p_teacher_ids: string[] };
        Returns: undefined;
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
