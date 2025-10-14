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

    console.log('🔍 Checking database for existing user...');

    // Check if user already exists with this Pi user_uid
    const existingUser = await prisma.user.findUnique({
      where: { user_uid: piUser.uid }
    });

    const currentTime = new Date();
    console.log('🕐 Current timestamp:', currentTime.toISOString());

    let user;

    if (existingUser) {
      console.log('📝 Updating existing user:', existingUser.user_uid);
      // Update existing user with latest Pi data (like your MongoDB projects)
      user = await prisma.user.update({
        where: { user_uid: piUser.uid },
        data: {
          piUsername: piUser.username,           // Update username safely
          from_address: piUser.wallet_address || null,
          piAccessToken: accessToken,
          piAuthenticatedAt: currentTime,
          updatedAt: currentTime
          // Role and other fields stay intact - don't update them
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
      console.log('✅ Existing user updated successfully');
    } else {
      console.log('🆕 Creating new user for:', piUser.uid);
      // Create new user with Pi Network data
      user = await prisma.user.create({
        data: {
          user_uid: piUser.uid,
          piUsername: piUser.username,
          from_address: piUser.wallet_address || null,
          role: 'reader',
          piAccessToken: accessToken,
          piAuthenticatedAt: currentTime,
          // Store additional Pi data
          piAppId: piUser.app_id,
          piCredentials: piUser.credentials,
          piReceivingEmail: piUser.receiving_email,
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
      console.log('✅ New user created successfully');
    }

    // Return user data following Pi Network structure (like your previous projects)
    const userResponse = {
      id: user.id,
      user_uid: user.user_uid,
      piUsername: user.piUsername,
      from_address: user.from_address,
      to_address: user.to_address,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      piAuthenticatedAt: user.piAuthenticatedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    console.log('✅ User verified with role:', user.role, 'for user:', user.piUsername || user.user_uid);
    console.log('✅ Returning user response:', userResponse);

    res.status(200).json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error.message 
    });
  }
}