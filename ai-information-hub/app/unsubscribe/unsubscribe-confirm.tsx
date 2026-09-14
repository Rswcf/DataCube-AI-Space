'use client'

import { useState } from 'react'

type Status = 'idle' | 'pending' | 'done' | 'invalid' | 'error'

export function UnsubscribeConfirm({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>('idle')

  async function confirm() {
    setStatus('pending')
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ t: token }).toString(),
      })
      if (res.ok) setStatus('done')
      else setStatus(res.status === 400 ? 'invalid' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <p role="status" className="text-foreground">
        You are unsubscribed and will not receive further newsletter emails.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">
        Confirm to stop receiving the newsletter at the address this email was sent to.
      </p>
      <button
        type="button"
        onClick={confirm}
        disabled={status === 'pending'}
        className="inline-block rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
      >
        {status === 'pending' ? 'Unsubscribing…' : 'Unsubscribe'}
      </button>
      {status === 'invalid' && (
        <p role="alert" className="text-sm text-red-700">
          This unsubscribe link is not valid. Use the unsubscribe link in your most recent newsletter email.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-700">
          Something went wrong on our side. Please try again in a few minutes.
        </p>
      )}
    </div>
  )
}
