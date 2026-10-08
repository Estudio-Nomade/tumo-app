import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { SaasSubscriptionSection } from "@/modules/admin/dashboard/saas-subscription-section"
import { BusinessesTable } from "@/modules/admin/dashboard/businesses-table"

describe("admin SaaS subscription UI", () => {
  test("sección Suscripción muestra plan, estado, MP y módulos", () => {
    const html = renderToStaticMarkup(
      <SaasSubscriptionSection
        subscription={{
          plan_id: "pro",
          plan_label: "Pro",
          billing_interval: "month",
          status: "active",
          status_label: "Activa",
          subscribed_at: "2026-10-01T15:00:00.000Z",
          module_ids: ["loyalty", "orders"],
          amount_cents: 8_999_000,
          currency: "ARS",
          provider: "mercadopago",
          provider_subscription_id: "pre-1",
          current_period_end: "2026-11-01T15:00:00.000Z",
          grace_deadline_at: null,
        }}
      />
    )
    expect(html).toContain("data-saas-subscription")
    expect(html).toContain("Suscripción")
    expect(html).toContain("Pro")
    expect(html).toContain("Activa")
    expect(html).toContain("Mercado Pago")
    expect(html).toContain("loyalty")
    expect(html).toContain("orders")
    expect(html).toContain("pre-1")
  })

  test("tabla de negocios muestra plan cuando hay saas_subscription", () => {
    const html = renderToStaticMarkup(
      <BusinessesTable
        rows={[
          {
            id: "b1",
            name: "Nuevo",
            slug: "nuevo",
            active_modules: ["loyalty"],
            created_at: "2026-10-01T00:00:00.000Z",
            billing: { status: "al_dia", monthly_amount_cents: 3_999_000 },
            saas_subscription: {
              plan_id: "basico",
              plan_label: "Básico",
              status: "active",
              status_label: "Activa",
              subscribed_at: "2026-10-01T12:00:00.000Z",
            },
          },
          {
            id: "b2",
            name: "Carri",
            slug: "carri",
            active_modules: ["loyalty"],
            created_at: "2026-01-01T00:00:00.000Z",
            billing: { status: "pendiente", monthly_amount_cents: 6999 },
            saas_subscription: null,
          },
        ]}
      />
    )
    expect(html).toContain("Plan")
    expect(html).toContain("Básico")
    expect(html).toContain("manual")
  })
})
