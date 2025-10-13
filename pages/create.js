// pages/create.js
import { useRouter } from 'next/router'
import { useMemo, useState, useEffect } from 'react'
import ListingCard from '@/components/ListingCard'
import { usePiNetwork } from '@/contexts/PiNetworkContext'
import Link from 'next/link'

export default function Create() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = usePiNetwork()
  const [authChecked, setAuthChecked] = useState(false)

  // Check authentication and seller role
  useEffect(() => {
    if (!isLoading) {
      setAuthChecked(true)
      if (!isAuthenticated) {
        router.push('/')
      } else if (user && user.role !== 'seller') {
        // User is authenticated but not a seller
        // We'll show a message in the UI
      }
    }
  }, [isAuthenticated, user, isLoading, router])

  // ---------- form state ----------
  const [type, setType] = useState('Property') // 'Property' | 'Car'
  const [title, setTitle] = useState('')
  const [pricePi, setPricePi] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('Apartment') // property default
  const [isNew, setIsNew] = useState(true)
  const [images, setImages] = useState([''])
  const [uploadingIndex, setUploadingIndex] = useState(null) // Track which image is being uploaded

  // property-specific
  const [beds, setBeds] = useState('')
  const [baths, setBaths] = useState('')
  const [area, setArea] = useState('') // m²
  const [propKind, setPropKind] = useState('Sale') // Sale | Rent

  // car-specific
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('') // "62000"
  const [fuel, setFuel] = useState('Petrol') // Petrol | Diesel | Hybrid | Electric | Other
  const [transmission, setTransmission] = useState('Manual') // Manual | Automatic
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [carBody, setCarBody] = useState('Hatchback') // sync with categories when type=Car

  // notes only (chat is built-in)
  const [notes, setNotes] = useState('')

  const [accept, setAccept] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  // ---------- options ----------
  const propertyCats = ['Apartment', 'House', 'Villa', 'Commercial']
  const carCats = ['Hatchback', 'Sedan', 'SUV', 'Coupe', 'Van', 'Pickup']

  // keep category in sync when switching type
  const visibleCategory = useMemo(() => {
    if (type === 'Property') return category
    return carBody
  }, [type, category, carBody])

  // ---------- helpers ----------
  const trim = (s) => (s || '').trim()
  const kmNum = (s) => {
    if (s === '' || s == null) return 0
    const n = parseInt(String(s).replace(/[^\d]/g, ''), 10)
    return Number.isNaN(n) ? 0 : n
  }
  const yearValid = (y) => {
    const n = Number(y)
    const thisYear = new Date().getFullYear() + 1
    return n >= 1980 && n <= thisYear
  }
  const priceValid = (p) => {
    const n = Number(p)
    return Number.isFinite(n) && n > 0
  }
  const urlish = (u) => /^https?:\/\/|^\/(images|img|uploads|cars|property|propertys)\//i.test(u || '')

  const addImage = () => setImages((arr) => [...arr, ''])
  const removeImage = (idx) =>
    setImages((arr) => arr.filter((_, i) => i !== idx))
  const setImageAt = (idx, val) =>
    setImages((arr) => arr.map((v, i) => (i === idx ? val : v)))

  // Handle image upload
  const handleImageUpload = async (idx, file) => {
    if (!file) return
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB')
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, WebP, or GIF)')
      return
    }

    setUploadingIndex(idx)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('type', type === 'Property' ? 'properties' : 'cars')

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setImageAt(idx, result.url)
      } else {
        alert(result.error || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploadingIndex(null)
    }
  }

  // ---------- validation ----------
  const validate = () => {
    const e = {}
    if (trim(title).length < 4) e.title = 'Title must be at least 4 characters'
    if (!priceValid(pricePi)) e.pricePi = 'Enter a valid price in π'
    if (trim(location).length < 2) e.location = 'Enter a location (City, Country)'
    const mainImage = images[0]
    if (!urlish(mainImage)) e.images = 'Add at least one valid image URL (http/https or /images/...)'

    if (type === 'Property') {
      if (!propertyCats.includes(category)) e.category = 'Choose a valid category'
      if (category !== 'Commercial') {
        if (String(beds) === '' || Number(beds) < 0) e.beds = 'Beds required'
        if (String(baths) === '' || Number(baths) < 0) e.baths = 'Baths required'
      }
      if (trim(area) && Number(area) <= 0) e.area = 'Area must be positive'
    } else {
      if (!carCats.includes(carBody)) e.carBody = 'Choose a valid body type'
      if (!yearValid(year)) e.year = 'Enter a year between 1980 and next year'
      if (mileage !== '' && kmNum(mileage) < 0) e.mileage = 'Mileage must be ≥ 0'
      if (trim(make).length < 2) e.make = 'Make required'
      if (trim(model).length < 1) e.model = 'Model required'
    }

    if (!accept) e.accept = 'You must accept the terms'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ---------- submit ----------
  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    try {
      // Prepare data for API
      const listingData = type === 'Property'
        ? {
            type: category,
            title: trim(title),
            pricePi: Number(pricePi),
            location: trim(location),
            beds: category === 'Commercial' ? 0 : Number(beds || 0),
            baths: category === 'Commercial' ? 0 : Number(baths || 0),
            area: trim(area) || null,
            images: images.filter(Boolean),
            isNew,
            status: propKind === 'Sale' ? 'For sale' : 'To rent',
            notes: trim(notes),
          }
        : {
            type: carBody,
            title: trim(title) || `${trim(year)} ${trim(make)} ${trim(model)}`,
            pricePi: Number(pricePi),
            location: trim(location),
            mileage: mileage || '0 km',
            year: year ? Number(year) : new Date().getFullYear(),
            images: images.filter(Boolean),
            isNew,
            make: trim(make),
            model: trim(model),
            fuel,
            transmission,
            conditionNotes: trim(notes),
          }

      // POST to API
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type === 'Property' ? 'property' : 'car',
          data: listingData,
          userId: user.id || user.user_uid || user.uid
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert('Listing created successfully!')
    router.push(type === 'Property' ? '/properties' : '/cars')
      } else {
        alert(result.error || 'Failed to create listing')
        setSubmitting(false)
      }
    } catch (error) {
      console.error('Error creating listing:', error)
      alert('An error occurred while creating the listing')
      setSubmitting(false)
    }
  }

  // ---------- preview item for ListingCard ----------
  const previewItem = useMemo(() => {
    if (type === 'Property') {
      return {
        id: 'preview',
        type: category,
        title: title || `${category} • ${propKind}`,
        pricePi: pricePi ? Number(pricePi) : 0,
        location,
        beds: category === 'Commercial' ? 0 : Number(beds || 0),
        baths: category === 'Commercial' ? 0 : Number(baths || 0),
        area: area ? `${area} m²` : undefined,
        images: images.filter(Boolean),
        isNew,
      }
    }
    return {
      id: 'preview',
      type: carBody,
      title: title || [year, make, model].filter(Boolean).join(' '),
      pricePi: pricePi ? Number(pricePi) : 0,
      location,
      mileage: mileage ? `${kmNum(mileage).toLocaleString()} km` : undefined,
      year: year ? Number(year) : undefined,
      images: images.filter(Boolean),
      isNew,
    }
  }, [type, category, propKind, title, pricePi, location, beds, baths, area, images, isNew, carBody, year, mileage, make, model])

  // ---------- UI ----------
  // Show loading state
  if (isLoading || !authChecked) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    )
  }

  // Show message if user is not a seller or admin
  if (user && user.role !== 'seller' && user.role !== 'admin') {
    return (
      <div className="container py-6">
        <div className="max-w-2xl mx-auto mt-12">
          <div className="bg-white rounded-2xl border shadow-soft p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
              <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Seller Account Required</h1>
            <p className="text-gray-600 mb-6">
              You need to be approved as a seller to create listings. Please apply for a seller account first.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/apply-seller" className="inline-flex items-center px-6 py-3 rounded-xl bg-brand-blue text-white font-semibold hover:bg-brand-dark">
                Apply as Seller
              </Link>
              <Link href="/" className="inline-flex items-center px-6 py-3 rounded-xl border text-gray-700 hover:bg-gray-50">
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
  

      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-extrabold">
          <span className="bg-gradient-to-r from-brand-dark to-brand-blue bg-clip-text text-transparent">
            Create Listing
          </span>
        </h1>

        {/* Type toggle */}
        <div className="inline-flex rounded-xl border bg-white p-1 shadow-soft">
          {['Properties', 'Automobiles'].map((t) => {
            const active = type === t
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition
                  ${active ? 'bg-brand-blue text-white shadow' : 'text-gray-700 hover:bg-gray-50'}`}
                type="button"
              >
                {t}
              </button>
            )
          })}
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: form sections */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basics */}
          <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-soft">
            <h2 className="text-base font-semibold mb-3">Basics</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* type-specific category */}
              {type === 'Property' ? (
                <Field label="Category" error={errors.category}>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
                  >
                    {propertyCats.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              ) : (
                <Field label="Body type" error={errors.carBody}>
                  <select
                    value={carBody}
                    onChange={(e) => setCarBody(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
                  >
                    {carCats.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              )}

              <Field label="Location" error={errors.location}>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Country"
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
                />
              </Field>

              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Price (π)" error={errors.pricePi}>
                  <input
                    type="number"
                    step="0.01"
                    value={pricePi}
                    onChange={(e) => setPricePi(e.target.value)}
                    placeholder="e.g., 314.0"
                    className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
                  />
                </Field>

                <Field label="New listing">
                  <div className="flex h-10 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsNew((v) => !v)}
                      className={`w-12 h-6 rounded-full transition relative ${
                        isNew ? 'bg-brand-blue' : 'bg-gray-300'
                      }`}
                      aria-pressed={isNew}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                          isNew ? 'left-6' : 'left-0.5'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-gray-700">{isNew ? 'Yes' : 'No'}</span>
                  </div>
                </Field>

                {type === 'Property' ? (
                  <Field label="Listing type">
                    <select
                      value={propKind}
                      onChange={(e) => setPropKind(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
                    >
                      <option>Sale</option>
                      <option>Rent</option>
                    </select>
                  </Field>
                ) : (
                  <div />
                )}
              </div>

              <Field label="Title" error={errors.title} className="sm:col-span-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === 'Property' ? 'e.g., City Centre Apartment • 2 Bed' : 'e.g., 2020 Toyota RAV4 Hybrid'}
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
                />
              </Field>
            </div>
          </section>

          {/* Details */}
          <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-soft">
            <h2 className="text-base font-semibold mb-3">Details</h2>
            {type === 'Property' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Beds" error={errors.beds}>
                  <input
                    type="number"
                    min="0"
                    value={beds}
                    onChange={(e) => setBeds(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Baths" error={errors.baths}>
                  <input
                    type="number"
                    min="0"
                    value={baths}
                    onChange={(e) => setBaths(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Area (m²)" error={errors.area}>
                  <input
                    type="number"
                    min="0"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </Field>
                <div />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Year" error={errors.year}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Mileage (km)" error={errors.mileage}>
                  <input
                    inputMode="numeric"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Fuel">
                  <select
                    value={fuel}
                    onChange={(e) => setFuel(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option>Petrol</option>
                    <option>Diesel</option>
                    <option>Hybrid</option>
                    <option>Electric</option>
                    <option>Other</option>
                  </select>
                </Field>
                <Field label="Transmission">
                  <select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option>Manual</option>
                    <option>Automatic</option>
                  </select>
                </Field>
                <Field label="Make" error={errors.make}>
                  <input
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Model" error={errors.model}>
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </Field>
              </div>
            )}
          </section>

          {/* Photos */}
          <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Photos</h2>
              {errors.images && <span className="text-xs text-red-600">{errors.images}</span>}
            </div>

            <div className="space-y-3">
              {images.map((u, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">
                      {i === 0 ? 'Main Image' : `Image ${i + 1}`}
                    </span>
                    {u && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Added
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Upload Button */}
                    <label className="shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(i, e.target.files[0])}
                        className="hidden"
                        disabled={uploadingIndex === i}
                      />
                      <div className={`cursor-pointer inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                        uploadingIndex === i 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-brand-blue text-white hover:bg-brand-dark'
                      }`}>
                        {uploadingIndex === i ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Upload Image
                          </>
                        )}
                      </div>
                    </label>

                    {/* URL Input */}
                  <input
                    value={u}
                    onChange={(e) => setImageAt(i, e.target.value)}
                      placeholder={i === 0 ? 'Or paste image URL (required)' : 'Or paste image URL'}
                    className="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
                  />

                    {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                      className="shrink-0 rounded-xl border px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    disabled={images.length === 1}
                  >
                    Remove
                  </button>
                  </div>

                  {/* Image Preview */}
                  {u && urlish(u) && (
                    <div className="rounded-lg border overflow-hidden bg-gray-50">
                      <img 
                        src={u} 
                        alt={`Preview ${i + 1}`} 
                        className="h-32 w-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addImage}
                className="mt-2 inline-flex items-center gap-2 rounded-xl border border-dashed px-4 py-2 text-sm hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Another Image
              </button>
              
              <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs text-blue-800">
                  <strong>Tip:</strong> You can upload images (max 5MB) or paste URLs. Supported formats: JPEG, PNG, WebP, GIF.
                </p>
              </div>
            </div>
          </section>

          {/* Additional Info */}
          <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-soft">
            <h2 className="text-base font-semibold mb-3">Additional Information</h2>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-3">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">Buyers can message you via built-in chat</p>
                  <p className="text-xs text-blue-700 mt-1">No need to provide external contact info. Buyers will use the "Chat with Seller" button on your listing.</p>
                </div>
              </div>
            </div>
            <Field label="Extra notes (optional)">
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional details buyers should know (viewing times, condition, flexible price, etc.)"
                className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
              />
            </Field>
          </section>

          {/* Terms */}
          <section className="rounded-2xl border bg-white p-4 sm:p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <input
                id="accept"
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="accept" className="text-sm text-gray-700">
                I confirm this listing is accurate, priced in π, and follows the marketplace rules.
              </label>
            </div>
            {errors.accept && <p className="mt-2 text-xs text-red-600">{errors.accept}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Save Listing'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border px-5 py-2.5 text-sm hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>

        {/* RIGHT: live preview (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Preview</h3>
            <div className="rounded-2xl border bg-white p-3 shadow-soft">
              <ListingCard item={previewItem} href="#" />
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-gray-600">
                Category: <b>{visibleCategory}</b>
                <br />
                Type: <b>{type}</b>
              </div>
            </div>
          </div>
        </aside>
      </form>

      {/* Mobile sticky submit bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t p-3 lg:hidden">
        <div className="container flex items-center gap-2">
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save Listing'}
          </button>
          <button
            onClick={() => router.back()}
            className="rounded-xl border px-4 py-3 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- small field wrapper ---------- */
function Field({ label, error, className = '', children }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
