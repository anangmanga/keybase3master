
import { getPiPaymentService } from './lib/pi-payment-service';
import { prisma } from './lib/prisma';

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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { user_uid: piUser.uid }
    });

    // Use upsert to either create or update the user
    const user = await prisma.user.upsert({
      where: { 
        user_uid: piUser.uid 
      },
      update: {
        piAccessToken: accessToken,
        piAuthenticatedAt: new Date(),
        // Only update username if it has changed
        ...(piUser.username && { piUsername: piUser.username })
        // NOTE: We do NOT update the role here - it stays as set in the database
      },
      create: {
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
        // Explicitly NOT selecting piAccessToken for security
      }
    });

    console.log('✅ User verified with role:', user.role, 'for user:', user.piUsername || user.user_uid);

    // Return user data (already excluding sensitive info via select)
    const userData = user;

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