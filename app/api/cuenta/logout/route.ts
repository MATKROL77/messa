import { NextResponse } from 'next/server'
import { COOKIE_CLIENTE } from '@/lib/sesion-cliente'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_CLIENTE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
