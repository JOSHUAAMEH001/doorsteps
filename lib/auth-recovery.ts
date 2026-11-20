/** localStorage key set when a password reset email is requested (value: request time in ms). */
export const RECOVERY_FLAG = "doors:recovery-requested"
/** Reset links are treated as pending for this long after the request. */
export const RECOVERY_WINDOW_MS = 60 * 60 * 1000

export function hasPendingRecovery() {
  try {
    const at = Number(window.localStorage.getItem(RECOVERY_FLAG))
    return Number.isFinite(at) && at > 0 && Date.now() - at < RECOVERY_WINDOW_MS
  } catch {
    return false
  }
}

export function clearPendingRecovery() {
  try { window.localStorage.removeItem(RECOVERY_FLAG) } catch { /* storage unavailable */ }
}
