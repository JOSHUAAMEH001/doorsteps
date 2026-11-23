/** Vendor categories the customer app understands (it lists vendors under Food or Groceries). */
export const STORE_CATEGORIES = ["Food", "Groceries"] as const
export type StoreCategory = (typeof STORE_CATEGORIES)[number]
