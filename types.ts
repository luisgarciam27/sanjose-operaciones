
export type UserRole = 'superadmin' | 'admin' | 'employee';

export interface UserSession {
  id: number;
  name: string;
  role: UserRole;
  login_email: string;
  company_id: number;
  company_name: string;
  odoo_user_id: number;
}

export interface AppConfig {
  url: string;
  db: string;
  user: string;
  apiKey: string;
  wsUrl: string;
  useProxy?: boolean;
}

export interface Location {
  id: number;
  name: string;
  complete_name?: string;
}

export interface Employee {
  id: number;
  name: string;
  job_id: [number, string];
  department_id: [number, string];
  work_email?: string;
  image_1920?: string;
  last_activity?: string;
}

export interface Product {
  id: number;
  name: string;
  default_code?: string;
  qty_available: number;
  qty_at_location?: number;
  list_price: number;
  uom_id?: [number, string];
}

export interface Transfer {
  id: number;
  name: string;
  origin?: string;
  state: 'draft' | 'waiting' | 'confirmed' | 'assigned' | 'done' | 'cancel';
  scheduled_date: string;
  location_id: [number, string];
  location_dest_id: [number, string];
}

export interface PosSession {
  id: number;
  name: string;
  user_id: [number, string];
  start_at: string;
  state: 'opened' | 'closed';
  total_sales?: number;
  order_count?: number;
}

export interface SupplyRequestLine {
  product_id: number;
  product_name: string;
  qty: number;
  available_at_source: number;
}
