import { NextResponse, type NextRequest } from "next/server"
import { listServices } from "@/modules/turnos/api/services"
import { getSettings } from "@/modules/turnos/api/settings"
import { generateSlots, type HoursMap } from "@/modules/turnos/lib/availability"
import { servicesDeps, settingsDeps, taggedSql } from "@/modules/turnos/lib/default-deps"
import { getBusiness } from "@/shell/db/business"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get("slug") ?? ""
  const day = searchParams.get("day") ?? ""
  const serviceId = searchParams.get("serviceId") ?? ""

  const business = await getBusiness(slug)
  if (!business?.active_modules.includes("turnos")) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 })
  }

  const settingsRes = await getSettings(settingsDeps, {
    businessId: business.id,
  })
  const settings = (settingsRes.body as { settings: { isPaused: boolean; hours: HoursMap } })
    .settings

  const servicesRes = await listServices(servicesDeps, {
    businessId: business.id,
    activeOnly: true,
  })
  const services = (servicesRes.body as { services: { id: string; durationMinutes: number }[] })
    .services
  const service = services.find((s) => s.id === serviceId)
  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado." }, { status: 404 })
  }

  const existing = (await taggedSql`
    SELECT starts_at, ends_at
    FROM turnos_bookings
    WHERE business_id = ${business.id}
      AND status != 'cancelled'
      AND starts_at::date = ${day}::date
  `) as { starts_at: Date | string; ends_at: Date | string }[]

  const slots = generateSlots({
    day,
    durationMinutes: service.durationMinutes,
    hours: (settings.hours ?? {}) as HoursMap,
    existing: existing.map((e) => ({
      startsAt: new Date(e.starts_at).toISOString(),
      endsAt: new Date(e.ends_at).toISOString(),
    })),
    paused: Boolean(settings.isPaused),
  })

  return NextResponse.json({ slots })
}
