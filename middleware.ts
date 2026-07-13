import { NextResponse } from 'next/server';

export function middleware() {
  return NextResponse.next();
}

// Esto le dice a Next.js que no aplique el middleware a ninguna ruta real
export const config = {
  matcher: [],
};