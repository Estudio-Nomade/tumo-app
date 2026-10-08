export type CheckoutRouteErrorBody = {
  error: string
  code: string
}

function collectErrorTokens(err: unknown): string {
  const parts: string[] = []
  const walk = (value: unknown, depth: number) => {
    if (value == null || depth > 3) return
    if (typeof value === "string") {
      parts.push(value)
      return
    }
    if (typeof value !== "object") return
    const o = value as {
      message?: unknown
      code?: unknown
      cause?: unknown
      errors?: unknown
    }
    if (typeof o.message === "string") parts.push(o.message)
    if (typeof o.code === "string" || typeof o.code === "number") {
      parts.push(String(o.code))
    }
    if (o.cause) walk(o.cause, depth + 1)
    if (Array.isArray(o.errors)) {
      for (const nested of o.errors) walk(nested, depth + 1)
    }
  }
  walk(err, 0)
  return parts.join(" ").toLowerCase()
}

function isDbConnectivityFailure(err: unknown): boolean {
  const tokens = collectErrorTokens(err)
  return (
    tokens.includes("econnrefused") ||
    tokens.includes("enotfound") ||
    tokens.includes("econnreset") ||
    tokens.includes("connection terminated")
  )
}

export function jsonFromCheckoutThrow(err: unknown): {
  status: number
  body: CheckoutRouteErrorBody
} {
  if (isDbConnectivityFailure(err)) {
    return {
      status: 503,
      body: {
        error: "No pudimos guardar el alta. Revisá la base / reintentá.",
        code: "db_unavailable",
      },
    }
  }
  return {
    status: 500,
    body: {
      error: "No se pudo iniciar el checkout. Reintentá.",
      code: "internal_error",
    },
  }
}
