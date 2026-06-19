import React, { useState } from "react";
import { Tag, Dumbbell, Layers, Hash, Weight, CircleDot, SlidersHorizontal } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";

type TypeMode = "dumbbell" | "barbell" | "kettlebell" | "custom";

interface Props {
  serverError?: string | null;
}

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

export default function ConfigForm({ serverError }: Props) {
  const [typeMode, setTypeMode] = useState<TypeMode>("dumbbell");
  const [name, setName] = useState("");
  const [handleWeight, setHandleWeight] = useState("");
  const [plateWeight, setPlateWeight] = useState("");
  const [plateCount, setPlateCount] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    handleWeight?: string;
    plateWeight?: string;
    plateCount?: string;
  }>({});

  const isCustom = typeMode === "custom";
  const total =
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

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    if (!validate()) {
      e.preventDefault();
    }
  }

  return (
    <form method="POST" action="/api/equipment/configs" className="space-y-4" onSubmit={handleSubmit} noValidate>
      <input type="hidden" name="equipment_type" value={typeMode} />
      {isCustom && (
        <>
          <input type="hidden" name="plate_weight" value="0" />
          <input type="hidden" name="plate_count" value="0" />
        </>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
        {TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setTypeMode(type);
            }}
            className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              typeMode === type ? "bg-purple-600 text-white" : "text-blue-100/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            <TypeIcon type={type} />
            {TYPE_LABEL[type]}
          </button>
        ))}
      </div>

      <FormField
        id="name"
        label="Configuration name"
        value={name}
        onChange={(v) => {
          setName(v);
          clearError("name");
        }}
        placeholder={NAME_PLACEHOLDER[typeMode]}
        error={errors.name}
        icon={<Tag className="size-4" />}
      />

      <FormField
        id="handle_weight"
        label={HANDLE_LABEL[typeMode]}
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
            id="plate_weight"
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
            id="plate_count"
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
        <span className="text-xl font-bold text-purple-300">{total.toFixed(1)} kg</span>
      </div>

      <ServerError message={serverError} />

      <SubmitButton pendingText="Saving..." icon={<Dumbbell className="size-4" />}>
        Save configuration
      </SubmitButton>
    </form>
  );
}
