import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    // Get specific car
    try {
      const car = await prisma.car.findUnique({
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

      if (!car) {
        return res.status(404).json({
          success: false,
          error: 'Car not found'
        });
      }

      res.status(200).json({
        success: true,
        car
      });

    } catch (error) {
      console.error('Error fetching car:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch car'
      });
    }
  } else if (req.method === 'DELETE') {
    // Delete car (seller or admin only)
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User ID required'
        });
      }

      // Find the car
      const car = await prisma.car.findUnique({
        where: { id },
        include: { seller: true }
      });

      if (!car) {
        return res.status(404).json({
          success: false,
          error: 'Car not found'
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
      if (car.sellerId !== user.id && user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own listings'
        });
      }

      // Delete the car
      await prisma.car.delete({
        where: { id }
      });

      res.status(200).json({
        success: true,
        message: 'Car deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting car:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete car'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

