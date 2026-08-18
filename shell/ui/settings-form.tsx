"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Gift,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import LogoutButton from "@/shell/ui/logout-button"
import { getClientBrandPreviews } from "@/shell/ui/client-brand-preview-registry"

const PREVIEW_ICONS: Record<string, LucideIcon> = {
  gift: Gift,
  Gift: Gift,
}

function resolvePreviewIcon(name: string): LucideIcon {
  return PREVIEW_ICONS[name] ?? LayoutDashboard
}

export const BRAND_SWATCHES = [
  { hex: "#F97316", name: "Naranja" },
  { hex: "#EF4444", name: "Rojo" },
  { hex: "#F59E0B", name: "Amarillo" },
  { hex: "#10B981", name: "Verde" },
  { hex: "#3B82F6", name: "Azul" },
  { hex: "#8B5CF6", name: "Violeta" },
  { hex: "#EC4899", name: "Rosa" },
  { hex: "#1C1917", name: "Negro" },
] as const

const HEX = /^#[0-9A-Fa-f]{6}$/

function colorLabel(hex: string): string {
  const n = normalizeHex(hex)
  const found = BRAND_SWATCHES.find((s) => s.hex === n)
  return found?.name ?? "Personalizado"
}

type Props = {
  slug: string
  initialName: string
  initialLogo: string | null
  initialPrimary: string
  initialSecondary: string
  rewardName: string
  purchasesNeeded: number
  activeModuleIds: string[]
  ownerName: string
  ownerInitial: string
}

function normalizeHex(value: string): string {
  const v = value.trim()
  if (!HEX.test(v)) return value
  return v.toUpperCase()
}

export default function SettingsForm({
  slug,
  initialName,
  initialLogo,
  initialPrimary,
  initialSecondary,
  rewardName,
  purchasesNeeded,
  activeModuleIds,
  ownerName,
  ownerInitial,
}: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [logo, setLogo] = useState<string | null>(initialLogo)
  const [primary, setPrimary] = useState(normalizeHex(initialPrimary))
  const [secondary, setSecondary] = useState(normalizeHex(initialSecondary))
  const [savedName, setSavedName] = useState(initialName)
  const [savedPrimary, setSavedPrimary] = useState(normalizeHex(initialPrimary))
  const [savedSecondary, setSavedSecondary] = useState(
    normalizeHex(initialSecondary)
  )
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")
  const [clientPreviewOpen, setClientPreviewOpen] = useState(false)
  const [previewModuleId, setPreviewModuleId] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const clientPreviews = useMemo(
    () => getClientBrandPreviews(activeModuleIds),
    [activeModuleIds]
  )
  const selectedPreview =
    clientPreviews.find((m) => m.id === previewModuleId) ?? null

  function openClientPreview() {
    if (clientPreviews.length === 0) return
    setPreviewModuleId(null)
    setClientPreviewOpen(true)
  }

  const dirty = useMemo(() => {
    return (
      name.trim() !== savedName.trim() ||
      normalizeHex(primary) !== normalizeHex(savedPrimary) ||
      normalizeHex(secondary) !== normalizeHex(savedSecondary)
    )
  }, [name, primary, secondary, savedName, savedPrimary, savedSecondary])

  const nameOk = name.trim().length >= 2 && name.trim().length <= 60
  const primaryOk = HEX.test(primary.trim())
  const secondaryOk = HEX.test(secondary.trim())
  const valid = nameOk && primaryOk && secondaryOk
  const canSave = dirty && valid && !saving

  const previewInitial = (name.trim()?.[0] ?? "T").toUpperCase()

  async function onSave() {
    if (!canSave) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          primary_color: normalizeHex(primary),
          secondary_color: normalizeHex(secondary),
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.")
        return
      }
      const nextName = name.trim()
      const nextPrimary = normalizeHex(primary)
      const nextSecondary = normalizeHex(secondary)
      setName(nextName)
      setPrimary(nextPrimary)
      setSecondary(nextSecondary)
      setSavedName(nextName)
      setSavedPrimary(nextPrimary)
      setSavedSecondary(nextSecondary)
      setToast("Listo, se guardó")
      window.setTimeout(() => setToast(""), 2500)
      router.refresh()
    } catch {
      setError("No se pudo guardar. Probá de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  async function onLogoSelected(file: File | null) {
    if (!file || uploadingLogo) return
    setUploadingLogo(true)
    setError("")
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/business/logo", {
        method: "POST",
        body,
      })
      const data = (await res.json()) as { error?: string; logo?: string }
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir el logo.")
        return
      }
      if (data.logo) setLogo(data.logo)
      setToast("Logo actualizado")
      window.setTimeout(() => setToast(""), 2500)
      router.refresh()
    } catch {
      setError("No se pudo subir el logo. Probá de nuevo.")
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ""
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
          Ajustes
        </h1>
        <p className="text-[13px] text-stone-500">Tu comercio y tu cuenta</p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Negocio
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-800">
            Nombre del comercio
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-[var(--color-primary,#F97316)]"
            autoComplete="organization"
          />
          <span className="text-xs text-stone-400">
            Así te ven clientes y empleados
          </span>
          {!nameOk && name.trim().length > 0 ? (
            <span className="text-xs text-red-600">
              Entre 2 y 60 caracteres.
            </span>
          ) : null}
        </label>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Marca
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-stone-800">Logo</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#E7E5E4] bg-[#FAFAF9] transition hover:border-[var(--color-primary,#F97316)] disabled:opacity-60"
              aria-label="Subir logo del comercio"
            >
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center text-xl font-bold text-white"
                  style={{
                    backgroundColor: primaryOk ? primary : "#F97316",
                  }}
                >
                  {previewInitial}
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/45 py-0.5 text-[10px] font-semibold text-white">
                <Camera className="h-3 w-3" aria-hidden />
                {uploadingLogo ? "…" : "Subir"}
              </span>
            </button>
            <div className="min-w-0 flex-1 text-xs leading-relaxed text-stone-500">
              JPEG, PNG o WebP. Máximo 2 MB. Se reemplaza el logo anterior.
            </div>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onLogoSelected(e.target.files?.[0] ?? null)}
          />
        </div>

        <button
          type="button"
          onClick={openClientPreview}
          disabled={clientPreviews.length === 0}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-[#E7E5E4] bg-[#FAFAF9] p-3 text-left transition active:bg-stone-100 disabled:opacity-50"
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              className="h-12 w-12 rounded-[14px] object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-[14px] text-lg font-bold text-white"
              style={{ backgroundColor: primaryOk ? primary : "#F97316" }}
            >
              {previewInitial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-stone-900">
              {name.trim() || "Tu comercio"}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="h-5 w-5 rounded-md border border-[#E7E5E4]"
                style={{
                  backgroundColor: primaryOk ? primary : "#ccc",
                }}
                title="Primario"
              />
              <span
                className="h-5 w-5 rounded-md border border-[#E7E5E4]"
                style={{
                  backgroundColor: secondaryOk ? secondary : "#ccc",
                }}
                title="Secundario"
              />
              <span className="text-sm font-semibold text-[var(--color-primary,#F97316)]">
                Ver como cliente
              </span>
            </div>
          </div>
          <ChevronRight
            className="h-6 w-6 shrink-0 text-stone-400"
            aria-hidden
          />
        </button>

        <Dialog
          open={clientPreviewOpen}
          onOpenChange={(open) => {
            setClientPreviewOpen(open)
            if (!open) setPreviewModuleId(null)
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="max-h-[min(92vh,720px)] gap-0 overflow-y-auto p-0 sm:max-w-md"
          >
            {selectedPreview === null ? (
              <>
                <DialogHeader className="gap-2 border-b border-stone-100 p-5 pb-4">
                  <DialogTitle className="text-xl font-bold text-stone-900">
                    ¿Qué módulo querés ver?
                  </DialogTitle>
                  <DialogDescription className="text-base leading-relaxed text-stone-500">
                    Elegí cómo se ve tu marca del lado del cliente en cada
                    módulo activo.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 p-5">
                  {clientPreviews.map((mod) => {
                    const Icon = resolvePreviewIcon(mod.icon)
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setPreviewModuleId(mod.id)}
                        className="flex min-h-[76px] w-full items-center gap-3 rounded-2xl border-2 border-[#E7E5E4] bg-white px-3 py-3 text-left transition active:bg-stone-50"
                      >
                        <span
                          aria-hidden
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
                          style={{
                            backgroundColor: primaryOk ? primary : "#F97316",
                          }}
                        >
                          <Icon className="h-6 w-6" strokeWidth={2.25} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-bold text-stone-900">
                            {mod.name}
                          </span>
                          <span className="block text-sm text-stone-500">
                            {mod.description}
                          </span>
                        </span>
                        <ChevronRight
                          className="h-5 w-5 shrink-0 text-stone-400"
                          aria-hidden
                        />
                      </button>
                    )
                  })}
                </div>

                <DialogFooter className="mx-0 mb-0 flex-col gap-2 rounded-b-xl border-t border-stone-100 bg-stone-50 p-4 sm:flex-col sm:justify-stretch">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-12 w-full text-base font-semibold text-stone-600"
                    onClick={() => setClientPreviewOpen(false)}
                  >
                    Cancelar
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader className="gap-2 border-b border-stone-100 p-5 pb-4">
                  <button
                    type="button"
                    onClick={() => setPreviewModuleId(null)}
                    className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary,#F97316)]"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Elegir otro módulo
                  </button>
                  <DialogTitle className="text-xl font-bold text-stone-900">
                    Así te ven tus clientes
                  </DialogTitle>
                  <DialogDescription className="text-base leading-relaxed text-stone-500">
                    Vista de {selectedPreview.name} con tu nombre y colores
                    actuales.
                  </DialogDescription>
                </DialogHeader>

                <div className="bg-stone-100 px-4 py-5">
                  {(() => {
                    const Preview = selectedPreview.Preview
                    return (
                      <Preview
                        businessName={name.trim() || "Tu comercio"}
                        primary={primaryOk ? primary : "#F97316"}
                        secondary={secondaryOk ? secondary : "#FACC15"}
                        rewardName={rewardName}
                        purchasesNeeded={purchasesNeeded}
                      />
                    )
                  })()}
                </div>

                <DialogFooter className="mx-0 mb-0 flex-col gap-2 rounded-b-xl border-t border-stone-100 bg-stone-50 p-4 sm:flex-col sm:justify-stretch">
                  <Button
                    type="button"
                    className="h-12 w-full bg-[var(--color-primary,#F97316)] text-base font-semibold text-white hover:bg-[var(--color-primary,#F97316)]/90"
                    onClick={() => {
                      setClientPreviewOpen(false)
                      setPreviewModuleId(null)
                    }}
                  >
                    Entendido
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-12 w-full text-base font-semibold text-stone-600"
                    onClick={() => setPreviewModuleId(null)}
                  >
                    Volver a módulos
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <ColorField
          label="Color principal"
          value={primary}
          onChange={setPrimary}
          ok={primaryOk}
        />
        <ColorField
          label="Color secundario"
          value={secondary}
          onChange={setSecondary}
          ok={secondaryOk}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Cuenta
        </div>
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C1917] text-sm font-bold text-white"
          >
            {ownerInitial}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-stone-900">
              {ownerName}
            </div>
            <div className="text-xs text-stone-500">Dueño del comercio</div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Fidelización
        </div>
        <Link
          href={`/${slug}/dashboard/loyalty/programa`}
          className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border-2 border-[#E7E5E4] bg-[#FAFAF9] px-4 py-3 text-left transition active:bg-stone-100"
        >
          <span className="text-sm font-semibold text-stone-900">
            Ajustes de fidelización
          </span>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-stone-400"
            aria-hidden
          />
        </Link>
      </section>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canSave}
        onClick={onSave}
        className="w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>

      <LogoutButton
        slug={slug}
        className="w-full rounded-2xl border border-[#E7E5E4] bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-[var(--color-primary,#F97316)] hover:text-[var(--color-primary,#F97316)]"
      />

      {toast ? (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1C1917] px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  )
}


function ColorField({
  label,
  value,
  onChange,
  ok,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  ok: boolean
}) {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [draft, setDraft] = useState(value)
  const [showCode, setShowCode] = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)

  function openPicker() {
    setDraft(ok ? normalizeHex(value) : "#F97316")
    setShowCustom(false)
    setShowCode(false)
    setOpen(true)
  }

  function pickSwatch(hex: string) {
    onChange(hex)
    setOpen(false)
    setShowCustom(false)
    setShowCode(false)
  }

  function applyCustom() {
    const hex = normalizeHex(draft)
    if (!HEX.test(hex)) return
    onChange(hex)
    setOpen(false)
    setShowCustom(false)
    setShowCode(false)
  }

  function openNativePalette() {
    const el = colorInputRef.current
    if (!el) return
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker()
        return
      }
    } catch {
      // fall through to click()
    }
    el.click()
  }

  useEffect(() => {
    if (!open || !showCustom) return
    const t = window.setTimeout(() => openNativePalette(), 120)
    return () => window.clearTimeout(t)
  }, [open, showCustom])

  const displayHex = ok ? normalizeHex(value) : "#A8A29E"
  const displayName = ok ? colorLabel(value) : "Sin color"
  const draftHex = HEX.test(normalizeHex(draft))
    ? normalizeHex(draft)
    : "#F97316"

  return (
    <div className="flex flex-col gap-2">
      <span className="text-base font-semibold text-stone-800">{label}</span>
      <button
        type="button"
        onClick={openPicker}
        className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 border-[#E7E5E4] bg-[#FAFAF9] px-3 py-3 text-left transition active:bg-stone-100"
      >
        <span
          aria-hidden
          className="h-12 w-12 shrink-0 rounded-2xl border border-black/10 shadow-sm"
          style={{ backgroundColor: displayHex }}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-stone-900">
            {displayName}
          </span>
          <span className="block text-sm text-stone-500">Cambiar color</span>
        </span>
        <ChevronRight
          className="h-6 w-6 shrink-0 text-stone-400"
          aria-hidden
        />
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setShowCustom(false)
            setShowCode(false)
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[min(90vh,640px)] gap-0 overflow-y-auto p-0 sm:max-w-md"
        >
          <DialogHeader className="gap-2 p-5 pb-3">
            <DialogTitle className="text-xl font-bold text-stone-900">
              {showCustom ? "Color personalizado" : "Elegí un color"}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-stone-500">
              {showCustom
                ? "Tocá el botón grande para abrir la paleta y elegir cualquier color."
                : `Tocá el color que quieras para ${label.toLowerCase()}.`}
            </DialogDescription>
          </DialogHeader>

          {!showCustom ? (
            <div className="grid grid-cols-2 gap-3 px-5 pb-4">
              {BRAND_SWATCHES.map((swatch) => {
                const active = normalizeHex(value) === swatch.hex
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => pickSwatch(swatch.hex)}
                    className={`flex min-h-[72px] items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition ${
                      active
                        ? "border-[#1C1917] bg-stone-50 ring-2 ring-[#1C1917]/15"
                        : "border-[#E7E5E4] bg-white active:bg-stone-50"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="h-12 w-12 shrink-0 rounded-full border border-black/10 shadow-sm"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-bold text-stone-900">
                        {swatch.name}
                      </span>
                      {active ? (
                        <span className="text-sm font-medium text-stone-500">
                          Elegido
                        </span>
                      ) : (
                        <span className="text-sm text-stone-400">Elegir</span>
                      )}
                    </span>
                    {active ? (
                      <Check
                        className="h-5 w-5 shrink-0 text-stone-900"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4 px-5 pb-4">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                <span className="text-sm font-medium text-stone-500">
                  Color elegido
                </span>
                <span
                  aria-hidden
                  className="h-24 w-24 rounded-[28px] border border-black/10 shadow-md"
                  style={{ backgroundColor: draftHex }}
                />
              </div>

              <input
                ref={colorInputRef}
                type="color"
                value={draftHex}
                onChange={(e) => setDraft(e.target.value.toUpperCase())}
                tabIndex={-1}
                aria-hidden
                className="pointer-events-none absolute h-px w-px opacity-0"
              />

              <button
                type="button"
                onClick={openNativePalette}
                className="flex min-h-[64px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-lg font-bold text-white shadow-sm active:opacity-90"
              >
                Abrir paleta de colores
              </button>

              <p className="text-center text-sm leading-relaxed text-stone-500">
                Se abre la paleta del teléfono. Elegí el color y después tocá
                “Usar este color”.
              </p>

              {!showCode ? (
                <button
                  type="button"
                  onClick={() => setShowCode(true)}
                  className="text-center text-sm font-semibold text-stone-500 underline-offset-2 hover:underline"
                >
                  ¿Preferís escribir el código?
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-stone-700">
                    Código del color
                  </label>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="#F97316"
                    maxLength={7}
                    className="min-h-14 w-full rounded-2xl border-2 border-[#E7E5E4] px-4 py-3 font-mono text-lg text-stone-900 outline-none focus:border-[var(--color-primary,#F97316)]"
                    spellCheck={false}
                  />
                  {!HEX.test(normalizeHex(draft)) ? (
                    <span className="text-sm text-red-600">
                      Tiene que verse así: #F97316
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mx-0 mb-0 flex-col gap-2 rounded-b-xl border-t border-stone-100 bg-stone-50 p-4 sm:flex-col sm:justify-stretch">
            {!showCustom ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full text-base font-semibold"
                onClick={() => {
                  setDraft(ok ? normalizeHex(value) : "#F97316")
                  setShowCode(false)
                  setShowCustom(true)
                }}
              >
                Otro color…
              </Button>
            ) : (
              <Button
                type="button"
                className="h-12 w-full bg-[var(--color-primary,#F97316)] text-base font-semibold text-white hover:bg-[var(--color-primary,#F97316)]/90"
                disabled={!HEX.test(normalizeHex(draft))}
                onClick={applyCustom}
              >
                Usar este color
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="h-12 w-full text-base font-semibold text-stone-600"
              onClick={() => {
                if (showCustom) {
                  setShowCustom(false)
                  setShowCode(false)
                  return
                }
                setOpen(false)
              }}
            >
              {showCustom ? "Volver a la lista" : "Cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
