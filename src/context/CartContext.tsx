"use client";
import { createContext, useContext, useReducer, ReactNode } from "react";

export type CartItem = {
  id: string;
  productId: string;
  negocioId: string;
  negocioNombre: string;
  nombre: string;
  precio: number;
  cantidad: number;
  descripcion: string;
};

type CartState = {
  items: CartItem[];
  negocioId: string | null;
  negocioNombre: string;
  propina: number;
};

type CartAction =
  | { type: "ADD_ITEM"; payload: { productId: string; negocioId: string; negocioNombre: string; nombre: string; precio: number; descripcion: string } }
  | { type: "REMOVE_ITEM"; payload: { productId: string } }
  | { type: "UPDATE_QUANTITY"; payload: { productId: string; cantidad: number } }
  | { type: "CLEAR_CART" }
  | { type: "SET_PROPINA"; payload: number }
  | { type: "FORCE_ADD"; payload: { productId: string; negocioId: string; negocioNombre: string; nombre: string; precio: number; descripcion: string } };

function loadCart(): CartState {
  if (typeof window === "undefined") return { items: [], negocioId: null, negocioNombre: "", propina: 0 };
  try {
    const raw = localStorage.getItem("domiu_cart");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && "items" in parsed) return { propina: 0, ...parsed };
    }
  } catch {}
  return { items: [], negocioId: null, negocioNombre: "", propina: 0 };
}

function saveCart(state: CartState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("domiu_cart", JSON.stringify(state)); } catch {}
}

function cartReducer(state: CartState, action: CartAction): CartState {
  let next: CartState;
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find(i => i.productId === action.payload.productId);
      if (existing) {
        next = { ...state, items: state.items.map(i => i.productId === action.payload.productId ? { ...i, cantidad: i.cantidad + 1 } : i) };
      } else {
        next = {
          ...state,
          negocioId: action.payload.negocioId,
          negocioNombre: action.payload.negocioNombre,
          items: [...state.items, { id: crypto.randomUUID(), ...action.payload, cantidad: 1 }],
        };
      }
      break;
    }
    case "REMOVE_ITEM":
      next = { ...state, items: state.items.filter(i => i.productId !== action.payload.productId) };
      break;
    case "UPDATE_QUANTITY": {
      if (action.payload.cantidad <= 0) {
        next = { ...state, items: state.items.filter(i => i.productId !== action.payload.productId) };
      } else {
        next = { ...state, items: state.items.map(i => i.productId === action.payload.productId ? { ...i, cantidad: action.payload.cantidad } : i) };
      }
      break;
    }
    case "CLEAR_CART":
      next = { items: [], negocioId: null, negocioNombre: "", propina: 0 };
      break;
    case "SET_PROPINA":
      next = { ...state, propina: action.payload };
      break;
    case "FORCE_ADD":
      next = {
        negocioId: action.payload.negocioId,
        negocioNombre: action.payload.negocioNombre,
        propina: 0,
        items: [{ id: crypto.randomUUID(), ...action.payload, cantidad: 1 }],
      };
      break;
    default:
      return state;
  }
  saveCart(next);
  return next;
}

const CartContext = createContext<{
  items: CartItem[];
  negocioId: string | null;
  negocioNombre: string;
  propina: number;
  addItem: (item: Omit<CartItem, "id" | "cantidad">) => void;
  forceAdd: (item: Omit<CartItem, "id" | "cantidad">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, cantidad: number) => void;
  clearCart: () => void;
  setPropina: (v: number) => void;
  totalItems: number;
  subtotal: number;
} | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart);

  const addItem = (item: Omit<CartItem, "id" | "cantidad">) => dispatch({ type: "ADD_ITEM", payload: item });
  const forceAdd = (item: Omit<CartItem, "id" | "cantidad">) => dispatch({ type: "FORCE_ADD", payload: item });
  const removeItem = (productId: string) => dispatch({ type: "REMOVE_ITEM", payload: { productId } });
  const updateQuantity = (productId: string, cantidad: number) => dispatch({ type: "UPDATE_QUANTITY", payload: { productId, cantidad } });
  const clearCart = () => dispatch({ type: "CLEAR_CART" });
  const setPropina = (v: number) => dispatch({ type: "SET_PROPINA", payload: v });
  const totalItems = state.items.reduce((sum, i) => sum + i.cantidad, 0);
  const subtotal = state.items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  return (
    <CartContext.Provider value={{ ...state, addItem, forceAdd, removeItem, updateQuantity, clearCart, setPropina, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
