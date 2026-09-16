import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { BRAND } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'Login',
  description: `Gateway page for ${BRAND.name} Space.`,
  robots: {
    index: false,
    follow: false,
  },
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children
}
