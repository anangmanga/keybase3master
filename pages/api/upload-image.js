// pages/api/upload-image.js
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

// Disable body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse form data
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB max
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)

    // Get the uploaded file (formidable v3 returns arrays)
    const imageFiles = files.image
    if (!imageFiles || imageFiles.length === 0) {
      return res.status(400).json({ error: 'No image file provided' })
    }

    const uploadedFile = imageFiles[0]

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(uploadedFile.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const originalName = uploadedFile.originalFilename || 'image'
    const ext = path.extname(originalName)
    const baseName = path.basename(originalName, ext).replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const newFileName = `${baseName}-${timestamp}${ext}`

    // Determine upload directory based on listing type
    const listingType = (fields.type && fields.type[0]) || 'general'
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', listingType)
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Move file to upload directory
    const newPath = path.join(uploadDir, newFileName)
    fs.copyFileSync(uploadedFile.filepath, newPath)
    fs.unlinkSync(uploadedFile.filepath) // Delete temp file

    // Return public URL
    const publicUrl = `/uploads/${listingType}/${newFileName}`
    
    return res.status(200).json({
      success: true,
      url: publicUrl,
      filename: newFileName
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    return res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    })
  }
}

