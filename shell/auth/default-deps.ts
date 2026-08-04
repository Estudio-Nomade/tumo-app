import { sendOtp, verifyOtp } from "@/shell/auth/authyo"
import type { AuthDeps } from "@/shell/auth/handlers"
import {
  canSendCode,
  canVerify,
  recordSend,
  recordVerifyAttempt,
  resetVerifyAttempts,
} from "@/shell/auth/rate-limit"
import {
  createSession,
  deleteSession,
  validateSession,
} from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"
import { getEmployeeByPhone } from "@/shell/db/employee"

export const defaultAuthDeps: AuthDeps = {
  getBusiness,
  getEmployeeByPhone,
  sendOtp,
  verifyOtp,
  createSession,
  validateSession,
  deleteSession,
  canSendCode,
  recordSend,
  resetVerifyAttempts,
  canVerify,
  recordVerifyAttempt,
}
