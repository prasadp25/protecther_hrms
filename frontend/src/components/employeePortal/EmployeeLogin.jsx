import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { employeePortalService } from '../../services/employeePortalService';

// Resend cooldown in seconds (must match backend)
const RESEND_COOLDOWN = 45;
// OTP expiry time in seconds (must match backend: 10 minutes)
const OTP_EXPIRY_SECONDS = 10 * 60;
// LocalStorage key for remembered email
const REMEMBERED_EMAIL_KEY = 'employee_portal_email';

const EmployeeLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(0);
  const [rememberEmail, setRememberEmail] = useState(true);
  const timerRef = useRef(null);
  const expiryTimerRef = useRef(null);
  const otpInputRef = useRef(null);

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    };
  }, []);

  // Auto-focus OTP input when step changes to 'otp'
  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [step]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !loading && step === 'otp') {
      handleVerifyOTP({ preventDefault: () => {} });
    }
  }, [otp]);

  // Start countdown timer for resend
  const startCountdown = (seconds) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(seconds);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start OTP expiry countdown
  const startExpiryCountdown = () => {
    if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    setOtpExpiry(OTP_EXPIRY_SECONDS);
    expiryTimerRef.current = setInterval(() => {
      setOtpExpiry((prev) => {
        if (prev <= 1) {
          clearInterval(expiryTimerRef.current);
          toast.warning('OTP has expired. Please request a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await employeePortalService.sendOTP(email);
      if (response.success) {
        toast.success('OTP sent to your email');
        setStep('otp');
        startCountdown(RESEND_COOLDOWN);
        startExpiryCountdown();

        // Save or remove email based on checkbox
        if (rememberEmail) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      }
    } catch (error) {
      // Handle rate limit with waitTime from backend
      if (error.data?.waitTime) {
        startCountdown(error.data.waitTime);
        setStep('otp'); // Move to OTP step if already sent
        startExpiryCountdown();
      }
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    if (otpExpiry === 0) {
      toast.error('OTP has expired. Please request a new one.');
      return;
    }

    setLoading(true);
    try {
      const response = await employeePortalService.verifyOTP(email, otp);
      if (response.success) {
        toast.success('Login successful!');
        navigate('/employee-portal/dashboard');
      }
    } catch (error) {
      toast.error(error.message || 'Invalid OTP');
      setOtp(''); // Clear OTP on error
      otpInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setOtp(''); // Clear old OTP
    await handleSendOTP({ preventDefault: () => {} });
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center">
          <img
            src="/protecther-logo.png"
            alt="ProtectHer"
            className="h-16 mx-auto mb-4"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h1 className="text-2xl font-bold text-white">Employee Portal</h1>
          <p className="text-indigo-200 mt-2">Access your payslips, profile & more</p>
        </div>

        {/* Form */}
        <div className="p-8">
          {step === 'email' ? (
            <form onSubmit={handleSendOTP}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Remember my email
                </label>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending OTP...
                  </span>
                ) : (
                  'Send OTP'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-4">
                <p className="text-gray-600 text-sm mb-2">
                  We've sent a 6-digit OTP to <strong>{email}</strong>
                </p>
                {/* OTP Expiry Warning */}
                {otpExpiry > 0 ? (
                  <p className={`text-sm mb-4 ${otpExpiry <= 60 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                    ⏱ OTP expires in <strong>{formatTime(otpExpiry)}</strong>
                  </p>
                ) : (
                  <p className="text-sm mb-4 text-red-500 font-medium">
                    ⚠ OTP has expired. Please request a new one.
                  </p>
                )}
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Enter OTP
                </label>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={handleOtpChange}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-center text-2xl tracking-widest"
                  maxLength={6}
                  disabled={otpExpiry === 0}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6 || otpExpiry === 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 mb-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Verify & Login'
                )}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
                  }}
                  className="text-indigo-600 hover:underline"
                >
                  Change Email
                </button>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={countdown > 0}
                  className={`${countdown > 0 ? 'text-gray-400' : 'text-indigo-600 hover:underline'}`}
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {/* Back to Admin */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <a
              href="/login"
              className="text-gray-500 text-sm hover:text-indigo-600"
            >
              Admin Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogin;
