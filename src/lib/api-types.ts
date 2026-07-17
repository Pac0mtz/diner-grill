// Shared types for the ordering API.

export type ApiMenuItem = {
  id: number;
  name: string;
  price_cents: number;
  description: string | null;
  tag: string | null;
};

export type ApiMenuSection = {
  id: number;
  label: string;
  note: string | null;
  sort: number;
  items: ApiMenuItem[];
};

export type OrderLine = {
  item_id: number;
  name: string;
  qty: number;
  price_cents: number;
};

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "ready"
  | "done"
  | "cancelled";

export type AdminOrder = {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  notes: string | null;
  items: OrderLine[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  status: OrderStatus;
  stripe_payment_intent: string | null;
  print_status: "queued" | "printed" | "failed";
  created_at: string;
};

export type AdminSection = {
  id: number;
  label: string;
  note: string | null;
  sort: number;
};

export type AdminItem = {
  id: number;
  section_id: number;
  name: string;
  price_cents: number;
  description: string | null;
  tag: string | null;
  available: 0 | 1;
  sort: number;
};
