// Pi Network Backend Service - Following PiBackend.ts pattern exactly
import axios from 'axios';

export class PiNetworkService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("Pi Network API Key is required.");
    }
    this.apiKey = apiKey;
    this.baseUrl = "https://api.minepi.com/v2"; // Following PiBackend.ts exactly
    
    console.log(`Pi Network Service initialized with URL: ${this.baseUrl}`);
    
    // Initialize Axios instance with the provided API key (following PiBackend.ts pattern)
    this.PiNetworkApi = axios.create({
      baseURL: this.baseUrl,
      timeout: 20000,
      headers: {
        Authorization: "Key " + this.apiKey,
      },
    });
  }

  // Static method to create instance (following PiBackend.ts pattern)
  static connect() {
    const apiKey = process.env.PI_API_KEY || process.env.PI_API_KEY;
    if (!apiKey) {
      console.error('❌ PI_NETWORK_API_KEY not found in environment variables!');
      console.error('Please add PI_NETWORK_API_KEY to your .env.local file');
      throw new Error('PI_NETWORK_API_KEY is required. Cannot use demo key for payments.');
    }
    console.log('✅ Pi Network API Key loaded from environment');
    return new PiNetworkService(apiKey);
  }

  async authWithPiNetworkApi(accessToken) {
    try {
      const APIAnswer = await this.PiNetworkApi.get("/me", {
        headers: {
          Authorization: "Bearer " + accessToken,
        },
      });
      return APIAnswer.data;
    } catch (error) {
      console.error("Error authenticating with Pi Network API:", error);
      throw error;
    }
  }

  async approvePayment(paymentId) {
    try {
      console.log(`Attempting to approve payment ${paymentId} with API key: ${this.apiKey.substring(0, 10)}...`);
      console.log(`Making request to: ${this.baseUrl}/payments/${paymentId}/approve`);
      
      const approvalResult = await this.PiNetworkApi.post(
        `/payments/${paymentId}/approve`
      );
      console.log(`Payment ${paymentId} approved successfully.`, approvalResult.data);
      return approvalResult.data;
    } catch (error) {
      console.error(`Error approving payment ${paymentId}:`, error.response?.data || error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  async completePayment(paymentId, txid) {
    try {
      const completionResponse = await this.PiNetworkApi.post(
        `/payments/${paymentId}/complete`,
        { txid: txid }
      );
      console.log(
        `Payment ${paymentId} completed successfully with txid: ${txid}.`
      );
      return completionResponse.data;
    } catch (error) {
      console.error(`Error completing payment ${paymentId}:`, error);
      throw error;
    }
  }

  async getPiNetworkPaymentInformation(paymentId) {
    try {
      const paymentResponse = await this.PiNetworkApi.get(
        `/payments/${paymentId}`
      );
      return paymentResponse.data;
    } catch (error) {
      console.error(
        `Error getting Pi Network payment info for ${paymentId}:`,
        error
      );
      throw error;
    }
  }

  async cancelPayment(paymentId) {
    try {
      const paymentCancellingResponse = await this.PiNetworkApi.post(
        `/payments/${paymentId}/cancel`
      );
      console.log(`Payment ${paymentId} cancelled successfully.`);
      return paymentCancellingResponse.data;
    } catch (error) {
      console.error(`Error cancelling payment ${paymentId}:`, error);
      throw error;
    }
  }

  async cancelPiNetworkIncompletePayment(paymentId, _PiNetworkPaymentDTO) {
    console.warn(
      `cancelPiNetworkIncompletePayment called for ${paymentId}. Consider simplifying this method.`
    );
    try {
      const paymentCancellingResponse = await this.PiNetworkApi.post(
        `/payments/${paymentId}/cancel`
      );
      console.log(`Incomplete payment ${paymentId} cancelled successfully.`);
      return paymentCancellingResponse.data;
    } catch (error) {
      console.error(
        `Error cancelling incomplete Pi Network payment ${paymentId}:`,
        error
      );
      throw error;
    }
  }
}

// Export singleton instance
export const piNetworkService = PiNetworkService.connect();
