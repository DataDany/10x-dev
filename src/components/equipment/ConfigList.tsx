import type { Database } from "@/types/database.types";
import { ConfigCard } from "./ConfigCard";

type Config = Database["public"]["Tables"]["equipment_configs"]["Row"];

interface Props {
  configs: Config[];
}

export function ConfigList({ configs }: Props) {
  if (configs.length === 0) {
    return (
      <p className="text-center text-blue-100/60">
        You don&apos;t have any configurations yet. Use the form above to add your first one.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {configs.map((config) => (
        <ConfigCard key={config.id} config={config} />
      ))}
    </div>
  );
}
