'use client'

import type { ReactNode } from 'react'
import AdminLayout from '@/app/admin/layout'

/**
 * Las vistas operativas históricas conservan sus URLs públicas, pero ya no
 * montan un segundo dashboard. Comparten exactamente el mismo shell, permisos,
 * sucursal, tema, navegación y transición que /admin.
 */
export default function AdminOperationShell({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
