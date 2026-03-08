import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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
  const { setAuthData } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOtpMessage('');
    setIsLoading(true);

    try {
      const loginResponse = (await api.login(email, password)) as any;

      if (loginResponse.success) {
        if (loginResponse.data?.requiresOtp) {
          const otpData = {
            userId: loginResponse.data.userId,
            challengeId: loginResponse.data.challengeId,
            email: loginResponse.data.email,
            otpCode: loginResponse.data.otpCode,
          };
          sessionStorage.setItem('otp-pending', JSON.stringify(otpData));

          setUserId(loginResponse.data.userId);
          setChallengeId(loginResponse.data.challengeId);
          setStep('otp');

          let message = `OTP sent to your email: ${loginResponse.data.email}`;
          if (loginResponse.data?.otpCode) {
            message += ` (Dev: ${loginResponse.data.otpCode})`;
          }
          setOtpMessage(message);
          setIsLoading(false);
          return;
        }

        if (loginResponse.data?.requiresTotp) {
          setError('TOTP is required for this account. Please complete your authenticator login flow.');
          setIsLoading(false);
          return;
        }

        if (loginResponse.data?.user) {
          const user = loginResponse.data.user;
          setAuthData('cookie-session', {
            id: user.id,
            name: user.name || user.email || 'User',
            email: user.email,
            role: user.role,
            location: user.location || '',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any);

          localStorage.setItem('user', JSON.stringify(user));

          if (loginResponse.data?.accessToken) {
            api.setToken(loginResponse.data.accessToken);
          }
          if (loginResponse.data?.refreshToken) {
            api.setRefreshToken(loginResponse.data.refreshToken);
          }

          navigate('/dashboard');
          return;
        }

        if (loginResponse.data?.accessToken && loginResponse.data?.user) {
          api.setToken(loginResponse.data.accessToken);
          localStorage.setItem('user', JSON.stringify(loginResponse.data.user));

          if (loginResponse.data?.refreshToken) {
            api.setRefreshToken(loginResponse.data.refreshToken);
          }

          navigate('/dashboard');
          return;
        }
      }

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
      const response = (await api.verifyOtp(userId, challengeId, otp)) as any;

      if (response.success && response.data?.accessToken && response.data?.user) {
        api.setToken(response.data.accessToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        if (response.data?.refreshToken) {
          api.setRefreshToken(response.data.refreshToken);
        }

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
            <Lock size={12} aria-hidden="true" />
            <span>Secure Access</span>
            <span className="securityDivider" aria-hidden="true">•</span>
            <span>Real-Time Dispatch</span>
            <span className="securityDivider" aria-hidden="true">•</span>
            <span>Enterprise Ready</span>
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

          <form onSubmit={step === 'credentials' ? handleLogin : handleVerifyOtp}>
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
                      placeholder="********"
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
                      {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
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
                  <p className="formHint">
                    Check your email at <strong>{email}</strong>
                  </p>
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
              className="loginLinkButton"
              onClick={() => setRequestAccessOpen(true)}
            >
              Request access
            </button>
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
