export const NETWORK_ERROR_MESSAGE = "Error de red. Reintentá."

export function messageFromCheckoutHttp(
  status: number,
  data: { error?: string } | null | undefined
): string {
  if (data && typeof data.error === "string" && data.error.length > 0) {
    return data.error
  }
  return `No se pudo iniciar el checkout (${status}).`
}
