"use client"

import { useCallback, useEffect, useState } from "react"
import type { Preset } from "@/lib/types"

const STORAGE_KEY = "dashboard-presets"

function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function persistPresets(presets: Preset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch {
    // storage quota or access denied — silently ignore
  }
}

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>([])

  useEffect(() => {
    setPresets(loadPresets())
  }, [])

  const savePreset = useCallback((name: string, excludedAccountIds: string[], excludedAssetIds: string[]) => {
    const next: Preset = {
      id: crypto.randomUUID(),
      name,
      excludedAccountIds,
      excludedAssetIds,
    }
    setPresets((prev) => {
      const updated = [...prev, next]
      persistPresets(updated)
      return updated
    })
  }, [])

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const updated = prev.filter((p) => p.id !== id)
      persistPresets(updated)
      return updated
    })
  }, [])

  return { presets, savePreset, deletePreset }
}
