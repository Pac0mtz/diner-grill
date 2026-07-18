// Shared types for the ordering API.

export type ModifierOption = {
  id: string;
  label: string;
  price_cents: number;
};

export type ModifierGroup = {
  id: string;
  label: string;
  required?: boolean;
  min?: number;
  max?: number;
  free_count?: number;
  options: ModifierOption[];
};

export type SelectedModifier = {
  group_id: string;
  option_id: string;
};

export type ApiMenuItem = {
  id: number;
  name: string;
  price_cents: number;
  description: string | null;
  tag: string | null;
  image: string | null;
  modifier_groups?: ModifierGroup[];
};

export type ApiMenuSection = {
  id: number;
  label: string;
  note: string | null;
  sort: number;
  items: ApiMenuItem[];
};

export type OrderLineModifier = {
  group_id: string;
  group_label: string;
  option_id: string;
  label: string;
  price_cents: number;
};

export type OrderLine = {
  item_id: number;
  name: string;
  qty: number;
  price_cents: number;
  modifiers?: OrderLineModifier[];
  line_note?: string | null;
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
  customer_email?: string | null;
  notes: string | null;
  items: OrderLine[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  status: OrderStatus;
  stripe_payment_intent: string | null;
  stripe_dashboard_url?: string | null;
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
  image: string | null;
};
