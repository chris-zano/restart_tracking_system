/**
 * Tracks — TEMPORARY hard-coded list.
 *
 * The OpenAPI spec has no /api/tracks endpoint yet; weekly-targets and cohorts
 * reference `trackId` but there's no CRUD surface for tracks themselves.
 *
 * Until the backend ships those endpoints, edit this file to reflect your real
 * track ids. Once the API exists, delete this file and replace imports with
 * `lib/api/tracks.ts`.
 */
import type { Track } from "./types";

export const TRACKS: Track[] = [
  { id: 1, code: "UNI-CCP", name: "January_University_Foundations_CCP_2026", short: "Uni Foundations · CCP",   color: "#22D3EE", weeks: 10 },
  { id: 2, code: "EXT-SAA", name: "April_External_Associate_SAA_2026",       short: "External Associate · SAA", color: "#A78BFA", weeks: 10 },
  { id: 3, code: "INT-DVA", name: "April_Internal_Associate_DVA_2026",       short: "Internal Associate · DVA", color: "#34D399", weeks: 10 },
  { id: 4, code: "EXT-SOA", name: "July_External_Associate_SOA_2026",        short: "External Associate · SOA", color: "#F59E0B", weeks: 10 },
];

export const trackById = (id: number) => TRACKS.find(t => t.id === id);
