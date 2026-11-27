"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import useSWR from "swr"
import { getMyOrders, getVendors } from "@/app/actions/catalog"
import { getCurrentProfile, type Role } from "@/app/actions/roles"
import { getOrderingStatus } from "@/app/actions/ordering"
import type { CategoryId, Order, Product, Vendor } from "@/lib/data"

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
  | "vendorDashboard"
  | "riderDashboard"
  | "adminDashboard"
  | "adminOrders"
  | "notifications"
  | "profile"
  | "support"
  | "settings"

export interface NavParams {
  vendorId?: string
  productId?: string
  category?: CategoryId
  orderCode?: string
  searchQuery?: string
}

/** Which main tab a screen belongs to, so the nav highlights the right one on sub-screens. */
export function tabForScreen(screen: Screen): Screen {
  switch (screen) {
    case "vendors":
    case "vendor":
    case "product":
      return "home"
    case "delivery":
    case "payment":
      return "cart"
    case "tracking":
    case "success":
    case "adminOrders":
      return "orders"
    case "support":
    case "settings":
      return "profile"
    default:
      return screen
  }
}

/** Where someone lands after signing in (or reopening the app signed in). */
export function landingScreen(role: Role | null | undefined, hasCartItems: boolean): Screen {
  if (role === "vendor") return "vendorDashboard"
  if (role === "rider") return "riderDashboard"
  if (role === "admin") return "adminDashboard"
  // A customer who was checking out goes back to their cart.
  return hasCartItems ? "cart" : "home"
}

export interface CartLine {
  product: Product
  qty: number
  note?: string
}

export type PaymentMethod = "cod" | "transfer" | "card"

export interface DeliveryDetails {
  address: string
  /** Room / hostel / landmark, so the rider finds the exact spot. */
  landmark: string
  phone: string
  instructions: string
  time: string
  /** Pinned drop-off point, only when the customer shared or placed one. */
  dropoffLat: number | null
  dropoffLng: number | null
}

/**
 * Result of addToCart: "conflict" means the item is from another vendor and the user is being asked;
 * "closed" means ordering hasn't started (the "Ordering has not started yet" notice is shown).
 */
export type AddToCartResult = "added" | "conflict" | "closed"

interface PendingCartReplace {
  product: Product
  qty: number
  note?: string
  onAdded?: () => void
}

/** Screens that are never kept in the back stack (leaving them replaces the history entry). */
const TRANSIENT_SCREENS = new Set<Screen>(["splash", "onboarding", "auth"])
const CART_STORAGE_KEY = "doors-cart"

/** What we store in window.history.state for each in-app screen. */
type DoorsHistoryState = { doors: true; floor?: boolean; screen?: Screen; params?: NavParams; idx: number }

function isDoorsState(value: unknown): value is DoorsHistoryState {
  return Boolean(value && typeof value === "object" && (value as { doors?: unknown }).doors === true)
}

function sameParams(a: NavParams, b: NavParams) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof NavParams>
  for (const key of keys) if (a[key] !== b[key]) return false
  return true
}

function scrollToTop() {
  if (typeof window === "undefined") return
  window.scrollTo({ top: 0 })
  document.getElementById("app-scroll")?.scrollTo({ top: 0 })
}

function readStoredCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((line): line is CartLine => {
      const l = line as Partial<CartLine>
      return Boolean(l && l.product && typeof l.product.id === "string" && typeof l.product.vendorId === "string"
        && typeof l.product.price === "number" && Number.isInteger(l.qty) && (l.qty as number) > 0)
    })
  } catch {
    return []
  }
}

function writeStoredCart(cart: CartLine[]) {
  try {
    if (cart.length) window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    else window.localStorage.removeItem(CART_STORAGE_KEY)
  } catch {
    // Storage unavailable (private mode, blocked): the cart still works for this visit.
  }
}

interface AppState {
  screen: Screen
  params: NavParams
  /** Pass { replace: true } to swap the current screen instead of adding a Back step. */
  navigate: (screen: Screen, params?: NavParams, options?: { replace?: boolean }) => void
  back: () => void
  canGoBack: boolean

  vendors: Vendor[]
  vendorsLoading: boolean
  vendorsError: unknown
  orders: Order[]
  ordersLoading: boolean
  cart: CartLine[]
  /** Adds to the cart, or asks before replacing a cart from another vendor. onAdded runs once the item is in. */
  addToCart: (product: Product, qty: number, note?: string, onAdded?: () => void) => AddToCartResult
  pendingCartReplace: PendingCartReplace | null
  confirmCartReplace: () => void
  cancelCartReplace: () => void
  cartVendorId: string | null
  /** False while DOORS isn't taking orders from this visitor (site_settings.orders_open off). */
  orderingOpen: boolean
  /** Whether the "Ordering has not started yet" notice is showing. */
  orderingNotice: boolean
  showOrderingNotice: () => void
  closeOrderingNotice: () => void
  updateQty: (productId: string, qty: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  orderId: string | null
  placeOrder: (orderCode: string) => void
  cartCount: number
  cartSubtotal: number

  deliveryFee: number
  serviceFee: number

  paymentMethod: PaymentMethod
  setPaymentMethod: (m: PaymentMethod) => void
  deliveryDetails: DeliveryDetails | null
  setDeliveryDetails: (details: DeliveryDetails) => void

  userName: string
  isGuest: boolean
  role: Role | null
  isAdmin: boolean
  /** True once we know whether someone is signed in (profile request finished). */
  authChecked: boolean
  isSignedIn: boolean
  signIn: (name: string, guest?: boolean) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children, initialScreen = "splash", initialParams = {}, initialVendors = [] }: { children: ReactNode; initialScreen?: Screen; initialParams?: NavParams; initialVendors?: Awaited<ReturnType<typeof getVendors>> }) {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [params, setParams] = useState<NavParams>(initialParams)
  const [historyIndex, setHistoryIndex] = useState(0)
  const [cart, setCart] = useState<CartLine[]>([])
  const [pendingCartReplace, setPendingCartReplace] = useState<PendingCartReplace | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod")
  const [deliveryDetails, setDeliveryDetails] = useState<AppState["deliveryDetails"]>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [userName, setUserName] = useState("Customer")
  const [isGuest, setIsGuest] = useState(false)
  const { data: vendorRows = [], error: vendorsError, isLoading: vendorsLoading } = useSWR("vendors", () => getVendors(), {
    fallbackData: initialVendors,
    revalidateOnMount: initialVendors.length === 0,
  })
  const { data: orderRows = [], isLoading: ordersLoading } = useSWR("my-orders", getMyOrders)
  const { data: profileResult, isLoading: profileLoading } = useSWR("current-profile", getCurrentProfile)
  const role = profileResult?.data?.role ?? null
  const isSignedIn = Boolean(profileResult?.data)
  const authChecked = !profileLoading
  const profile = profileResult?.data
  const profileName = profile?.full_name?.trim() || profile?.email?.split("@")[0]?.trim()
  const displayName = profile ? profileName || "Customer" : userName

  // Is DOORS taking orders from this visitor? (Admins and testers can order while it's closed.)
  // Unknown (loading or error) counts as open: the database refuses orders anyway when closed.
  const { data: ordering } = useSWR(["ordering-status", profile?.id ?? "guest"], () => getOrderingStatus(), {
    revalidateOnFocus: true,
    // Keep the last answer while it re-checks after sign-in, so the switch doesn't flicker to "open".
    keepPreviousData: true,
  })
  const orderingOpen = ordering?.canOrder !== false
  const orderingOpenRef = useRef(orderingOpen)
  useLayoutEffect(() => {
    orderingOpenRef.current = orderingOpen
  }, [orderingOpen])
  const [orderingNotice, setOrderingNotice] = useState(false)
  const showOrderingNotice = useCallback(() => setOrderingNotice(true), [])
  const closeOrderingNotice = useCallback(() => setOrderingNotice(false), [])

  const vendors = useMemo<Vendor[]>(
    () => vendorRows.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      category: String(vendor.category).toLowerCase() as CategoryId,
      image: vendor.image_url ?? "",
      rating: vendor.rating,
      deliveryMins: vendor.delivery_minutes,
      deliveryFee: null,
      isOpen: vendor.is_active,
    })),
    [vendorRows],
  )
  const orders = useMemo<Order[]>(
    () => orderRows.map((order) => ({
      id: order.order_code,
      vendorId: order.vendor_id,
      vendorName: Array.isArray(order.vendors) ? (order.vendors[0] as { name: string } | undefined)?.name ?? "Unknown vendor" : (order.vendors as { name: string } | null)?.name ?? "Unknown vendor",
      items: (order.order_items ?? []).map((item) => ({ name: item.item_name, qty: item.quantity, price: item.unit_price })),
      total: order.total,
      status: order.status as Order["status"],
      placedAt: new Date(order.created_at).toLocaleString("en-NG"),
    })),
    [orderRows],
  )

  // Latest values for the history listeners, which are registered once.
  const screenRef = useRef(screen)
  const paramsRef = useRef(params)
  const indexRef = useRef(0)
  const cartRef = useRef(cart)
  const signedInRef = useRef(isSignedIn)
  const deliveryRef = useRef(deliveryDetails)
  useLayoutEffect(() => {
    screenRef.current = screen
    paramsRef.current = params
    cartRef.current = cart
    signedInRef.current = isSignedIn
    deliveryRef.current = deliveryDetails
  }, [screen, params, cart, isSignedIn, deliveryDetails])

  const show = useCallback((next: Screen, nextParams: NavParams, index: number) => {
    screenRef.current = next
    paramsRef.current = nextParams
    indexRef.current = index
    setScreen(next)
    setParams(nextParams)
    setHistoryIndex(index)
    scrollToTop()
  }, [])

  /**
   * In-app navigation is mirrored into the browser history so the browser/phone Back button
   * moves between screens instead of leaving the app. The URL stays on the current path
   * (query and hash dropped, so a reload never reopens the login screen by accident).
   */
  const navigate = useCallback(
    (next: Screen, nextParams: NavParams = {}, options?: { replace?: boolean }) => {
      if (next === screenRef.current && sameParams(nextParams, paramsRef.current)) {
        scrollToTop()
        return
      }
      // Splash, onboarding and login are never kept as a Back step.
      const replace = Boolean(options?.replace) || TRANSIENT_SCREENS.has(screenRef.current)
      const index = replace ? indexRef.current : indexRef.current + 1
      if (typeof window !== "undefined") {
        const state: DoorsHistoryState = { doors: true, screen: next, params: nextParams, idx: index }
        try {
          if (replace) window.history.replaceState(state, "", window.location.pathname)
          else window.history.pushState(state, "", window.location.pathname)
        } catch {
          // History API unavailable: in-app navigation still works.
        }
      }
      show(next, nextParams, index)
    },
    [show],
  )

  // Register the first screen and listen for the browser Back/Forward buttons.
  useEffect(() => {
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""))
    // Auth email links on "/" are forwarded elsewhere by AppShell; don't touch their URL.
    const isAuthLink = url.searchParams.has("code") || hash.has("access_token") || url.searchParams.has("error_code") || hash.has("error_code")
    // Deferred one tick: Next.js wires up its own history handling after this effect runs, and
    // entries created before that make Next reload the page when Back reaches them.
    const setupTimer = window.setTimeout(() => {
      if (isAuthLink) return
      try {
        const first: DoorsHistoryState = { doors: true, screen: screenRef.current, params: paramsRef.current, idx: 0 }
        const existing: unknown = window.history.state
        if (isDoorsState(existing) && !existing.floor && existing.idx >= 0) {
          // Reload: keep the existing stack, start again from the first screen.
          window.history.replaceState({ ...first, idx: existing.idx }, "", url.pathname)
          indexRef.current = existing.idx
          setHistoryIndex(indexRef.current)
        } else {
          // A "floor" entry under the app, so Back from the first screen stays in the app.
          window.history.replaceState({ doors: true, floor: true, idx: -1 } satisfies DoorsHistoryState, "", url.pathname)
          window.history.pushState(first, "", url.pathname)
        }
      } catch {
        // History API unavailable.
      }
    }, 0)

    function onPopState(event: PopStateEvent) {
      const state = event.state
      if (!isDoorsState(state)) return
      const signedIn = signedInRef.current
      if (state.floor || !state.screen) {
        // Nothing earlier in the app. Signed-out visitors on the intro/login screens may leave;
        // everyone else stays on (or goes to) home.
        if (!signedIn && TRANSIENT_SCREENS.has(screenRef.current)) {
          window.history.back()
          return
        }
        const home: DoorsHistoryState = { doors: true, screen: "home", params: {}, idx: 0 }
        window.history.pushState(home, "", window.location.pathname)
        show("home", {}, 0)
        return
      }
      let target = state.screen
      let targetParams = state.params ?? {}
      // A signed-in user never goes Back to the splash/intro/login screens.
      if (signedIn && TRANSIENT_SCREENS.has(target)) target = "home"
      // Checkout steps only make sense with something in the cart.
      if ((target === "delivery" || target === "payment") && cartRef.current.length === 0) target = "home"
      else if (target === "payment" && !deliveryRef.current) target = "delivery"
      if (target !== state.screen) {
        targetParams = {}
        window.history.replaceState({ doors: true, screen: target, params: targetParams, idx: state.idx } satisfies DoorsHistoryState, "", window.location.pathname)
      }
      show(target, targetParams, state.idx)
    }

    window.addEventListener("popstate", onPopState)
    return () => {
      window.clearTimeout(setupTimer)
      window.removeEventListener("popstate", onPopState)
    }
  }, [show])

  const canGoBack = historyIndex > 0 || screen !== "home"

  /** In-app Back: same as the browser Back button. With no earlier screen, go (or stay) home. */
  const back = useCallback(() => {
    if (indexRef.current > 0) {
      window.history.back()
    } else if (screenRef.current !== "home") {
      navigate("home", {}, { replace: true })
    }
  }, [navigate])

  // Restore the cart saved on this device, then keep it saved.
  const cartLoaded = useRef(false)
  useEffect(() => {
    // localStorage only exists in the browser, so the saved cart is restored after the first
    // render (restoring it during render would not match the server-rendered HTML).
    const saved = readStoredCart()
    cartLoaded.current = true
    if (saved.length) {
      cartRef.current = saved
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from browser storage
      setCart(saved)
    }
  }, [])
  useEffect(() => {
    if (cartLoaded.current) writeStoredCart(cart)
  }, [cart])

  const cartVendorId = cart[0]?.product.vendorId ?? null

  const addToCart = useCallback((product: Product, qty: number, note?: string, onAdded?: () => void): AddToCartResult => {
    // Before launch: tell the customer ordering hasn't started instead of filling a cart they can't check out.
    if (!orderingOpenRef.current) {
      setOrderingNotice(true)
      return "closed"
    }
    const current = cartRef.current
    // One order goes to one vendor: ask before replacing a cart from another vendor.
    if (current.length > 0 && current[0].product.vendorId !== product.vendorId) {
      setPendingCartReplace({ product, qty, note, onAdded })
      return "conflict"
    }
    const existing = current.find((l) => l.product.id === product.id)
    const nextCart = existing
      ? current.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + qty, note: note ?? l.note } : l))
      : [...current, { product, qty, note }]
    cartRef.current = nextCart
    setCart(nextCart)
    onAdded?.()
    return "added"
  }, [])

  const pendingRef = useRef(pendingCartReplace)
  useLayoutEffect(() => {
    pendingRef.current = pendingCartReplace
  }, [pendingCartReplace])

  const confirmCartReplace = useCallback(() => {
    const pending = pendingRef.current
    pendingRef.current = null
    setPendingCartReplace(null)
    if (!pending) return
    const nextCart = [{ product: pending.product, qty: pending.qty, note: pending.note }]
    cartRef.current = nextCart
    setCart(nextCart)
    pending.onAdded?.()
  }, [])

  const cancelCartReplace = useCallback(() => setPendingCartReplace(null), [])

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

  const clearCart = useCallback(() => {
    cartRef.current = []
    setCart([])
  }, [])

  const placeOrder = useCallback((orderCode: string) => {
    setOrderId(orderCode)
  }, [])

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

  const deliveryFee = 0
  const serviceFee = 0

  const value: AppState = {
    screen,
    params,
    navigate,
    back,
    canGoBack,
    vendors,
    vendorsLoading,
    vendorsError,
    orders,
    ordersLoading,
    cart,
    addToCart,
    pendingCartReplace,
    confirmCartReplace,
    cancelCartReplace,
    cartVendorId,
    orderingOpen,
    orderingNotice,
    showOrderingNotice,
    closeOrderingNotice,
    updateQty,
    removeFromCart,
    clearCart,
    orderId,
    placeOrder,
    cartCount,
    cartSubtotal,
    deliveryFee,
    serviceFee,
    paymentMethod,
    setPaymentMethod,
    deliveryDetails,
    setDeliveryDetails,
    userName: displayName,
    isGuest,
    role,
    isAdmin: role === "admin",
    authChecked,
    isSignedIn,
    signIn,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
