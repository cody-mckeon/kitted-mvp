"use client";
import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";

export type CartProduct = { id: string; name: string; category: string; price: number };
type CartLine = CartProduct & { quantity: number };
type CartState = { lines: CartLine[] };
type CartContextValue = CartState & { itemCount: number; subtotal: number; addProduct: (product: CartProduct) => void };
const CartContext = createContext<CartContextValue | null>(null);

export function cartReducer(state: CartState, product: CartProduct): CartState {
  const existing = state.lines.find((line) => line.id === product.id);
  if (!existing) return { lines: [...state.lines, { ...product, quantity: 1 }] };
  return { lines: state.lines.map((line) => line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line) };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, addProduct] = useReducer(cartReducer, { lines: [] });
  const value = useMemo(() => ({
    ...state,
    itemCount: state.lines.reduce((total, line) => total + line.quantity, 0),
    subtotal: state.lines.reduce((total, line) => total + line.price * line.quantity, 0),
    addProduct,
  }), [state]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used within CartProvider");
  return cart;
}
