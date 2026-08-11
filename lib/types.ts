export type UserRole = 'user' | 'admin'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  avatar_url?: string | null
  created_at: string
}

export interface Category {
  id: number
  name: string
  slug: string
  image_url: string | null
  created_at: string
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  discount_price: number | null
  category_id: number | null
  category_name?: string
  category_slug?: string
  images: string[]
  stock: number
  rating: number
  rating_count: number
  sizes: string[]
  product_details?: Record<string, string>
  size_stock?: Record<string, number>
  is_featured: boolean
  is_best_seller: boolean
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: number
  user_id: number
  product_id: number
  quantity: number
  size: string | null
  created_at: string
  product?: Product
}

export interface CartItemWithProduct extends CartItem {
  product: Product
}

export interface Order {
  id: number
  user_id: number | null
  status: OrderStatus
  subtotal: number
  shipping_cost: number
  total: number
  shipping_name: string | null
  shipping_phone: string | null
  shipping_address: string | null
  shipping_city: string | null
  shipping_state: string | null
  shipping_zip: string | null
  tracking_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
  user_name?: string
  user_email?: string
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number | null
  product_name: string
  product_image: string | null
  price: number
  quantity: number
  size: string | null
  created_at: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

export interface WishlistItem {
  id: number
  user_id: number
  product_id: number
  created_at: string
  product?: Product
}

export interface Session {
  id: string
  user_id: number
  expires_at: string
  created_at: string
}

export interface AuthUser {
  id: number
  name: string
  email: string
  role: UserRole
  avatar_url?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}
