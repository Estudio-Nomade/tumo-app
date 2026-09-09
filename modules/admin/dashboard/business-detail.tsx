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

export type ModuleSubscriptionData = {
  module_id: string
  status: string
  activated_at: string | null
  billing_anchor_at: string | null
  deactivated_at: string | null
}

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
  module_subscriptions?: ModuleSubscriptionData[]
  billing: {
    status: BillingStatus
    monthly_amount_cents: number
    last_payment_at: string | null
    next_due_at: string | null
    business_anchor_at?: string | null
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
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("es-AR")
  } catch {
    return iso
  }
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ""
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch {
    return ""
  }
}

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10)
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
  const [subs] = useState(business.module_subscriptions ?? [])
  const [activateId, setActivateId] = useState<string | null>(null)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [activateDate, setActivateDate] = useState(todayDateInput())
  const [sameAnchor, setSameAnchor] = useState(true)
  const [anchorDate, setAnchorDate] = useState(todayDateInput())
  const [editActivated, setEditActivated] = useState("")
  const [editAnchor, setEditAnchor] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const subById = useMemo(() => {
    const m = new Map<string, ModuleSubscriptionData>()
    for (const s of subs) m.set(s.module_id, s)
    return m
  }, [subs])

  async function confirmActivate() {
    if (!activateId) return
    setBusy(true)
    setError("")
    try {
      const body: { activatedAt: string; billingAnchorAt?: string } = {
        activatedAt: activateDate,
      }
      if (!sameAnchor) body.billingAnchorAt = anchorDate
      const res = await fetch(
        `/api/admin/businesses/${business.id}/modules/${activateId}/activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )
      const data = (await res.json()) as {
        active_modules?: string[]
        error?: string
      }
      if (!res.ok) {
        setError(data.error ?? "No se pudo activar.")
        return
      }
      setModules(data.active_modules ?? [...modules, activateId])
      setActivateId(null)
      router.refresh()
    } catch {
      setError("Error de red al activar.")
    } finally {
      setBusy(false)
    }
  }

  async function confirmDeactivate() {
    if (!deactivateId) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch(
        `/api/admin/businesses/${business.id}/modules/${deactivateId}/deactivate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }
      )
      const data = (await res.json()) as {
        active_modules?: string[]
        error?: string
      }
      if (!res.ok) {
        setError(data.error ?? "No se pudo desactivar.")
        return
      }
      setModules(data.active_modules ?? modules.filter((m) => m !== deactivateId))
      setDeactivateId(null)
      router.refresh()
    } catch {
      setError("Error de red al desactivar.")
    } finally {
      setBusy(false)
    }
  }

  async function confirmEdit() {
    if (!editId) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch(
        `/api/admin/businesses/${business.id}/modules/${editId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activatedAt: editActivated || undefined,
            billingAnchorAt: editAnchor || undefined,
          }),
        }
      )
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "No se pudo editar fechas.")
        return
      }
      setEditId(null)
      router.refresh()
    } catch {
      setError("Error de red al editar.")
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
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }
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
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
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
            const sub = subById.get(id)
            return (
              <li
                key={id}
                className="flex flex-col gap-2 rounded-lg border border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <ModuleBadge id={id} />
                    <span className="text-sm text-slate-600">
                      {on ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  {on && sub ? (
                    <p className="text-xs text-slate-500">
                      Activado: {formatDate(sub.activated_at)} · Ancla:{" "}
                      {formatDate(sub.billing_anchor_at)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {on ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        disabled={busy}
                        onClick={() => {
                          setEditId(id)
                          setEditActivated(toDateInputValue(sub?.activated_at))
                          setEditAnchor(toDateInputValue(sub?.billing_anchor_at))
                        }}
                      >
                        Editar fechas
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 min-w-28"
                        disabled={busy}
                        onClick={() => setDeactivateId(id)}
                      >
                        Desactivar
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      className="h-9 min-w-28"
                      disabled={busy}
                      onClick={() => {
                        setActivateId(id)
                        setActivateDate(todayDateInput())
                        setAnchorDate(todayDateInput())
                        setSameAnchor(true)
                      }}
                    >
                      Activar…
                    </Button>
                  )}
                </div>
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
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-400">Ancla negocio</dt>
            <dd>{formatDate(business.billing.business_anchor_at)}</dd>
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
        open={activateId != null}
        onOpenChange={(open) => {
          if (!open) setActivateId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activar módulo</DialogTitle>
            <DialogDescription>
              Elegí desde qué fecha cuenta el mes de facturación de{" "}
              <strong>{activateId}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <label className="text-sm text-slate-700">
              Fecha de activación
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                value={activateDate}
                onChange={(e) => {
                  setActivateDate(e.target.value)
                  if (sameAnchor) setAnchorDate(e.target.value)
                }}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={sameAnchor}
                onChange={(e) => {
                  setSameAnchor(e.target.checked)
                  if (e.target.checked) setAnchorDate(activateDate)
                }}
              />
              Facturar desde la misma fecha
            </label>
            {!sameAnchor ? (
              <label className="text-sm text-slate-700">
                Ancla de facturación
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                  value={anchorDate}
                  onChange={(e) => setAnchorDate(e.target.value)}
                />
              </label>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setActivateId(null)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={busy} onClick={confirmActivate}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deactivateId != null}
        onOpenChange={(open) => {
          if (!open) setDeactivateId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar módulo</DialogTitle>
            <DialogDescription>
              ¿Desactivar <strong>{deactivateId}</strong>? No borra datos del
              módulo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setDeactivateId(null)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={busy} onClick={confirmDeactivate}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editId != null}
        onOpenChange={(open) => {
          if (!open) setEditId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar fechas</DialogTitle>
            <DialogDescription>
              Módulo <strong>{editId}</strong>. Con pagos previos, el próximo
              vencimiento no se mueve.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <label className="text-sm text-slate-700">
              Activado
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                value={editActivated}
                onChange={(e) => setEditActivated(e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-700">
              Ancla facturación
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                value={editAnchor}
                onChange={(e) => setEditAnchor(e.target.value)}
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setEditId(null)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={busy} onClick={confirmEdit}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
