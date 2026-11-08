"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const ALLOWED_CV_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_CV_BYTES = 8 * 1024 * 1024;

function cleanFilename(name: string) {
  const parts = name.split(".");
  const ext = parts.length > 1 ? "." + parts.pop()!.toLowerCase() : "";
  return { ext, safe: randomUUID() + ext };
}

function values(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean);
}

export async function saveOnboarding(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/onboarding?error=Database%20non%20ancora%20collegato");
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const primaryRoles = values(formData, "primary_roles");
  const secondaryRoles: string[] = [];
  const excludedRoles: string[] = [];
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const radarScope = String(formData.get("radar_scope") || "smart");
  const preferredLocations = values(formData, "preferred_locations");
  const relocationLocations = values(formData, "relocation_locations");

  if (!firstName || !lastName || !primaryRoles.length) {
    redirect("/onboarding?error=Completa%20nome%2C%20cognome%20e%20almeno%20un%20obiettivo");
  }

  const profileResult = await supabase.from("profiles").upsert({
    user_id: userId,
    first_name: firstName,
    last_name: lastName,
    display_name: firstName + " " + lastName,
    seniority: String(formData.get("seniority") || "entry_level"),
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  });

  if (profileResult.error) {
    redirect("/onboarding?error=Profilo%20non%20salvato");
  }

  const preferencesResult = await supabase.from("career_preferences").upsert({
    user_id: userId,
    primary_role_families: primaryRoles,
    secondary_role_families: secondaryRoles,
    excluded_role_families: excludedRoles,
    preferred_locations: preferredLocations,
    relocation_locations: relocationLocations,
    employment_types: values(formData, "employment_types"),
    preferred_brands: [],
    excluded_brands: [],
    industries: ["fashion", "luxury"],
    preferences: { radar_scope: radarScope },
    updated_at: new Date().toISOString(),
  });

  if (preferencesResult.error) {
    redirect("/onboarding?error=Preferenze%20non%20salvate");
  }

  const cv = formData.get("cv");
  if (cv instanceof File && cv.size > 0) {
    if (!ALLOWED_CV_TYPES.has(cv.type) || cv.size > MAX_CV_BYTES) {
      redirect("/onboarding?error=CV%20non%20valido%20%28PDF%2FDOC%2FDOCX%2C%20max%208MB%29");
    }

    const { safe } = cleanFilename(cv.name);
    const path = userId + "/" + safe;
    const body = Buffer.from(await cv.arrayBuffer());

    const upload = await supabase.storage
      .from("cvs")
      .upload(path, body, {
        contentType: cv.type,
        upsert: false,
        cacheControl: "0",
      });

    if (upload.error) {
      redirect("/onboarding?error=Caricamento%20CV%20non%20riuscito");
    }

    const cvRow = await supabase.from("user_cvs").insert({
      user_id: userId,
      name: String(formData.get("cv_name") || cv.name || "CV"),
      storage_path: path,
      target_role_families: primaryRoles,
      parsed_profile: {},
      is_default: true,
      active: true,
    });

    if (cvRow.error) {
      await supabase.storage.from("cvs").remove([path]);
      redirect("/onboarding?error=CV%20non%20registrato");
    }
  }

  redirect("/");
}
