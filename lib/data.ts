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
  type: string
  banner: string
  rating: number
  reviews: number
  distanceKm: number
  deliveryMins: number
  deliveryFee: number
  tags: string[]
  isOpen: boolean
  promo?: string
}

export interface OrderItem {
  name: string
  qty: number
  price: number
}

export type OrderStatus = "preparing" | "on_the_way" | "delivered" | "cancelled"

export interface Order {
  id: string
  vendorName: string
  vendorId: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  placedAt: string
  eta?: string
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

export function formatNaira(amount: number) {
  return `${NAIRA}${amount.toLocaleString("en-NG")}`
}

export const categories: {
  id: CategoryId
  label: string
  description: string
}[] = [
  { id: "food", label: "Food", description: "Restaurants & meals" },
  { id: "groceries", label: "Groceries", description: "Stores & supermarkets" },
  { id: "errands", label: "Errands", description: "We run it for you" },
  { id: "waybill", label: "Waybill", description: "Send & receive parcels" },
]

export const vendors: Vendor[] = [
  {
    id: "mama-nkechi",
    name: "Mama Nkechi Kitchen",
    category: "food",
    type: "Local dishes • Rice • Swallow",
    banner: "/vendor-restaurant.png",
    rating: 4.8,
    reviews: 1240,
    distanceKm: 0.8,
    deliveryMins: 20,
    deliveryFee: 500,
    tags: ["Jollof", "Amala", "Soups"],
    isOpen: true,
    promo: "Free delivery over ₦5,000",
  },
  {
    id: "campus-bites",
    name: "Campus Bites",
    category: "food",
    type: "Fast food • Shawarma • Snacks",
    banner: "/food-shawarma.png",
    rating: 4.6,
    reviews: 860,
    distanceKm: 1.2,
    deliveryMins: 25,
    deliveryFee: 600,
    tags: ["Shawarma", "Burgers", "Fries"],
    isOpen: true,
    promo: "10% off first order",
  },
  {
    id: "suya-spot",
    name: "Agbani Suya Spot",
    category: "food",
    type: "Grill • Suya • Peppered meat",
    banner: "/food-suya.png",
    rating: 4.7,
    reviews: 540,
    distanceKm: 1.6,
    deliveryMins: 30,
    deliveryFee: 700,
    tags: ["Suya", "Grill", "Drinks"],
    isOpen: true,
  },
  {
    id: "slice-pizza",
    name: "Slice & Co.",
    category: "food",
    type: "Pizza • Pasta • Continental",
    banner: "/food-pizza.png",
    rating: 4.5,
    reviews: 410,
    distanceKm: 2.4,
    deliveryMins: 35,
    deliveryFee: 800,
    tags: ["Pizza", "Pasta"],
    isOpen: false,
  },
  {
    id: "fresh-mart",
    name: "FreshMart Supermarket",
    category: "groceries",
    type: "Supermarket • Provisions • Toiletries",
    banner: "/vendor-supermarket.png",
    rating: 4.7,
    reviews: 980,
    distanceKm: 1.0,
    deliveryMins: 30,
    deliveryFee: 700,
    tags: ["Provisions", "Drinks", "Toiletries"],
    isOpen: true,
    promo: "Buy 2 get 1 free on selected items",
  },
  {
    id: "green-market",
    name: "Agbani Green Market",
    category: "groceries",
    type: "Fresh produce • Foodstuff",
    banner: "/grocery-basket.png",
    rating: 4.6,
    reviews: 620,
    distanceKm: 1.4,
    deliveryMins: 35,
    deliveryFee: 650,
    tags: ["Vegetables", "Foodstuff"],
    isOpen: true,
  },
]

export const products: Product[] = [
  // Mama Nkechi
  {
    id: "p-jollof",
    vendorId: "mama-nkechi",
    name: "Jollof Rice & Chicken",
    description:
      "Smoky party jollof rice served with grilled chicken and fried plantain.",
    price: 2500,
    image: "/food-jollof.png",
    group: "Rice Dishes",
    popular: true,
  },
  {
    id: "p-amala",
    vendorId: "mama-nkechi",
    name: "Amala & Ewedu",
    description: "Soft amala with ewedu soup and assorted meat.",
    price: 2200,
    image: "/food-amala.png",
    group: "Swallow",
    popular: true,
  },
  {
    id: "p-friedrice",
    vendorId: "mama-nkechi",
    name: "Fried Rice & Chicken",
    description: "Colourful fried rice with mixed vegetables and chicken.",
    price: 2600,
    image: "/food-jollof.png",
    group: "Rice Dishes",
  },
  {
    id: "p-smoothie1",
    vendorId: "mama-nkechi",
    name: "Chapman (50cl)",
    description: "Chilled Nigerian chapman with a slice of lemon.",
    price: 800,
    image: "/food-smoothie.png",
    group: "Drinks",
  },
  // Campus Bites
  {
    id: "p-shawarma",
    vendorId: "campus-bites",
    name: "Double Chicken Shawarma",
    description: "Loaded chicken shawarma with sausage and special sauce.",
    price: 1800,
    image: "/food-shawarma.png",
    group: "Shawarma",
    popular: true,
  },
  {
    id: "p-burger",
    vendorId: "campus-bites",
    name: "Beef Burger & Fries",
    description: "Juicy beef patty with cheese, served with crispy fries.",
    price: 2400,
    image: "/food-pizza.png",
    group: "Burgers",
  },
  {
    id: "p-smoothie2",
    vendorId: "campus-bites",
    name: "Fruit Smoothie",
    description: "Fresh blended fruit smoothie, no added sugar.",
    price: 1200,
    image: "/food-smoothie.png",
    group: "Drinks",
    popular: true,
  },
  // Suya Spot
  {
    id: "p-suya",
    vendorId: "suya-spot",
    name: "Beef Suya (Large)",
    description: "Spicy grilled beef skewers with onions and yaji pepper.",
    price: 2000,
    image: "/food-suya.png",
    group: "Grill",
    popular: true,
  },
  {
    id: "p-chicken",
    vendorId: "suya-spot",
    name: "Peppered Chicken",
    description: "Grilled chicken tossed in spicy pepper sauce.",
    price: 3000,
    image: "/food-suya.png",
    group: "Grill",
  },
  // Slice & Co
  {
    id: "p-pizza",
    vendorId: "slice-pizza",
    name: "Chicken BBQ Pizza",
    description: "Wood-fired pizza with BBQ chicken and extra cheese.",
    price: 6500,
    image: "/food-pizza.png",
    group: "Pizza",
    popular: true,
  },
  // FreshMart
  {
    id: "p-provisions",
    vendorId: "fresh-mart",
    name: "Provisions Bundle",
    description: "Spaghetti, noodles, cooking oil, milk and sugar pack.",
    price: 8500,
    image: "/grocery-provisions.png",
    group: "Provisions",
    popular: true,
  },
  {
    id: "p-basket",
    vendorId: "fresh-mart",
    name: "Fresh Produce Basket",
    description: "Tomatoes, onions, pepper and vegetables for the week.",
    price: 5500,
    image: "/grocery-basket.png",
    group: "Fresh Produce",
  },
  // Green Market
  {
    id: "p-produce",
    vendorId: "green-market",
    name: "Weekly Foodstuff Pack",
    description: "Rice, beans, garri and seasoning starter pack.",
    price: 12000,
    image: "/grocery-basket.png",
    group: "Foodstuff",
    popular: true,
  },
]

export const recentOrders: Order[] = [
  {
    id: "DL-4821",
    vendorName: "Mama Nkechi Kitchen",
    vendorId: "mama-nkechi",
    items: [
      { name: "Jollof Rice & Chicken", qty: 2, price: 2500 },
      { name: "Chapman (50cl)", qty: 1, price: 800 },
    ],
    total: 6300,
    status: "on_the_way",
    placedAt: "Today, 1:24 PM",
    eta: "15 mins",
  },
  {
    id: "DL-4796",
    vendorName: "Campus Bites",
    vendorId: "campus-bites",
    items: [{ name: "Double Chicken Shawarma", qty: 2, price: 1800 }],
    total: 4200,
    status: "delivered",
    placedAt: "Yesterday, 7:10 PM",
  },
  {
    id: "DL-4712",
    vendorName: "FreshMart Supermarket",
    vendorId: "fresh-mart",
    items: [{ name: "Provisions Bundle", qty: 1, price: 8500 }],
    total: 9200,
    status: "delivered",
    placedAt: "Mon, 11:02 AM",
  },
  {
    id: "DL-4655",
    vendorName: "Agbani Suya Spot",
    vendorId: "suya-spot",
    items: [{ name: "Beef Suya (Large)", qty: 3, price: 2000 }],
    total: 6700,
    status: "cancelled",
    placedAt: "Sun, 9:40 PM",
  },
]

export const notifications: AppNotification[] = [
  {
    id: "n1",
    title: "Your order is on the way!",
    body: "Emeka is heading to your location with order DL-4821. Track live.",
    time: "2 min ago",
    type: "order",
    unread: true,
  },
  {
    id: "n2",
    title: "₦1,000 off your next order",
    body: "Use code AGBANI10 at checkout before Sunday. Enjoy!",
    time: "1 hr ago",
    type: "promo",
    unread: true,
  },
  {
    id: "n3",
    title: "Order delivered",
    body: "Your order from Campus Bites was delivered. Rate your experience.",
    time: "Yesterday",
    type: "order",
    unread: false,
  },
  {
    id: "n4",
    title: "Welcome to Doorsteps Logistics",
    body: "Fast doorstep delivery across ESUT Agbani. Let's get you started.",
    time: "2 days ago",
    type: "system",
    unread: false,
  },
]

export const orderStatusSteps: {
  key: OrderStatus | "confirmed"
  label: string
  desc: string
}[] = [
  { key: "confirmed", label: "Order confirmed", desc: "Vendor accepted your order" },
  { key: "preparing", label: "Preparing your order", desc: "Your food is being packed" },
  { key: "on_the_way", label: "Rider on the way", desc: "Emeka is heading to you" },
  { key: "delivered", label: "Delivered", desc: "Enjoy your order!" },
]
