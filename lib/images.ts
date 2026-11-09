const image = (id: string) =>
  `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`

const restaurantDishImages: Record<string, string> = {
  jollof: image("photo-1603133872878-684f208fb84b"),
  "fried rice": image("photo-1512058564366-18510be2db19"),
  soup: image("photo-1547592180-85f173990554"),
  "pounded yam": image("photo-1601050690597-df0568f70950"),
  amala: image("photo-1601050690117-94f5f6fa8bd7"),
  eba: image("photo-1601050690117-94f5f6fa8bd7"),
  chicken: image("photo-1532550907401-a500c9a57435"),
  suya: image("photo-1544025162-d76694265947"),
  shawarma: image("photo-1529006557810-274b9b2fc783"),
  burger: image("photo-1568901346375-23c9450c58cd"),
  pizza: image("photo-1513104890138-7c749659a591"),
  pie: image("photo-1578985545062-69928b1d9587"),
  puff: image("photo-1558961363-fa8fdf82db35"),
  smoothie: image("photo-1553530666-ba11a7da3888"),
  zobo: image("photo-1546173159-315724a31696"),
  chapman: image("photo-1544145945-f90425340c7e"),
  indomie: image("photo-1569718212165-3a8278d5f624"),
  spaghetti: image("photo-1551892374-ecf8754cf8b0"),
  beans: image("photo-1551183053-bf91a1d81141"),
  plantain: image("photo-1601050690597-df0568f70950"),
  egg: image("photo-1525351484163-7529414344d8"),
}

const groceryImages: Record<string, string> = {
  rice: image("photo-1586201375761-83865001e31c"),
  noodle: image("photo-1585032226651-759b368d7246"),
  water: image("photo-1548839140-29a749e1cf4d"),
  milk: image("photo-1563636619-e9143da7973b"),
  bread: image("photo-1509440159596-0249088772ff"),
  egg: image("photo-1491524062933-cb0289261700"),
  oil: image("photo-1474979266404-7eaacbcd87c5"),
  tomato: image("photo-1546094096-0df4bcaaa337"),
  sugar: image("photo-1581441363689-1f3c3c414635"),
  detergent: image("photo-1583947215259-38e31be8751f"),
  toiletries: image("photo-1556228720-195a672e8a03"),
  drink: image("photo-1544145945-f90425340c7e"),
}

const vendorImages: Record<string, string> = {
  "frayo restaurant": image("photo-1517248135467-4c7edcad34c4"),
  "golden plate": image("photo-1515003197210-e0cd71810b5f"),
  "suzzy park restaurant": image("photo-1517248135467-4c7edcad34c4"),
  "suzzy park superstore": image("photo-1534723452862-4c874018d66d"),
  "four corner restaurant": image("photo-1552566626-52f8b828add7"),
  "four corner superstore": image("photo-1601598851547-4302969d4d3c"),
}

export const genericFoodImage = image("photo-1546069901-ba9599a7e63c")
export const genericGroceryImage = image("photo-1542838132-92c53300491e")

export function getVendorImage(name = "", category = "") {
  return vendorImages[name.trim().toLowerCase()] ??
    (category.toLowerCase().includes("grocer") ? genericGroceryImage : genericFoodImage)
}

export function getDishImage(name = "", category = "food") {
  const normalized = name.toLowerCase()
  const map = category.toLowerCase().includes("grocer") ? groceryImages : restaurantDishImages
  const match = Object.keys(map).find((keyword) => normalized.includes(keyword))
  return match ? map[match] : category.toLowerCase().includes("grocer") ? genericGroceryImage : genericFoodImage
}

export function getImageUrl(url: string | null | undefined, fallback: string) {
  return url?.trim() ? url : fallback
}
