import React, { useState } from "react";
import { Tag, Dumbbell, Layers, Hash, Pencil, Trash2, Weight, CircleDot, SlidersHorizontal } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { ServerError } from "@/components/auth/ServerError";
import type { Database } from "@/types/database.types";

type Config = Database["public"]["Tables"]["equipment_configs"]["Row"];
type TypeMode = "dumbbell" | "barbell" | "kettlebell" | "custom";

interface Props {
  config: Config;
}

type Mode = "view" | "edit" | "confirm-delete";

const TYPES: TypeMode[] = ["dumbbell", "barbell", "kettlebell", "custom"];

const TYPE_LABEL: Record<TypeMode, string> = {
  dumbbell: "Dumbbell",
  barbell: "Barbell",
  kettlebell: "Kettlebell",
  custom: "Custom",
};

const HANDLE_LABEL: Record<TypeMode, string> = {
  dumbbell: "Handle weight (kg)",
  barbell: "Bar weight (kg)",
  kettlebell: "Handle weight (kg)",
  custom: "Weight (kg)",
};

const NAME_PLACEHOLDER: Record<TypeMode, string> = {
  dumbbell: "e.g. Left dumbbell",
  barbell: "e.g. My barbell",
  kettlebell: "e.g. My kettlebell",
  custom: "e.g. My equipment",
};

function TypeIcon({ type }: { type: TypeMode }) {
  if (type === "barbell") return <CircleDot className="size-4" />;
  if (type === "kettlebell") return <Weight className="size-4" />;
  if (type === "custom") return <SlidersHorizontal className="size-4" />;
  return <Dumbbell className="size-4" />;
}

export function ConfigCard({ config }: Props) {
  const configType = config.equipment_type as TypeMode;
  const [mode, setMode] = useState<Mode>("view");
  const [equipmentType, setEquipmentType] = useState<TypeMode>(configType);
  const [name, setName] = useState(config.name);
  const [handleWeight, setHandleWeight] = useState(String(config.handle_weight));
  const [plateWeight, setPlateWeight] = useState(String(config.plate_weight));
  const [plateCount, setPlateCount] = useState(String(config.plate_count));
  const [errors, setErrors] = useState<{
    name?: string;
    handleWeight?: string;
    plateWeight?: string;
    plateCount?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isCustom = equipmentType === "custom";
  const total = config.handle_weight + config.plate_weight * config.plate_count;
  const editTotal =
    (parseFloat(handleWeight) || 0) + (isCustom ? 0 : (parseFloat(plateWeight) || 0) * (parseInt(plateCount, 10) || 0));

  function validate() {
    const next: typeof errors = {};

    if (!name.trim()) next.name = "Name is required";

    const hw = parseFloat(handleWeight);
    if (!handleWeight.trim() || isNaN(hw)) {
      next.handleWeight = "Weight is required";
    } else if (!isCustom && hw <= 0) {
      next.handleWeight = "Handle weight must be greater than 0";
    } else if (hw < 0) {
      next.handleWeight = "Weight must be 0 or more";
    }

    if (!isCustom) {
      const pw = parseFloat(plateWeight);
      if (!plateWeight.trim() || isNaN(pw) || pw < 0) next.plateWeight = "Plate weight must be 0 or more";

      const pc = parseInt(plateCount, 10);
      if (!plateCount.trim() || isNaN(pc) || pc < 0) next.plateCount = "Plate count must be 0 or more";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function clearError(field: keyof typeof errors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleTypeChange(type: TypeMode) {
    setEquipmentType(type);
    if (type === "custom") {
      setPlateWeight("0");
      setPlateCount("0");
    }
  }

  function handleCancel() {
    setEquipmentType(configType);
    setName(config.name);
    setHandleWeight(String(config.handle_weight));
    setPlateWeight(String(config.plate_weight));
    setPlateCount(String(config.plate_count));
    setErrors({});
    setServerError(null);
    setMode("view");
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/equipment/configs/${config.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          equipment_type: equipmentType,
          handle_weight: parseFloat(handleWeight),
          plate_weight: isCustom ? 0 : parseFloat(plateWeight),
          plate_count: isCustom ? 0 : parseInt(plateCount, 10),
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        setServerError(data.error ?? "Something went wrong");
      }
    } catch {
      setServerError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/equipment/configs/${config.id}`, { method: "DELETE" });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        setServerError(data.error ?? "Something went wrong");
        setMode("view");
      }
    } catch {
      setServerError("Network error — please try again");
      setMode("view");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "view") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-white">{config.name}</h3>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-blue-100/50">
              <TypeIcon type={configType} />
              {TYPE_LABEL[configType]}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMode("edit");
              }}
              className="rounded-lg p-1.5 text-blue-100/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Edit"
            >
              <Pencil className="size-4" />
            </button>
            <button
              onClick={() => {
                setMode("confirm-delete");
              }}
              className="rounded-lg p-1.5 text-blue-100/60 transition-colors hover:bg-white/10 hover:text-red-300"
              aria-label="Delete"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
        <div className="space-y-1 text-sm text-blue-100/60">
          <p>
            {HANDLE_LABEL[configType].replace(" (kg)", "")}: {config.handle_weight} kg
          </p>
          {configType !== "custom" && (
            <p>
              Plates: {config.plate_weight} kg × {config.plate_count}
            </p>
          )}
        </div>
        <div className="mt-3 text-2xl font-bold text-purple-300">{total.toFixed(1)} kg</div>
        {serverError && (
          <div className="mt-3">
            <ServerError message={serverError} />
          </div>
        )}
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            {TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  handleTypeChange(type);
                }}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  equipmentType === type
                    ? "bg-purple-600 text-white"
                    : "text-blue-100/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <TypeIcon type={type} />
                {TYPE_LABEL[type]}
              </button>
            ))}
          </div>

          <FormField
            id={`name-${config.id}`}
            label="Configuration name"
            value={name}
            onChange={(v) => {
              setName(v);
              clearError("name");
            }}
            placeholder={NAME_PLACEHOLDER[equipmentType]}
            error={errors.name}
            icon={<Tag className="size-4" />}
          />
          <FormField
            id={`handle_weight-${config.id}`}
            label={HANDLE_LABEL[equipmentType]}
            type="number"
            value={handleWeight}
            onChange={(v) => {
              setHandleWeight(v);
              clearError("handleWeight");
            }}
            placeholder="e.g. 2.5"
            error={errors.handleWeight}
            icon={<Dumbbell className="size-4" />}
          />
          {!isCustom && (
            <>
              <FormField
                id={`plate_weight-${config.id}`}
                label="Plate weight (kg)"
                type="number"
                value={plateWeight}
                onChange={(v) => {
                  setPlateWeight(v);
                  clearError("plateWeight");
                }}
                placeholder="e.g. 1.25"
                error={errors.plateWeight}
                icon={<Layers className="size-4" />}
              />
              <FormField
                id={`plate_count-${config.id}`}
                label="Number of plates"
                type="number"
                value={plateCount}
                onChange={(v) => {
                  setPlateCount(v);
                  clearError("plateCount");
                }}
                placeholder="e.g. 4"
                error={errors.plateCount}
                icon={<Hash className="size-4" />}
              />
            </>
          )}

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm text-blue-100/70">Total weight</span>
            <span className="text-xl font-bold text-purple-300">{editTotal.toFixed(1)} kg</span>
          </div>

          <ServerError message={serverError} />

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Dumbbell className="size-4" />
                  Save
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white">
      <p className="mb-4 text-sm text-blue-100/80">Are you sure you want to delete &ldquo;{config.name}&rdquo;?</p>
      <ServerError message={serverError} />
      <div className="mt-3 flex gap-3">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Deleting...
            </>
          ) : (
            "Yes, delete"
          )}
        </button>
        <button
          onClick={() => {
            setMode("view");
          }}
          disabled={loading}
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
