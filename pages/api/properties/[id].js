import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    // Get specific property
    try {
      const property = await prisma.property.findUnique({
        where: { id },
        include: {
          seller: {
            select: {
              id: true,
              user_uid: true,
              piUsername: true
            }
          }
        }
      });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      res.status(200).json({
        success: true,
        property
      });

    } catch (error) {
      console.error('Error fetching property:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch property'
      });
    }
  } else if (req.method === 'DELETE') {
    // Delete property (seller or admin only)
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User ID required'
        });
      }

      // Find the property
      const property = await prisma.property.findUnique({
        where: { id },
        include: { seller: true }
      });

      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }

      // Find the requesting user
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { user_uid: userId }
          ]
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if user is the seller or an admin
      if (property.sellerId !== user.id && user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own listings'
        });
      }

      // Delete the property
      await prisma.property.delete({
        where: { id }
      });

      res.status(200).json({
        success: true,
        message: 'Property deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting property:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete property'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

