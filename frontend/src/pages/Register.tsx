import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
} from 'lucide-react';
import api from '../services/api';
import logoPath from '../assets/abhyuday-logo.png';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const watchPassword = watch('password', '');
  const watchConfirmPassword = watch('confirmPassword', '');

  // Calculate Password Strength meter score (0 - 4)
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^a-zA-Z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-emerald-400' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-600' };
  };

  const strength = getPasswordStrength(watchPassword);

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      });

      setSuccessMsg('Admin account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-enter w-full">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-emerald-50/80 mb-3 border border-emerald-100/60 shadow-sm">
          <img
            src={logoPath}
            alt="Abhyuday Industries"
            className="h-[52px] sm:h-[60px] w-auto object-contain"
          />
        </div>
        <h1 className="font-auth text-[1.7rem] font-bold tracking-tight text-slate-900">
          Create Admin Account
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Register an operator profile for compliance tracking
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3.5 bg-red-50/90 border border-red-200/80 rounded-2xl text-xs font-medium text-red-700 flex items-center gap-2.5 shadow-sm">
          <AlertCircle size={16} className="shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3.5 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl text-xs font-medium text-emerald-800 flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-[12px] font-semibold text-slate-700 mb-1 ml-1">
            Full Name
          </label>
          <div className="auth-input-group relative flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl">
            <User size={18} className="shrink-0 text-slate-400" />
            <input
              type="text"
              disabled={loading}
              placeholder="Enter your full name"
              autoComplete="name"
              {...register('name')}
              className="w-full bg-transparent border-0 outline-none text-[14px] text-slate-800 placeholder:text-slate-400 disabled:opacity-60 font-medium"
            />
          </div>
          {errors.name && (
            <p className="text-red-500 text-[11px] font-medium mt-1 ml-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-slate-700 mb-1 ml-1">
            Email Address
          </label>
          <div className="auth-input-group relative flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl">
            <Mail size={18} className="shrink-0 text-slate-400" />
            <input
              type="email"
              disabled={loading}
              placeholder="Enter your email address"
              autoComplete="email"
              {...register('email')}
              className="w-full bg-transparent border-0 outline-none text-[14px] text-slate-800 placeholder:text-slate-400 disabled:opacity-60 font-medium"
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-[11px] font-medium mt-1 ml-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-slate-700 mb-1 ml-1">
            Password
          </label>
          <div className="auth-input-group relative flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl">
            <Lock size={18} className="shrink-0 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              disabled={loading}
              placeholder="Create a strong password"
              autoComplete="new-password"
              {...register('password')}
              className="w-full bg-transparent border-0 outline-none text-[14px] text-slate-800 placeholder:text-slate-400 pr-8 disabled:opacity-60 font-medium"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>
          </div>

          {/* Password Strength Meter */}
          {watchPassword.length > 0 && (
            <div className="mt-2 px-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span>Strength:</span>
                <span className={strength.score >= 3 ? 'text-emerald-600' : 'text-slate-600'}>
                  {strength.label}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      step <= strength.score ? strength.color : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {errors.password && (
            <p className="text-red-500 text-[11px] font-medium mt-1 ml-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-slate-700 mb-1 ml-1">
            Confirm Password
          </label>
          <div className="auth-input-group relative flex items-center gap-3 px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-2xl">
            <Lock size={18} className="shrink-0 text-slate-400" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              disabled={loading}
              placeholder="Confirm your password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              className="w-full bg-transparent border-0 outline-none text-[14px] text-slate-800 placeholder:text-slate-400 pr-8 disabled:opacity-60 font-medium"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>
          </div>
          {watchConfirmPassword.length > 0 && watchPassword === watchConfirmPassword && (
            <p className="text-emerald-600 text-[11px] font-medium mt-1 ml-1 flex items-center gap-1">
              <CheckCircle2 size={13} />
              <span>Passwords match</span>
            </p>
          )}
          {errors.confirmPassword && (
            <p className="text-red-500 text-[11px] font-medium mt-1 ml-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="auth-cta group relative w-full mt-3 bg-[#00c853] hover:bg-[#00b34a] text-white font-bold tracking-[0.1em] uppercase text-[13px] py-3.5 rounded-2xl flex items-center justify-center transition-all active:scale-[0.99]"
        >
          <span className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform">
            {loading ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <ArrowRight size={16} className="text-white" />
            )}
          </span>
          <span>{loading ? 'Creating account...' : 'Create Account'}</span>
        </button>
      </form>

      <p className="text-center mt-5 text-[13px] text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
          Sign In
        </Link>
      </p>

      {/* Crafted with Love by Jenish Patel Badge */}
      <div className="mt-6 pt-3 border-t border-slate-100 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-[11px] font-medium text-slate-500 border border-slate-200/60 shadow-2xs">
          <span>Made with</span>
          <Heart size={12} className="text-red-500 fill-red-500 animate-pulse" />
          <span>by</span>
          <span className="font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Jenish Patel
          </span>
        </span>
      </div>
    </div>
  );
};

export default Register;
