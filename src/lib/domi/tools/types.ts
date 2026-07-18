import type { DomiServerContext } from '@/lib/domi/server-context';

export type DomiToolName =
  | 'customer.search_catalog'
  | 'customer.cart_summary'
  | 'customer.list_orders'
  | 'customer.track_order';

export interface DomiToolPlan {
  name: DomiToolName;
  intent: string;
  arguments: Record<string, unknown>;
}

export interface DomiNavigationLink {
  label: string;
  href: string;
}

export interface DomiToolResult {
  name: DomiToolName;
  success: boolean;
  message: string;
  data: Record<string, unknown>;
  recordCount: number;
  suggestedActions: string[];
  navigation: DomiNavigationLink[];
}

export interface DomiToolExecutionInput {
  context: DomiServerContext;
  plan: DomiToolPlan;
}
