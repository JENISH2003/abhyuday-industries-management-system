import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  LayoutDashboard, 
  FileCheck, 
  Clock, 
  Users, 
  Calendar, 
  Mail, 
  FileText, 
  Settings, 
  User, 
  LogOut,
  FolderOpen,
  FlaskConical,
  BellRing
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { logout } from '../slices/authSlice';
import { RootState } from '../store';
import { api } from '../services/api';
import logoPath from '../assets/abhyuday logo.jpg';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {}
    dispatch(logout());
    navigate('/login');
  };

  // Clean, professional line-by-line navigation items
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'manager', 'user'] },
    { to: '/categories', label: 'Compliance Folders', icon: FolderOpen, roles: ['super_admin', 'admin', 'manager', 'user'] },
    { to: '/certificates', label: 'Certificates', icon: FileCheck, roles: ['super_admin', 'admin', 'manager', 'user'] },
    { to: '/stability', label: 'Stability Reminders', icon: FlaskConical, roles: ['super_admin', 'admin', 'manager', 'user'] },
    { to: '/personal-reminders', label: 'Personal Reminders', icon: BellRing, roles: ['super_admin', 'admin', 'manager', 'user'] },
    { to: '/meetings', label: 'Meetings', icon: Calendar, roles: ['super_admin', 'admin', 'manager', 'user'] },
    { to: '/logs', label: 'Activity Logs', icon: FileText, roles: ['super_admin', 'admin'] },
    { to: '/users', label: 'User Management', icon: Users, roles: ['super_admin'] },
    { to: '/settings', label: 'Settings & Backups', icon: Settings, roles: ['super_admin'] },
    { to: '/profile', label: 'Profile', icon: User, roles: ['super_admin', 'admin', 'manager', 'user'] },
  ];

  // Filter line-by-line items strictly by current user clearance role
  const filteredNavItems = navItems.filter((item) => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  return (
    <>
      {isOpen && onClose && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-slate-900 text-slate-100 flex flex-col h-screen border-r border-slate-800/80 shadow-2xl select-none transition-all duration-300 ease-in-out md:static ${
          isOpen
            ? 'translate-x-0 md:w-64 md:opacity-100'
            : '-translate-x-full md:-translate-x-full md:w-0 md:opacity-0 md:p-0 overflow-hidden border-none'
        }`}
      >
        <div className="flex items-center space-x-3 p-5 border-b border-slate-800 shrink-0 overflow-hidden">
          <img src={logoPath} alt="Abhyuday logo" className="h-12 w-auto shrink-0 rounded-xl border border-slate-800 bg-slate-950 p-1" />
          <div className="overflow-hidden">
            <h1 className="text-base font-bold tracking-tight text-white leading-none truncate">Abhyuday Industries</h1>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1 block truncate">Management System</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive ? 'bg-brand text-white shadow-soft font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
                `}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col space-y-3">
          <div className="flex items-center justify-between gap-3">
            {user ? (
              <div className="flex items-center space-x-3 overflow-hidden min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 text-brand-light flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize truncate font-medium">{user.role.replace('_', ' ')}</p>
                </div>
              </div>
            ) : (
              <div className="flex-1" />
            )}

            <div className="flex items-center space-x-2 shrink-0">
              <ThemeToggle variant="pill" />
              {user && (
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors cursor-pointer"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
