/**
 * 2FA API Testing Script
 * Run with: node backend/test-2fa.js
 * Or: open in browser at http://localhost:3000/test-2fa.html
 */

const BASE_URL = 'http://localhost:3000';

// Test utilities
const api = {
  async request(method, endpoint, body = null, token = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    return {
      status: response.status,
      success: response.ok,
      data,
    };
  },

  async requestOtp(email) {
    return this.request('POST', '/auth/request-otp', { email });
  },

  async verifyOtp(email, otp) {
    return this.request('POST', '/auth/verify-otp', { email, otp });
  },

  async get2faSettings(token) {
    return this.request('GET', '/auth/2fa/settings', null, token);
  },

  async setupPassphrase(token, questions) {
    return this.request('POST', '/auth/2fa/passphrase/setup', { questions }, token);
  },

  async getWebauthnChallenge(token) {
    return this.request('POST', '/auth/2fa/webauthn/register/challenge', {}, token);
  },

  async completeWebauthnRegistration(token, credentialId, publicKey, deviceName) {
    return this.request(
      'POST',
      '/auth/2fa/webauthn/register/complete',
      {
        credentialId,
        publicKey,
        deviceName,
      },
      token
    );
  },

  async enable2fa(token, primaryMethod = 'otp') {
    return this.request('POST', '/auth/2fa/enable', { primaryMethod }, token);
  },

  async disable2fa(token) {
    return this.request('POST', '/auth/2fa/disable', {}, token);
  },

  async verify2fa(userId, otp = null, passphraseAnswers = null, webauthn = null) {
    const body = { userId };

    if (otp) {
      body.otp = otp;
    }

    if (passphraseAnswers) {
      body.passphraseAnswers = passphraseAnswers;
    }

    if (webauthn) {
      body.webauthn = webauthn;
    }

    return this.request('POST', '/auth/2fa/verify', body);
  },
};

// Test scenarios
async function testOtpFlow() {
  console.log('\n=== Testing OTP Flow ===');

  const email = 'test@example.com';

  // Step 1: Request OTP
  console.log(`\n1. Requesting OTP for ${email}...`);
  const requestResult = await api.requestOtp(email);
  console.log('Response:', requestResult);

  if (!requestResult.success) {
    console.error('Failed to request OTP');
    return;
  }

  // Step 2: Verify OTP (you would get this from email in production)
  console.log('\n2. Verifying OTP...');
  const otp = '123456'; // In real test, fetch from database or email

  const verifyResult = await api.verifyOtp(email, otp);
  console.log('Response:', verifyResult);

  if (verifyResult.success) {
    console.log('✓ OTP verification successful');
    return verifyResult.data.data.token;
  }
}

async function test2faSetup(token) {
  console.log('\n=== Testing 2FA Setup ===');

  if (!token) {
    console.log('⚠ No token provided, skipping 2FA setup tests');
    return;
  }

  // Step 1: Get 2FA settings
  console.log('\n1. Getting 2FA settings...');
  const settingsResult = await api.get2faSettings(token);
  console.log('Response:', settingsResult);

  // Step 2: Setup passphrase
  console.log('\n2. Setting up security questions...');
  const questions = [
    {
      question: 'What is your childhood pet\'s name?',
      answer: 'Fluffy',
    },
    {
      question: 'What city were you born in?',
      answer: 'New York',
    },
    {
      question: 'What is your favorite color?',
      answer: 'Blue',
    },
  ];

  const setupResult = await api.setupPassphrase(token, questions);
  console.log('Response:', setupResult);

  if (setupResult.success) {
    console.log('✓ Passphrase setup successful');
  }

  // Step 3: Enable 2FA
  console.log('\n3. Enabling 2FA...');
  const enableResult = await api.enable2fa(token, 'otp');
  console.log('Response:', enableResult);

  if (enableResult.success) {
    console.log('✓ 2FA enabled successfully');
  }
}

async function test2faVerification() {
  console.log('\n=== Testing 2FA Verification ===');

  const userId = 'test-user-id'; // Replace with actual user ID

  // Test OTP verification
  console.log('\n1. Verifying OTP during login...');
  const otpResult = await api.verify2fa(userId, '123456');
  console.log('Response:', otpResult);

  // Test passphrase verification
  console.log('\n2. Verifying passphrase during login...');
  const passphraseAnswers = {
    'What is your childhood pet\'s name?': 'Fluffy',
    'What city were you born in?': 'New York',
    'What is your favorite color?': 'Blue',
  };

  const passphraseResult = await api.verify2fa(userId, null, passphraseAnswers);
  console.log('Response:', passphraseResult);
}

async function testWebauthn(token) {
  console.log('\n=== Testing WebAuthn ===');

  if (!token) {
    console.log('⚠ No token provided, skipping WebAuthn tests');
    return;
  }

  // Step 1: Get registration challenge
  console.log('\n1. Getting WebAuthn registration challenge...');
  const challengeResult = await api.getWebauthnChallenge(token);
  console.log('Response:', challengeResult);

  if (challengeResult.success) {
    const challenge = challengeResult.data.data.challenge;

    // Step 2: Complete registration (with mock credential)
    console.log('\n2. Completing WebAuthn registration...');
    const registrationResult = await api.completeWebauthnRegistration(
      token,
      'mock-credential-id-12345',
      Buffer.from('mock-public-key-data').toString('base64'),
      'iPhone Face ID'
    );
    console.log('Response:', registrationResult);

    if (registrationResult.success) {
      console.log('✓ WebAuthn credential registered');
    }
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting 2FA API Tests');
  console.log(`Base URL: ${BASE_URL}`);

  try {
    // Test OTP flow
    const otpToken = await testOtpFlow();

    // Test 2FA setup with token
    if (otpToken) {
      await test2faSetup(otpToken);

      // Test WebAuthn
      await testWebauthn(otpToken);
    }

    // Test 2FA verification
    await test2faVerification();

    console.log('\n✅ All tests completed');
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { api, runAllTests };
}

// Run tests if executed directly
if (typeof window === 'undefined') {
  runAllTests();
}
