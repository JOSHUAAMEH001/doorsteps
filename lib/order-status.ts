/** Shared order status vocabulary. Mirrors the `orders.status` check constraint in Supabase. */

export type OrderStatus = "pending" | "confirmed" | "assigned" | "picked_up" | "delivered" | "cancelled"

export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "assigned", "picked_up", "delivered", "cancelled"]

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value)
}

/** Allowed admin status moves. Admins can correct mistakes but closed orders only step back one stage. */
export const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["pending", "assigned", "cancelled"],
  assigned: ["confirmed", "picked_up", "cancelled"],
  picked_up: ["assigned", "delivered", "cancelled"],
  delivered: ["picked_up"],
  cancelled: ["pending"],
}

/** Rider moves: each step only from the one before it. */
export const RIDER_PREVIOUS: Record<"picked_up" | "delivered", OrderStatus> = {
  picked_up: "assigned",
  delivered: "picked_up",
}

export const ACTIVE_DELIVERY: OrderStatus[] = ["assigned", "picked_up"]
export const IN_PROGRESS: OrderStatus[] = ["confirmed", "assigned", "picked_up"]
/** Orders a customer can open on the tracking screen (placed but not yet finished). */
export const TRACKABLE: OrderStatus[] = ["pending", "confirmed", "assigned", "picked_up"]
export const isTrackable = (status: string) => (TRACKABLE as string[]).includes(status)

type Tone = "neutral" | "brand" | "info" | "warning" | "success" | "danger"

/** One label + tone per status, per audience, so badges read the same everywhere. */
export const STATUS_META: Record<OrderStatus, { label: string; vendorLabel: string; riderLabel: string; tone: Tone }> = {
  pending: { label: "New", vendorLabel: "New order", riderLabel: "Awaiting vendor", tone: "warning" },
  confirmed: { label: "Accepted", vendorLabel: "Preparing", riderLabel: "Ready to claim", tone: "info" },
  assigned: { label: "Rider assigned", vendorLabel: "Rider on the way", riderLabel: "Go to pickup", tone: "brand" },
  picked_up: { label: "On delivery", vendorLabel: "Picked up", riderLabel: "Delivering", tone: "brand" },
  delivered: { label: "Delivered", vendorLabel: "Delivered", riderLabel: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", vendorLabel: "Rejected / cancelled", riderLabel: "Cancelled", tone: "danger" },
}

export type { Tone }
