export type CategoryId = "food" | "groceries" | "errands" | "waybill"

export interface Product {
  id: string
  vendorId: string
  name: string
  description: string
  price: number
  image: string
  group: string
  popular?: boolean
}

export interface Vendor {
  id: string
  name: string
  category: CategoryId
  image: string
  rating: number | null
  deliveryMins: number | null
  deliveryFee: number | null
  isOpen: boolean
}

export interface OrderItem {
  name: string
  qty: number
  price: number
}

export type OrderStatus = "preparing" | "assigned" | "picked_up" | "on_the_way" | "delivered" | "cancelled"

export interface Order {
  id: string
  vendorName: string
  vendorId: string | null
  items: OrderItem[]
  total: number
  status: OrderStatus
  placedAt: string
}

export interface AppNotification {
  id: string
  title: string
  body: string
  time: string
  type: "order" | "promo" | "system"
  unread: boolean
}

export const NAIRA = "\u20A6"

export function formatNaira(amount: number | null | undefined) {
  return `${NAIRA}${(amount ?? 0).toLocaleString("en-NG")}`
}

export const categories: { id: CategoryId; label: string; description: string }[] = [
  { id: "food", label: "Food", description: "Restaurants & meals" },
  { id: "groceries", label: "Groceries", description: "Stores & supermarkets" },
  { id: "errands", label: "Errands", description: "No vendors yet" },
  { id: "waybill", label: "Waybill", description: "No vendors yet" },
]
