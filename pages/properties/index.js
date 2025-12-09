// pages/properties/index.js
import Head from 'next/head'
import { useMemo, useState, useEffect } from 'react'
import CategoryChips from '@/components/CategoryChips'
import ListingCard from '@/components/ListingCard'
import Carousel from '@/Carousel'

export async function getServerSideProps() {
  try {
    const { prisma } = await import('@/lib/prisma')
    
    const properties = await prisma.property.findMany({
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
        { isNew: 'desc' },
        { pricePi: 'desc' }
      ]
    })
    
    // Format data (handle arrays properly)
    const formattedProperties = properties.map(property => ({
      ...property,
      images: Array.isArray(property.images) ? property.images : [],
      features: Array.isArray(property.features) ? property.features : [],
      safetyFeatures: Array.isArray(property.safetyFeatures) ? property.safetyFeatures : [],
      _meta: {
        sellerName: property.seller?.piUsername || property.seller?.user_uid || 'Seller'
      }
    }))
    
    return { props: { properties: JSON.parse(JSON.stringify(formattedProperties)) } }
  } catch (error) {
    console.error('Error fetching properties:', error)
    return { props: { properties: [] } }
  }
}

/* ---------- helper subcomponents ---------- */
function StatPill({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 border shadow-sm">
      <Icon name={icon} className="h-4 w-4 text-brand-dark" />
      {children}
    </span>
  )
}

function FeaturePill({ icon, children }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-2.5 py-1 border shadow-sm">
      <Icon name={icon} className="h-3.5 w-3.5 text-brand-dark" />
      <span>{children}</span>
    </li>
  )
}

function Icon({ name, className }) {
  switch (name) {
    case 'home':
      return (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22V10l8-6 8 6v12H4z"/></svg>)
    case 'plus':
      return (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>)
    case 'pi':
      return (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M8 7v10a3 3 0 0 0 3 3"/><path d="M16 7v10a3 3 0 0 1-3 3"/></svg>)
    case 'shield':
      return (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z"/></svg>)
    case 'tag':
      return (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V4h8l10.59 9.41z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>)
    case 'phone':
      return (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>)
    default:
      return null
  }
}

/* --------------- page component --------------- */
export default function Properties({ properties }) {
  // UI state (mobile-first defaults)
  const categories = ['All', 'Apartment', 'House', 'Villa', 'Commercial', 'New Listings']
  const [cat, setCat] = useState('All')
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Filters
  const [minBeds, setMinBeds] = useState('')
  const [minBaths, setMinBaths] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  // Sort
  const [sort, setSort] = useState('Featured') // Featured | Price ↑ | Price ↓ | Beds ↓

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)

  const newOnly = cat === 'New Listings'

  const base = useMemo(() => {
    let arr = properties.slice()

    // Category
    if (cat !== 'All' && !newOnly) arr = arr.filter(p => p.type === cat)
    if (newOnly) arr = arr.filter(p => p.isNew)

    // Search (title/location)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      arr = arr.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q)
      )
    }

    // Numeric filters
    const mb = Number(minBeds) || 0
    const mba = Number(minBaths) || 0
    const minP = minPrice === '' ? -Infinity : Number(minPrice)
    const maxP = maxPrice === '' ? Infinity : Number(maxPrice)

    arr = arr.filter(p =>
      (p.beds ?? 0) >= mb &&
      (p.baths ?? 0) >= mba &&
      (p.pricePi ?? 0) >= minP &&
      (p.pricePi ?? 0) <= maxP
    )

    // Sort
    switch (sort) {
      case 'Price ↑': arr.sort((a, b) => (a.pricePi ?? 0) - (b.pricePi ?? 0)); break
      case 'Price ↓': arr.sort((a, b) => (b.pricePi ?? 0) - (a.pricePi ?? 0)); break
      case 'Beds ↓':  arr.sort((a, b) => (b.beds ?? 0) - (a.beds ?? 0)); break
      default: // Featured: new first, then higher price
        arr.sort((a, b) =>
          (b.isNew === a.isNew ? (b.pricePi ?? 0) - (a.pricePi ?? 0) : (b.isNew ? 1 : -1))
        )
    }
    return arr
  }, [properties, cat, newOnly, query, minBeds, minBaths, minPrice, maxPrice, sort])

  useEffect(() => { setPage(1) }, [cat, query, minBeds, minBaths, minPrice, maxPrice, sort])

  const total = base.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const items = base.slice(start, end)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasNew = properties.some(p => p.isNew)
  const totalNew = properties.filter(p => p.isNew).length

  const resetFilters = () => {
    setMinBeds(''); setMinBaths(''); setMinPrice(''); setMaxPrice(''); setSort('Featured')
  }

  // avg price (for hero stat)
  const avgPrice = Math.round(
    properties.reduce((s, p) => s + (p.pricePi ?? 0), 0) / Math.max(1, properties.length)
  )

  return (
    <>
      <Head>
        <title>Properties listings</title>
        <meta name="description" content="Browse properties in π. Mobile-first, contact-first marketplace." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      {/* HERO — upgraded */}
      <section className="relative overflow-hidden bg-brand-pale">
        {/* ambient blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-blue/15 blur-3xl animate-pulse" />
          <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-brand-dark/10 blur-3xl animate-pulse [animation-delay:200ms]" />
        </div>

        <div className="container py-6 sm:py-10">
          <div className="max-w-3xl mx-auto text-center">
          

            <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold">
              <span className="bg-gradient-to-r from-brand-dark to-brand-blue bg-clip-text text-transparent">
                All Properties
              </span>
            </h1>

            <p className="mt-2 text-gray-700 text-sm sm:text-base">
              Apartments, houses, villas &amp; commercial. Message sellers.
            </p>
       {/* quick stats */}
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
              <StatPill icon="home">{properties.length} total</StatPill>
             
            </div>
            {/* micro features */}
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs text-gray-600">
              <FeaturePill icon="shield">Safe, contact-first</FeaturePill>
              <FeaturePill icon="phone">Built for pi network</FeaturePill>
            </ul>
          </div>
        </div>
      </section>

  

      {/* NEW LISTINGS — 1 per view */}
      {hasNew && (
        <section className="container mt-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base sm:text-lg font-semibold">New Listings</h2>
            {/* <button onClick={() => setCat('New Listings')} className="text-sm text-brand-dark hover:underline">View only new</button> */}
          </div>
          <Carousel>
            {properties.filter(p => p.isNew).map(p => (
              <div key={p.id} className="snap-start shrink-0 basis-full px-2">
                <ListingCard item={p} href={`/properties/${p.id}`} />
              </div>
            ))}
          </Carousel>
        </section>
      )}
    {/* TOOLBAR — mobile-first */}
      <section className="container pt-4">
        {/* row 1: search + filters trigger + sort */}
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or location…"
            className="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
            aria-label="Search properties"
          />
          <button
            onClick={() => setFiltersOpen(true)}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-white md:hidden"
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
          >
            Filters
          </button>
        </div>

        {/* row 2: desktop inline filters */}
        <div className="hidden md:grid grid-cols-5 gap-2 mt-2">
          <select value={minBeds} onChange={(e)=>setMinBeds(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
            <option value="">Beds (min)</option>
            <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
          </select>
          <select value={minBaths} onChange={(e)=>setMinBaths(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
            <option value="">Baths (min)</option>
            <option>1</option><option>2</option><option>3</option><option>4</option>
          </select>
          <input value={minPrice} onChange={(e)=>setMinPrice(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" placeholder="Min π" inputMode="decimal" />
          <input value={maxPrice} onChange={(e)=>setMaxPrice(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" placeholder="Max π" inputMode="decimal" />
          <div className="flex gap-2">
            <button onClick={resetFilters} className="flex-1 px-3 py-2 rounded-xl border text-sm hover:bg-white">Reset</button>
            <a href="/create" className="px-3 py-2 rounded-xl bg-brand-blue text-white text-sm hover:bg-brand-dark">Create</a>
          </div>
        </div>
      </section>

      {/* MOBILE FILTERS SHEET */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setFiltersOpen(false)} />
          <aside className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Filters</h3>
              <button onClick={()=>setFiltersOpen(false)} className="p-2 rounded-md hover:bg-gray-100" aria-label="Close">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={minBeds} onChange={(e)=>setMinBeds(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
                <option value="">Beds (min)</option>
                <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
              </select>
              <select value={minBaths} onChange={(e)=>setMinBaths(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
                <option value="">Baths (min)</option>
                <option>1</option><option>2</option><option>3</option><option>4</option>
              </select>
              <input value={minPrice} onChange={(e)=>setMinPrice(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" placeholder="Min π" inputMode="decimal" />
              <input value={maxPrice} onChange={(e)=>setMaxPrice(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" placeholder="Max π" inputMode="decimal" />
              <select value={sort} onChange={(e)=>setSort(e.target.value)} className="col-span-2 rounded-xl border px-3 py-2 text-sm">
                <option>Featured</option>
                <option>Price ↑</option>
                <option>Price ↓</option>
                <option>Beds ↓</option>
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={resetFilters} className="flex-1 px-3 py-2 rounded-xl border text-sm">Reset</button>
              <button onClick={()=>setFiltersOpen(false)} className="flex-1 px-3 py-2 rounded-xl bg-brand-blue text-white text-sm">Apply</button>
            </div>
          </aside>
        </div>
      )}

      {/* CATEGORIES — horizontal scroll on mobile */}
      <section className="container mt-4">
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
          <CategoryChips items={categories} active={cat} onSelect={setCat} />
        </div>
      </section>
      {/* RESULTS */}
      <section id="results" className="container py-5">
        {/* Title + toolbar */}
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-extrabold">
            <span className="bg-gradient-to-r from-brand-dark to-brand-blue bg-clip-text text-transparent">
              All Listings
            </span>
          </h2>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs sm:text-sm text-gray-600">
            Showing <b>{total ? start + 1 : 0}</b>–<b>{Math.min(total, end)}</b> of <b>{total}</b>
          </p>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span>Per page</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border px-2 py-1"
            >
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={12}>12</option>
            </select>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {items.map(p => (
              <ListingCard key={p.id} item={p} href={`/properties/${p.id}`} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border bg-white p-6 text-center">
            <div className="text-brand-dark font-semibold">No results</div>
            <p className="mt-1 text-sm text-gray-600">Try clearing filters or widening your price range.</p>
            <div className="mt-3 flex justify-center gap-2">
              <button onClick={resetFilters} className="px-4 py-2 rounded-xl border">Clear Filters</button>
              <a href="/" className="px-4 py-2 rounded-xl bg-brand-blue text-white">Back Home</a>
            </div>
          </div>
        )}

        {/* Pagination — mobile-friendly */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="flex w-full sm:w-auto items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-3 rounded-xl border text-sm disabled:opacity-50"
                aria-label="Previous page"
              >
                Prev
              </button>
              <span className="text-sm text-gray-700">
                Page <b>{page}</b> / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-3 rounded-xl border text-sm disabled:opacity-50"
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* HOW IT WORKS / SAFETY (properties-focused) */}
      <section className="container pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-blue text-white">
                {/* play icon */}
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M8 5v14l11-7-11-7z"/></svg>
              </span>
              <h4 className="text-lg font-semibold">How it works</h4>
            </div>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white text-sm font-bold">1</span>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Browse listings priced in π</div>
                  <div className="text-gray-600">Filter by category, price, beds/baths, and more.</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white text-sm font-bold">2</span>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Open a listing &amp; tap <b>Contact Seller</b></div>
                  <div className="text-gray-600">Ask questions, arrange a viewing.</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white text-sm font-bold">3</span>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Meet &amp; verify</div>
                  <div className="text-gray-600">Check title, BER cert, planning, and ID as needed.</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white text-sm font-bold">4</span>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Complete in Pi</div>
                  <div className="text-gray-600">Agree terms and exchange via your trusted Pi wallet.</div>
                </div>
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-dark text-white">
                {/* shield icon */}
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z"/>
                </svg>
              </span>
              <h4 className="text-lg font-semibold">Safety &amp; checks</h4>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-pale text-brand-dark">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </span>
                <span><b>Meet safely</b> and consider bringing a friend.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-pale text-brand-dark">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </span>
                <span><b>Verify documents</b> (title, ID, BER, planning/build regs where applicable).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-pale text-brand-dark">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </span>
                <span><b>Inspect thoroughly</b> (damp, structure, utilities). Get a survey if unsure.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-pale text-brand-dark">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </span>
                <span><b>Protect your info</b> and only use wallets you trust.</span>
              </li>
            </ul>

            {/* <div className="mt-4 grid grid-cols-2 gap-2">
              <a href="/create" className="rounded-xl bg-brand-blue px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-dark">Create listing</a>
              <a href="/safety" className="rounded-xl border px-4 py-2 text-center text-sm font-semibold hover:border-brand-blue">Safety guide</a>
            </div> */}
          </div>
        </div>
      </section>
    </>
  )
}
