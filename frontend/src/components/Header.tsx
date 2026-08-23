import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  // Map path to friendly title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Overview Dashboard';
    if (path.startsWith('/categories')) return 'Compliance Folders';
    if (path.startsWith('/certificates')) return 'Certificate Repository';
    if (path.startsWith('/expiring')) return 'Compliance Timeline';
    if (path.startsWith('/meetings')) return 'Meeting Planner';
    if (path.startsWith('/logs')) return 'Activity & System Logs';
    if (path.startsWith('/users')) return 'Access Control Administration';
    if (path.startsWith('/settings')) return 'Backup & Restoration Panel';
    if (path.startsWith('/profile')) return 'Profile Settings';
    if (path.startsWith('/stability')) return 'Stability Studies';
    if (path.startsWith('/personal-reminders')) return 'Personal Reminders';
    return 'Abhyuday Management System';
  };

  return (
    <header className="h-16 border-b border-border bg-card/75 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 md:px-8 select-none shadow-soft transition-colors">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-xl border border-border/70 bg-card text-foreground transition hover:bg-muted/70 hover:text-brand shadow-sm active:scale-95 cursor-pointer"
            aria-label="Toggle navigation panel"
            title="Open / Close left navigation panel"
          >
            <Menu size={20} />
          </button>
        )}

        <div>
          <h2 className="text-md font-bold tracking-tight text-foreground">{getPageTitle()}</h2>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Abhyuday Management System Workspace</p>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-3">
        {/* Medium Theme Toggle Button (Icon variant, no text, premium design) */}
        <ThemeToggle variant="icon" />

        {/* User Profile Card Button */}
        {user && (
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center space-x-3 pl-3 border-l border-border cursor-pointer group"
            title="View & Edit Profile Settings"
          >
            <div className="hidden text-right md:block">
              <p className="text-xs font-bold text-foreground group-hover:text-brand transition-colors leading-tight">{user.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize font-semibold tracking-wider leading-tight">{user.role.replace('_', ' ')}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-brand group-hover:bg-brand-dark text-white flex items-center justify-center font-extrabold text-sm shadow-soft group-hover:shadow-premium transition-all">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
export default Header;
