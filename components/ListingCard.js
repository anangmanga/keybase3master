// components/ListingCard.js
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

export default function ListingCard({ item, href }) {
  const isProperty = item?.beds != null || !!item?.area
  const imgSrc = item?.images?.[0] || '/placeholder.jpg'
  const [imgError, setImgError] = useState(false)

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-soft transition hover:shadow-md focus-within:shadow-md"
      aria-label={item?.title}
    >
      {/* Media */}
      <div className="relative h-40 w-full sm:h-44">
        <Image
          src={imgError ? '/placeholder.jpg' : imgSrc}
          alt={item?.title || 'Listing image'}
          fill
          sizes="(min-width: 640px) 384px, 100vw"
          className="object-cover"
          onError={() => setImgError(true)}
          priority={item?.isNew}
        />

        {/* Badges */}
        {item?.isNew && (
          <span className="absolute left-2 top-2 rounded-full bg-brand-blue px-2 py-1 text-xs font-medium text-white shadow">
            New
          </span>
        )}
        {item?.type && (
          <span className="absolute right-2 top-2 rounded-full border bg-white/90 px-2 py-1 text-xs font-medium text-gray-800">
            {item.type}
          </span>
        )}

        {/* Save (stub) */}
        <button
          type="button"
          aria-label="Save listing"
          className="absolute bottom-2 right-2 rounded-full border bg-white/90 p-2 text-gray-700 shadow transition hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/60"
        >
          <Icon name="heart" className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-gray-900">
          {item?.title}
        </h3>

        {/* Price + Pi pill */}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-lg font-extrabold text-brand-dark">{formatPi(item?.pricePi)}</span>
          
        </div>

        {/* Location */}
        {item?.location && (
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
            <Icon name="pin" className="h-4 w-4 text-gray-500" />
            <span className="truncate">{item.location}</span>
          </div>
        )}

        {/* Key facts */}
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-700">
          {isProperty ? (
            <>
              <Fact icon="bed" label={`${item?.beds ?? 0} bd`} />
              <Fact icon="bath" label={`${item?.baths ?? 0} ba`} />
              <Fact icon="ruler" label={item?.area || '—'} />
            </>
          ) : (
            <>
              <Fact icon="calendar" label={item?.year ?? '—'} />
              <Fact icon="road" label={item?.mileage || '—'} />
              <Fact icon="car" label={item?.type || '—'} />
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          <Link
            href={href}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand-blue px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/60"
          >
            More details
          </Link>
          <Link
            href={`${href}?contact=1`}
            className="inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold text-gray-800 hover:border-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30"
          >
            Contact
          </Link>
        </div>
      </div>
    </article>
  )
}

/* --- Small subcomponents --- */

function Fact({ icon, label }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1">
      <Icon name={icon} className="h-4 w-4 text-gray-500" />
      <span>{label}</span>
    </div>
  )
}

function Icon({ name, className = '' }) {
  switch (name) {
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
      )
    case 'pin':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )
    case 'bed':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 7v13" /><path d="M21 20V7" /><path d="M3 13h18" /><path d="M7 13V9a2 2 0 0 1 2-2h3" />
        </svg>
      )
    case 'bath':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 10h18" /><path d="M7 10V6a3 3 0 0 1 6 0v4" /><path d="M5 10v2a7 7 0 0 0 14 0v-2" />
        </svg>
      )
    case 'ruler':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M16 2H8a2 2 0 0 0-2 2v16l6-3 6 3V4a2 2 0 0 0-2-2z" />
        </svg>
      )
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    case 'road':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4 22l6-20" /><path d="M20 22l-6-20" /><path d="M12 8v3" /><path d="M12 16v3" />
        </svg>
      )
    case 'car':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 13h18l-1 8H4l-1-8Z"/><path d="M5 13l1-3h12l1 3"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="16.5" cy="18.5" r="1.5"/>
        </svg>
      )
    default:
      return null
  }
}

function formatPi(value) {
  if (value == null || value === '') return '— π'
  try {
    return `${Number(value).toLocaleString()} π`
  } catch {
    return `${value} π`
  }
}
