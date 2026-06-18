import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();
  const name = ((form.get("name") as string | null) ?? "").trim();
  const handleWeightRaw = form.get("handle_weight") as string | null;
  const plateWeightRaw = form.get("plate_weight") as string | null;
  const plateCountRaw = form.get("plate_count") as string | null;

  if (!name) {
    return context.redirect(`/dashboard?error=${encodeURIComponent("Name is required")}`);
  }

  const handleWeight = parseFloat(handleWeightRaw ?? "");
  const plateWeight = parseFloat(plateWeightRaw ?? "");
  const plateCount = parseInt(plateCountRaw ?? "", 10);

  if (isNaN(handleWeight) || handleWeight < 0) {
    return context.redirect(`/dashboard?error=${encodeURIComponent("Handle weight must be a non-negative number")}`);
  }
  if (isNaN(plateWeight) || plateWeight < 0) {
    return context.redirect(`/dashboard?error=${encodeURIComponent("Plate weight must be a non-negative number")}`);
  }
  if (isNaN(plateCount) || plateCount < 0) {
    return context.redirect(`/dashboard?error=${encodeURIComponent("Plate count must be a non-negative integer")}`);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/dashboard?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const { error } = await supabase.from("equipment_configs").insert({
    name,
    equipment_type: "dumbbell",
    handle_weight: handleWeight,
    plate_weight: plateWeight,
    plate_count: plateCount,
    user_id: user.id,
  });

  if (error) {
    const message = error.code === "23505" ? "A configuration with this name already exists" : error.message;
    return context.redirect(`/dashboard?error=${encodeURIComponent(message)}`);
  }

  return context.redirect("/dashboard");
};
