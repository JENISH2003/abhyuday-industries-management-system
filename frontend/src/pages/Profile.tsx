import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  KeyRound, 
  Activity,
  FileCheck,
  Building,
  Sparkles,
  CheckCircle2,
  Edit2,
  X,
  Loader2,
  AlertCircle,
  LogOut
} from 'lucide-react';
import { RootState } from '../store';
import { setCredentials, logout } from '../slices/authSlice';
import { formatDateTime } from '../utils';
import api from '../services/api';

export const Profile: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);

  // Component States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  // Role display formatting
  const formattedRole = user?.role ? user.role.replace('_', ' ').toUpperCase() : 'USER';

  // Open Edit Name Modal
  const openEditModal = () => {
    setNewName(user?.name || '');
    setEditError('');
    setEditSuccess('');
    setIsEditModalOpen(true);
  };

  // Submit Name Update
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim().length < 2) {
      setEditError('Name must be at least 2 characters long.');
      return;
    }

    setEditLoading(true);
    setEditError('');
    setEditSuccess('');

    try {
      const res = await api.put('/auth/profile', { name: newName.trim() });
      if (res.data?.success && res.data.user) {
        // Update Redux state to reflect new name everywhere instantly
        dispatch(setCredentials({ user: res.data.user, token }));
        setEditSuccess('Name updated successfully!');
        setTimeout(() => {
          setIsEditModalOpen(false);
          setEditSuccess('');
        }, 1000);
      }
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update name.');
    } finally {
      setEditLoading(false);
    }
  };

  // Logout from all devices handler
  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to log out from all devices? All other active sessions will be terminated.')) {
      return;
    }
    setLogoutAllLoading(true);
    try {
      await api.post('/auth/logout-all');
    } catch (err) {
      console.error('Logout all error:', err);
    } finally {
      setLogoutAllLoading(false);
      dispatch(logout());
      navigate('/login');
    }
  };

  // Permission list based on role
  const getRolePermissions = (role?: string) => {
    const isSuper = role === 'super_admin';
    const isAdmin = role === 'admin' || isSuper;
    const isManager = role === 'manager' || isAdmin;

    return [
      { name: 'Register & View Certificates', allowed: true },
      { name: 'Stability Reminders & Checkpoints', allowed: true },
      { name: 'Receive Compliance Email Alerts', allowed: true },
      { name: 'Schedule Compliance Meetings', allowed: isManager },
      { name: 'Audit & System Activity Logs', allowed: isAdmin },
      { name: 'User Directory & Clearance Management', allowed: isAdmin },
      { name: 'System Core Settings & SMTP Control', allowed: isSuper },
    ];
  };

  const permissions = getRolePermissions(user?.role);

  return (
    <div className="space-y-8 select-none max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* HERO COVER HEADER */}
      <div className="relative bg-card border border-border rounded-3xl overflow-hidden shadow-premium">
        {/* Decorative Gradient Banner */}
        <div className="h-32 bg-gradient-to-r from-brand via-brand-dark to-emerald-700 relative overflow-hidden flex items-center justify-end px-6">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="z-10 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg">
            <Sparkles size={14} />
            <span>Abhyuday Management System Workspace</span>
          </div>
        </div>

        {/* Profile Details Bar */}
        <div className="px-6 md:px-8 pb-6 pt-0 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 -mt-12">
          <div className="flex flex-col md:flex-row items-center md:items-end space-y-3 md:space-y-0 md:space-x-5 text-center md:text-left">
            {/* User Avatar Badge */}
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-brand to-brand-dark text-white font-black text-3xl flex items-center justify-center shadow-lg border-4 border-card uppercase">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div 
                className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-card rounded-full" 
                title="Account Active & Verified"
              />
            </div>

            <div className="space-y-1 pb-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">{user?.name}</h2>
                
                {/* Edit Name Trigger Button */}
                <button
                  type="button"
                  onClick={openEditModal}
                  className="px-2.5 py-1 text-xs font-semibold text-brand hover:text-brand bg-brand/10 hover:bg-brand-dark/20 border border-brand/30 rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                  title="Edit your display name"
                >
                  <Edit2 size={12} />
                  <span>Edit Name</span>
                </button>

                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-brand/10 text-brand dark:text-brand-light border border-brand/20">
                  {formattedRole}
                </span>
              </div>

              <p className="text-xs text-muted-foreground flex items-center justify-center md:justify-start space-x-1.5">
                <Mail size={13} className="text-muted-foreground/80" />
                <span>{user?.email}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
            <Link
              to="/forgot-password"
              className="px-4 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-all shadow-soft active:scale-[0.98] cursor-pointer"
            >
              <KeyRound size={15} />
              <span>Request Password Reset (OTP)</span>
            </Link>

            <button
              type="button"
              disabled={logoutAllLoading}
              onClick={handleLogoutAll}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl flex items-center space-x-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Terminate sessions on all devices"
            >
              {logoutAllLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <LogOut size={15} />
              )}
              <span>Logout All Devices</span>
            </button>
            
            {(user?.role === 'super_admin' || user?.role === 'admin') && (
              <Link
                to="/logs"
                className="px-4 py-2 bg-card hover:bg-muted border border-border text-foreground text-xs font-bold rounded-xl flex items-center space-x-2 transition-all shadow-sm cursor-pointer"
              >
                <Activity size={15} className="text-brand" />
                <span>My Audit Logs</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2-COLUMN METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: PERSONAL & WORKSPACE DETAILS */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-soft space-y-4">
          <div className="flex items-center space-x-3 border-b border-border pb-3">
            <div className="p-2.5 bg-brand/10 text-brand border border-brand/20 rounded-xl">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Operator Attributes</h3>
              <p className="text-[10px] text-muted-foreground">Personal & organizational details</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Full Name</span>
              <span className="font-semibold text-foreground text-sm mt-0.5 block">{user?.name}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Registered Email</span>
              <span className="font-semibold text-foreground mt-0.5 block truncate">{user?.email}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Clearance Level</span>
              <span className="font-semibold text-foreground capitalize mt-0.5 block">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Organization / Unit</span>
              <span className="font-semibold text-foreground mt-0.5 flex items-center space-x-1">
                <Building size={13} className="text-brand" />
                <span>Abhyuday Industries</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Last Active Session</span>
              <span className="font-semibold text-foreground mt-0.5 block">
                {user?.lastLogin ? formatDateTime(user.lastLogin) : 'Active Now'}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: SYSTEM PERMISSIONS MATRIX */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-soft space-y-4">
          <div className="flex items-center space-x-3 border-b border-border pb-3">
            <div className="p-2.5 bg-slate-500/10 text-slate-500 border border-slate-500/20 rounded-xl">
              <FileCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Clearance Rights</h3>
              <p className="text-[10px] text-muted-foreground">Module privileges for your role</p>
            </div>
          </div>

          <div className="space-y-3">
            {permissions.map((perm, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium truncate max-w-[240px]" title={perm.name}>
                  {perm.name}
                </span>
                {perm.allowed ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center space-x-1">
                    <CheckCircle2 size={10} />
                    <span>ENABLED</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-muted text-muted-foreground/60 border border-border shrink-0">
                    RESTRICTED
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* EDIT NAME MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center space-x-2">
                <Edit2 className="text-brand" size={18} />
                <h3 className="text-sm font-bold text-foreground">Edit Display Name</h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveName} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold text-red-600 flex items-center space-x-2">
                  <AlertCircle size={15} />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-600 flex items-center space-x-2">
                  <CheckCircle2 size={15} />
                  <span>{editSuccess}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  disabled={editLoading}
                  placeholder="Enter full name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 transition-all"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading || !newName.trim()}
                  className="px-5 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-all shadow-soft active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving Name...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Profile;
