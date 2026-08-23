import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { 
  FlaskConical, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  X, 
  History, 
  ShieldCheck,
  Layers,
  Trash2,
  Bell,
  RotateCcw,
  CheckCheck,
  Activity,
  Filter,
  Calendar,
  UserCheck,
  ArrowRightCircle
} from 'lucide-react';
import api from '../services/api';
import { formatDate } from '../utils';
import { RootState } from '../store';
import { StabilityRecord } from '../types';
import { PaginationControls } from '../components/PaginationControls';

// Helper to compute discrete status badge for ongoing stability interval
export const computeStabilityStatus = (dueDateStr: string): { label: string; badgeClass: string; hex: string; key: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Overdue', badgeClass: 'bg-slate-900 text-slate-100 border-slate-700', hex: '#0F172A', key: 'overdue' };
  } else if (diffDays === 0) {
    return { label: 'Due Today', badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20', hex: '#EF4444', key: 'due_today' };
  } else if (diffDays === 1) {
    return { label: 'Due Tomorrow', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', hex: '#F59E0B', key: 'due_tomorrow' };
  } else {
    return { label: 'Upcoming', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', hex: '#10B981', key: 'upcoming' };
  }
};

export interface ComprehensiveStabilityEvent {
  id: string;
  parentRecordId: string;
  eventType: 'created' | 'completed' | 'finished';
  eventTitle: string;
  productName: string;
  batchNumber: string;
  intervalLabel?: string;
  eventDate: string;
  dueDate?: string;
  performedBy: string;
  remarks?: string;
  stabilityStartDate?: string;
  stabilityEndDate?: string;
  badgeClass: string;
}

export const StabilityReminders: React.FC = () => {
  const queryClient = useQueryClient();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Main Tab: 'ongoing' | 'finished' | 'history'
  const [activeTab, setActiveTab] = useState<'ongoing' | 'finished' | 'history'>('ongoing');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [historyActionFilter, setHistoryActionFilter] = useState<string>('all');
  const [historyTimeFilter, setHistoryTimeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Reset page to 1 when tab or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, historyActionFilter, historyTimeFilter, searchQuery]);

  // Modals & Selector state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StabilityRecord | null>(null);
  const [selectedRoadmapBatchId, setSelectedRoadmapBatchId] = useState<string>('all');

  // Form states - Create Record
  const [createForm, setCreateForm] = useState({
    productName: '',
    batchNumber: '',
    stabilityStartDate: '',
    stabilityEndDate: '',
    description: '',
  });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Form states - Mark Completed
  const [completeForm, setCompleteForm] = useState({
    completedDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });
  const [completeError, setCompleteError] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);

  // Fetch Stability Records
  const { data: stabilityData, isLoading: recordsLoading } = useQuery({
    queryKey: ['stability-records'],
    queryFn: async () => {
      const res = await api.get('/stability');
      return res.data;
    }
  });

  const records: StabilityRecord[] = stabilityData?.records || [];

  // Categorize records by status
  const ongoingRecords = records.filter(r => r.status === 'ongoing');
  const finishedRecords = records.filter(r => r.status === 'finished' || r.status === 'completed');

  // Summary Metrics
  const dueOrOverdueCount = ongoingRecords.filter(r => {
    const st = computeStabilityStatus(r.currentDueDate);
    return st.key === 'due_today' || st.key === 'overdue';
  }).length;

  // Build Comprehensive History Audit Timeline (All Stability Actions)
  const allHistoryEvents: ComprehensiveStabilityEvent[] = [];

  records.forEach((r) => {
    // 1. Event: Study Created
    allHistoryEvents.push({
      id: `created-${r._id}`,
      parentRecordId: r._id,
      eventType: 'created',
      eventTitle: 'Study Registered',
      productName: r.productName,
      batchNumber: r.batchNumber,
      eventDate: r.createdAt,
      performedBy: r.createdBy?.name || 'Operator',
      remarks: r.description || `Study schedule: ${formatDate(r.stabilityStartDate)} to ${formatDate(r.stabilityEndDate)}`,
      stabilityStartDate: r.stabilityStartDate,
      stabilityEndDate: r.stabilityEndDate,
      badgeClass: 'bg-brand/10 text-brand border-brand/20',
    });

    // 2. Events: Interval Completions
    if (r.history && r.history.length > 0) {
      r.history.forEach((h, idx) => {
        const completedByName =
          typeof h.completedBy === 'object' && h.completedBy && 'name' in h.completedBy
            ? (h.completedBy as any).name
            : h.completedByName || 'Operator';

        allHistoryEvents.push({
          id: `completed-${r._id}-${idx}`,
          parentRecordId: r._id,
          eventType: 'completed',
          eventTitle: `${h.interval} Interval Completed`,
          productName: r.productName,
          batchNumber: r.batchNumber,
          intervalLabel: h.interval,
          eventDate: h.completedDate || h.createdAt,
          dueDate: h.dueDate,
          performedBy: completedByName,
          remarks: h.remarks,
          stabilityStartDate: r.stabilityStartDate,
          stabilityEndDate: r.stabilityEndDate,
          badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        });
      });
    }

    // 3. Event: Study Finished
    if (r.status === 'finished' || r.status === 'completed') {
      allHistoryEvents.push({
        id: `finished-${r._id}`,
        parentRecordId: r._id,
        eventType: 'finished',
        eventTitle: 'Study Finished',
        productName: r.productName,
        batchNumber: r.batchNumber,
        eventDate: r.updatedAt,
        performedBy: r.createdBy?.name || 'System Operator',
        remarks: `All stability checkpoints completed through ${formatDate(r.stabilityEndDate)}`,
        stabilityStartDate: r.stabilityStartDate,
        stabilityEndDate: r.stabilityEndDate,
        badgeClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
      });
    }
  });

  // Sort history chronologically newest first
  allHistoryEvents.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  // Filtered ongoing records
  const filteredOngoing = ongoingRecords.filter(rec => {
    const matchesSearch = 
      rec.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    const st = computeStabilityStatus(rec.currentDueDate);
    return st.key === statusFilter;
  });

  // Filtered finished records
  const filteredFinished = finishedRecords.filter(rec => 
    rec.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered history events
  const filteredHistory = allHistoryEvents.filter(ev => {
    const matchesSearch = 
      ev.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.performedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.remarks && ev.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filter by Action Type
    if (historyActionFilter !== 'all' && ev.eventType !== historyActionFilter) {
      return false;
    }

    // Filter by Time Range
    if (historyTimeFilter !== 'all') {
      const evTime = new Date(ev.eventDate).getTime();
      const nowTime = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      if (historyTimeFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        const evDateStr = new Date(ev.eventDate).toISOString().split('T')[0];
        if (todayStr !== evDateStr) return false;
      } else if (historyTimeFilter === '7days' && nowTime - evTime > 7 * oneDay) {
        return false;
      } else if (historyTimeFilter === '30days' && nowTime - evTime > 30 * oneDay) {
        return false;
      }
    }

    return true;
  });

  // Paginated Data
  const getActiveTabData = () => {
    if (activeTab === 'ongoing') return filteredOngoing;
    if (activeTab === 'finished') return filteredFinished;
    return filteredHistory;
  };

  const currentTabData = getActiveTabData();
  const totalRecords = currentTabData.length;
  const totalPages = Math.ceil(totalRecords / pageSize);

  const paginatedData = currentTabData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/stability', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stability-records'] });
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: any) => {
      setCreateError(err.response?.data?.message || 'Failed to create stability record');
    }
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => 
      api.post(`/stability/${id}/complete`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stability-records'] });
      setIsCompleteModalOpen(false);
      setSelectedRecord(null);
      resetCompleteForm();
    },
    onError: (err: any) => {
      setCompleteError(err.response?.data?.message || 'Failed to mark interval as completed');
    }
  });

  const revertMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/stability/${id}/revert`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stability-records'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/stability/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stability-records'] });
    }
  });

  const resetCreateForm = () => {
    setCreateForm({
      productName: '',
      batchNumber: '',
      stabilityStartDate: '',
      stabilityEndDate: '',
      description: '',
    });
    setCreateError('');
    setCreateLoading(false);
  };

  const resetCompleteForm = () => {
    setCompleteForm({
      completedDate: new Date().toISOString().split('T')[0],
      remarks: '',
    });
    setCompleteError('');
    setCompleteLoading(false);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.productName || !createForm.batchNumber || !createForm.stabilityStartDate || !createForm.stabilityEndDate) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    if (new Date(createForm.stabilityEndDate) <= new Date(createForm.stabilityStartDate)) {
      setCreateError('Stability End Date must be after Stability Start Date.');
      return;
    }

    setCreateLoading(true);
    createMutation.mutate(createForm, {
      onSettled: () => setCreateLoading(false)
    });
  };

  const handleCompleteWithAction = (actionType: 'next_interval' | 'finish_study') => {
    if (!selectedRecord) return;

    if (actionType === 'finish_study') {
      if (!window.confirm(`Mark "${selectedRecord.productName}" stability study as FINISHED? This will stop all future email alerts for this product.`)) {
        return;
      }
    }

    setCompleteLoading(true);
    completeMutation.mutate({
      id: selectedRecord._id,
      payload: {
        ...completeForm,
        actionType,
      },
    }, {
      onSettled: () => setCompleteLoading(false)
    });
  };

  const handleRevert = (id: string, productName: string, intervalLabel: string) => {
    if (window.confirm(`Revert "${productName}" (${intervalLabel} study) back to active ongoing status? This will re-enable 3-month email reminders.`)) {
      revertMutation.mutate(id);
    }
  };

  const handleDelete = (id: string, productName: string, batch: string) => {
    if (window.confirm(`Delete stability record for "${productName}" (Batch: ${batch})?`)) {
      deleteMutation.mutate(id);
    }
  };

  const openCompleteModal = (rec: StabilityRecord) => {
    setSelectedRecord(rec);
    resetCompleteForm();
    setIsCompleteModalOpen(true);
  };

  const canModify = currentUser && ['super_admin', 'admin', 'manager', 'user'].includes(currentUser.role);
  const canDelete = currentUser && ['super_admin', 'admin'].includes(currentUser.role);

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <FlaskConical className="text-brand" size={22} />
            <span>Smart Quarterly Stability Management</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated 3-month recurring interval alerts & complete stability action history audit log
          </p>
        </div>

        {canModify && (
          <button
            onClick={() => { resetCreateForm(); setIsCreateModalOpen(true); }}
            className="bg-brand hover:bg-brand-dark text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center space-x-2 shadow-soft active:scale-[0.99] cursor-pointer self-start md:self-auto"
          >
            <Plus size={14} />
            <span>Schedule New Stability Study</span>
          </button>
        )}
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Studies</span>
            <span className="text-xl font-black text-foreground mt-0.5 block">{records.length}</span>
          </div>
          <div className="p-3 bg-brand/10 text-brand rounded-lg border border-brand/20">
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Ongoing Studies</span>
            <span className="text-xl font-black text-brand mt-0.5 block">{ongoingRecords.length}</span>
          </div>
          <div className="p-3 bg-brand/10 text-brand rounded-lg border border-brand/20">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Finished Studies</span>
            <span className="text-xl font-black text-emerald-500 mt-0.5 block">{finishedRecords.length}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
            <CheckCheck size={20} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Action Required</span>
            <span className={`text-xl font-black mt-0.5 block ${dueOrOverdueCount > 0 ? 'text-red-500' : 'text-foreground'}`}>
              {dueOrOverdueCount} Checkpoints
            </span>
          </div>
          <div className={`p-3 rounded-lg border ${dueOrOverdueCount > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
            <AlertCircle size={20} />
          </div>
        </div>
      </div>

      {/* ONE CLEAN UNIFIED TOOLBAR LINE DIRECTLY BELOW 4 ICONS */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs select-none">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-muted/60 p-1 rounded-lg border border-border/40">
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'ongoing'
                ? 'bg-card text-brand shadow-soft border border-border/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock size={13} className={activeTab === 'ongoing' ? 'text-brand' : ''} />
            <span>⚡ Action Center ({ongoingRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('finished')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'finished'
                ? 'bg-card text-emerald-600 shadow-soft border border-border/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCheck size={13} className={activeTab === 'finished' ? 'text-emerald-500' : ''} />
            <span>🏁 Finished Studies ({finishedRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-card text-foreground shadow-soft border border-border/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History size={13} />
            <span>📜 Batch History & Renewal Timeline ({allHistoryEvents.length})</span>
          </button>
        </div>

        {/* Filter Dropdowns + Search Box */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'ongoing' && (
            <div className="flex items-center space-x-1.5 bg-background border border-border px-2.5 py-1.5 rounded-lg">
              <Filter size={12} className="text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
              >
                <option value="all">Filter Status: All</option>
                <option value="overdue">⚫ Overdue</option>
                <option value="due_today">🔴 Due Today</option>
                <option value="due_tomorrow">🟡 Due Tomorrow</option>
                <option value="upcoming">🟢 Upcoming</option>
              </select>
            </div>
          )}

          {activeTab === 'history' && (
            <>
              {/* Action Type Filter */}
              <div className="flex items-center space-x-1.5 bg-background border border-border px-2.5 py-1.5 rounded-lg">
                <Filter size={12} className="text-muted-foreground" />
                <select
                  value={historyActionFilter}
                  onChange={(e) => setHistoryActionFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
                >
                  <option value="all">All Action Types</option>
                  <option value="completed">Interval Completed</option>
                  <option value="created">Study Registered</option>
                  <option value="finished">Study Finished</option>
                </select>
              </div>

              {/* Time Range Filter */}
              <div className="flex items-center space-x-1.5 bg-background border border-border px-2.5 py-1.5 rounded-lg">
                <Calendar size={12} className="text-muted-foreground" />
                <select
                  value={historyTimeFilter}
                  onChange={(e) => setHistoryTimeFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today Only</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>
            </>
          )}

          <div className="relative w-full sm:w-56">
            <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search product, batch, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      {/* TAB CONTENT AREA WITH PAGINATION */}
      {recordsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-card border border-border rounded-xl p-5 shadow-soft animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'ongoing' ? (
        /* ONGOING TAB */
        paginatedData.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center shadow-soft">
            <ShieldCheck size={48} className="mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="text-sm font-bold text-foreground">No Ongoing Stability Studies</h3>
            <p className="text-xs text-muted-foreground mt-1">All registered products are up to date or marked as Finished.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(paginatedData as StabilityRecord[]).map((rec) => {
              const statusInfo = computeStabilityStatus(rec.currentDueDate);
              const lastCompletedItem = rec.history && rec.history.length > 0 ? rec.history[rec.history.length - 1] : null;

              return (
                <div
                  key={rec._id}
                  style={{ borderTop: `4px solid ${statusInfo.hex}` }}
                  className="bg-card border border-border rounded-xl p-5 shadow-soft hover:shadow-premium transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-brand/10 text-brand border border-brand/20 uppercase tracking-wider">
                        <Clock size={11} />
                        <span>🔵 ONGOING STUDY</span>
                      </span>

                      <div className="flex items-center space-x-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>

                        {canDelete && (
                          <button
                            onClick={() => handleDelete(rec._id, rec.productName, rec.batchNumber)}
                            className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors ml-1"
                            title="Delete Record"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-1">{rec.productName}</h4>
                      <div className="flex items-center space-x-2 mt-1 text-[10px]">
                        <span className="bg-muted px-2 py-0.5 rounded font-mono font-semibold text-foreground">Batch: {rec.batchNumber}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/40 border border-border/60 rounded-lg space-y-2 text-[10px]">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-brand flex items-center space-x-1">
                          <Layers size={13} />
                          <span>Active 3M Checkpoint:</span>
                        </span>
                        <span className="bg-brand text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                          {rec.currentIntervalLabel} Stability
                        </span>
                      </div>

                      <div className="pt-1.5 border-t border-border/40 grid grid-cols-2 gap-2 text-muted-foreground">
                        <div>
                          <span className="block text-[9px] uppercase font-bold text-muted-foreground/80">Start Date</span>
                          <strong className="text-foreground font-semibold">{formatDate(rec.stabilityStartDate)}</strong>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-bold text-muted-foreground/80">End Date</span>
                          <strong className="text-foreground font-semibold">{formatDate(rec.stabilityEndDate)}</strong>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-border/40 flex justify-between items-center text-muted-foreground">
                        <span>Scheduled Checkpoint Due:</span>
                        <strong className="text-foreground font-bold">{formatDate(rec.currentDueDate)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[9px] text-muted-foreground/90 font-medium">
                      <Bell size={11} className="text-brand shrink-0" />
                      <span className="truncate">Alerts sent ONLY to: <strong>{rec.createdBy?.email || 'Owner Account'}</strong></span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                    {lastCompletedItem ? (
                      <button
                        type="button"
                        onClick={() => handleRevert(rec._id, rec.productName, lastCompletedItem.interval)}
                        className="text-[10px] font-semibold text-amber-500 hover:text-amber-400 flex items-center space-x-1 border border-amber-500/20 bg-amber-500/10 px-2 py-1 rounded hover:bg-amber-500/20 transition-all cursor-pointer"
                        title={`Accidentally touched? Click to Undo ${lastCompletedItem.interval}!`}
                      >
                        <RotateCcw size={11} />
                        <span>Undo {lastCompletedItem.interval}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Current: <strong className="text-foreground">{rec.currentIntervalLabel}</strong>
                      </span>
                    )}

                    <button
                      onClick={() => openCompleteModal(rec)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg flex items-center space-x-1.5 shadow-soft active:scale-[0.98] cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Mark as Completed</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'finished' ? (
        /* FINISHED TAB */
        paginatedData.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center shadow-soft">
            <CheckCheck size={48} className="mx-auto text-emerald-500/50 mb-3" />
            <h3 className="text-sm font-bold text-foreground">No Finished Stability Studies</h3>
            <p className="text-xs text-muted-foreground mt-1">Studies will automatically be archived here once all 3-month checkpoints reach the end date or marked as Finished.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(paginatedData as StabilityRecord[]).map((rec) => (
              <div
                key={rec._id}
                className="bg-card border border-emerald-500/30 rounded-xl p-5 shadow-soft hover:shadow-premium transition-all duration-200 flex flex-col justify-between border-t-4 border-t-emerald-500"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
                      <CheckCheck size={11} />
                      <span>🏁 FINISHED STUDY</span>
                    </span>

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(rec._id, rec.productName, rec.batchNumber)}
                        className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-1">{rec.productName}</h4>
                    <div className="flex items-center space-x-2 mt-1 text-[10px]">
                      <span className="bg-muted px-2 py-0.5 rounded font-mono font-semibold text-foreground">Batch: {rec.batchNumber}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-2 text-[10px]">
                    <div className="flex justify-between items-center font-bold text-emerald-600">
                      <span>Full Study Program Complete:</span>
                      <span>{rec.history?.length || 0} Checkpoints</span>
                    </div>

                    <div className="pt-1.5 border-t border-emerald-500/20 grid grid-cols-2 gap-2 text-muted-foreground">
                      <div>
                        <span className="block text-[9px] uppercase font-bold">Start Date</span>
                        <strong className="text-foreground">{formatDate(rec.stabilityStartDate)}</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold">End Date</span>
                        <strong className="text-foreground">{formatDate(rec.stabilityEndDate)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] text-emerald-600 font-semibold flex items-center space-x-1">
                    <ShieldCheck size={12} className="shrink-0" />
                    <span>Email reminders are STOPPED for this finished study.</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground">Registered by: <strong>{rec.createdBy?.name || 'Operator'}</strong></span>
                  {rec.history && rec.history.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRevert(rec._id, rec.productName, rec.history[rec.history.length - 1].interval)}
                      className="text-amber-500 hover:text-amber-400 font-semibold flex items-center space-x-1 cursor-pointer bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"
                      title="Reopen study back to ongoing status & re-enable email reminders"
                    >
                      <RotateCcw size={11} />
                      <span>Reopen & Enable Emails</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* COMPREHENSIVE ACTION HISTORY AUDIT & BATCH MONTHLY RENEWAL MAP TAB */
        <div className="space-y-6">
          {/* SEARCH & BATCH MONTHLY RENEWAL ROADMAP MATRIX */}
          {(() => {
            let matchingBatches = records;
            
            if (selectedRoadmapBatchId !== 'all') {
              matchingBatches = records.filter(r => r._id === selectedRoadmapBatchId);
            } else if (searchQuery.trim()) {
              matchingBatches = records.filter(r =>
                r.productName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                r.batchNumber.toLowerCase().includes(searchQuery.toLowerCase().trim())
              );
            }

            if (records.length === 0) return null;

            return (
              <div className="space-y-4 bg-muted/20 border border-border rounded-2xl p-4 md:p-5 shadow-soft">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center space-x-2">
                    <FlaskConical className="text-brand" size={18} />
                    <h3 className="text-sm font-bold text-foreground">
                      Batch Testing Roadmap Matrix ({matchingBatches.length} {matchingBatches.length === 1 ? 'batch' : 'batches'} shown)
                    </h3>
                  </div>

                  {/* BATCH SELECTOR DROPDOWN */}
                  <div className="flex items-center space-x-2">
                    <label className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                      Select Batch:
                    </label>
                    <select
                      value={selectedRoadmapBatchId}
                      onChange={(e) => setSelectedRoadmapBatchId(e.target.value)}
                      className="px-3 py-1.5 border border-border rounded-xl text-xs font-semibold bg-background text-foreground outline-none focus:border-brand shadow-sm cursor-pointer"
                    >
                      <option value="all">🌐 Show All Batches ({records.length})</option>
                      {records.map((r) => (
                        <option key={r._id} value={r._id}>
                          🧪 {r.productName} (Batch #{r.batchNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {matchingBatches.slice(0, 5).map(rec => (
                  <div key={rec._id} className="bg-card border border-border rounded-xl p-4 shadow-soft space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{rec.productName}</span>
                        <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded font-bold text-foreground">
                          Batch #{rec.batchNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          rec.status === 'finished' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand/10 text-brand'
                        }`}>
                          {rec.status === 'finished' ? '🏁 Finished' : '🔄 Ongoing'}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        Storage: <strong className="text-foreground">{(rec as any).storageCondition || rec.description || 'Standard'}</strong> &bull; Started: <strong className="text-foreground">{formatDate(rec.stabilityStartDate || (rec as any).startDate)}</strong>
                      </div>
                    </div>

                    {/* Full 36-Month Interval Milestone Roadmap Grid (12 Checks) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {(() => {
                        const start = new Date(rec.stabilityStartDate);
                        const schedule = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
                        
                        return schedule.map((months) => {
                          const dueDateObj = new Date(start);
                          dueDateObj.setMonth(dueDateObj.getMonth() + months);

                          const label = `${months}M`;
                          const historyMatch = (rec.history || []).find(h => h.interval === label || h.interval === `${months} Months`);
                          const isCompleted = Boolean(historyMatch);
                          const isOverdue = !isCompleted && dueDateObj < new Date();

                          const completedByName = historyMatch
                            ? typeof historyMatch.completedBy === 'object' && historyMatch.completedBy && 'name' in historyMatch.completedBy
                              ? (historyMatch.completedBy as any).name
                              : historyMatch.completedByName || 'Operator'
                            : '';

                          return (
                            <div 
                              key={label}
                              className={`p-2 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                                isCompleted
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                  : isOverdue
                                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                  : 'bg-muted/30 border-border text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold text-[10px]">
                                <span>{label} Check</span>
                                {isCompleted ? (
                                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                ) : isOverdue ? (
                                  <AlertCircle size={12} className="text-red-500 shrink-0" />
                                ) : (
                                  <Clock size={12} className="text-muted-foreground/60 shrink-0" />
                                )}
                              </div>

                              <div className="mt-1 space-y-0.5 text-[9px]">
                                {isCompleted ? (
                                  <>
                                    <div className="font-extrabold text-emerald-600 dark:text-emerald-300">✅ Done</div>
                                    <div>{formatDate(historyMatch.completedDate)}</div>
                                    <div className="truncate text-muted-foreground" title={completedByName}>
                                      By: {completedByName}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className={isOverdue ? 'font-bold text-red-500' : 'text-muted-foreground'}>
                                      {isOverdue ? '⚠️ Overdue' : '⏳ Due'}
                                    </div>
                                    <div>{formatDate(dueDateObj)}</div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* NOTIFICATION CARDS LIST FOR HISTORY */}
          {paginatedData.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-16 text-center shadow-soft">
              <History size={48} className="mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-sm font-bold text-foreground">No Stability Action History Found</h3>
              <p className="text-xs text-muted-foreground mt-1">All stability-related actions (creation, completed intervals, study finishes) will record a clear human-readable notification card here.</p>
            </div>
          ) : (
            <div className="space-y-3">
            {(paginatedData as ComprehensiveStabilityEvent[]).map((ev) => {
              const isCompleted = ev.eventType === 'completed';
              const isCreated = ev.eventType === 'created';
              const isFinished = ev.eventType === 'finished';

              const cardBadgeBg = isCompleted
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : isFinished
                ? 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30'
                : 'bg-brand/10 text-brand dark:text-brand-light border-brand/30';

              const cardBadgeText = isCompleted
                ? `🟢 ${ev.intervalLabel} Interval Completed`
                : isFinished
                ? '🏁 Study Finished'
                : '🧪 Study Registered';

              const cardTitle = isCompleted
                ? `🎉 ${ev.intervalLabel} Testing Completed for ${ev.productName}`
                : isFinished
                ? `🏁 Stability Study Completed for ${ev.productName}`
                : `🧪 New Stability Study Started for ${ev.productName}`;

              const cardMessage = isCompleted
                ? `Batch #${ev.batchNumber} of ${ev.productName} successfully passed its ${ev.intervalLabel} testing checkpoint. Action logged by ${ev.performedBy}.`
                : isFinished
                ? `All stability testing intervals for ${ev.productName} (Batch #${ev.batchNumber}) are finished and study is closed by ${ev.performedBy}.`
                : `Stability study initiated for ${ev.productName} (Batch #${ev.batchNumber}) by ${ev.performedBy}.`;

              return (
                <div
                  key={ev.id}
                  className="bg-card border border-border rounded-2xl p-4 md:p-5 shadow-soft hover:shadow-premium transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
                >
                  <div className="flex items-start space-x-4 pl-1">
                    <div className={`p-3 rounded-2xl shrink-0 mt-0.5 border ${cardBadgeBg}`}>
                      {isCompleted ? <CheckCircle2 size={22} /> : isFinished ? <CheckCheck size={22} /> : <FlaskConical size={22} />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${cardBadgeBg}`}>
                          {cardBadgeText}
                        </span>
                        <h4 className="text-sm font-bold text-foreground">{cardTitle}</h4>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">{cardMessage}</p>

                      <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-medium">
                        <span className="flex items-center space-x-1">
                          <Clock size={12} className="text-muted-foreground/80" />
                          <span>{formatDate(ev.eventDate)}</span>
                        </span>
                        <span>&bull;</span>
                        <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded">Batch: {ev.batchNumber}</span>
                        <span>&bull;</span>
                        <span>Study Duration: {formatDate(ev.stabilityStartDate)} to {formatDate(ev.stabilityEndDate)}</span>
                        {ev.remarks && (
                          <>
                            <span>&bull;</span>
                            <span className="italic text-muted-foreground">"{ev.remarks}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
                    {isCreated ? (
                      <span className="text-[10px] text-muted-foreground bg-muted px-2.5 py-1 rounded-lg font-semibold">
                        Registered by {ev.performedBy}
                      </span>
                    ) : isFinished ? (
                      <button
                        type="button"
                        onClick={() => handleRevert(ev.parentRecordId, ev.productName, 'Study Finish')}
                        className="px-3 py-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-soft active:scale-[0.98]"
                        title="Reopen study back to ongoing status"
                      >
                        <RotateCcw size={13} />
                        <span>Reopen Study</span>
                      </button>
                    ) : isCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleRevert(ev.parentRecordId, ev.productName, ev.intervalLabel || 'interval')}
                        className="px-3 py-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-soft active:scale-[0.98]"
                        title="Accidentally completed by mistake? Click to Undo & restore this record!"
                      >
                        <RotateCcw size={13} />
                        <span>Undo / Revert</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

      {/* PAGINATION CONTROLS AT BOTTOM */}
      {totalRecords > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          limit={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onLimitChange={(limit) => {
            setPageSize(limit);
            setCurrentPage(1);
          }}
          pageSizeOptions={[6, 12, 24, 48]}
          itemLabel={activeTab === 'history' ? 'action logs' : 'stability studies'}
        />
      )}

      {/* CREATE STABILITY STUDY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-premium w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
              <h3 className="text-sm font-bold text-foreground flex items-center space-x-2">
                <FlaskConical size={16} className="text-brand" />
                <span>Schedule 3-Year Product Stability Study</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-600 flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={createForm.productName}
                  onChange={(e) => setCreateForm({ ...createForm, productName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none focus:border-brand"
                  placeholder="e.g. Psyllium Husk 99% Grade A"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Batch Number</label>
                <input
                  type="text"
                  required
                  value={createForm.batchNumber}
                  onChange={(e) => setCreateForm({ ...createForm, batchNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none focus:border-brand font-mono"
                  placeholder="e.g. PSY-2026-B99"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Stability Start Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.stabilityStartDate}
                    onChange={(e) => {
                      const startVal = e.target.value;
                      let endVal = createForm.stabilityEndDate;
                      if (startVal) {
                        const sDate = new Date(startVal);
                        sDate.setFullYear(sDate.getFullYear() + 3);
                        endVal = sDate.toISOString().split('T')[0];
                      }
                      setCreateForm({
                        ...createForm,
                        stabilityStartDate: startVal,
                        stabilityEndDate: endVal
                      });
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Stability End Date (3-Year)</label>
                  <input
                    type="date"
                    required
                    value={createForm.stabilityEndDate}
                    onChange={(e) => setCreateForm({ ...createForm, stabilityEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">36-Month Testing Schedule (12 Checks)</label>
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-between">
                  <span>Every 3 Months:</span>
                  <span className="font-bold">12 Checks (3M, 6M, 9M... up to 36M)</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Description / Remarks (Optional)</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="e.g. Storage condition: 30°C ± 2°C / 65% RH ± 5% RH"
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none h-16 resize-none"
                />
              </div>

              <div className="p-3 bg-brand/10 border border-brand/20 rounded-lg text-[10px] text-brand flex items-center space-x-2">
                <Bell size={14} className="shrink-0" />
                <span>Automated emails will be sent 1 day before & on due date ONLY to your account ({currentUser?.email}).</span>
              </div>

              <div className="pt-4 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs hover:bg-muted font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-brand hover:bg-brand-dark disabled:bg-brand/60 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  {createLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                  <span>Schedule Study</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARK AS COMPLETED MODAL WITH 2 CLEAR BUTTONS: "Next 3 Months" & "Finish Study" */}
      {isCompleteModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-premium w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10">
              <h3 className="text-sm font-bold text-foreground flex items-center space-x-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Mark {selectedRecord.currentIntervalLabel} Stability Completed</span>
              </h3>
              <button onClick={() => setIsCompleteModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {completeError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-600 flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>{completeError}</span>
                </div>
              )}

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-1 text-xs">
                <div className="font-bold text-foreground">{selectedRecord.productName}</div>
                <div className="text-[10px] text-muted-foreground">
                  Batch: <strong>{selectedRecord.batchNumber}</strong> &bull; Completing Interval: <strong className="text-emerald-500">{selectedRecord.currentIntervalLabel}</strong>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Completion Date</label>
                <input
                  type="date"
                  required
                  value={completeForm.completedDate}
                  onChange={(e) => setCompleteForm({ ...completeForm, completedDate: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Testing Remarks / Summary (Optional)</label>
                <textarea
                  value={completeForm.remarks}
                  onChange={(e) => setCompleteForm({ ...completeForm, remarks: e.target.value })}
                  placeholder="e.g. Assay: 99.4%, Related Substances within limits. Passed 3M stability criteria."
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none h-20 resize-none"
                />
              </div>

              <div className="p-3 bg-brand/10 border border-brand/20 rounded-lg space-y-1.5 text-[10px] text-brand">
                <div className="font-bold flex items-center space-x-1">
                  <Bell size={12} />
                  <span>Choose Next Action & Email Behavior:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-brand/90">
                  <li><strong>Next 3 Months</strong>: Auto-schedules next 3-month checkpoint and continues email alerts.</li>
                  <li><strong>Finish Study</strong>: Marks study as Finished and <strong>STOPS all email alerts</strong> (re-enabled only if reverted).</li>
                </ul>
              </div>

              {/* 2 DISTINCT ACTION BUTTONS */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="w-full sm:w-auto px-3 py-2 border border-border rounded-lg text-xs hover:bg-muted font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={completeLoading}
                  onClick={() => handleCompleteWithAction('next_interval')}
                  className="w-full sm:w-auto px-4 py-2 bg-brand hover:bg-brand-dark disabled:bg-brand/60 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-soft cursor-pointer"
                >
                  {completeLoading ? <Loader2 size={13} className="animate-spin" /> : <ArrowRightCircle size={14} />}
                  <span>Next 3 Months</span>
                </button>

                <button
                  type="button"
                  disabled={completeLoading}
                  onClick={() => handleCompleteWithAction('finish_study')}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/60 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-soft cursor-pointer"
                >
                  {completeLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={14} />}
                  <span>Finish Study</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StabilityReminders;
