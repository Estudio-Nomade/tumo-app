import Link from "next/link"
import { formatCents } from "@/modules/orders/lib/types"
import MetricCard from "@/shell/ui/MetricCard"

export function OrdersMetrics({
  slug,
  ordersToday,
  revenueTodayCents,
  receiptsToReview,
}: {
  slug: string
  ordersToday: number
  revenueTodayCents: number
  receiptsToReview: number
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <MetricCard value={ordersToday} label="Pedidos hoy" />
      <MetricCard value={`$ ${formatCents(revenueTodayCents)}`} label="Ingresos hoy" />
      <Link href={`/${slug}/dashboard/orders`} className="block">
        <MetricCard
          value={receiptsToReview}
          label="Comprobantes para revisar"
          variant={receiptsToReview > 0 ? "highlight" : "default"}
        />
      </Link>
    </div>
  )
}
