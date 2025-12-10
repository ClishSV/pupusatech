import { create } from 'zustand'

// Definimos cómo se ve un item en el carrito
interface CartItem {
  cartId: string // Un ID único para diferenciar (ej: Revuelta Maíz vs Revuelta Arroz)
  id: string     // El ID original del producto
  name: string
  price: number
  dough?: string // "maiz" o "arroz" (opcional porque las cocas no tienen masa)
}

interface CartStore {
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (cartId: string) => void
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  cart: [],
  
  addToCart: (item) => set((state) => ({ 
    cart: [...state.cart, item] 
  })),
  
  removeFromCart: (cartId) => set((state) => ({
    cart: state.cart.filter((i) => i.cartId !== cartId)
  })),
  
  clearCart: () => set({ cart: [] }),
  
  total: () => {
    return get().cart.reduce((sum, item) => sum + item.price, 0)
  }
}))