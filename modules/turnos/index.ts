import type { Module } from "@/lib/modules"
import { TurnosHomeSection } from "@/modules/turnos/dashboard/home-section"

export const turnosModule: Module = {
  id: "turnos",
  name: "Turnos",
  icon: "calendar",
  dashboardPath: "turnos",
  HomeSection: TurnosHomeSection,
}
