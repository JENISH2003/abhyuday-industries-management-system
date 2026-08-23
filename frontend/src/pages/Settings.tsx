import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { 
  Download, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  Database, 
  AlertCircle, 
  Send, 
  Check, 
  RefreshCw,
  Trash2,
  Bell,
  Activity,
  Mail,
  FileText,
  AlertTriangle,
  CheckSquare,
  Square,
  Search,
  RotateCcw,
  X
} from 'lucide-react';
import { RootState } from '../store';
import { formatDate } from '../utils';
import { PaginationControls } from '../components/PaginationControls';
import api from '../services/api';

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Backup & Restore states
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [mergeFiles, setMergeFiles] = useState<FileList | null>(null);
  const [mergeError, setMergeError] = useState('');
  const [mergeSuccess, setMergeSuccess] = useState('');
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeResult, setMergeResult] = useState<{ categories: number; subcategories: number; users: number; certificates: number; meetings: number; emailLogs: number; activityLogs: number; } | null>(null);

  // Email SMTP Settings states
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(465);
  const [secure, setSecure] = useState(true);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [fromName, setFromName] = useState('Abhyuday Management System Compliance System');
  const [fromEmail, setFromEmail] = useState('');
  const [replyTo, setReplyTo] = useState('');

  const [smtpError, setSmtpError] = useState('');
  const [smtpSuccess, setSmtpSuccess] = useState('');
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Test Mail Modal state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testMailStatus, setTestMailStatus] = useState({ error: '', success: '', loading: false });

  // Data Purge Maintenance State
  const [activePurgeTab, setActivePurgeTab] = useState<'certificates' | 'notifications' | 'logs' | 'emails'>('certificates');
  const [purgeTimeframe, setPurgeTimeframe] = useState<'30_days' | '90_days' | 'all' | 'expired'>('30_days');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [purgeSearch, setPurgeSearch] = useState('');
  
  // Pagination States for Purge Maintenance
  const [purgePage, setPurgePage] = useState(1);
  const [purgeLimit, setPurgeLimit] = useState(25);

  // Modal states
  const [purgeMode, setPurgeMode] = useState<'selected' | 'timeframe'>('selected');
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeFeedback, setPurgeFeedback] = useState({ error: '', success: '' });

  // Fetch current SMTP Settings
  const { data: smtpData } = useQuery({
    queryKey: ['email-settings'],
    queryFn: async () => {
      const res = await api.get('/settings/email');
      return res.data;
    }
  });

  // Fetch Database Data Storage Stats (Super Admin)
  const { data: cleanupStats, refetch: refetchCleanupStats } = useQuery({
    queryKey: ['cleanup-stats'],
    queryFn: async () => {
      const res = await api.get('/settings/cleanup/stats');
      return res.data?.stats;
    },
    enabled: isSuperAdmin,
  });

  // Fetch Items List for Manual Selection Data Purging with Live Content Search & Smart Pagination
  const { data: itemsData, isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ['purge-items', activePurgeTab, purgePage, purgeLimit, purgeSearch],
    queryFn: async () => {
      const res = await api.get(
        `/settings/cleanup/items?module=${activePurgeTab}&page=${purgePage}&limit=${purgeLimit}&search=${encodeURIComponent(purgeSearch)}`
      );
      return res.data;
    },
    enabled: isSuperAdmin,
  });

  const purgeItemsList = itemsData?.items || [];
  const purgePagination = itemsData?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 };

  // Helper variables for cross-page selection preservation
  const currentPageIds = purgeItemsList.map((item: any) => item._id);
  const isCurrentPageAllSelected =
    currentPageIds.length > 0 && currentPageIds.every((id: string) => selectedIds.includes(id));

  // Toggle current page select all (preserves selections from other pages!)
  const handleToggleSelectPage = () => {
    if (isCurrentPageAllSelected) {
      setSelectedIds(selectedIds.filter((id) => !currentPageIds.includes(id)));
    } else {
      const combined = new Set([...selectedIds, ...currentPageIds]);
      setSelectedIds(Array.from(combined));
    }
  };

  // Clear all accumulative selections
  const handleClearAllSelections = () => {
    setSelectedIds([]);
  };

  // Reset selected IDs, Search & Page when tab changes
  useEffect(() => {
    setSelectedIds([]);
    setPurgeSearch('');
    setPurgePage(1);
  }, [activePurgeTab]);

  useEffect(() => {
    if (smtpData?.settings) {
      const s = smtpData.settings;
      setSmtpHost(s.smtpHost || 'smtp.gmail.com');
      setSmtpPort(s.smtpPort || 465);
      setSecure(s.secure !== undefined ? s.secure : true);
      setSmtpUser(s.smtpUser || '');
      setSmtpPass(s.smtpPass || '');
      setFromName(s.fromName || 'Abhyuday Management System Compliance System');
      setFromEmail(s.fromEmail || s.smtpUser || '');
      setReplyTo(s.replyTo || '');
    }
  }, [smtpData]);

  // Handle Single Checkbox Selection
  const handleToggleSelectItem = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Save SMTP Settings Mutation
  const saveSmtpMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.put('/settings/email', payload);
    },
    onSuccess: (res) => {
      setSmtpSuccess(res.data.message || 'SMTP settings saved successfully!');
      setSmtpError('');
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (err: any) => {
      setSmtpError(err.response?.data?.message || 'Failed to save SMTP settings.');
      setSmtpSuccess('');
    }
  });

  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpError('');
    setSmtpSuccess('');
    setSmtpLoading(true);

    saveSmtpMutation.mutate({
      smtpHost,
      smtpPort,
      secure,
      smtpUser,
      smtpPass,
      fromName,
      fromEmail,
      replyTo,
    });
    setSmtpLoading(false);
  };

  const handleVerifySmtp = async () => {
    setVerifyLoading(true);
    setSmtpError('');
    setSmtpSuccess('');
    try {
      const res = await api.post('/settings/email/verify');
      setSmtpSuccess(res.data.message || 'SMTP connection verified successfully!');
    } catch (err: any) {
      setSmtpError(err.response?.data?.message || 'SMTP verification failed.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSendTestMail = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestMailStatus({ error: '', success: '', loading: true });
    try {
      const res = await api.post('/settings/email/test', { recipient: testRecipient });
      setTestMailStatus({ error: '', success: res.data.message || 'Test email dispatched!', loading: false });
    } catch (err: any) {
      setTestMailStatus({ error: err.response?.data?.message || 'Test mail dispatch failed.', success: '', loading: false });
    }
  };

  // Download Backup JSON
  const handleBackupDownload = async () => {
    setBackupLoading(true);
    try {
      const response = await api.get('/db/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Abhyuday_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Failed to export backup JSON snapshot.');
    } finally {
      setBackupLoading(false);
    }
  };

  // Handle Restore File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRestoreFile(e.target.files[0]);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;

    setRestoreLoading(true);
    setRestoreError('');
    setRestoreSuccess('');

    const formData = new FormData();
    formData.append('file', restoreFile);

    try {
      const res = await api.post('/db/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRestoreSuccess(res.data.message || 'Database snapshot restored successfully!');
      queryClient.invalidateQueries();
    } catch (err: any) {
      setRestoreError(err.response?.data?.message || 'Database restore failed.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const readJsonFile = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Invalid JSON in ${file.name}`));
        }
      };
      reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
      reader.readAsText(file);
    });
  };

  const normalizeText = (value: any) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

  const buildUniqueRecords = <T extends { _id?: string }>(items: T[], keyFn: (item: T) => string) => {
    const map = new Map<string, T>();
    const idMap: Record<string, string> = {};
    for (const item of items) {
      const key = keyFn(item);
      if (item._id) {
        if (!map.has(key)) {
          map.set(key, item);
          idMap[item._id] = item._id;
        } else {
          idMap[item._id] = map.get(key)!._id!;
        }
      } else if (!map.has(key)) {
        map.set(key, item);
      }
    }
    return { uniqueItems: Array.from(map.values()), idMap };
  };

  const handleMergeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setMergeFiles(e.target.files);
    } else {
      setMergeFiles(null);
    }
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeFiles || mergeFiles.length === 0) return;

    setMergeLoading(true);
    setMergeError('');
    setMergeSuccess('');
    setMergeResult(null);

    try {
      const backups = await Promise.all(Array.from(mergeFiles).map((file) => readJsonFile(file)));
      const allCategories: any[] = [];
      const allSubcategories: any[] = [];
      const allUsers: any[] = [];
      const allCertificates: any[] = [];
      const allMeetings: any[] = [];
      const allEmailLogs: any[] = [];
      const allActivityLogs: any[] = [];

      backups.forEach((backup) => {
        if (!backup?.data) {
          throw new Error('One of the selected files is not a valid backup JSON.');
        }
        const data = backup.data;
        allCategories.push(...(data.categories || []));
        allSubcategories.push(...(data.subcategories || []));
        allUsers.push(...(data.users || []));
        allCertificates.push(...(data.certificates || []));
        allMeetings.push(...(data.meetings || []));
        allEmailLogs.push(...(data.emailLogs || []));
        allActivityLogs.push(...(data.activityLogs || []));
      });

      const { uniqueItems: mergedCategories, idMap: categoryIdMap } = buildUniqueRecords(allCategories, (item) => normalizeText(item.name));
      const categoryNameById: Record<string, string> = {};
      mergedCategories.forEach((category) => {
        if (category._id) {
          categoryNameById[category._id] = normalizeText(category.name);
        }
      });
      Object.entries(categoryIdMap).forEach(([oldId, canonicalId]) => {
        if (!categoryNameById[canonicalId]) {
          const cat = allCategories.find((c) => c._id === oldId);
          if (cat && canonicalId) {
            categoryNameById[canonicalId] = normalizeText(cat.name);
          }
        }
      });

      const { uniqueItems: mergedSubcategories, idMap: subcategoryIdMap } = buildUniqueRecords(allSubcategories, (item) => {
        const rawCategoryId = item.category as string;
        const canonicalCategoryId = rawCategoryId ? categoryIdMap[rawCategoryId] || rawCategoryId : '';
        const categoryName = normalizeText(categoryNameById[canonicalCategoryId] || '');
        return `${categoryName}|${normalizeText(item.name)}`;
      });

      const { uniqueItems: mergedUsers, idMap: userIdMap } = buildUniqueRecords(allUsers, (item) => normalizeText(item.email));

      const getCanonicalCategoryId = (oldId: string | undefined) => (oldId ? categoryIdMap[oldId] || oldId : undefined);
      const getCanonicalSubcategoryId = (oldId: string | undefined) => (oldId ? subcategoryIdMap[oldId] || oldId : undefined);
      const getCanonicalUserId = (oldId: string | undefined) => (oldId ? userIdMap[oldId] || oldId : undefined);

      const canonicalCategoryName = (oldId: string | undefined) => {
        const canonicalId = getCanonicalCategoryId(oldId);
        return canonicalId ? categoryNameById[canonicalId] || '' : '';
      };
      const canonicalSubcategoryName = (oldId: string | undefined) => {
        const canonicalId = getCanonicalSubcategoryId(oldId);
        const sub = mergedSubcategories.find((item) => item._id === canonicalId);
        return sub ? normalizeText(sub.name) : '';
      };

      const { uniqueItems: mergedCertificates } = buildUniqueRecords(allCertificates, (item) => {
        const certNo = normalizeText(item.certificateNo);
        if (certNo) {
          return `no:${certNo}`;
        }
        return [
          normalizeText(item.issuingAuthority),
          canonicalCategoryName(item.category as string),
          canonicalSubcategoryName(item.subcategory as string),
          normalizeText(item.issueDate),
          normalizeText(item.expiryDate),
        ]
          .filter(Boolean)
          .join('|');
      });

      const { uniqueItems: mergedMeetings } = buildUniqueRecords(allMeetings, (item) => {
        return [
          normalizeText(item.title),
          normalizeText(item.date),
          normalizeText(item.time),
          normalizeText(item.location),
        ]
          .filter(Boolean)
          .join('|');
      });

      const uniqueEmailLogs = Array.from(
        new Map(allEmailLogs.map((log) => {
          const key = log._id || `${normalizeText(log.message)}|${normalizeText(log.action)}|${normalizeText(log.timestamp)}`;
          return [key, log];
        })).values()
      );

      const uniqueActivityLogs = Array.from(
        new Map(allActivityLogs.map((log) => {
          const key = log._id || `${normalizeText(log.message)}|${normalizeText(log.action)}|${normalizeText(log.timestamp)}`;
          return [key, log];
        })).values()
      );

      const remapReference = (item: any) => {
        if (!item || typeof item !== 'object') return item;
        const copied = { ...item };
        if (copied.category) copied.category = getCanonicalCategoryId(copied.category as string) || copied.category;
        if (copied.subcategory) copied.subcategory = getCanonicalSubcategoryId(copied.subcategory as string) || copied.subcategory;
        if (copied.createdBy) copied.createdBy = getCanonicalUserId(copied.createdBy as string) || copied.createdBy;
        return copied;
      };

      const normalizedCertificates = mergedCertificates.map((cert) => remapReference(cert));
      const normalizedMeetings = mergedMeetings.map((meeting) => remapReference(meeting));

      const mergedBackup = {
        timestamp: new Date().toISOString(),
        version: '1.1.0',
        data: {
          categories: mergedCategories,
          subcategories: mergedSubcategories,
          users: mergedUsers,
          certificates: normalizedCertificates,
          meetings: normalizedMeetings,
          emailLogs: uniqueEmailLogs,
          activityLogs: uniqueActivityLogs,
        },
      };

      const url = window.URL.createObjectURL(new Blob([JSON.stringify(mergedBackup, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Abhyuday_Merged_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMergeSuccess(`Merged ${mergeFiles.length} file(s) successfully.`);
      setMergeResult({
        categories: mergedCategories.length,
        subcategories: mergedSubcategories.length,
        users: mergedUsers.length,
        certificates: normalizedCertificates.length,
        meetings: normalizedMeetings.length,
        emailLogs: uniqueEmailLogs.length,
        activityLogs: uniqueActivityLogs.length,
      });
    } catch (error: any) {
      setMergeError(error?.message || 'Failed to merge backup files.');
    } finally {
      setMergeLoading(false);
    }
  };

  // Open Purge Modal
  const openPurgeModal = (mode: 'selected' | 'timeframe') => {
    setPurgeMode(mode);
    setPurgeFeedback({ error: '', success: '' });
    setPurgeModalOpen(true);
  };

  // Trigger Data Purge Execution
  const handleExecutePurge = async () => {
    setPurgeLoading(true);
    setPurgeFeedback({ error: '', success: '' });

    try {
      let endpoint = '';
      if (activePurgeTab === 'certificates') endpoint = '/settings/cleanup/certificates';
      if (activePurgeTab === 'notifications') endpoint = '/settings/cleanup/notifications';
      if (activePurgeTab === 'logs') endpoint = '/settings/cleanup/activity-logs';
      if (activePurgeTab === 'emails') endpoint = '/settings/cleanup/email-logs';

      const payload = purgeMode === 'selected' 
        ? { ids: selectedIds }
        : { timeframe: purgeTimeframe };

      const res = await api.post(endpoint, payload);
      
      setPurgeFeedback({ error: '', success: res.data.message || 'Data purged successfully!' });
      setSelectedIds([]);
      refetchCleanupStats();
      refetchItems();
      queryClient.invalidateQueries();
      
      setTimeout(() => {
        setPurgeModalOpen(false);
        setPurgeFeedback({ error: '', success: '' });
      }, 1500);
    } catch (err: any) {
      setPurgeFeedback({ error: err.response?.data?.message || 'Data purge failed.', success: '' });
    } finally {
      setPurgeLoading(false);
    }
  };

  return (
    <div className="space-y-8 select-none max-w-5xl animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">System Administration Settings</h1>
        <p className="text-xs text-muted-foreground">Manage backup snapshots and database storage purging</p>
      </div>

      {/* SECTION 2: Database Backup & Recovery */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-soft space-y-6">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center space-x-2">
            <Database className="text-brand" size={18} />
            <span>Database Backup & Restoration</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Export and import full system database snapshots in encrypted JSON format</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 border border-border rounded-xl bg-muted/20 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-xs font-bold text-foreground">Export Backup Snapshot</h4>
              <p className="text-[11px] text-muted-foreground mt-1">Download complete certificates, categories, users, and audit logs.</p>
            </div>
            <button
              onClick={handleBackupDownload}
              disabled={backupLoading}
              className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-soft cursor-pointer transition-all"
            >
              {backupLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Download Backup JSON</span>
            </button>
          </div>

          <div className="p-4 border border-border rounded-xl bg-muted/20">
            <form onSubmit={handleRestoreSubmit} className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-foreground">Restore Database Snapshot</h4>
                <p className="text-[11px] text-muted-foreground mt-1">Overwrites current system state with uploaded JSON backup.</p>
              </div>

              {restoreError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-600 flex items-center space-x-2">
                  <AlertCircle size={14} />
                  <span>{restoreError}</span>
                </div>
              )}

              {restoreSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-semibold text-emerald-600 flex items-center space-x-2">
                  <CheckCircle2 size={14} />
                  <span>{restoreSuccess}</span>
                </div>
              )}

              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full text-xs text-muted-foreground cursor-pointer"
              />

              <button
                type="submit"
                disabled={restoreLoading || !restoreFile}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-soft cursor-pointer transition-all"
              >
                {restoreLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                <span>Restore Database</span>
              </button>
            </form>
          </div>
        </div>

        <div className="p-4 border border-border rounded-xl bg-muted/20">
          <form onSubmit={handleMergeSubmit} className="space-y-3">
            <div>
              <h4 className="text-xs font-bold text-foreground">Merge Backup Files</h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                Upload two or more backup JSON files to merge them into a single deduplicated backup file.
              </p>
            </div>

            {mergeError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-600 flex items-center space-x-2">
                <AlertCircle size={14} />
                <span>{mergeError}</span>
              </div>
            )}

            {mergeSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-semibold text-emerald-600 flex items-center space-x-2">
                <CheckCircle2 size={14} />
                <span>{mergeSuccess}</span>
              </div>
            )}

            <input
              type="file"
              accept=".json"
              multiple
              onChange={handleMergeFileChange}
              className="w-full text-xs text-muted-foreground cursor-pointer"
            />

            {mergeResult && (
              <div className="space-y-2 text-[11px] text-muted-foreground">
                <div>Categories: {mergeResult.categories}</div>
                <div>Subcategories: {mergeResult.subcategories}</div>
                <div>Users: {mergeResult.users}</div>
                <div>Certificates: {mergeResult.certificates}</div>
                <div>Meetings: {mergeResult.meetings}</div>
                <div>Email Logs: {mergeResult.emailLogs}</div>
                <div>Activity Logs: {mergeResult.activityLogs}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={mergeLoading || !mergeFiles || mergeFiles.length < 1}
              className="w-full py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-soft cursor-pointer transition-all"
            >
              {mergeLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>Merge Backup Files</span>
            </button>
          </form>
        </div>
      </div>

      {/* SECTION 3: SUPER ADMIN DATA STORAGE PURGING & MAINTENANCE */}
      {isSuperAdmin && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-soft space-y-6">
          <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center space-x-2">
                <Trash2 className="text-red-500" size={18} />
                <span>Super Admin Data Storage Purging & Maintenance</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Search, manually select specific items across pages, or bulk purge unwanted notifications, audit logs, email history, and certificate files
              </p>
            </div>

            <button
              type="button"
              onClick={() => { refetchCleanupStats(); refetchItems(); }}
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl border border-border flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw size={13} />
              <span>Refresh Stats</span>
            </button>
          </div>

          {/* Database Storage Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 bg-brand/10 border border-brand/20 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand dark:text-brand-light block">Notifications Total</span>
              <span className="text-lg font-black text-foreground mt-1 block">{cleanupStats?.totalNotifications || 0}</span>
            </div>

            <div className="p-3.5 bg-purple-500/10 border border-slate-500/20 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">Activity Audit Logs</span>
              <span className="text-lg font-black text-foreground mt-1 block">{cleanupStats?.totalActivityLogs || 0}</span>
            </div>

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Email Logs</span>
              <span className="text-lg font-black text-foreground mt-1 block">{cleanupStats?.totalEmailLogs || 0}</span>
            </div>

            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Certificates Total</span>
              <span className="text-lg font-black text-foreground mt-1 block">{cleanupStats?.totalCertificates || 0}</span>
            </div>
          </div>

          {/* Module Selector Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setActivePurgeTab('certificates')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all ${
                activePurgeTab === 'certificates'
                  ? 'bg-red-600 text-white shadow-soft'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText size={14} />
              <span>Certificates & File Storage</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePurgeTab('notifications')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all ${
                activePurgeTab === 'notifications'
                  ? 'bg-brand text-white shadow-soft'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bell size={14} />
              <span>Notifications Purge</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePurgeTab('logs')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all ${
                activePurgeTab === 'logs'
                  ? 'bg-brand text-white shadow-soft'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Activity size={14} />
              <span>Activity Audit Logs</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePurgeTab('emails')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all ${
                activePurgeTab === 'emails'
                  ? 'bg-amber-600 text-white shadow-soft'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mail size={14} />
              <span>Email Logs</span>
            </button>
          </div>

          {/* PURGE CONTROLS & SEARCH ACTION BAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/40 p-4 rounded-xl border border-border">
            {/* Live Search Input Box */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <Search size={15} />
              </span>
              <input
                type="text"
                value={purgeSearch}
                onChange={(e) => {
                  setPurgeSearch(e.target.value);
                  setPurgePage(1);
                }}
                placeholder={`Search ${activePurgeTab} content by keyword, cert #, user...`}
                className="w-full pl-9 pr-8 py-2 border border-border rounded-xl text-xs bg-card outline-none focus:border-brand font-medium transition-all"
              />
              {purgeSearch && (
                <button
                  type="button"
                  onClick={() => { setPurgeSearch(''); setPurgePage(1); }}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 shrink-0">
              {/* Select Page Toggle Checkbox */}
              <button
                type="button"
                onClick={handleToggleSelectPage}
                className="text-xs font-bold text-foreground flex items-center space-x-1.5 cursor-pointer bg-card px-3 py-2 rounded-xl border border-border shadow-xs"
              >
                {isCurrentPageAllSelected ? (
                  <CheckSquare size={16} className="text-brand" />
                ) : (
                  <Square size={16} className="text-muted-foreground" />
                )}
                <span>Select Page</span>
              </button>

              {/* Total Selection Counter Badge & Clear All */}
              {selectedIds.length > 0 && (
                <div className="flex items-center space-x-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
                  <span>Selected: {selectedIds.length} items</span>
                  <button
                    type="button"
                    onClick={handleClearAllSelections}
                    className="p-0.5 hover:bg-red-500/20 rounded-md text-red-600 cursor-pointer ml-1"
                    title="Clear all checked selections"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              )}

              {/* Manual Selection Delete Button */}
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => openPurgeModal('selected')}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-soft transition-all cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>

              {/* Timeframe Select & Bulk Delete All */}
              <div className="flex items-center space-x-2 border-l border-border pl-2">
                <select
                  value={purgeTimeframe}
                  onChange={(e: any) => setPurgeTimeframe(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-border text-xs bg-card font-semibold outline-none focus:border-red-500"
                >
                  <option value="30_days">Older than 30 Days</option>
                  <option value="90_days">Older than 90 Days</option>
                  {activePurgeTab === 'certificates' && <option value="expired">Expired Files Only</option>}
                  <option value="all">EVERYTHING (All Time)</option>
                </select>

                <button
                  type="button"
                  onClick={() => openPurgeModal('timeframe')}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-soft transition-all cursor-pointer shrink-0"
                >
                  <Trash2 size={13} />
                  <span>Purge All ({purgeTimeframe.replace('_', ' ')})</span>
                </button>
              </div>
            </div>
          </div>

          {/* MANUAL SELECTION DATA TABLE */}
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            {itemsLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center space-x-2">
                <Loader2 size={16} className="animate-spin text-brand" />
                <span>Loading records for manual selection...</span>
              </div>
            ) : purgeItemsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {purgeSearch ? `No records matching "${purgeSearch}" found for ${activePurgeTab}.` : `No records found for ${activePurgeTab}. Database storage is clean!`}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 backdrop-blur-md">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isCurrentPageAllSelected}
                            onChange={handleToggleSelectPage}
                            className="w-4 h-4 text-brand rounded accent-brand cursor-pointer"
                          />
                        </th>
                        {activePurgeTab === 'certificates' && (
                          <>
                            <th className="p-3">Cert # / Product</th>
                            <th className="p-3">Company</th>
                            <th className="p-3">Expiry Date</th>
                            <th className="p-3">File Status</th>
                          </>
                        )}
                        {(activePurgeTab === 'notifications' || activePurgeTab === 'logs') && (
                          <>
                            <th className="p-3">User</th>
                            <th className="p-3">Action / Module</th>
                            <th className="p-3">Details</th>
                            <th className="p-3">Timestamp</th>
                          </>
                        )}
                        {activePurgeTab === 'emails' && (
                          <>
                            <th className="p-3">Recipient</th>
                            <th className="p-3">Subject</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {purgeItemsList.map((item: any) => {
                        const isSelected = selectedIds.includes(item._id);
                        return (
                          <tr 
                            key={item._id}
                            onClick={() => handleToggleSelectItem(item._id)}
                            className={`hover:bg-muted/30 cursor-pointer transition-colors ${
                              isSelected ? 'bg-brand/5' : ''
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectItem(item._id)}
                                className="w-4 h-4 text-brand rounded accent-brand cursor-pointer"
                              />
                            </td>

                            {activePurgeTab === 'certificates' && (
                              <>
                                <td className="p-3 font-semibold text-foreground">
                                  <div>{item.certificateNumber}</div>
                                  <div className="text-[10px] text-muted-foreground font-normal">{item.productName}</div>
                                </td>
                                <td className="p-3 text-muted-foreground">{item.companyName}</td>
                                <td className="p-3">
                                  <span className={`font-semibold ${new Date(item.expiryDate) < new Date() ? 'text-red-500' : 'text-foreground'}`}>
                                    {formatDate(item.expiryDate)}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {item.fileUrl ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand/10 text-brand">
                                      Physical File Attached
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-[10px]">No File</span>
                                  )}
                                </td>
                              </>
                            )}

                            {(activePurgeTab === 'notifications' || activePurgeTab === 'logs') && (
                              <>
                                <td className="p-3 font-semibold text-foreground">{item.userName || 'System'}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-500">
                                    {item.module}: {item.action}
                                  </span>
                                </td>
                                <td className="p-3 text-muted-foreground truncate max-w-xs">{item.details}</td>
                                <td className="p-3 text-muted-foreground text-[11px]">{formatDate(item.timestamp)}</td>
                              </>
                            )}

                            {activePurgeTab === 'emails' && (
                              <>
                                <td className="p-3 font-semibold text-foreground">{item.recipient}</td>
                                <td className="p-3 text-muted-foreground truncate max-w-xs">{item.subject}</td>
                                <td className="p-3 text-[10px] uppercase font-bold text-muted-foreground">{item.type}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* UNIVERSAL SMART PAGINATION CONTROLS */}
                <div className="p-3 border-t border-border bg-muted/20">
                  <PaginationControls
                    currentPage={purgePage}
                    totalPages={purgePagination.totalPages}
                    totalRecords={purgePagination.total}
                    limit={purgeLimit}
                    onPageChange={(p) => setPurgePage(p)}
                    onLimitChange={(l) => { setPurgeLimit(l); setPurgePage(1); }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    itemLabel={activePurgeTab}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}



      {/* CONFIRMATION PURGE POP-UP MODAL */}
      {purgeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-red-500/10">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <AlertTriangle size={20} />
                <h3 className="text-sm font-bold">
                  {purgeMode === 'selected' ? `Delete ${selectedIds.length} Selected Items` : `Purge All (${purgeTimeframe.replace('_', ' ')})`}
                </h3>
              </div>
              <button 
                onClick={() => setPurgeModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {purgeFeedback.error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold text-red-600 flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>{purgeFeedback.error}</span>
                </div>
              )}

              {purgeFeedback.success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-600 flex items-center space-x-2">
                  <CheckCircle2 size={16} />
                  <span>{purgeFeedback.success}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed">
                {purgeMode === 'selected' ? (
                  <>Are you sure you want to permanently delete <strong className="text-red-500">{selectedIds.length} manually selected</strong> <span className="capitalize text-foreground font-bold">{activePurgeTab}</span> records from the database?</>
                ) : (
                  <>Are you sure you want to permanently purge matching <strong className="text-red-500 font-bold">{purgeTimeframe.replace('_', ' ')}</strong> <span className="capitalize text-foreground font-bold">{activePurgeTab}</span> records from the database?</>
                )}
              </p>

              <div className="p-3 bg-muted rounded-xl text-[11px] font-mono text-muted-foreground border border-border space-y-1">
                <p>• Module Target: {activePurgeTab.toUpperCase()}</p>
                <p>• Purge Mode: {purgeMode === 'selected' ? `MANUAL CHECKED (${selectedIds.length} ITEMS)` : `BULK RANGE (${purgeTimeframe.toUpperCase()})`}</p>
                <p>• Action: PERMANENT DATABASE DELETION</p>
              </div>

              <div className="pt-3 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setPurgeModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-muted font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={purgeLoading}
                  onClick={handleExecutePurge}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-soft transition-all"
                >
                  {purgeLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Deleting Data...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Confirm Permanent Deletion</span>
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
export default Settings;
