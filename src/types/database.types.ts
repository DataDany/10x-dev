/* eslint-disable @typescript-eslint/consistent-type-definitions */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      equipment_configs: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          equipment_type: string;
          handle_weight: number;
          plate_weight: number;
          plate_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          equipment_type?: string;
          handle_weight: number;
          plate_weight: number;
          plate_count: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          equipment_type?: string;
          handle_weight?: number;
          plate_weight?: number;
          plate_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_configs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
