/** Port between Tumo SaaS billing and payment gateways (MP first). */

export type CreateCheckoutInput = {
  externalReference: string
  planId: string
  title: string
  amountArsCents: number
  payerEmail: string
  payerName?: string
  payerDocument?: string | null
  successUrl: string
  failureUrl: string
  pendingUrl: string
  notificationUrl: string
}

export type CreateCheckoutResult = {
  providerCheckoutId: string
  redirectUrl: string
}

export type ProviderEventType =
  | "payment_succeeded"
  | "payment_failed"
  | "payment_pending"
  | "renewal_succeeded"
  | "renewal_failed"
  | "subscription_cancelled"
  | "chargeback"

export type ProviderEvent = {
  type: ProviderEventType
  providerEventId: string
  externalReference: string
  providerPaymentId?: string
  providerSubscriptionId?: string
  amountCents?: number
  currency?: string
  paidAt?: Date
  raw: unknown
}

export interface PaymentProvider {
  readonly name: string
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>
  parseAndVerifyWebhook(
    rawBody: string,
    headers: Headers | Record<string, string>
  ): Promise<ProviderEvent>
  getPaymentStatus?(providerPaymentId: string): Promise<{
    status: "pending" | "approved" | "rejected" | "other"
    raw: unknown
  }>
}
