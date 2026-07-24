"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { CategoryId, Product } from "@/lib/data"

export type Screen =
  | "splash"
  | "onboarding"
  | "auth"
  | "home"
  | "vendors"
  | "vendor"
  | "product"
  | "cart"
  | "delivery"
  | "payment"
  | "tracking"
  | "success"
  | "orders"
  | "notifications"
  | "profile"
  | "support"
  | "settings"

export interface NavParams {
  vendorId?: string
  productId?: string
  category?: CategoryId
}

export interface CartLine {
  product: Product
  qty: number
  note?: string
}

export type PaymentMethod = "cod" | "transfer" | "card"

interface AppState {
  screen: Screen
  params: NavParams
  navigate: (screen: Screen, params?: NavParams) => void
  back: () => void
  canGoBack: boolean

  cart: CartLine[]
  addToCart: (product: Product, qty: number, note?: string) => void
  updateQty: (productId: string, qty: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  cartCount: number
  cartSubtotal: number

  deliveryFee: number
  serviceFee: number

  paymentMethod: PaymentMethod
  setPaymentMethod: (m: PaymentMethod) => void

  userName: string
  isGuest: boolean
  signIn: (name: string, guest?: boolean) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>("splash")
  const [params, setParams] = useState<NavParams>({})
  const [history, setHistory] = useState<{ screen: Screen; params: NavParams }[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod")
  const [userName, setUserName] = useState("Chidera")
  const [isGuest, setIsGuest] = useState(false)

  const navigate = useCallback(
    (next: Screen, nextParams: NavParams = {}) => {
      setHistory((h) => [...h, { screen, params }])
      setScreen(next)
      setParams(nextParams)
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0 })
        const el = document.getElementById("app-scroll")
        if (el) el.scrollTo({ top: 0 })
      }
    },
    [screen, params],
  )

  const back = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setScreen(prev.screen)
      setParams(prev.params)
      return h.slice(0, -1)
    })
  }, [])

  const addToCart = useCallback((product: Product, qty: number, note?: string) => {
    setCart((c) => {
      const existing = c.find((l) => l.product.id === product.id)
      if (existing) {
        return c.map((l) =>
          l.product.id === product.id
            ? { ...l, qty: l.qty + qty, note: note ?? l.note }
            : l,
        )
      }
      return [...c, { product, qty, note }]
    })
  }, [])

  const updateQty = useCallback((productId: string, qty: number) => {
    setCart((c) =>
      qty <= 0
        ? c.filter((l) => l.product.id !== productId)
        : c.map((l) => (l.product.id === productId ? { ...l, qty } : l)),
    )
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart((c) => c.filter((l) => l.product.id !== productId))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const signIn = useCallback((name: string, guest = false) => {
    setUserName(name)
    setIsGuest(guest)
  }, [])

  const cartCount = useMemo(
    () => cart.reduce((sum, l) => sum + l.qty, 0),
    [cart],
  )
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.qty * l.product.price, 0),
    [cart],
  )

  const deliveryFee = cart.length ? 600 : 0
  const serviceFee = cart.length ? 200 : 0

  const value: AppState = {
    screen,
    params,
    navigate,
    back,
    canGoBack: history.length > 0,
    cart,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    cartCount,
    cartSubtotal,
    deliveryFee,
    serviceFee,
    paymentMethod,
    setPaymentMethod,
    userName,
    isGuest,
    signIn,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
