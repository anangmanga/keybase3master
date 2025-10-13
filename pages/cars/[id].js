// pages/cars/[id].js
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import ListingCard from '@/components/ListingCard'
import Carousel from '@/Carousel'
import ChatButton from '@/components/ChatButton'

// ---------- helpers ----------
const kmNum = (s) => {
  const n = parseInt(String(s || '').replace(/[^\d]/g, ''), 10)
  return Number.isNaN(n) ? 0 : n
}

function maskMid(str, start = 3, end = 2) {
  if (!str) return ''
  const len = String(str).length
  if (len <= start + end) return str
  return String(str).slice(0, start) + '•'.repeat(len - start - end) + String(str).slice(len - end)
}

// ---------- SSR ----------
export async function getServerSideProps({ params }) {
  const { prisma } = await import('@/lib/prisma')
  
  try {
    // Fetch the car with seller info
    const car = await prisma.car.findUnique({
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

    if (!car) {
      return { notFound: true }
    }

    // Fetch related cars (same type first)
    const related = await prisma.car.findMany({
      where: {
        id: { not: car.id }
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
        { type: car.type ? 'asc' : 'desc' },
        { isNew: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 8
    })

    // Format the data to match expected structure
    const item = {
      ...car,
      _meta: {
        make: car.make,
        model: car.model,
        trim: car.trim,
        body: car.body,
        fuel: car.fuel,
        transmission: car.transmission,
        drivetrain: car.drivetrain,
        engine: car.engine,
        powerKW: car.powerKW,
        powerBHP: car.powerBHP,
        consumptionL100: car.consumptionL100,
        consumptionKWh100: car.consumptionKWh100,
        emissions: car.emissions,
        owners: car.owners,
        nctExpiry: car.nctExpiry,
        taxExpiry: car.taxExpiry,
        serviceHistory: car.serviceHistory,
        lastServiceAtKm: car.lastServiceAtKm,
        lastServiceDate: car.lastServiceDate,
        accidentHistory: car.accidentHistory,
        currentFaults: car.currentFaults,
        tyres: car.tyres,
        brakes: car.brakes,
        keys: car.keys,
        conditionNotes: car.conditionNotes,
        modifications: car.modifications,
        financeCleared: car.financeCleared,
        doors: car.doors,
        seats: car.seats,
        color: car.color,
        bootL: car.bootL,
        wheelbaseMm: car.wheelbaseMm,
        weightKg: car.weightKg,
        vin: car.vin,
        reg: car.reg,
        features: car.features || [],
        safetyFeatures: car.safetyFeatures || [],
        videoUrl: car.videoUrl,
        docs: car.docs || [],
        contactMethod: car.contactMethod,
        contactHandle: car.contactHandle,
        notes: car.conditionNotes
      }
    }

  return {
      props: {
        item: JSON.parse(JSON.stringify(item)),
        related: JSON.parse(JSON.stringify(related))
      }
    }
  } catch (error) {
    console.error('Error fetching car:', error)
    return { notFound: true }
  }
}

// ---------- Page ----------
export default function CarDetail({ item, related }) {
  const router = useRouter()
  const [imgIdx, setImgIdx] = React.useState(0)
  const [saved, setSaved] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [detailsOpen, setDetailsOpen] = React.useState(false)

  const images =
    Array.isArray(item.images) && item.images.length ? item.images : ['/placeholder.png']

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
    } catch (_) {}
  }

  const metaDesc = `${item.title} • ${item.location}${
    item.year ? ` • ${item.year}` : ''
  }${item.mileage ? ` • ${item.mileage}` : ''}`

  return (
    <>
      <Head>
        <title>{item.title} • Autos • Pi Listings</title>
        <meta name="description" content={metaDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: item.title,
              image: images,
              description: metaDesc,
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
        {/* Top row: back + new badge */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-brand-blue hover:text-brand-dark"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            Back
          </button>
          {item.isNew && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-brand-blue/10 px-2 py-1 text-xs font-medium text-brand-dark">
              <Icon name="sparkles" className="h-3.5 w-3.5" />
              New
            </span>
          )}
        </div>

        {/* Title & meta */}
        <div className="mt-3">
          <h1 className="text-xl sm:text-2xl font-extrabold">
            <span className="bg-gradient-to-r from-brand-dark to-brand-blue bg-clip-text text-transparent">
              {item.title}
            </span>
          </h1>

          {/* chips row */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700">
            <Chip icon="map-pin">{item.location || '—'}</Chip>
            {item.year ? <Chip icon="calendar">{item.year}</Chip> : null}
            {item.mileage ? <Chip icon="gauge">{item.mileage}</Chip> : null}
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
                <div className="flex gap-2 overflow-x-auto p-2 no-scrollbar" role="tablist" aria-label="Gallery thumbnails">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      aria-label={`View image ${i + 1}`}
                      className={`relative h-16 w-24 overflow-hidden rounded-lg border transition ${
                        imgIdx === i ? 'ring-2 ring-brand-blue' : 'opacity-90 hover:opacity-100'
                      }`}
                    >
                      <img src={src} alt={`thumb ${i + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Vehicle details */}
            <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold">Vehicle Details</h2>
                <span className="text-xs text-gray-500">Pi-only • Contact-first</span>
              </div>

              {/* PRIMARY FACTS — always visible */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <Fact label="Make" value={item._meta?.make} />
                <Fact label="Model" value={item._meta?.model} />
                <Fact label="Year" value={item.year} />
                <Fact label="Condition" value={item.isNew ? 'New' : 'Used'} />
                <Fact label="Body" value={item._meta?.body || item.type} />
                <Fact label="Trim" value={item._meta?.trim} />
                <Fact label="Mileage" value={item.mileage} />
                <Fact label="Price (π)" value={(item.pricePi ?? 0).toLocaleString()} />
                <Fact label="Location" value={item.location} />
              </div>

              {/* DROPDOWN TOGGLE — centered */}
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => setDetailsOpen((o) => !o)}
                  aria-expanded={detailsOpen}
                  aria-controls="more-vehicle-details"
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
              <div id="more-vehicle-details" className={`${detailsOpen ? 'mt-4' : 'hidden'}`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {/* Drivetrain / engine */}
                  <Fact label="Fuel" value={item._meta?.fuel} />
                  <Fact label="Transmission" value={item._meta?.transmission} />
                  <Fact label="Drivetrain" value={item._meta?.drivetrain} />
                  <Fact
                    label="Engine"
                    value={
                      item._meta?.engine ||
                      (item._meta?.engineCC ? `${item._meta.engineCC} cc` : undefined)
                    }
                  />
                  <Fact
                    label="Power"
                    value={
                      item._meta?.powerKW || item._meta?.powerBHP
                        ? [
                            item._meta?.powerKW ? `${item._meta.powerKW} kW` : null,
                            item._meta?.powerBHP ? `${item._meta.powerBHP} bhp` : null,
                          ]
                            .filter(Boolean)
                            .join(' / ')
                        : undefined
                    }
                  />
                  <Fact label="Torque" value={item._meta?.torqueNm ? `${item._meta.torqueNm} Nm` : undefined} />
                  <Fact label="0–100 km/h" value={item._meta?.zeroToHundred} />
                  <Fact label="Top speed" value={item._meta?.topSpeedKph ? `${item._meta.topSpeedKph} km/h` : undefined} />

                  {/* Practicalities */}
                  <Fact label="Doors" value={item._meta?.doors} />
                  <Fact label="Seats" value={item._meta?.seats} />
                  <Fact label="Color" value={item._meta?.color} />
                  <Fact label="Owners" value={item._meta?.owners} />

                  {/* Compliance/costs */}
                  <Fact label="NCT/MOT" value={item._meta?.nctExpiry} />
                  <Fact label="Tax expiry" value={item._meta?.taxExpiry} />
                  <Fact label="Emissions" value={item._meta?.emissions ? `${item._meta.emissions} g/km` : undefined} />
                  <Fact
                    label="Consumption"
                    value={
                      item._meta?.consumptionL100
                        ? `${item._meta.consumptionL100} L/100km`
                        : item._meta?.consumptionKWh100
                        ? `${item._meta.consumptionKWh100} kWh/100km`
                        : undefined
                    }
                  />

                  {/* Dimensions */}
                  <Fact
                    label="Dimensions (L×W×H)"
                    value={
                      item._meta?.lengthMm && item._meta?.widthMm && item._meta?.heightMm
                        ? `${item._meta.lengthMm}×${item._meta.widthMm}×${item._meta.heightMm} mm`
                        : undefined
                    }
                  />
                  <Fact label="Wheelbase" value={item._meta?.wheelbaseMm ? `${item._meta.wheelbaseMm} mm` : undefined} />
                  <Fact label="Boot" value={item._meta?.bootL ? `${item._meta.bootL} L` : undefined} />
                  <Fact label="Weight" value={item._meta?.weightKg ? `${item._meta.weightKg} kg` : undefined} />

                  {/* IDs (masked) */}
                  <Fact label="VIN" value={item._meta?.vin ? maskMid(item._meta.vin) : undefined} />
                  <Fact label="Registration" value={item._meta?.reg ? maskMid(item._meta.reg, 3, 2) : undefined} />
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

                {/* Safety features */}
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

                {/* Docs */}
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
              <h2 className="text-base font-semibold">About this car</h2>
              <p className="mt-1 text-sm text-gray-700">
                Message the seller to arrange viewing and complete the exchange in Pi. This marketplace is
                contact-first — no on-site payments.
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
                  <li>Meet in public; bring a friend where possible.</li>
                  <li>Verify VIN/chassis and check service history.</li>
                  <li>Inspect NCT/roadworthiness where applicable.</li>
                  <li>Never share sensitive info; use a wallet you trust.</li>
                </ul>
              </div>
            </section>
          </div>

          {/* Right: seller & actions */}
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
                <p className="mt-2 text-sm text-gray-600">
                  Contact details provided after you tap the button below.
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                {item.seller && (
                <ChatButton
                  listing={{
                    type: 'car',
                    id: item.id,
                    title: item.title
                  }}
                    seller={item.seller}
                  className="col-span-2 inline-flex items-center justify-center rounded-xl bg-brand-blue px-4 py-2 text-white font-semibold hover:bg-brand-dark"
                />
                )}
                <button
                  onClick={() => setSaved((s) => !s)}
                  className={`rounded-xl border px-4 py-2 text-sm transition ${
                    saved ? 'border-brand-blue text-brand-dark' : ''
                  }`}
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

            <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-soft">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link href="/help" className="rounded-xl border px-3 py-2 text-center hover:bg-white">
                  Help Center
                </Link>
                <Link href="/safety" className="rounded-xl border px-3 py-2 text-center hover:bg-white">
                  Safety Tips
                </Link>
                <button className="col-span-2 rounded-xl border px-3 py-2 hover:bg-white">
                  Report Listing
                </button>
              </div>
            </section>
          </aside>
        </div>

        {/* Related */}
        {Array.isArray(related) && related.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base sm:text-lg font-semibold">Similar Listings</h2>
              <Link href="/cars" className="text-sm text-brand-dark hover:underline">
                View all
              </Link>
            </div>
            <Carousel>
              {related.map((c) => (
                <div
                  key={c.id}
                  className="snap-start shrink-0 basis-full sm:basis-1/2 lg:basis-1/3 px-2"
                >
                  <ListingCard item={c} href={`/cars/${c.id}`} />
                </div>
              ))}
            </Carousel>
          </section>
        )}
      </div>

    </>
  )
}

// ---------- small UI bits ----------
function Chip({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white border px-2.5 py-1">
      <Icon name={icon} className="h-4 w-4 text-brand-dark" />
      {children}
    </span>
  )
}

function Fact({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="rounded-xl border bg-white px-3 py-2 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-semibold text-gray-900 break-words">{value}</div>
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
          <path d="M12 2l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z" />
        </svg>
      )
    case 'map-pin':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 21s8-7 8-12a8 8 0 1 0-16 0c0 5 8 12 8 12z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      )
    case 'calendar':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    case 'gauge':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 13l4-4" />
          <path d="M3 12a9 9 0 1 1 18 0" />
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

