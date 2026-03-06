import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { RequestAccessModal } from '../components/RequestAccessModal';
import '../index.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [requestAccessOpen, setRequestAccessOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOtpMessage('');
    setIsLoading(true);

    try {
      // First, try to login to verify credentials and get OTP challenge
      const loginResponse = (await api.login(email, password)) as any;
      
      if (loginResponse.success) {
        // Check if OTP is required
        if (loginResponse.data?.requiresOtp) {
          // Store OTP challenge data
          const otpData = {
            userId: loginResponse.data.userId,
            challengeId: loginResponse.data.challengeId,
            email: loginResponse.data.email,
            otpCode: loginResponse.data.otpCode
          };
          sessionStorage.setItem('otp-pending', JSON.stringify(otpData));
          
          // Move to OTP verification step
          setUserId(loginResponse.data.userId);
          setChallengeId(loginResponse.data.challengeId);
          setStep('otp');
          
          // Check if OTP code is in response (dev/testing mode)
          let message = 'OTP sent to your email: ' + loginResponse.data.email;
          if (loginResponse.data?.otpCode) {
            message += ` (Dev: ${loginResponse.data.otpCode})`;
          }
          setOtpMessage(message);
          setIsLoading(false);
          return;
        }
        
        // Phase 4 path: HttpOnly cookies are automatically set by the server
        // Check if we have user data (which indicates successful login)
        if (loginResponse.data?.user) {
          // Store user in localStorage for AuthContext to pick up
          localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
          
          // Also store tokens if returned in response (fallback for HttpOnly cookies)
          if (loginResponse.data?.accessToken) {
            api.setToken(loginResponse.data.accessToken);
          }
          if (loginResponse.data?.refreshToken) {
            api.setRefreshToken(loginResponse.data.refreshToken);
          }
          
          // Tokens are in HttpOnly cookies, browser will send them automatically
          navigate('/dashboard');
          return;
        }
        
        // Legacy path: if tokens are in response (fallback)
        if (loginResponse.data?.accessToken && loginResponse.data?.user) {
          // Store both token and user in localStorage
          api.setToken(loginResponse.data.accessToken);
          localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
          
          // Store refresh token if available
          if (loginResponse.data?.refreshToken) {
            api.setRefreshToken(loginResponse.data.refreshToken);
          }
          
          navigate('/dashboard');
          return;
        }
      }
      
      // If we get here, something unexpected happened
      setError('Login response invalid. Please try again.');
    } catch (loginErr: any) {
      const errorMsg = loginErr instanceof Error ? loginErr.message : 'Login failed';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Verify OTP with backend
      const response = (await api.verifyOtp(userId, challengeId, otp)) as any;

      if (response.success && response.data?.accessToken && response.data?.user) {
        // Store token and user in localStorage for AuthContext to pick up
        api.setToken(response.data.accessToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Store refresh token if available
        if (response.data?.refreshToken) {
          api.setRefreshToken(response.data.refreshToken);
        }
        
        // Navigate to dashboard - AuthContext will immediately see the new localStorage values
        navigate('/dashboard');
      } else {
        setError(response.error || 'OTP verification failed. Please try again.');
      }
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : 'OTP verification failed. Please try again.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="loginWrapper">
      <div className="loginLeft">
        <div className="brandBlock">
          <h1>Homecare Matching</h1>
          <p>Secure, intelligent dispatch for healthcare professionals.</p>

          <div className="securityBadge">
            🔐 Secure Access • Real-Time Dispatch • Enterprise Ready
          </div>
        </div>
      </div>

      <div className="loginRight">
        <div className="loginCard">
          <h2>{step === 'credentials' ? 'Sign In' : 'Verify Code'}</h2>
          <p className="loginSubtitle">
            {step === 'credentials'
              ? 'Access your dispatch dashboard securely.'
              : 'Enter the 6-digit code sent to your email.'}
          </p>

          {error && <div className="loginError" role="alert">{error}</div>}
          {otpMessage && <div className="loginSuccess" role="status">{otpMessage}</div>}

          <form
            onSubmit={
              step === 'credentials' ? handleLogin : handleVerifyOtp
            }
          >
            {step === 'credentials' && (
              <>
                <div className="formGroup">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    placeholder="you@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="formGroup">
                  <label htmlFor="password">Password</label>
                  <div className="passwordInputWrapper">
                    <input
                      id="password"
                      className="input passwordInput"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="passwordToggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Continue'}
                </button>
              </>
            )}

            {step === 'otp' && (
              <>
                <div className="formGroup">
                  <label htmlFor="otp">6-Digit Code</label>
                  <p className="formHint">Check your email at <strong>{email}</strong></p>
                  <input
                    id="otp"
                    className="input otp-input"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                </button>

                <button
                  type="button"
                  className="btn btn-text"
                  onClick={() => {
                    setStep('credentials');
                    setOtp('');
                    setOtpMessage('');
                  }}
                >
                  Back to email
                </button>
              </>
            )}
          </form>

          <div className="loginLinks">
            <a href="#forgot">Forgot password?</a>
            <button
              type="button"
              className="btn btn-link"
              onClick={() => setRequestAccessOpen(true)}
            >
              Request access
            </button>
          </div>

          <div className="demoCredentials">
            <p><strong>Login Credentials:</strong></p>
            <p>Admin: onboarding@sochristventures.com</p>
            <p>Contact support for password</p>
          </div>
        </div>
      </div>

      <RequestAccessModal
        open={requestAccessOpen}
        onClose={() => setRequestAccessOpen(false)}
      />
    </div>
  );
}
