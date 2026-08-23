import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileCheck, 
  ShieldCheck, 
  Clock, 
  Calendar,
  ChevronRight,
  ShieldAlert,
  FolderCheck,
  RefreshCw,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import { formatDate, getDaysRemaining } from '../utils';
import { Certificate, Meeting } from '../types';
import { PaginationControls } from '../components/PaginationControls';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  // Recent Certificates table pagination state
  const [recentPage, setRecentPage] = useState(1);
  const [recentLimit, setRecentLimit] = useState(5);

  // Renewal modal state
  const [renewCert, setRenewCert] = useState<Certificate | null>(null);
  const [renewDate, setRenewDate] = useState('');
  const [renewError, setRenewError] = useState('');
  const [renewLoading, setRenewLoading] = useState(false);

  // Query 1: Accurate Status Stats from Server
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['certificate-stats'],
    queryFn: async () => {
      const res = await api.get('/certificates/stats');
      return res.data;
    }
  });

  // Query 2: Recent certificates with pagination
  const { data: certsData, isLoading: certsLoading } = useQuery({
    queryKey: ['dashboard-certificates', recentPage, recentLimit],
    queryFn: async () => {
      const res = await api.get('/certificates', {
        params: {
          page: recentPage,
          limit: recentLimit,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      });
      return res.data;
    }
  });

  // Query 3: Meetings list
  const { data: meetingsData, isLoading: meetingsLoading } = useQuery({
    queryKey: ['dashboard-meetings'],
    queryFn: async () => {
      const res = await api.get('/meetings');
      return res.data;
    }
  });

  // Stats aggregation
  const stats = statsData?.stats || { total: 0, active: 0, warning: 0, expired: 0 };
  const recentCerts: Certificate[] = certsData?.certificates || [];
  const recentCertsPagination = certsData?.pagination || { total: 0, page: 1, limit: recentLimit, pages: 1 };
  const meetings: Meeting[] = meetingsData?.meetings || [];
  const upcomingMeetings = meetings.filter(m => new Date(m.date) >= new Date()).slice(0, 4);

  // Renewal Mutation
  const renewMutation = useMutation({
    mutationFn: async ({ id, expiryDate }: { id: string; expiryDate: string }) => {
      if (!renewCert) return;
      return api.put(`/certificates/${id}/renew`, {
        expiryDate: expiryDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-soon'] });

      setRenewCert(null);
      setRenewDate('');
      setRenewError('');
    },
    onError: (err: any) => {
      setRenewError(err.response?.data?.message || 'Failed to renew certificate.');
    }
  });

  const handleRenewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewCert || !renewDate) {
      setRenewError('Please select a valid future expiry date.');
      return;
    }
    setRenewLoading(true);
    renewMutation.mutate({ id: renewCert._id, expiryDate: renewDate }, {
      onSettled: () => setRenewLoading(false)
    });
  };

  const metricCards = [
    { 
      id: 'all',
      label: 'Total Certificates', 
      value: stats.total, 
      desc: 'Total managed documents',
      icon: FileCheck, 
      color: 'text-brand bg-brand/10 border-brand/20 hover:border-brand/50' 
    },
    { 
      id: 'active',
      label: 'Active Certificates', 
      value: stats.active, 
      desc: 'Valid & > 90 days left',
      icon: ShieldCheck, 
      color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50' 
    },
    { 
      id: 'expiring_soon',
      label: 'Warning Certificates', 
      value: stats.warning, 
      desc: 'Expiring within 90 days',
      icon: Clock, 
      color: 'text-amber-600 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50' 
    },
    { 
      id: 'expired',
      label: 'Expired Certificates', 
      value: stats.expired, 
      desc: 'Requires immediate renewal',
      icon: ShieldAlert, 
      color: 'text-red-600 bg-red-500/10 border-red-500/20 hover:border-red-500/50' 
    },
  ];

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200 max-w-6xl mx-auto pt-2">
      {/* 4 Clickable Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-soft animate-pulse flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-muted rounded"></div>
                  <div className="h-6 w-12 bg-muted rounded"></div>
                </div>
                <div className="w-10 h-10 bg-muted rounded-xl"></div>
              </div>
            ))
          : metricCards.map((metric) => {
              const Icon = metric.icon;
              return (
                <div 
                  key={metric.id}
                  onClick={() => navigate(`/certificates?status=${metric.id === 'all' ? '' : metric.id}`)}
                  className={`bg-card border rounded-2xl p-5 shadow-soft hover:shadow-premium transition-all duration-200 flex items-center justify-between cursor-pointer group ${metric.color}`}
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">{metric.label}</p>
                    <p className="text-2xl font-extrabold text-foreground">{metric.value}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">{metric.desc}</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 shadow-sm">
                    <Icon size={22} />
                  </div>
                </div>
              );
            })}
      </div>

      {/* Two Column Layout: Paginated Recent Certificates & Upcoming Syncs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans): Paginated Recent Certificates Overview */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-soft flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base font-bold text-foreground">Recent Certificates</h3>
                  <p className="text-xs text-muted-foreground">Compliance documents uploaded recently</p>
                </div>
                <Link 
                  to="/certificates" 
                  className="text-xs font-bold text-brand hover:text-brand dark:text-brand-light flex items-center space-x-1 hover:underline"
                >
                  <span>View All Certificates</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              {certsLoading ? (
                <div className="space-y-3 mb-6">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : recentCerts.length === 0 ? (
                <div className="text-center py-12 mb-6">
                  <FileCheck size={40} className="mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-bold text-foreground">No Certificates Added Yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="pb-3">Category / Subcategory</th>
                        <th className="pb-3">Authority</th>
                        <th className="pb-3">Expiry Date</th>
                        <th className="pb-3">Days Left</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs font-medium">
                      {recentCerts.map((cert) => {
                        const daysLeft = getDaysRemaining(cert.expiryDate);
                        const isExpired = daysLeft <= 0;
                        const isWarning = daysLeft > 0 && daysLeft <= 90;

                        return (
                          <tr 
                            key={cert._id} 
                            onClick={() => navigate('/certificates')} 
                            className="hover:bg-muted/50 transition-colors cursor-pointer group"
                            title="Click to open certificates workspace"
                          >
                            <td className="py-3.5 pr-3">
                              <div className="font-bold text-foreground group-hover:text-brand transition-colors">{cert.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{cert.category?.name || 'General'} • {cert.subcategory?.name || 'General'}</div>
                            </td>
                            <td className="py-3.5 pr-3 text-muted-foreground">{cert.issuingAuthority}</td>
                            <td className="py-3.5 pr-3 text-muted-foreground">{formatDate(cert.expiryDate)}</td>
                            <td className={`py-3.5 pr-3 font-bold ${isExpired ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-600'}`}>
                              {isExpired ? 'Expired' : `${daysLeft} days`}
                            </td>
                            <td className="py-3.5">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isExpired 
                                  ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                  : isWarning 
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {isExpired ? 'Expired' : isWarning ? 'Warning' : 'Active'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Premium Pagination for Recent Certificates on Dashboard */}
            {recentCerts.length > 0 && (
              <div className="pt-4 border-t border-border bg-card">
                <PaginationControls
                  currentPage={recentCertsPagination.page}
                  totalPages={recentCertsPagination.pages}
                  totalRecords={recentCertsPagination.total}
                  limit={recentLimit}
                  onPageChange={(p) => setRecentPage(p)}
                  onLimitChange={(l) => { setRecentLimit(l); setRecentPage(1); }}
                  pageSizeOptions={[5, 10, 25]}
                  itemLabel="certificates"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Meetings Highlights */}
        <div className="space-y-6">
          
          {/* Upcoming Meetings Box */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-soft h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Upcoming Meetings</h3>
                  <p className="text-xs text-muted-foreground">Scheduled compliance syncs</p>
                </div>
                <Link 
                  to="/meetings" 
                  className="text-xs font-bold text-brand hover:text-brand dark:text-brand-light flex items-center space-x-1 hover:underline"
                >
                  <span>View All</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              {meetingsLoading ? (
                <div className="space-y-3">
                  <div className="h-16 bg-muted/40 rounded-xl animate-pulse" />
                </div>
              ) : upcomingMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar size={36} className="mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">No upcoming meetings scheduled.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <div key={meeting._id} className="p-3.5 bg-muted/20 border border-border/70 rounded-xl hover:border-brand/30 transition-all">
                      <h4 className="text-xs font-bold text-foreground leading-snug">{meeting.title}</h4>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                        <span>{formatDate(meeting.date)} • {meeting.time}</span>
                        <span className="bg-brand/10 text-brand dark:text-brand-light px-2 py-0.5 rounded-md font-bold text-[10px]">
                          {meeting.location}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Renewal Modal */}
      {renewCert && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center space-x-2">
                <RefreshCw className="text-brand dark:text-brand-light" size={18} />
                <h3 className="text-sm font-bold text-foreground">Renew Certificate</h3>
              </div>
              <button 
                onClick={() => setRenewCert(null)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRenewSubmit} className="p-6 space-y-4">
              {renewError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold text-red-600 flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>{renewError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Category / Subcategory</label>
                <input
                  type="text"
                  disabled
                  value={`${renewCert.category?.name || 'General'}${renewCert.subcategory?.name ? ` / ${renewCert.subcategory.name}` : ''}`}
                  className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-muted/50 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Certificate Number</label>
                <input
                  type="text"
                  disabled
                  value={renewCert.certificateNo}
                  className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-muted/50 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">New Expiry Date</label>
                <input
                  type="date"
                  required
                  value={renewDate}
                  onChange={(e) => setRenewDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs bg-background/50 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-semibold"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Selecting a future date will automatically restore status to <strong>Active</strong> (or <strong>Warning</strong>) and remove this certificate from the Expired list.
                </p>
              </div>

              <div className="pt-4 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setRenewCert(null)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-muted font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewLoading}
                  className="px-5 py-2 bg-brand hover:bg-brand-dark disabled:bg-brand/60 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-soft transition-all"
                >
                  {renewLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  <span>Save Renewal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
