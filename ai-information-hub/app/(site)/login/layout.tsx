import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Login | Data Cube AI',
  description: 'Gateway page for Data Cube AI Space.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children
}
