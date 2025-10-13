import { prisma } from '@/lib/prisma'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
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
      
      // Properties are already parsed as arrays in PostgreSQL
      const parsedProperties = properties.map(property => ({
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
          notes: property.notes,
        }
      }))
      
      return res.status(200).json(parsedProperties)
    } catch (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
  
  if (req.method === 'POST') {
    try {
      const property = await prisma.property.create({
        data: {
          type: req.body.type,
          title: req.body.title,
          pricePi: req.body.pricePi,
          location: req.body.location,
          beds: req.body.beds,
          baths: req.body.baths,
          area: req.body.area,
          images: req.body.images || [],
          isNew: req.body.isNew || false,
          status: req.body.status || 'For sale',
          yearBuilt: req.body.yearBuilt,
          floor: req.body.floor,
          totalFloors: req.body.totalFloors,
          heating: req.body.heating,
          energyRating: req.body.energyRating,
          parking: req.body.parking,
          furnished: req.body.furnished,
          petsAllowed: req.body.petsAllowed,
          balcony: req.body.balcony,
          garden: req.body.garden,
          storage: req.body.storage,
          lotSizeSqm: req.body.lotSizeSqm,
          hoaFeesPi: req.body.hoaFeesPi,
          taxesPi: req.body.taxesPi,
          eircode: req.body.eircode,
          propertyId: req.body.propertyId,
          features: req.body.features || [],
          safetyFeatures: req.body.safetyFeatures || [],
          contactMethod: req.body.contactMethod,
          contactHandle: req.body.contactHandle,
          notes: req.body.notes,
        }
      })
      return res.status(201).json(property)
    } catch (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
  
  res.status(405).end()
}
