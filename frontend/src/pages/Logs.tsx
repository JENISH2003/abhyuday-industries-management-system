import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Shield, 
  Search, 
  Filter, 
  Trash2, 
  AlertTriangle, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Database
} from 'lucide-react';
import api from '../services/api';
import { formatDateTime } from '../utils';
import { ActivityLog } from '../types';
import { RootState } from '../store';
import { generateEnterpriseExcelReport, EnterpriseExcelColumn, SummaryCardItem } from '../utils/excelReportEngine';
import { PaginationControls } from '../components/PaginationControls';

// Helper to format raw actions into friendly text if legacy logs exist
const formatFriendlyAction = (actionStr: string): string => {
  if (!actionStr) return 'Activity';
  const upper = actionStr.toUpperCase();
  if (upper.startsWith('PATCH') || upper.startsWith('PUT')) return 'Update Record';
  if (upper.startsWith('POST')) return 'Create Record';
  if (upper.startsWith('DELETE')) return 'Delete Record';
  if (upper.startsWith('GET')) return 'View Record';
  return actionStr;
};

// Helper to format raw details if legacy logs contain technical HTTP paths
const formatFriendlyDetails = (detailsStr: string): string => {
  if (!detailsStr) return 'Activity recorded';
  if (detailsStr.includes('Completed request') && detailsStr.includes('/api/')) {
    return 'Action performed successfully.';
  }
  return detailsStr;
};

export const Logs: React.FC = () => {
  const queryClient = useQueryClient();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canDeleteLog = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [moduleFilter, setModuleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Log Modal State for Super Admin
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState({ error: '', success: '' });

  const handleExportExcel = async () => {
    const columns: EnterpriseExcelColumn[] = [
      { header: 'Time Sent', key: 'timestampFormatted', width: 25, align: 'center', type: 'date' },
      { header: 'User Name', key: 'userName', width: 22, align: 'left' },
      { header: 'Module', key: 'module', width: 20, align: 'center' },
      { header: 'Action', key: 'action', width: 22, align: 'center' },
      { header: 'Details', key: 'details', width: 50, align: 'left' },
    ];

    const certModuleCount = logs.filter(l => l.module === 'Certificate').length;
    const authModuleCount = logs.filter(l => l.module === 'Auth').length;
    const meetingModuleCount = logs.filter(l => l.module === 'Meeting').length;
    const userModuleCount = logs.filter(l => l.module === 'User').length;

    const summaryCards: SummaryCardItem[] = [
      { label: 'Total Logs', value: logs.length, bgColor: 'F1F5F9', textColor: '0F172A' },
      { label: 'Certificates', value: certModuleCount, bgColor: 'DCFCE7', textColor: '15803D' },
      { label: 'Security & Sign In', value: authModuleCount, bgColor: 'E0F2FE', textColor: '0369A1' },
      { label: 'Meetings', value: meetingModuleCount, bgColor: 'F3E8FF', textColor: '7E22CE' },
      { label: 'Users', value: userModuleCount, bgColor: 'FFEDD5', textColor: 'C2410C' },
    ];

    const exportData = logs.map(l => ({
      timestampFormatted: formatDateTime(l.timestamp),
      userName: l.userName,
      module: l.module === 'System' ? 'System & Folders' : l.module === 'Auth' ? 'Security & Login' : l.module,
      action: formatFriendlyAction(l.action),
      details: formatFriendlyDetails(l.details),
    }));

    await generateEnterpriseExcelReport({
      filename: `Activity_Log_Report_${Date.now()}`,
      sheetName: 'Activity Logs',
      reportTitle: 'System Activity & Audit Log',
      reportSubtitle: 'Official Activity History Log',
      operatorName: 'System Administrator',
      columns,
      data: exportData,
      summaryCards,
    });
  };

  // Fetch Activity logs with search and filter parameters
  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', page, limit, moduleFilter, searchQuery],
    queryFn: async () => {
      const res = await api.get('/logs/activity', {
        params: { 
          page, 
          limit,
          module: moduleFilter || undefined,
          search: searchQuery || undefined
        }
      });
      return res.data;
    }
  });

  const logs: ActivityLog[] = data?.logs || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit, pages: 1 };

  // Handle Single Log Deletion (Super Admin)
  const handleConfirmDeleteLog = async () => {
    if (!deleteTargetId) return;

    setDeleteLoading(true);
    setDeleteFeedback({ error: '', success: '' });

    try {
      await api.delete(`/logs/activity/${deleteTargetId}`);
      setDeleteFeedback({ error: '', success: 'Log record deleted permanently.' });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      setTimeout(() => {
        setDeleteTargetId(null);
        setDeleteFeedback({ error: '', success: '' });
      }, 1000);
    } catch (err: any) {
      setDeleteFeedback({ error: err.response?.data?.message || 'Failed to delete log.', success: '' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Bulk Log Purge (Super Admin)
  const handleClearAllLogs = async () => {
    if (!window.confirm('Are you sure you want to purge ALL activity logs from the database permanently? This action cannot be undone.')) return;
    try {
      await api.delete('/logs/activity/all');
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clear activity logs');
    }
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200 max-w-6xl mx-auto">
      {/* Title & Header Banner */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-soft flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <FileText className="text-brand" size={22} />
            <span>Activity & System Logs</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View a clean, simple record of all actions taken in the application (auto-purged after 24 hours for 512MB DB optimization).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && (
            <>
              <button
                onClick={handleClearAllLogs}
                className="border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center space-x-1.5 transition-all shadow-soft cursor-pointer active:scale-[0.98]"
                title="Permanently clear all activity logs from database"
              >
                <Trash2 size={14} />
                <span>Purge All Activity Logs</span>
              </button>

              <Link
                to="/settings"
                className="border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center space-x-1.5 transition-all shadow-soft cursor-pointer active:scale-[0.98]"
              >
                <Database size={14} />
                <span>Storage Maintenance</span>
              </Link>
            </>
          )}

          <button
            onClick={handleExportExcel}
            className="border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center space-x-2 transition-all shadow-soft cursor-pointer active:scale-[0.98]"
          >
            <span>Export Excel Report (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Info Notice Card */}
      <div className="bg-brand/5 border border-brand/15 p-4 rounded-xl flex items-start space-x-3 text-xs leading-relaxed text-muted-foreground">
        <div className="p-2 rounded-xl bg-brand/10 text-brand dark:text-brand-light shrink-0 mt-0.5">
          <Shield size={18} />
        </div>
        <div>
          <h4 className="font-bold text-foreground mb-0.5">Simple & Transparent Log History</h4>
          <p>
            {isSuperAdmin
              ? 'Super Admin Clearance Active: You can delete individual log entries using the trash icon or execute bulk range purges via Storage Maintenance.'
              : 'This page records every update to certificates, meeting schedules, categories, and account settings with clear user names and exact times.'}
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search by user name or details..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-xs bg-background/50 focus:bg-background outline-none transition-all focus:ring-2 focus:ring-brand/25 focus:border-brand"
          />
        </div>

        {/* Module Filter */}
        <div className="flex items-center space-x-2 border border-border bg-background/50 rounded-xl px-3 py-1 text-xs w-full sm:w-auto">
          <Filter size={14} className="text-muted-foreground" />
          <select
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
            className="py-1.5 bg-transparent border-0 outline-none cursor-pointer pr-4 w-full font-medium"
          >
            <option value="">All Categories & Modules</option>
            <option value="Certificate">Certificates</option>
            <option value="Meeting">Meetings</option>
            <option value="User">User Accounts</option>
            <option value="Auth">Security & Login</option>
            <option value="Stability">Stability Studies</option>
            <option value="Personal">Personal Reminders</option>
            <option value="System">System & Folders</option>
          </select>
        </div>
      </div>

      {/* Main Logs Table */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-2xl p-16 animate-pulse space-y-4">
          <div className="h-4 bg-muted w-1/4 rounded"></div>
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center shadow-soft">
          <FileText size={48} className="mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Logs Found</h3>
          <p className="text-xs text-muted-foreground mt-1">Try expanding your search query or choosing another category.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-muted/30 backdrop-blur-md border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider z-10">
                <tr>
                  <th className="p-4">Time</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Module</th>
                  <th className="p-4">Action Taken</th>
                  <th className="p-4">Details</th>
                  {canDeleteLog && <th className="p-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-medium">
                {logs.map((log) => {
                  const friendlyAction = formatFriendlyAction(log.action);
                  const friendlyDetails = formatFriendlyDetails(log.details);

                  return (
                    <tr key={log._id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="p-4 font-semibold text-foreground whitespace-nowrap">
                        {log.userName}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand/10 text-brand dark:text-brand-light border border-brand/20">
                          {log.module === 'System' ? 'System & Folders' : log.module === 'Auth' ? 'Security & Login' : log.module}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-foreground whitespace-nowrap">
                        {friendlyAction}
                      </td>
                      <td className="p-4 text-muted-foreground max-w-xs truncate" title={friendlyDetails}>
                        {friendlyDetails}
                      </td>
                      {canDeleteLog && (
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => { setDeleteTargetId(log._id); setDeleteFeedback({ error: '', success: '' }); }}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete log record permanently"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-border">
            <PaginationControls
              currentPage={page}
              totalPages={pagination.pages}
              totalRecords={pagination.total}
              limit={limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => { setLimit(l); setPage(1); }}
              itemLabel="audit logs"
            />
          </div>
        </div>
      )}

      {/* SUPER ADMIN SINGLE LOG DELETE MODAL */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-red-500/10">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <AlertTriangle size={20} />
                <h3 className="text-sm font-bold">Delete Activity Log</h3>
              </div>
              <button 
                onClick={() => setDeleteTargetId(null)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {deleteFeedback.error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold text-red-600 flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>{deleteFeedback.error}</span>
                </div>
              )}

              {deleteFeedback.success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-600 flex items-center space-x-2">
                  <CheckCircle2 size={16} />
                  <span>{deleteFeedback.success}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to permanently delete this activity log record from MongoDB?
              </p>

              <div className="pt-3 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(null)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-muted font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleConfirmDeleteLog}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-soft transition-all"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Delete Record</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default Logs;
