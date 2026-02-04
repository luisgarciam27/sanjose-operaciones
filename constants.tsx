
import React from 'react';

export const ODOO_COLORS = {
  purple: '#714B67',
  teal: '#017e84',
  dark: '#212529',
  bg: '#f8faff', 
  accent: '#f3e8ff'
};

export const MODULES = [
  { id: 'dashboard', label: 'Tablero de Control', icon: 'LayoutDashboard', roles: ['superadmin', 'admin'] },
  { id: 'transfers', label: 'Operaciones Logísticas', icon: 'Truck', roles: ['superadmin', 'admin', 'employee'] },
  { id: 'pos', label: 'Mi Caja POS', icon: 'Monitor', roles: ['superadmin', 'admin', 'employee'] },
  { id: 'employees', label: 'Gestión de Equipo', icon: 'Users2', roles: ['superadmin', 'admin'] },
  { id: 'stock', label: 'Inventario Global', icon: 'PackageSearch', roles: ['superadmin', 'admin'] },
  { id: 'settings', label: 'Configuración', roles: ['superadmin'], icon: 'Settings' }
] as const;

export const OFFICIAL_EMPLOYEES = [
  { name: 'Soporte FacturaClic', email: 'soporte@facturaclic.pe', role: 'Administrador Sistema', department: 'TI' },
  { name: 'Jose Herrera', email: 'admin1@sanjose.pe', role: 'Administrador / Gestión Horarios', department: 'Administración' },
  { name: 'Admin Herrera', email: 'admin.herrera@sanjose.pe', role: 'Gerente General', department: 'Administración' },
  { name: 'Logística Principal', email: 'logistica@sanjose.pe', role: 'Jefe de Almacén', department: 'Logística' },
  { name: 'Vendedor Botica 1', email: 'vendedor1@sanjose.pe', role: 'Vendedor POS', department: 'Ventas' },
  { name: 'Vendedor Botica 2', email: 'vendedor2@sanjose.pe', role: 'Vendedor POS', department: 'Ventas' },
];

export const SHIFT_TYPES = [
  { id: 'morning', label: 'Turno Mañana', hours: '08:00 - 14:00', color: 'bg-amber-100 text-amber-700' },
  { id: 'afternoon', label: 'Turno Tarde', hours: '14:00 - 20:00', color: 'bg-blue-100 text-blue-700' },
  { id: 'full', label: 'Tiempo Completo', hours: '08:00 - 18:00', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'night', label: 'Turno Noche', hours: '20:00 - 02:00', color: 'bg-indigo-100 text-indigo-700' },
];
