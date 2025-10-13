import { prisma } from '@/lib/prisma'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const cars = await prisma.car.findMany({
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
      
      // Cars - arrays are already native in PostgreSQL
      const parsedCars = cars.map(car => ({
        ...car,
        images: Array.isArray(car.images) ? car.images : [],
        features: Array.isArray(car.features) ? car.features : [],
        safetyFeatures: Array.isArray(car.safetyFeatures) ? car.safetyFeatures : [],
        docs: Array.isArray(car.docs) ? car.docs : [],
        _meta: {
          // Use seller relation instead of sellerName
          sellerName: car.seller?.piUsername || car.seller?.user_uid || 'Seller',
          contactMethod: car.contactMethod,
          contactHandle: car.contactHandle,
          availability: car.availability,
          negotiable: car.negotiable,
          tradeIn: car.tradeIn,
          delivery: car.delivery,
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
        }
      }))
      
      return res.status(200).json(parsedCars)
    } catch (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
  
  if (req.method === 'POST') {
    try {
      const car = await prisma.car.create({
        data: {
          type: req.body.type,
          title: req.body.title,
          pricePi: req.body.pricePi,
          location: req.body.location,
          mileage: req.body.mileage,
          year: req.body.year,
          images: req.body.images || [],
          isNew: req.body.isNew || false,
          sellerName: req.body.sellerName,
          contactMethod: req.body.contactMethod,
          contactHandle: req.body.contactHandle,
          availability: req.body.availability,
          negotiable: req.body.negotiable,
          tradeIn: req.body.tradeIn,
          delivery: req.body.delivery,
          make: req.body.make,
          model: req.body.model,
          trim: req.body.trim,
          body: req.body.body,
          fuel: req.body.fuel,
          transmission: req.body.transmission,
          drivetrain: req.body.drivetrain,
          engine: req.body.engine,
          powerKW: req.body.powerKW,
          powerBHP: req.body.powerBHP,
          consumptionL100: req.body.consumptionL100,
          consumptionKWh100: req.body.consumptionKWh100,
          emissions: req.body.emissions,
          owners: req.body.owners,
          nctExpiry: req.body.nctExpiry,
          taxExpiry: req.body.taxExpiry,
          serviceHistory: req.body.serviceHistory,
          lastServiceAtKm: req.body.lastServiceAtKm,
          lastServiceDate: req.body.lastServiceDate,
          accidentHistory: req.body.accidentHistory,
          currentFaults: req.body.currentFaults,
          tyres: req.body.tyres,
          brakes: req.body.brakes,
          keys: req.body.keys,
          conditionNotes: req.body.conditionNotes,
          modifications: req.body.modifications,
          financeCleared: req.body.financeCleared,
          doors: req.body.doors,
          seats: req.body.seats,
          color: req.body.color,
          bootL: req.body.bootL,
          wheelbaseMm: req.body.wheelbaseMm,
          weightKg: req.body.weightKg,
          vin: req.body.vin,
          reg: req.body.reg,
          features: req.body.features || [],
          safetyFeatures: req.body.safetyFeatures || [],
          videoUrl: req.body.videoUrl,
          docs: req.body.docs || [],
        }
      })
      return res.status(201).json(car)
    } catch (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
  
  res.status(405).end()
}
