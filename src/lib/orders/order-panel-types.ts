export interface PanelOrderItem {
  id: string;
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  isCustomItem: boolean;
  variantSelections: Record<string, unknown> | null;
  specialInstructions: string | null;
}

export interface BusinessPanelOrder {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerKind: 'registered' | 'guest';
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  items: PanelOrderItem[];
  createdAt: string;
  updatedAt: string;
  deliveryType: 'delivery' | 'pickup';
  deliveryAddress: string;
  deliveryInstructions: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  specialInstructions: string | null;
  courierId: string | null;
  courierName: string | null;
  createdManually: boolean;
  salesChannel: string;
}

export interface AdminPanelOrder {
  id: string;
  orderNumber: string;
  customerName: string | null;
  businessName: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  courierName: string | null;
  createdAt: string;
  orderType: string | null;
  courierEarnings: number | null;
  platformEarnings: number | null;
  createdManually: boolean;
  salesChannel: string;
  deliveryType: string;
}
