"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useSyncExternalStore } from "react"
import { cartSummary, loadCart } from "@/modules/orders/lib/cart"

const listeners = new Set<() => void>()

function subscribeCart(cb: () => void) {
  listeners.add(cb)
  function onStorage(e: StorageEvent) {
    if (e.key?.startsWith("tumo_cart_")) cb()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener("focus", cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", onStorage)
    window.removeEventListener("focus", cb)
  }
}

function getCartCount(slug: string): number {
  try {
    return cartSummary(loadCart(slug)).count
  } catch {
    return 0
  }
}

export function notifyOrdersCartChanged() {
  for (const cb of listeners) cb()
}

export default function OrdersPublicNav({
  slug,
  count,
}: {
  slug: string
  count?: number
}) {
  const pathname = usePathname()
  const getSnapshot = useCallback(() => getCartCount(slug), [slug])
  const storeCount = useSyncExternalStore(
    subscribeCart,
    getSnapshot,
    () => 0
  )
  const badge = count != null ? count : storeCount
  const menuHref = `/${slug}/orders`
  const cartHref = `/${slug}/orders/cart`
  const onMenu =
    pathname === menuHref ||
    pathname?.startsWith(`/${slug}/orders/producto`)
  const onCart = pathname === cartHref || pathname?.startsWith(`${cartHref}/`)

  return (
    <nav
      aria-label="Pedidos"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E7E5E4] bg-[var(--color-surface-public,#FFFFFF)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex w-full max-w-md">
        <Link
          href={menuHref}
          className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-base font-semibold ${
            onMenu
              ? "text-[var(--color-primary,#F97316)]"
              : "text-[var(--color-muted-public,#78716C)]"
          }`}
        >
          Menú
        </Link>
        <Link
          href={cartHref}
          className={`relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-base font-semibold ${
            onCart
              ? "text-[var(--color-primary,#F97316)]"
              : "text-[var(--color-muted-public,#78716C)]"
          }`}
        >
          <span className="relative inline-flex items-center">
            Carrito
            {badge > 0 ? (
              <span className="ml-1.5 inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[var(--color-primary,#F97316)] px-1.5 text-xs font-bold text-white">
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </span>
        </Link>
      </div>
    </nav>
  )
}
