ALTER TABLE public.equipment_configs
  ADD CONSTRAINT equipment_configs_equipment_type_check
  CHECK (equipment_type IN ('dumbbell', 'barbell', 'kettlebell', 'custom'));
