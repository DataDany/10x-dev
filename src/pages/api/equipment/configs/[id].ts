import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

const json = (body: object, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const PATCH: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const id = context.params.id;

  let body: Record<string, unknown>;
  try {
    body = (await context.request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return json({ error: "Name is required" }, 400);

  const et = body.equipment_type;
  if (typeof et !== "string" || !["dumbbell", "barbell", "kettlebell", "custom"].includes(et)) {
    return json({ error: "Invalid equipment type" }, 400);
  }
  const equipmentType = et;

  const hw = body.handle_weight;
  const handleWeight = typeof hw === "number" ? hw : typeof hw === "string" ? parseFloat(hw) : NaN;
  if (isNaN(handleWeight) || (equipmentType === "custom" ? handleWeight < 0 : handleWeight <= 0)) {
    return json(
      { error: equipmentType === "custom" ? "Weight must be 0 or more" : "Handle weight must be greater than 0" },
      400,
    );
  }

  const pw = body.plate_weight;
  const plateWeight = typeof pw === "number" ? pw : typeof pw === "string" ? parseFloat(pw) : NaN;
  if (isNaN(plateWeight) || plateWeight < 0) return json({ error: "Plate weight must be a non-negative number" }, 400);

  const pc = body.plate_count;
  const plateCount = typeof pc === "number" ? Math.trunc(pc) : typeof pc === "string" ? parseInt(pc, 10) : NaN;
  if (isNaN(plateCount) || plateCount < 0) return json({ error: "Plate count must be a non-negative integer" }, 400);

  const supabase = createClient(context.request.headers, context.cookies);

  const { error } = await supabase
    .from("equipment_configs")
    .update({
      name,
      equipment_type: equipmentType,
      handle_weight: handleWeight,
      plate_weight: plateWeight,
      plate_count: plateCount,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") return json({ error: "A configuration with this name already exists" }, 409);
    return json({ error: error.message }, 500);
  }

  return json({ success: true }, 200);
};

export const DELETE: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const id = context.params.id;

  const supabase = createClient(context.request.headers, context.cookies);

  const { error } = await supabase.from("equipment_configs").delete().eq("id", id).eq("user_id", user.id);

  if (error) return json({ error: error.message }, 500);

  return json({ success: true }, 200);
};
