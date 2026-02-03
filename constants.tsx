
import React from 'react';

export const ODOO_COLORS = {
  purple: '#714B67',
  teal: '#017e84',
  dark: '#212529',
  gray: '#f8f9fa'
};

export const MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', roles: ['superadmin', 'admin'] },
  { id: 'employees', label: 'Empleados', icon: 'Users', roles: ['superadmin', 'admin'] },
  { id: 'transfers', label: 'Transferencias', icon: 'ArrowLeftRight', roles: ['superadmin', 'admin', 'employee'] },
  { id: 'pos', label: 'Punto de Venta', icon: 'Monitor', roles: ['superadmin', 'admin', 'employee'] },
  { id: 'stock', label: 'Inventario', icon: 'Warehouse', roles: ['superadmin', 'admin', 'employee'] },
  { id: 'settings', label: 'Configuración', roles: ['superadmin'], icon: 'Settings' }
] as const;
