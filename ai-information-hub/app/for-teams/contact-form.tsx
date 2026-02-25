'use client'

import { useState } from 'react'

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-6 text-center">
        <p className="text-green-800 font-semibold text-lg mb-2">
          Thank you for your interest.
        </p>
        <p className="text-green-700 text-sm">
          We will review your message and get back to you within one business day.
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
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
          placeholder="Your full name"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium mb-1">
          Work Email <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label htmlFor="contact-company" className="block text-sm font-medium mb-1">
          Company <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-company"
          type="text"
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
          placeholder="Company name"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium mb-1">
          Message
        </label>
        <textarea
          id="contact-message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus:outline-none resize-y"
          placeholder="Tell us about your team size, use case, and any specific requirements."
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none transition-colors"
        >
          Send Inquiry
        </button>
        <span className="text-xs text-gray-500">
          Or email us directly at{' '}
          <a
            href="mailto:enterprise@datacubeai.space"
            className="underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            enterprise@datacubeai.space
          </a>
        </span>
      </div>
    </form>
  )
}
