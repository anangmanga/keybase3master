import { getPiPaymentService } from '../../../../lib/pi-payment-service';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Access token is required' 
      });
    }

    const piService = getPiPaymentService();
    const piUser = await piService.verifyUserToken(accessToken);

    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { user_uid: piUser.uid }
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          user_uid: piUser.uid,
          piUsername: piUser.username,
          piAccessToken: accessToken,
          piAuthenticatedAt: new Date(),
          role: 'reader'
        }
      });
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { user_uid: piUser.uid },
        data: {
          piUsername: piUser.username,
          piAccessToken: accessToken,
          piAuthenticatedAt: new Date()
        }
      });
    }

    // Return user data without sensitive information
    const { piAccessToken: _, ...userData } = user;

    res.status(200).json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Token verification failed',
      error: error.message 
    });
  }
}
