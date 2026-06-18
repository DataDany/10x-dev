import type { Database } from "@/types/database.types";

type Config = Database["public"]["Tables"]["equipment_configs"]["Row"];

interface Props {
  config: Config;
}

export function ConfigCard({ config }: Props) {
  const total = config.handle_weight + config.plate_weight * config.plate_count;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white">
      <h3 className="mb-3 font-semibold text-white">{config.name}</h3>
      <div className="space-y-1 text-sm text-blue-100/60">
        <p>Handle: {config.handle_weight} kg</p>
        <p>
          Plates: {config.plate_weight} kg × {config.plate_count}
        </p>
      </div>
      <div className="mt-3 text-2xl font-bold text-purple-300">{total.toFixed(1)} kg</div>
    </div>
  );
}
