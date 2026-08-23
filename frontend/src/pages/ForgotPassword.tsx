import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import api from '../services/api';
import logoPath from '../assets/abhyuday-logo.png';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setErrorMsg('');
      setSuccessMsg(res.data?.message || 'OTP code sent to your email.');
      setCooldown(res.data?.cooldownSeconds || 45);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to send OTP code. Please verify email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the OTP code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/auth/verify-otp', { email, otp: fullOtp });
      setErrorMsg('');
      setSuccessMsg(res.data?.message || 'OTP verified successfully!');
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please check again.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const fullOtp = otpDigits.join('');
      const res = await api.post('/auth/reset-password-otp', {
        email,
        otp: fullOtp,
        newPassword,
      });
      setErrorMsg('');
      setSuccessMsg(res.data?.message || 'Password reset successfully!');
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSuccessMsg('A fresh OTP code has been sent to your email.');
      setCooldown(res.data?.cooldownSeconds || 45);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    1: 'Forgot password',
    2: 'Verify OTP',
    3: 'Create new password',
    4: 'Password reset complete',
  };

  const subtitles = {
    1: 'Enter your registered email to receive a verification code',
    2: `We sent a 6-digit code to ${email}`,
    3: 'Choose a strong password for your account',
    4: 'Your password has been updated successfully',
  };

  return (
    <div className="auth-form-enter w-full">
      <div className="text-center mb-6">
        <img
          src={logoPath}
          alt="Abhyuday Industries"
          className="mx-auto h-[64px] w-auto object-contain mb-4"
        />
        <h1 className="font-auth text-[1.55rem] font-semibold tracking-tight text-[#1a1a1a]">
          {titles[step]}
        </h1>
        <p className="mt-1.5 text-[13px] text-[#6b7280] leading-relaxed">{subtitles[step]}</p>
      </div>

      {step < 4 && (
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                step === s ? 'w-8 bg-[#00c853]' : step > s ? 'w-2 bg-[#16a34a]' : 'w-2 bg-[#e5e7eb]'
              }`}
            />
          ))}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-600 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && step !== 4 && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-700 flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleSendOtp} className="space-y-6">
          <div>
            <div className="relative flex items-center gap-3 border-b border-[#d1d5db] focus-within:border-[#00c853] transition-colors pb-2">
              <Mail size={18} className="shrink-0 text-[#9ca3af]" />
              <input
                type="email"
                required
                disabled={loading}
                placeholder="Registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-[15px] text-[#1a1a1a] placeholder:text-[#9ca3af] py-1.5 disabled:opacity-60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="auth-cta group relative w-full bg-[#00c853] hover:bg-[#00b34a] disabled:bg-[#00c853]/70 text-white font-bold tracking-[0.12em] uppercase text-[13px] py-3.5 rounded-full flex items-center justify-center transition-all active:scale-[0.99]"
          >
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#16a34a] flex items-center justify-center shadow-sm">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            </span>
            <span>{loading ? 'Sending...' : 'Send OTP'}</span>
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  otpInputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                disabled={loading}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                className="w-10 h-12 sm:w-11 text-center text-lg font-bold bg-[#f9fafb] border border-[#e5e7eb] rounded-xl focus:border-[#00c853] focus:ring-2 focus:ring-[#00c853]/20 outline-none transition-all"
              />
            ))}
          </div>
          <p className="text-[10px] text-[#9ca3af] text-center">
            OTP expires in 10 minutes · Maximum 5 attempts
          </p>

          <button
            type="submit"
            disabled={loading || otpDigits.join('').length !== 6}
            className="auth-cta group relative w-full bg-[#00c853] hover:bg-[#00b34a] disabled:bg-[#00c853]/70 text-white font-bold tracking-[0.12em] uppercase text-[13px] py-3.5 rounded-full flex items-center justify-center transition-all active:scale-[0.99]"
          >
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#16a34a] flex items-center justify-center shadow-sm">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            </span>
            <span>{loading ? 'Verifying...' : 'Verify Code'}</span>
          </button>

          <div className="flex items-center justify-between text-xs text-[#6b7280] pt-1">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setErrorMsg('');
              }}
              className="hover:text-[#1a1a1a] flex items-center gap-1 font-semibold"
            >
              <ArrowLeft size={13} />
              Change email
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || loading}
              onClick={handleResendOtp}
              className={`font-semibold flex items-center gap-1 ${
                cooldown > 0 ? 'text-[#9ca3af] cursor-not-allowed' : 'text-[#00a844] hover:text-[#00963c]'
              }`}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <div className="relative flex items-center gap-3 border-b border-[#d1d5db] focus-within:border-[#00c853] transition-colors pb-2">
              <Lock size={18} className="shrink-0 text-[#9ca3af]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-[15px] text-[#1a1a1a] placeholder:text-[#9ca3af] py-1.5 pr-8 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 text-[#9ca3af] hover:text-[#4b5563]"
              >
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          <div>
            <div className="relative flex items-center gap-3 border-b border-[#d1d5db] focus-within:border-[#00c853] transition-colors pb-2">
              <Lock size={18} className="shrink-0 text-[#9ca3af]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-[15px] text-[#1a1a1a] placeholder:text-[#9ca3af] py-1.5 disabled:opacity-60"
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-red-500 text-[11px] font-medium mt-1.5">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || newPassword !== confirmPassword}
            className="auth-cta group relative w-full bg-[#00c853] hover:bg-[#00b34a] disabled:bg-[#00c853]/70 text-white font-bold tracking-[0.12em] uppercase text-[13px] py-3.5 rounded-full flex items-center justify-center transition-all active:scale-[0.99]"
          >
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#16a34a] flex items-center justify-center shadow-sm">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            </span>
            <span>{loading ? 'Updating...' : 'Reset Password'}</span>
          </button>
        </form>
      )}

      {step === 4 && (
        <div className="text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-[#00c853] rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <p className="text-[13px] text-[#6b7280] leading-relaxed">
            Your password has been securely updated. You can now sign in with your new credentials.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="auth-cta group relative w-full bg-[#00c853] hover:bg-[#00b34a] text-white font-bold tracking-[0.12em] uppercase text-[13px] py-3.5 rounded-full flex items-center justify-center transition-all active:scale-[0.99]"
          >
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#16a34a] flex items-center justify-center shadow-sm">
              <ArrowRight size={16} />
            </span>
            <span>Back to Sign In</span>
          </button>
        </div>
      )}

      {step !== 4 && (
        <p className="text-center mt-7">
          <Link
            to="/login"
            className="text-[13px] font-semibold text-[#6b7280] hover:text-[#1a1a1a] inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Sign In
          </Link>
        </p>
      )}
    </div>
  );
};

export default ForgotPassword;
