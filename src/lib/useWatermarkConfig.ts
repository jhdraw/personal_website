"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { DEFAULT_WATERMARK, type WatermarkConfig } from "@/lib/watermark";

// Loads the owner's watermark settings (site_settings key "watermark"),
// falling back to defaults. Used by the upload editors.
export function useWatermarkConfig() {
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT_WATERMARK);

  useEffect(() => {
    supabaseBrowser()
      .from("site_settings")
      .select("value")
      .eq("key", "watermark")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          setConfig({ ...DEFAULT_WATERMARK, ...(data.value as Partial<WatermarkConfig>) });
        }
      });
  }, []);

  return config;
}
