import { useState } from 'react';
import { usePiNetwork } from '../contexts/PiNetworkContext';

export default function DonationModal({ isOpen, onClose, onSuccess }) {
  const { user, createPayment, isPaymentInProgress } = usePiNetwork();
  const [amount, setAmount] = useState(10);
  const [memo, setMemo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error
  const [error, setError] = useState(null);

  const predefinedAmounts = [5, 10, 25, 50, 100];

  // Handle incomplete payments callback (following PIFRONTENDINTEGRATION.ts)
  const onIncompletePaymentFound = async (payment) => {
    console.log('Incomplete payment found:', payment);
    const paymentId = payment.identifier;
    try {
      await fetch('/api/pi/payments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId })
      });
    } catch (err) {
      console.error('Error cancelling incomplete payment:', err);
    }
  };

  const handleDonation = async () => {
    if (!amount || amount <= 0) {
      setError('Please enter a valid donation amount');
      return;
    }

    if (!user) {
      setError('Please login with Pi first');
      return;
    }

    setIsProcessing(true);
    setStatus('processing');
    setError(null);

    try {
      const paymentData = {
        amount: amount,
        memo: memo || `Donation to KeyBase - ${amount} π`,
        metadata: {
          type: 'donation',
          userId: user.user_uid || user.uid,
          timestamp: new Date().toISOString()
        }
      };

      const result = await createPayment(paymentData);
      
      if (result.success) {
        setStatus('success');
        setTimeout(() => {
          onSuccess?.({ paymentId: result.paymentId, amount });
          onClose();
          resetForm();
        }, 2000);
      } else {
        setError(result.error || 'Donation failed');
        setStatus('error');
      }

    } catch (error) {
      console.error('Donation failed:', error);
      setError(error.message || 'Donation failed');
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setAmount(10);
    setMemo('');
    setStatus('idle');
    setError(null);
    setIsProcessing(false);
  };

  const handleClose = () => {
    if (!isProcessing) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Support KeyBase</h2>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* User Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Donating as:</strong> {user?.piUsername || user?.username || user?.user_uid || user?.uid}
            </p>
          </div>

          {/* Amount Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Donation Amount (π)
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {predefinedAmounts.map((predefinedAmount) => (
                <button
                  key={predefinedAmount}
                  onClick={() => setAmount(predefinedAmount)}
                  disabled={isProcessing}
                  className={`px-3 py-2 text-sm rounded-md border ${
                    amount === predefinedAmount
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  {predefinedAmount} π
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Custom amount"
              min="0.1"
              step="0.1"
            />
          </div>

          {/* Memo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message (Optional)
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Thank you for supporting KeyBase!"
              rows={3}
            />
          </div>

          {/* Status Display */}
          {status === 'processing' && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-sm text-gray-600">Processing donation...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mb-2 mx-auto">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-green-600 font-medium">Donation successful!</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleDonation}
              disabled={isProcessing || amount <= 0}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : `Donate ${amount} π`}
            </button>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
