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

    // Verify token with Pi Network
    const piService = getPiPaymentService();
    let piUser;
    
    try {
      piUser = await piService.verifyUserToken(accessToken);
    } catch (verifyError) {
      console.error('Pi Network token verification failed:', verifyError.message);
      
      // Check if it's an expired token error
      if (verifyError.message?.includes('expired') || verifyError.response?.status === 401) {
        return res.status(401).json({ 
          success: false, 
          message: 'Access token expired. Please log in again.',
          expired: true
        });
      }
      
      throw verifyError;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { user_uid: piUser.uid }
    });

    let user;

    if (existingUser) {
      // User exists - update ONLY token and timestamp, preserve everything else
      user = await prisma.user.update({
        where: { user_uid: piUser.uid },
        data: {
          piAccessToken: accessToken,
          piAuthenticatedAt: new Date(),
          updatedAt: new Date()
          // DO NOT update piUsername, role, or any other fields
          // This preserves the existing user's data and role
        },
        select: {
          id: true,
          user_uid: true,
          piUsername: true,
          from_address: true,
          to_address: true,
          role: true,
          avatar: true,
          bio: true,
          piAuthenticatedAt: true,
          createdAt: true,
          updatedAt: true
        }
      });
    } else {
      // New user - create with Pi username
      user = await prisma.user.create({
        data: {
          user_uid: piUser.uid,
          piUsername: piUser.username,
          piAccessToken: accessToken,
          piAuthenticatedAt: new Date(),
          role: 'reader' // Default role for new users
        },
        select: {
          id: true,
          user_uid: true,
          piUsername: true,
          from_address: true,
          to_address: true,
          role: true,
          avatar: true,
          bio: true,
          piAuthenticatedAt: true,
          createdAt: true,
          updatedAt: true
        }
      });
    }

    console.log('✅ User verified with role:', user.role, 'for user:', user.piUsername || user.user_uid);

    res.status(200).json({
      success: true,
      user: user
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