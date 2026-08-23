import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Mail, Lock, Loader2, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { setCredentials } from '../slices/authSlice';
import api from '../services/api';
import logoPath from '../assets/abhyuday-logo.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get('reason') === 'expired') {
      setInfoMsg('Your session has expired due to inactivity. Please sign in again.');
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const { accessToken, user } = response.data;
      dispatch(setCredentials({ user, token: accessToken }));
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid email or password. Please verify your credentials.';
      if (err.response?.status === 401 || err.response?.status === 400) {
        setErrorMsg('Invalid email or password. Please verify your credentials and try again.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-enter w-full">
      <div className="text-center mb-8">
        <img
          src={logoPath}
          alt="Abhyuday Industries"
          className="mx-auto h-[72px] w-auto object-contain mb-5"
        />
        <h1 className="font-auth text-[1.65rem] font-semibold tracking-tight text-[#1a1a1a]">
          Access your account
        </h1>
        <p className="mt-1.5 text-[13px] text-[#6b7280]">
          Sign in to continue to Abhyuday Management
        </p>
      </div>

      {infoMsg && (
        <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-700 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{infoMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-600 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <div className="relative flex items-center gap-3 border-b border-[#d1d5db] focus-within:border-[#00c853] transition-colors pb-2">
            <Mail size={18} className="shrink-0 text-[#9ca3af]" />
            <input
              type="email"
              disabled={loading}
              placeholder="Email"
              autoComplete="email"
              {...register('email')}
              className="w-full bg-transparent border-0 outline-none text-[15px] text-[#1a1a1a] placeholder:text-[#9ca3af] py-1.5 disabled:opacity-60"
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-[11px] font-medium mt-1.5">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="relative flex items-center gap-3 border-b border-[#d1d5db] focus-within:border-[#00c853] transition-colors pb-2">
            <Lock size={18} className="shrink-0 text-[#9ca3af]" />
            <input
              type={showPassword ? 'text' : 'password'}
              disabled={loading}
              placeholder="Password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full bg-transparent border-0 outline-none text-[15px] text-[#1a1a1a] placeholder:text-[#9ca3af] py-1.5 pr-8 disabled:opacity-60"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 text-[#9ca3af] hover:text-[#4b5563] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-[11px] font-medium mt-1.5">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end pt-1">
          <Link
            to="/forgot-password"
            className="text-[12px] font-semibold text-[#00a844] hover:text-[#00963c] transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="auth-cta group relative w-full mt-2 bg-[#00c853] hover:bg-[#00b34a] disabled:bg-[#00c853]/70 text-white font-bold tracking-[0.12em] uppercase text-[13px] py-3.5 rounded-full flex items-center justify-center transition-all active:scale-[0.99]"
        >
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#16a34a] flex items-center justify-center shadow-sm group-hover:translate-x-0.5 transition-transform">
            {loading ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <ArrowRight size={16} className="text-white" />
            )}
          </span>
          <span>{loading ? 'Signing in...' : 'Sign In'}</span>
        </button>
      </form>

      <p className="text-center mt-7 text-[13px] text-[#6b7280]">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-[#00a844] hover:text-[#00963c] transition-colors">
          Create an account
        </Link>
      </p>
    </div>
  );
};

export default Login;
