"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  BillingBadge,
  ModuleBadge,
} from "@/modules/admin/dashboard/billing-badge"
import type { BillingStatus } from "@/modules/admin/lib/types"

export type BusinessDetailData = {
  id: string
  name: string
  slug: string
  active_modules: string[]
  created_at: string | null
  contact: { name: string; phone: string } | null
  employees: {
    id: string
    name: string
    phone: string
    role: string
    is_active: boolean
  }[]
  billing: {
    status: BillingStatus
    monthly_amount_cents: number
    last_payment_at: string | null
    next_due_at: string | null
    notes: string | null
    payments: {
      id: string
      amount_cents: number
      paid_at: string | null
      note: string | null
    }[]
  }
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(cents / 100)
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("es-AR")
  } catch {
    return iso
  }
}

export function BusinessDetailClient({
  business,
  registeredModules,
}: {
  business: BusinessDetailData
  registeredModules: string[]
}) {
  const router = useRouter()
  const [modules, setModules] = useState(business.active_modules)
  const [pendingToggle, setPendingToggle] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const pendingOn = useMemo(() => {
    if (!pendingToggle) return false
    return !modules.includes(pendingToggle)
  }, [pendingToggle, modules])

  async function confirmToggle() {
    if (!pendingToggle) return
    setBusy(true)
    setError("")
    const next = pendingOn
      ? [...modules, pendingToggle]
      : modules.filter((m) => m !== pendingToggle)
    try {
      const res = await fetch(`/api/admin/businesses/${business.id}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: next }),
      })
      const data = (await res.json()) as {
        active_modules?: string[]
        error?: string
      }
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar módulos.")
        return
      }
      setModules(data.active_modules ?? next)
      setPendingToggle(null)
      router.refresh()
    } catch {
      setError("Error de red al actualizar módulos.")
    } finally {
      setBusy(false)
    }
  }

  async function markPaid() {
    setBusy(true)
    setError("")
    try {
      const res = await fetch(
        `/api/admin/businesses/${business.id}/billing/mark-paid`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
      )
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "No se pudo marcar el pago.")
        return
      }
      router.refresh()
    } catch {
      setError("Error de red al marcar pago.")
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(status: BillingStatus) {
    setBusy(true)
    setError("")
    try {
      const res = await fetch(
        `/api/admin/businesses/${business.id}/billing/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      )
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "No se pudo cambiar el estado.")
        return
      }
      router.refresh()
    } catch {
      setError("Error de red.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{business.name}</h1>
        <p className="text-sm text-slate-500">
          /{business.slug} · alta {formatDate(business.created_at)}
        </p>
      </header>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Módulos
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {registeredModules.map((id) => {
            const on = modules.includes(id)
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <ModuleBadge id={id} />
                  <span className="text-sm text-slate-600">
                    {on ? "activo" : "apagado"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant={on ? "outline" : "default"}
                  className="h-9 min-w-28"
                  disabled={busy}
                  onClick={() => setPendingToggle(id)}
                >
                  {on ? "Desactivar" : "Activar"}
                </Button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Billing
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <BillingBadge status={business.billing.status} />
          <span className="text-sm text-slate-600">
            {formatMoney(business.billing.monthly_amount_cents)} / mes
          </span>
        </div>
        <dl className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">Último pago</dt>
            <dd>{formatDate(business.billing.last_payment_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Próximo vencimiento</dt>
            <dd>{formatDate(business.billing.next_due_at)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-10"
            disabled={busy}
            onClick={markPaid}
          >
            Marcar pagado
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            disabled={busy}
            onClick={() => setStatus("vencido")}
          >
            Marcar vencido
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10"
            disabled={busy}
            onClick={() => setStatus("pendiente")}
          >
            Marcar pendiente
          </Button>
        </div>
        {business.billing.payments.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-3 text-sm">
            {business.billing.payments.map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <span>{formatDate(p.paid_at)}</span>
                <span className="font-medium tabular-nums">
                  {formatMoney(p.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Contacto / empleados
        </h2>
        {business.contact ? (
          <p className="mt-2 text-sm text-slate-700">
            Owner: {business.contact.name} · {business.contact.phone}
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">Sin owner cargado</p>
        )}
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {business.employees.map((e) => (
            <li key={e.id} className="flex justify-between gap-2 py-2">
              <span>
                {e.name}{" "}
                <span className="text-xs text-slate-400">({e.role})</span>
              </span>
              <span className="text-slate-500">
                {e.is_active ? "activo" : "inactivo"} · {e.phone}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Dialog
        open={pendingToggle != null}
        onOpenChange={(open) => {
          if (!open) setPendingToggle(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingOn ? "Activar" : "Desactivar"} módulo
            </DialogTitle>
            <DialogDescription>
              ¿{pendingOn ? "Activar" : "Desactivar"}{" "}
              <strong>{pendingToggle}</strong> para {business.slug}? Apagar no
              borra datos del módulo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setPendingToggle(null)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={busy} onClick={confirmToggle}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
