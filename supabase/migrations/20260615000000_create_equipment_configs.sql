-- Table definition
CREATE TABLE public.equipment_configs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name           TEXT         NOT NULL,
  equipment_type TEXT         NOT NULL DEFAULT 'dumbbell',
  handle_weight  NUMERIC(8,2) NOT NULL CHECK (handle_weight >= 0),
  plate_weight   NUMERIC(8,2) NOT NULL CHECK (plate_weight >= 0),
  plate_count    INTEGER      NOT NULL CHECK (plate_count >= 0),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- updated_at auto-maintenance
CREATE OR REPLACE FUNCTION public.handle_updated_at ()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_configs_set_updated_at
  BEFORE UPDATE ON public.equipment_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at ();

-- Row-level security
ALTER TABLE public.equipment_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_configs_select_own" ON public.equipment_configs
  FOR SELECT USING (auth.uid () = user_id);

CREATE POLICY "equipment_configs_insert_own" ON public.equipment_configs
  FOR INSERT WITH CHECK (auth.uid () = user_id);

CREATE POLICY "equipment_configs_update_own" ON public.equipment_configs
  FOR UPDATE USING (auth.uid () = user_id)
  WITH CHECK (auth.uid () = user_id);

CREATE POLICY "equipment_configs_delete_own" ON public.equipment_configs
  FOR DELETE USING (auth.uid () = user_id);
