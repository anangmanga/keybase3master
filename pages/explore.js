import { useMemo, useState } from 'react'
import Carousel from '@/Carousel'
import ListingCard from '@/components/ListingCard'

export async function getServerSideProps() {
  try {
    const { prisma } = await import('@/lib/prisma');
    
    // Fetch directly from database
    const [properties, cars] = await Promise.all([
      prisma.property.findMany({
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
      }),
      prisma.car.findMany({
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
          { year: 'desc' }
        ]
      })
    ]);
    
    // Format data
    const formattedProperties = properties.map(property => ({
      ...property,
      images: Array.isArray(property.images) ? property.images : [],
      features: Array.isArray(property.features) ? property.features : [],
      safetyFeatures: Array.isArray(property.safetyFeatures) ? property.safetyFeatures : []
    }));
    
    const formattedCars = cars.map(car => ({
      ...car,
      images: Array.isArray(car.images) ? car.images : [],
      features: Array.isArray(car.features) ? car.features : [],
      safetyFeatures: Array.isArray(car.safetyFeatures) ? car.safetyFeatures : [],
      docs: Array.isArray(car.docs) ? car.docs : []
    }));
    
    return { 
      props: { 
        properties: JSON.parse(JSON.stringify(formattedProperties)), 
        cars: JSON.parse(JSON.stringify(formattedCars))
      } 
    };
  } catch (error) {
    console.error('Error fetching listings:', error);
    return { props: { properties: [], cars: [] } };
  }
}

export default function Home({ properties, cars }) {
  const [section, setSection] = useState('Properties') // 'Properties' | 'Autos'

  // ---------- Helpers ----------
  const orderProps = ['Apartment', 'House', 'Villa', 'Commercial']
  const orderCars  = ['Hatchback', 'Sedan', 'SUV', 'Coupe', 'Van', 'Pickup']

  const uniq = (arr) => Array.from(new Set(arr))
  const inOrder = (types, order) =>
    order.filter((t) => types.includes(t)).concat(uniq(types).filter(t => !order.includes(t)))

  // Data slices (Properties)
  const propNew = useMemo(() => properties.filter(p => p.isNew), [properties])
  const propTypes = useMemo(
    () => inOrder(uniq(properties.map(p => p.type)), orderProps),
    [properties]
  )
  const propsByType = useMemo(() =>
    propTypes.map(t => ({
      type: t,
      items: properties.filter(p => p.type === t && !p.isNew),
    })), [properties, propTypes]
  )

  // Data slices (Autos)
  const carNew = useMemo(() => cars.filter(c => c.isNew), [cars])
  const carTypes = useMemo(
    () => inOrder(uniq(cars.map(c => c.type)), orderCars),
    [cars]
  )
  const carsByType = useMemo(() =>
    carTypes.map(t => ({
      type: t,
      items: cars.filter(c => c.type === t && !c.isNew),
    })), [cars, carTypes]
  )

  // ---------- UI ----------
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-pale">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-brand-blue/15 blur-3xl animate-pulse" />
          <div className="absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-brand-dark/10 blur-3xl animate-pulse [animation-delay:200ms]" />
        </div>

        <div className="container py-8 sm:py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold">
              <span className="bg-gradient-to-r from-brand-dark to-brand-blue bg-clip-text text-transparent">
                List & Discover Properties and Automobiles
              </span>
            </h1>
            <p className="mt-2 text-gray-700">
              <span className="font-semibold">Contact-first</span> marketplace — no payments here.
              Message sellers and arrange the sale in Pi.
            </p>

            {/* Segmented Control */}
            <div
              className="mt-5 inline-flex items-center rounded-2xl border bg-white p-1 shadow-sm"
              role="tablist"
              aria-label="Select section"
              aria-orientation="horizontal"
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  setSection((s) => (s === 'Properties' ? 'Autos' : 'Properties'))
                }
              }}
            >
              <button
                id="tab-properties"
                onClick={() => setSection('Properties')}
                role="tab"
                aria-selected={section === 'Properties'}
                aria-controls="panel-properties"
                tabIndex={section === 'Properties' ? 0 : -1}
                className={`min-w-[9rem] px-4 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/60 active:scale-95
                ${section === 'Properties'
                  ? 'bg-brand-blue text-white shadow-md ring-1 ring-brand-blue/30'
                  : 'text-gray-800 hover:bg-gray-50 hover:text-brand-dark'}`}
              >
                Properties
              </button>
              <button
                id="tab-autos"
                onClick={() => setSection('Autos')}
                role="tab"
                aria-selected={section === 'Autos'}
                aria-controls="panel-autos"
                tabIndex={section === 'Autos' ? 0 : -1}
                className={`min-w-[9rem] px-4 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/60 active:scale-95
                ${section === 'Autos'
                  ? 'bg-brand-blue text-white shadow-md ring-1 ring-brand-blue/30'
                  : 'text-gray-800 hover:bg-gray-50 hover:text-brand-dark'}`}
              >
                Autos
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      {section === 'Properties' ? (
        <SectionGroup
          title="Properties"
          viewAllHref="/properties"
          newItems={propNew}
          groups={propsByType}
          buildHref={(item) => `/properties/${item.id}`}
        />
      ) : (
        <SectionGroup
          title="Autos"
          viewAllHref="/cars"
          newItems={carNew}
          groups={carsByType}
          buildHref={(item) => `/cars/${item.id}`}
        />
      )}
    </div>
  )
}

/* ---------- Reusable Section Group ---------- */
function SectionGroup({ title, viewAllHref, newItems = [], groups = [], buildHref }) {
  return (
    <>
      {/* New Listings */}
      {newItems.length > 0 && (
        <section className="container py-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-black">New Listings</h2>
            {/* <a href={viewAllHref} className="text-sm text-black hover:underline">View only new</a> */}
          </div>

          <Carousel>
            {newItems.map((it) => (
              <div key={it.id} className="snap-start shrink-0 basis-full sm:basis-1/2 lg:basis-1/3 px-2">
                <ListingCard item={it} href={buildHref(it)} />
              </div>
            ))}
          </Carousel>
        </section>
      )}

      {/* By Type */}
      {groups.map(({ type, items }) => (
        items.length > 0 && (
          <section key={type} className="container pb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-black">{type}</h3>
              <a href={viewAllHref} className="text-sm text-black hover:underline">View all</a>
            </div>

            <Carousel>
              {items.map((it) => (
                <div key={it.id} className="snap-start shrink-0 basis-full sm:basis-1/2 lg:basis-1/3 px-2">
                  <ListingCard item={it} href={buildHref(it)} />
                </div>
              ))}
            </Carousel>
          </section>
        )
      ))}

      {/* Empty state (if absolutely nothing) */}
      {newItems.length === 0 && groups.every(g => g.items.length === 0) && (
        <section className="container py-10">
          <div className="rounded-2xl border bg-white p-6 text-center">
            <div className="font-semibold">No {title.toLowerCase()} yet</div>
            <p className="mt-1 text-sm text-gray-600">Check back soon or become a seller.</p>
          </div>
        </section>
      )}
    </>
  )
}