/**
 * DOORS bank account for manual transfers, as confirmed by the DOORS owner (2026-11-22).
 * Change ONLY on the owner's instruction: a wrong number sends customers' money to a stranger.
 * Manual transfers are confirmed by an admin (Admin → Payments → "Confirm payment").
 */
export const TRANSFER_ACCOUNT = {
  bank: "Moniepoint",
  accountName: "Doorsteps Campus Logistics Limited",
  accountNumber: "3001422614",
} as const
