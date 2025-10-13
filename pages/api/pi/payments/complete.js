import { piNetworkService } from '../../../../lib/pi-network-backend';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId, txid, donationData } = req.body;

    if (!paymentId || !txid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment ID and transaction ID are required' 
      });
    }
    try {
      await piNetworkService.completePayment(paymentId, txid);
    } catch (piError) {
      // If payment is already completed, that's okay - we can still save to database
      if (piError.response?.data?.error === 'already_completed') {
        console.log('⚠️ Payment already completed on Pi servers, continuing with database save...');
      } else {
        throw piError; // Re-throw other errors
      }
    }

    // If this is a donation, save it to the database
    if (donationData) {
      try {
        console.log('Saving donation to database:', {
          userId: donationData.userId,
          amount: donationData.amount,
          piPaymentId: paymentId,
          txid: txid,
          status: 'completed',
          memo: donationData.memo,
          metadata: donationData.metadata
        });
        
        // First, ensure the user exists in the database
        let user = await prisma.user.findUnique({
          where: { user_uid: donationData.userId }
        });
        
        if (!user) {
          console.log('⚠️ User not found in database, creating user record...');
          // Create a basic user record if it doesn't exist
          user = await prisma.user.create({
            data: {
              user_uid: donationData.userId,
              piUsername: donationData.metadata?.username || `user_${donationData.userId.slice(0, 8)}`,
              role: 'reader',
              piAuthenticatedAt: new Date()
            }
          });
          console.log('✅ User record created');
        }
        
        // Now create the donation record using the user's database ID
        await prisma.donation.create({
          data: {
            userId: user.id, // Use the database ID, not the user_uid
            amount: donationData.amount,
            piPaymentId: paymentId,
            txid: txid,
            status: 'completed',
            memo: donationData.memo,
            metadata: donationData.metadata
          }
        });
        console.log('✅ Donation saved to database successfully');
      } catch (dbError) {
        console.error('❌ Error saving donation to database:', dbError);
        // Don't fail the payment completion if DB save fails
      }
    } else {
      console.log('No donation data provided, skipping database save');
    }

    res.status(200).json({
      success: true,
      message: 'Payment completed successfully'
    });
  } catch (error) {
    console.error('Payment completion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Payment completion failed',
      error: error.message 
    });
  }
}
