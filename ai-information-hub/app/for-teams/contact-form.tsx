'use client'

import { useState } from 'react'
import { API_BASE, DEFAULT_API_BASE } from '@/lib/api-base'

type Status = 'idle' | 'sending' | 'sent' | 'rate_limited' | 'error'

const fieldClass =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus:outline-none'

// Delivery: POST {API_BASE}/contact → Resend → CONTACT_INBOX, with reply-to set
// to the visitor. The "sent" state appears only after the backend accepted the
// message (HTTP 202).
export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot: hidden from people, filled by bots

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch(`${API_BASE || DEFAULT_API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, message, website }),
      })
      if (res.status === 202) setStatus('sent')
      else setStatus(res.status === 429 ? 'rate_limited' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className="border border-green-200 bg-green-50 rounded-lg p-6 text-center">
        <p className="text-green-800 font-semibold text-lg mb-2">Message sent.</p>
        <p className="text-green-700 text-sm">
          Thank you. Any reply will go to the email address you entered.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
          placeholder="Your full name"
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
          placeholder="you@company.com"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
        />
      </div>

      <div>
        <label htmlFor="contact-company" className="block text-sm font-medium mb-1">
          Company <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <input
          id="contact-company"
          name="organization"
          type="text"
          maxLength={160}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className={fieldClass}
          placeholder="Company name"
          autoComplete="organization"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium mb-1">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${fieldClass} resize-y`}
          placeholder="Corrections: include the page URL. Teams: size, use case and requirements."
        />
      </div>

      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none transition-colors disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>

      {status === 'rate_limited' && (
        <p role="alert" className="text-sm text-red-700">
          Too many messages right now. Please try again later.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-700">
          The message could not be sent. Please try again later.
        </p>
      )}
    </form>
  )
}
