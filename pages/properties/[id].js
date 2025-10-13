// pages/properties/[id].js
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import ListingCard from '@/components/ListingCard'
import Carousel from '@/Carousel'
import ChatButton from '@/components/ChatButton'

/* ---------------- helpers ---------------- */
const maskMid = (str = '', left = 2, right = 2) => {
  if (!str) return ''
  if (str.length <= left + right) return str
  return `${str.slice(0, left)}•••${str.slice(-right)}`
}

/* -------------- SSR --------------- */
export async function getServerSideProps({ params }) {
  const { prisma } = await import('@/lib/prisma')
  
  try {
    // Fetch the property with seller info
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        seller: {
          select: {
            id: true,
            user_uid: true,
            piUsername: true
          }
        }
      }
    })

    if (!property) {
      return { notFound: true }
    }

    // Fetch related properties (same type first, or new ones)
    const related = await prisma.property.findMany({
      where: {
        id: { not: property.id }
      },
      include: {
        seller: {
          select: {
            id: true,
            user_uid: true,
            piUsername: true
          }
        }
      },
      orderBy: [
        { type: property.type ? 'asc' : 'desc' },
        { isNew: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 8
    })

    // Format the data to match expected structure
    const item = {
      ...property,
      _meta: {
        status: property.status,
        yearBuilt: property.yearBuilt,
        floor: property.floor,
        totalFloors: property.totalFloors,
        heating: property.heating,
        energyRating: property.energyRating,
        parking: property.parking,
        furnished: property.furnished,
        petsAllowed: property.petsAllowed,
        balcony: property.balcony,
        garden: property.garden,
        storage: property.storage,
        lotSizeSqm: property.lotSizeSqm,
        hoaFeesPi: property.hoaFeesPi,
        taxesPi: property.taxesPi,
        eircode: property.eircode,
        propertyId: property.propertyId,
        features: property.features || [],
        safetyFeatures: property.safetyFeatures || [],
        contactMethod: property.contactMethod,
        contactHandle: property.contactHandle,
        notes: property.notes
      }
    }

    return {
      props: {
        item: JSON.parse(JSON.stringify(item)),
        related: JSON.parse(JSON.stringify(related))
      }
    }
  } catch (error) {
    console.error('Error fetching property:', error)
    return { notFound: true }
  }
}

/* -------------- Page --------------- */
export default function PropertyDetail({ item, related }) {
  const router = useRouter()
  const [imgIdx, setImgIdx] = React.useState(0)
  const [saved, setSaved] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [detailsOpen, setDetailsOpen] = React.useState(false)

  const images = Array.isArray(item.images) && item.images.length ? item.images : ['/placeholder.png']

  const onShare = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : ''
      if (navigator.share) {
        await navigator.share({ title: item.title, url })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }
    } catch {}
  }

  const metaDesc =
    `${item.title} • ${item.location}` +
    (item.beds ? ` • ${item.beds} beds` : '') +
    (item.baths ? ` • ${item.baths} baths` : '') +
    (item.area ? ` • ${item.area}` : '')

  return (
    <>
      <Head>
        <title>{item.title} • Properties • Pi Listings</title>
        <meta name="description" content={metaDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* JSON-LD: RealEstateListing (basic) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'RealEstateListing',
              name: item.title,
              description: metaDesc,
              url: typeof window !== 'undefined' ? window.location?.href : '',
              image: images,
              address: { '@type': 'PostalAddress', addressLocality: item.location || '' },
              floorSize: item.area ? { '@type': 'QuantitativeValue', value: item.area } : undefined,
              offers: {
                '@type': 'Offer',
                priceCurrency: 'XPI',
                price: item.pricePi ?? 0,
                availability: 'https://schema.org/InStock',
              },
            }),
          }}
        />
      </Head>

      <div className="container py-5">
        {/* Back + New badge */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-brand-blue hover:text-brand-dark"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            Back
          </button>
          {item.isNew && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-brand-blue/10 px-2 py-1 text-xs font-medium text-brand-dark">
              <Icon name="sparkles" className="h-3.5 w-3.5" /> New
            </span>
          )}
        </div>

        {/* Title */}
        <div className="mt-3">
          <h1 className="text-xl sm:text-2xl font-extrabold">
            <span className="bg-gradient-to-r from-brand-dark to-brand-blue bg-clip-text text-transparent">
              {item.title}
            </span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700">
            <span className="inline-flex items-center gap-1 rounded-full bg-white border px-2.5 py-1">
              <Icon name="map-pin" className="h-4 w-4 text-brand-dark" />
              {item.location || '—'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white border px-2.5 py-1">
              <Icon name="home" className="h-4 w-4 text-brand-dark" />
              {item.type || 'Property'}
            </span>
            {item.area ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white border px-2.5 py-1">
                <Icon name="ruler" className="h-4 w-4 text-brand-dark" />
                {item.area}
              </span>
            ) : null}
            <PiBadge />
          </div>

          <div className="mt-2 text-brand-dark text-lg sm:text-xl font-extrabold">
            {Number(item.pricePi || 0).toLocaleString()} π
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Left: gallery + details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Gallery */}
            <section className="rounded-2xl border bg-white shadow-soft overflow-hidden">
              <div className="aspect-[16/10] w-full bg-gray-100">
                <img
                  src={images[imgIdx]}
                  alt={`${item.title} photo ${imgIdx + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-2 no-scrollbar">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`relative h-16 w-24 overflow-hidden rounded-lg border ${
                        imgIdx === i ? 'ring-2 ring-brand-blue' : 'opacity-90 hover:opacity-100'
                      }`}
                      aria-label={`View image ${i + 1}`}
                    >
                      <img src={src} alt={`thumb ${i + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Property details */}
            <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold">Property Details</h2>
                <span className="text-xs text-gray-500">Pi-only • Contact-first</span>
              </div>

              {/* PRIMARY FACTS — always visible */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <Fact label="Type" value={item.type} />
                <Fact label="Beds" value={item.beds} />
                <Fact label="Baths" value={item.baths} />
                <Fact label="Area" value={item.area} />
                <Fact label="Price (π)" value={(item.pricePi ?? 0).toLocaleString()} />
                <Fact label="Location" value={item.location} />
                {/* Useful top-level flags from _meta if present */}
                <Fact label="Status" value={item._meta?.status /* For sale / To rent */} />
                <Fact label="Furnished" value={item._meta?.furnished} />
              </div>

              {/* Centered dropdown to reveal more */}
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => setDetailsOpen((o) => !o)}
                  aria-expanded={detailsOpen}
                  aria-controls="more-property-details"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium transition hover:border-brand-blue/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/60"
                >
                  {detailsOpen ? 'Hide full details' : 'Show full details'}
                  <svg
                    className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>

              {/* EXTRA DETAILS — collapsible */}
              <div id="more-property-details" className={`${detailsOpen ? 'mt-4' : 'hidden'}`}>
                {/* Spec grid (the rest) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {/* Building/structure */}
                  <Fact label="Year built" value={item._meta?.yearBuilt} />
                  <Fact label="Floor" value={item._meta?.floor} />
                  <Fact label="Total floors" value={item._meta?.totalFloors} />
                  <Fact label="Heating" value={item._meta?.heating} />
                  <Fact label="Energy (BER)" value={item._meta?.energyRating} />
                  <Fact label="Parking" value={item._meta?.parking} />
                  <Fact label="Pets allowed" value={item._meta?.petsAllowed} />
                  <Fact label="Balcony/Terrace" value={item._meta?.balcony} />
                  <Fact label="Garden/Patio" value={item._meta?.garden} />
                  <Fact label="Storage" value={item._meta?.storage} />

                  {/* Size/land */}
                  <Fact label="Lot size" value={item._meta?.lotSizeSqm ? `${item._meta.lotSizeSqm} m²` : undefined} />
                  <Fact label="Plot size" value={item._meta?.plotSizeSqm ? `${item._meta.plotSizeSqm} m²` : undefined} />

                  {/* Costs / admin */}
                  <Fact label="HOA/Service (π)" value={item._meta?.hoaFeesPi} />
                  <Fact label="Local taxes (π)" value={item._meta?.taxesPi} />
                  <Fact label="Eircode" value={item._meta?.eircode ? maskMid(item._meta.eircode, 3, 3) : undefined} />
                  <Fact label="Property ID" value={item._meta?.propertyId ? maskMid(item._meta.propertyId) : undefined} />
                </div>

                {/* Features */}
                {Array.isArray(item._meta?.features) && item._meta.features.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold mb-2">Features</h3>
                    <ul className="flex flex-wrap gap-2">
                      {item._meta.features.map((f, i) => (
                        <li
                          key={i}
                          className="rounded-full bg-brand-pale text-brand-dark text-xs px-3 py-1 border"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Safety / compliance */}
                {Array.isArray(item._meta?.safetyFeatures) && item._meta.safetyFeatures.length > 0 && (
                  <div className="mt-3">
                    <h3 className="text-sm font-semibold mb-2">Safety</h3>
                    <ul className="flex flex-wrap gap-2">
                      {item._meta.safetyFeatures.map((f, i) => (
                        <li key={i} className="rounded-full bg-white text-gray-800 text-xs px-3 py-1 border">
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Documents */}
                {Array.isArray(item._meta?.docs) && item._meta.docs.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold mb-2">Documents</h3>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {item._meta.docs.map((d, i) => (
                        <a
                          key={i}
                          href={d}
                          target="_blank"
                          rel="noreferrer"
                          className="h-24 w-36 overflow-hidden rounded-lg border bg-white"
                        >
                          <img src={d} alt={`Document ${i + 1}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* About / Safety tips */}
            <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-soft">
              <h2 className="text-base font-semibold">About this property</h2>
              <p className="mt-1 text-sm text-gray-700">
                Message the seller to arrange a viewing and complete the exchange in Pi. This marketplace is contact-first —
                no on-site payments.
              </p>

              {item._meta?.notes ? (
                <div className="mt-3 rounded-xl border bg-brand-pale/50 p-3 text-sm text-gray-800">
                  <div className="font-semibold mb-1">Seller notes</div>
                  <p>{item._meta.notes}</p>
                </div>
              ) : null}

              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-1">Safety checks</h3>
                <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
                  <li>Meet at the property with a friend if possible.</li>
                  <li>Verify ownership docs and ID where appropriate.</li>
                  <li>Review BER/inspection reports if provided.</li>
                  <li>Never share sensitive info; use a wallet you trust.</li>
                </ul>
              </div>
            </section>
          </div>

          {/* Right: seller / actions */}
          <aside className="lg:col-span-1 space-y-4">
            <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-soft">
              <h2 className="text-base font-semibold">Seller</h2>

              {/* Seller Identity - Show Pi Username */}
              {item.seller && (
                <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-brand-pale/50 border">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-brand-blue flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {(item.seller.piUsername || item.seller.user_uid).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {item.seller.piUsername || item.seller.user_uid}
                    </p>
                    <p className="text-xs text-gray-500">Pi Network User</p>
                  </div>
                </div>
              )}

              {item._meta?.contactMethod && item._meta?.contactHandle ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border bg-white px-3 py-2">
                    <div className="text-gray-500">Method</div>
                    <div className="font-semibold">{item._meta.contactMethod}</div>
                  </div>
                  <div className="rounded-xl border bg-white px-3 py-2">
                    <div className="text-gray-500">Handle</div>
                    <div className="font-semibold break-all">{item._meta.contactHandle}</div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-600">Contact details provided after you tap the button below.</p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                {item.seller && (
                  <ChatButton
                    listing={{
                      type: 'property',
                      id: item.id,
                      title: item.title
                    }}
                    seller={item.seller}
                    className="col-span-2 inline-flex items-center justify-center rounded-xl bg-brand-blue px-4 py-2 text-white font-semibold hover:bg-brand-dark"
                  />
                )}
                <button
                  onClick={() => setSaved((s) => !s)}
                  className={`rounded-xl border px-4 py-2 text-sm ${saved ? 'border-brand-blue text-brand-dark' : ''}`}
                >
                  <Icon name={saved ? 'heart-solid' : 'heart'} className="h-4 w-4 inline mr-2" />
                  {saved ? 'Saved' : 'Save'}
                </button>
                <button onClick={onShare} className="rounded-xl border px-4 py-2 text-sm">
                  <Icon name="share" className="h-4 w-4 inline mr-2" />
                  {copied ? 'Link copied!' : 'Share'}
                </button>
              </div>

              <p className="mt-2 text-[11px] text-gray-500">
                By contacting, you agree to follow community rules and transact in π.
              </p>
            </section>

            {/* Quick links */}
            <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-soft">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link href="/help" className="rounded-xl border px-3 py-2 text-center hover:bg-white">
                  Help Center
                </Link>
                <Link href="/safety" className="rounded-xl border px-3 py-2 text-center hover:bg-white">
                  Safety Tips
                </Link>
                <button className="col-span-2 rounded-xl border px-3 py-2 hover:bg-white">Report Listing</button>
              </div>
            </section>
          </aside>
        </div>

        {/* Similar listings */}
        {Array.isArray(related) && related.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base sm:text-lg font-semibold">Similar Listings</h2>
              <Link href="/properties" className="text-sm text-brand-dark hover:underline">
                View all
              </Link>
            </div>

            <Carousel>
              {related.map((p) => (
                <div key={p.id} className="snap-start shrink-0 basis-full sm:basis-1/2 lg:basis-1/3 px-2">
                  <ListingCard item={p} href={`/properties/${p.id}`} />
                </div>
              ))}
            </Carousel>
          </section>
        )}
      </div>

    </>
  )
}

/* -------------- Small UI bits --------------- */
function Fact({ label, value }) {
  const display =
    value === null || value === undefined || value === '' ? '—' : String(value)
  return (
    <div className="rounded-xl border bg-white px-3 py-2 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-semibold text-gray-900 break-words">{display}</div>
    </div>
  )
}

function PiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white border px-2.5 py-1 text-xs font-medium text-gray-800">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-dark" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7h16M8 7v10a3 3 0 0 0 3 3" />
        <path d="M16 7v10a3 3 0 0 1-3 3" />
      </svg>
      Pi-only
    </span>
  )
}

function Icon({ name, className }) {
  switch (name) {
    case 'arrow-left':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" />
        </svg>
      )
    case 'map-pin':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 21s8-7 8-12a8 8 0 1 0-16 0c0 5 8 12 8 12z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      )
    case 'home':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 22V10l8-6 8 6v12H4z" />
        </svg>
      )
    case 'ruler':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8h18M3 12h18M3 16h18" />
        </svg>
      )
    case 'message':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      )
    case 'heart':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
      )
    case 'heart-solid':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.45 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.55 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      )
    case 'share':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98" />
          <path d="M15.41 6.51L8.59 10.49" />
        </svg>
      )
    default:
      return null
  }
}

