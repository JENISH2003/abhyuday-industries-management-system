import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { 
  FileCheck, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Download, 
  FolderOpen,
  X,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  RefreshCw,
  Calendar,
  Building,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Layers,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import api from '../services/api';
import { formatDate, getDaysRemaining } from '../utils';
import { generateEnterpriseExcelReport, EnterpriseExcelColumn, SummaryCardItem } from '../utils/excelReportEngine';
import { RootState } from '../store';
import { Certificate, Category, Subcategory } from '../types';
import { renderIcon } from './CategoryAdmin';
import { PaginationControls } from '../components/PaginationControls';
import { BulkRegisterModal } from '../components/BulkRegisterModal';

export const Certificates: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useSelector((state: RootState) => state.auth.user);

  // Read URL query params if opened from Dashboard clickable cards
  const initialStatus = searchParams.get('status') || '';

  // Pagination, Search & Sorting States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('expiryDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Advanced Filters Drawer Toggle
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [renewCert, setRenewCert] = useState<Certificate | null>(null);
  const [renewDate, setRenewDate] = useState('');

  // Selected Item
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subcategory: '',
    certificateNo: '',
    issuingAuthority: '',
    issueDate: '',
    expiryDate: '',
    remarks: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Sync state if URL search param changes
  useEffect(() => {
    if (searchParams.get('status') !== null) {
      setStatusFilter(searchParams.get('status') || '');
      setPage(1);
    }
  }, [searchParams]);

  // Fetch Certificate Expiration Stats Summary
  const { data: statsData } = useQuery({
    queryKey: ['certificate-stats'],
    queryFn: async () => {
      const res = await api.get('/certificates/stats');
      return res.data;
    }
  });
  const stats = statsData?.stats || { total: 0, active: 0, warning: 0, expired: 0 };

  // Fetch Active Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['active-categories'],
    queryFn: async () => {
      const res = await api.get('/categories?status=active');
      return res.data;
    }
  });

  // Fetch Active Subcategories
  const { data: subcategoriesData } = useQuery({
    queryKey: ['active-subcategories'],
    queryFn: async () => {
      const res = await api.get('/subcategories?status=active');
      return res.data;
    }
  });

  const categoriesList: Category[] = categoriesData?.categories || [];
  const subcategoriesList: Subcategory[] = subcategoriesData?.subcategories || [];

  // Filter subcategories for selected form Category
  const formFilteredSubcategories = subcategoriesList.filter(
    (sub) => {
      const catId = sub && sub.category ? (typeof sub.category === 'object' ? (sub.category as any)._id : sub.category) : '';
      return catId === formData.category;
    }
  );

  useEffect(() => {
    if (formData.category && formFilteredSubcategories.length > 0) {
      const belongs = formFilteredSubcategories.some(sub => sub._id === formData.subcategory);
      if (!belongs) {
        setFormData(prev => ({ ...prev, subcategory: formFilteredSubcategories[0]._id }));
      }
    } else {
      setFormData(prev => ({ ...prev, subcategory: '' }));
    }
  }, [formData.category, subcategoriesData]);

  // Fetch Certificates list with server-side search, filtering, sorting, and pagination
  const { data, isLoading } = useQuery({
    queryKey: ['certificates', page, limit, search, statusFilter, categoryFilter, subcategoryFilter, sortBy, sortOrder],
    queryFn: async () => {
      const res = await api.get('/certificates', {
        params: {
          page,
          limit,
          search,
          status: statusFilter,
          category: categoryFilter,
          subcategory: subcategoryFilter,
          sortBy,
          sortOrder,
        }
      });
      return res.data;
    }
  });

  const certificatesList: Certificate[] = data?.certificates || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit, pages: 1 };

  // Toggle sorting on column click
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setSubcategoryFilter('');
    setSearchParams({});
    setPage(1);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/certificates', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-certificates'] });
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to register certificate.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return api.put(`/certificates/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-certificates'] });
      setIsEditModalOpen(false);
      setRenewCert(null);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to update certificate.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/certificates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: categoriesList[0]?._id || '',
      subcategory: '',
      certificateNo: '',
      issuingAuthority: '',
      issueDate: '',
      expiryDate: '',
      remarks: '',
    });
    setFormError('');
    setFormLoading(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.subcategory) {
      setFormError('Please select a valid Category and Subcategory.');
      return;
    }
    setFormLoading(true);

    const subcatObj = subcategoriesList.find(s => s._id === formData.subcategory);
    const catObj = categoriesList.find(c => c._id === formData.category);
    const autoName = formData.name?.trim() || (subcatObj ? subcatObj.name : catObj ? catObj.name : 'Compliance Document');

    const payload = {
      ...formData,
      name: autoName,
    };

    createMutation.mutate(payload, {
      onSettled: () => setFormLoading(false)
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCert) return;
    if (!formData.category || !formData.subcategory) {
      setFormError('Please select a valid Category and Subcategory.');
      return;
    }
    setFormLoading(true);
    updateMutation.mutate({ id: selectedCert._id, payload: formData }, {
      onSettled: () => setFormLoading(false)
    });
  };

  const openEditModal = (cert: Certificate) => {
    setSelectedCert(cert);
    setFormData({
      name: cert.name,
      category: cert.category?._id || '',
      subcategory: cert.subcategory?._id || '',
      certificateNo: cert.certificateNo,
      issuingAuthority: cert.issuingAuthority,
      issueDate: cert.issueDate.split('T')[0],
      expiryDate: cert.expiryDate.split('T')[0],
      remarks: cert.remarks || '',
    });
    setIsEditModalOpen(true);
  };

  const [renewError, setRenewError] = useState('');

  const renewMutation = useMutation({
    mutationFn: async ({ id, expiryDate }: { id: string; expiryDate: string }) => {
      return api.put(`/certificates/${id}/renew`, { expiryDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-soon'] });
      setRenewCert(null);
      setRenewDate('');
      setRenewError('');
    },
    onError: (err: any) => {
      setRenewError(err.response?.data?.message || 'Failed to renew certificate.');
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async (certId: string) => {
      return api.patch(`/certificates/${certId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-soon'] });
    }
  });

  const openRenewModal = (cert: Certificate) => {
    setSelectedCert(cert);
    setRenewError('');
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    setRenewDate(future.toISOString().split('T')[0]);
    setRenewCert(cert);
  };

  const handleRenewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewCert || !renewDate) {
      setRenewError('Please select a valid future expiry date.');
      return;
    }
    setFormLoading(true);
    renewMutation.mutate({ id: renewCert._id, expiryDate: renewDate }, {
      onSettled: () => setFormLoading(false)
    });
  };

  const openViewModal = (cert: Certificate) => {
    setSelectedCert(cert);
    setIsViewModalOpen(true);
  };

  const [deleteConfirmCert, setDeleteConfirmCert] = useState<Certificate | null>(null);

  const handleDelete = (cert: Certificate) => {
    setDeleteConfirmCert(cert);
  };

  const handleExecuteDeleteCert = () => {
    if (deleteConfirmCert) {
      deleteMutation.mutate(deleteConfirmCert._id);
      setDeleteConfirmCert(null);
    }
  };

  const handleExportExcel = async () => {
    const columns: EnterpriseExcelColumn[] = [
      { header: 'Certificate Name', key: 'name', width: 28, align: 'left' },
      { header: 'Category', key: 'categoryName', width: 20, align: 'left' },
      { header: 'Subcategory', key: 'subcategoryName', width: 20, align: 'left' },
      { header: 'Certificate No.', key: 'certificateNo', width: 22, align: 'center' },
      { header: 'Issuing Authority / Supplier', key: 'issuingAuthority', width: 25, align: 'left' },
      { header: 'Issue Date', key: 'issueDateFormatted', width: 14, align: 'center', type: 'date' },
      { header: 'Expiry Date', key: 'expiryDateFormatted', width: 14, align: 'center', type: 'date' },
      { header: 'Days Remaining', key: 'daysLeft', width: 18, align: 'center', type: 'status' },
      { header: 'Compliance Status', key: 'statusFormatted', width: 20, align: 'center', type: 'status' },
      { header: 'Remarks', key: 'remarks', width: 32, align: 'left' },
    ];

    const activeCount = certificatesList.filter(c => getDaysRemaining(c.expiryDate) > 90).length;
    const warningCount = certificatesList.filter(c => { const d = getDaysRemaining(c.expiryDate); return d > 0 && d <= 90; }).length;
    const expiredCount = certificatesList.filter(c => getDaysRemaining(c.expiryDate) <= 0).length;

    const summaryCards: SummaryCardItem[] = [
      { label: 'Total Output', value: certificatesList.length, bgColor: 'F1F5F9', textColor: '0F172A' },
      { label: 'Active Valid (>90d)', value: activeCount, bgColor: 'DCFCE7', textColor: '15803D' },
      { label: 'Warning (0-90d)', value: warningCount, bgColor: 'FFEDD5', textColor: 'C2410C' },
      { label: 'Expired (<=0d)', value: expiredCount, bgColor: 'FEE2E2', textColor: 'B91C1C' },
    ];

    const exportData = certificatesList.map(c => {
      const days = getDaysRemaining(c.expiryDate);
      const isExpired = days <= 0;
      const isWarning = days > 0 && days <= 90;

      return {
        name: c.name,
        categoryName: c.category?.name || 'Unassigned',
        subcategoryName: c.subcategory?.name || 'General',
        certificateNo: c.certificateNo,
        issuingAuthority: c.issuingAuthority,
        issueDateFormatted: c.issueDate ? c.issueDate.split('T')[0] : '-',
        expiryDateFormatted: c.expiryDate.split('T')[0],
        daysLeft: isExpired ? `EXPIRED (${Math.abs(days)}d AGO)` : `${days} DAYS REMAINING`,
        statusFormatted: isExpired ? 'EXPIRED' : isWarning ? 'WARNING' : 'ACTIVE',
        remarks: c.remarks || '',
      };
    });

    await generateEnterpriseExcelReport({
      filename: `Certificates_Report_${Date.now()}`,
      sheetName: 'Certificates Inventory',
      reportTitle: 'Compliance Certificates Inventory Report',
      reportSubtitle: 'Official Enterprise Compliance Audit & Management Export',
      operatorName: user?.name || 'Compliance Officer',
      columns,
      data: exportData,
      summaryCards,
    });
  };

  const canModify = user && ['super_admin', 'admin', 'manager', 'user'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200 max-w-6xl mx-auto">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <FileCheck className="text-brand" size={22} />
            <span>Compliance Certificates</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search, filter, renew, and manage enterprise compliance certificates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-soft cursor-pointer active:scale-[0.98]"
          >
            <Download size={14} />
            <span>Export Excel (.xlsx)</span>
          </button>

          {canModify && (
            <>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="border border-brand/30 bg-brand/10 hover:bg-brand-dark/20 text-brand dark:text-brand-light text-xs font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-soft active:scale-[0.98] cursor-pointer"
              >
                <Layers size={14} />
                <span>Bulk Register</span>
              </button>

              <button
                onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                className="bg-brand hover:bg-brand-dark text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-soft active:scale-[0.98] cursor-pointer"
              >
                <Plus size={15} />
                <span>Add Certificate</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Interactive Expiry & Certificate Status Indicator Board */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => { setStatusFilter(''); setSearchParams({}); setPage(1); }}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-soft flex items-center justify-between group ${
            statusFilter === '' 
              ? 'bg-brand/10 dark:bg-brand/20 border-brand ring-2 ring-brand/30 shadow-md' 
              : 'bg-card border-border hover:border-brand/40 hover:bg-brand/5'
          }`}
        >
          <div className="space-y-0.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground group-hover:text-brand transition-colors">
              All Certificates
            </p>
            <p className="text-2xl font-black text-foreground tracking-tight">{stats.total}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
            statusFilter === '' 
              ? 'bg-brand text-white border-brand shadow-sm' 
              : 'bg-brand/10 text-brand border-brand/20'
          }`}>
            <FileCheck size={20} />
          </div>
        </div>

        <div 
          onClick={() => { setStatusFilter('active'); setSearchParams({ status: 'active' }); setPage(1); }}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-soft flex items-center justify-between group ${
            statusFilter === 'active' 
              ? 'bg-emerald-500/15 dark:bg-emerald-500/25 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md' 
              : 'bg-card border-border hover:border-emerald-500/40 hover:bg-emerald-500/5'
          }`}
        >
          <div className="space-y-0.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Active & Valid
            </p>
            <p className="text-2xl font-black text-foreground tracking-tight">{stats.active}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
            statusFilter === 'active' 
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
          }`}>
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div 
          onClick={() => { setStatusFilter('expiring_soon'); setSearchParams({ status: 'expiring_soon' }); setPage(1); }}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-soft flex items-center justify-between group ${
            statusFilter === 'expiring_soon' 
              ? 'bg-amber-500/15 dark:bg-amber-500/25 border-amber-500 ring-2 ring-amber-500/30 shadow-md' 
              : 'bg-card border-border hover:border-amber-500/40 hover:bg-amber-500/5'
          }`}
        >
          <div className="space-y-0.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Expiring Soon (0-90d)
            </p>
            <p className="text-2xl font-black text-foreground tracking-tight">{stats.warning}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
            statusFilter === 'expiring_soon' 
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm' 
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}>
            <Clock size={20} />
          </div>
        </div>

        <div 
          onClick={() => { setStatusFilter('expired'); setSearchParams({ status: 'expired' }); setPage(1); }}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-soft flex items-center justify-between group ${
            statusFilter === 'expired' 
              ? 'bg-red-500/15 dark:bg-red-500/25 border-red-500 ring-2 ring-red-500/30 shadow-md' 
              : 'bg-card border-border hover:border-red-500/40 hover:bg-red-500/5'
          }`}
        >
          <div className="space-y-0.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400">
              Expired Now
            </p>
            <p className="text-2xl font-black text-foreground tracking-tight">{stats.expired}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
            statusFilter === 'expired' 
              ? 'bg-red-600 text-white border-red-500 shadow-sm' 
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
          }`}>
            <ShieldAlert size={20} />
          </div>
        </div>
      </div>

      {/* Global Fast Search & Filters Control Bar */}
      <div className="bg-card border border-border dark:border-slate-700 p-4 rounded-2xl shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Search by name, supplier, certificate number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-xs bg-background/50 dark:bg-slate-950/80 focus:bg-background outline-none transition-all focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center space-x-2 border border-border bg-white dark:bg-slate-950/80 rounded-xl px-3 py-1 text-xs">
              <Filter size={13} className="text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setStatusFilter(val);
                  setSearchParams(val ? { status: val } : {});
                  setPage(1);
                }}
                className="py-1.5 bg-white dark:bg-slate-950/95 border-0 rounded-none appearance-none outline-none cursor-pointer pr-4 font-bold text-foreground dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="active">Active (Valid & &gt; 90d)</option>
                <option value="expiring_soon">Warning (Expiring within 90d)</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2 border border-border bg-white dark:bg-slate-950/80 rounded-xl px-3 py-1 text-xs">
              <FolderOpen size={13} className="text-muted-foreground" />
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setSubcategoryFilter(''); setPage(1); }}
                className="py-1.5 bg-white dark:bg-slate-950/95 border-0 rounded-none appearance-none outline-none cursor-pointer pr-4 font-medium text-foreground dark:text-white"
              >
                <option value="">All Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Toggle Advanced Filters Drawer */}
            <button
              onClick={() => setShowAdvancedFilters(prev => !prev)}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all ${
                showAdvancedFilters || subcategoryFilter ? 'bg-brand/10 border-brand text-brand' : 'border-border bg-background/50 dark:bg-slate-950/80 text-muted-foreground hover:text-foreground'
              }`}
              title="Advanced Filter Options"
            >
              <SlidersHorizontal size={14} />
            </button>

            {/* Reset Filters */}
            {(search || statusFilter || categoryFilter || subcategoryFilter) && (
              <button
                onClick={handleResetFilters}
                className="p-2 rounded-xl border border-border bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Reset All Filters"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Subcategory Filter</label>
              <select
                value={subcategoryFilter}
                onChange={(e) => { setSubcategoryFilter(e.target.value); setPage(1); }}
                disabled={!categoryFilter}
                className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-white dark:bg-slate-950/95 appearance-none outline-none cursor-pointer disabled:opacity-50 font-medium text-foreground dark:text-white"
              >
                <option value="">All Subcategories</option>
                {subcategoriesList
                  .filter((sub) => {
                    const catId = sub && sub.category ? (typeof sub.category === 'object' ? (sub.category as any)._id : sub.category) : '';
                    return catId === categoryFilter;
                  })
                  .map((sub) => (
                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Sort Field</label>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-white dark:bg-slate-950/95 appearance-none outline-none cursor-pointer font-medium text-foreground dark:text-white"
              >
                <option value="expiryDate">Expiry Date</option>
                <option value="name">Certificate Name</option>
                <option value="issuingAuthority">Issuing Authority / Supplier</option>
                <option value="createdAt">Registration Date</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="w-full py-2 px-3 border border-border bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold text-foreground flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset All Filters</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Certificates Table */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-2xl p-16 animate-pulse space-y-4">
          <div className="h-4 bg-muted w-1/4 rounded"></div>
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </div>
      ) : certificatesList.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center shadow-soft">
          <FileCheck size={48} className="mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-bold text-foreground">No Certificates Found</h3>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria or register a new certificate.</p>
        </div>
      ) : (
        <div className="bg-card border border-border dark:border-slate-700 rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-muted/30 dark:bg-slate-900/80 backdrop-blur-md border-b border-border dark:border-slate-700 z-10 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-4">Category</th>
                  <th className="p-4">Subcategory</th>
                  <th className="p-4">Certificate No.</th>
                  <th onClick={() => handleSort('issueDate')} className="p-4 cursor-pointer hover:text-foreground">
                    <div className="flex items-center space-x-1">
                      <span>Issue Date</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('expiryDate')} className="p-4 cursor-pointer hover:text-foreground">
                    <div className="flex items-center space-x-1">
                      <span>Expiry Date</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-4">Days Left</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-medium">
                {certificatesList.map((cert) => {
                  const daysLeft = getDaysRemaining(cert.expiryDate);
                  const isExpired = daysLeft <= 0;
                  const isWarning = daysLeft > 0 && daysLeft <= 90;

                  return (
                    <tr 
                      key={cert._id} 
                      onClick={() => openViewModal(cert)} 
                      className="hover:bg-muted/50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 font-bold text-foreground group-hover:text-brand transition-colors" title="Click to view details">
                        {cert.category?.name || 'General'}
                      </td>
                      <td className="p-4">
                        <span className="bg-muted dark:bg-slate-800/70 px-2.5 py-1 rounded-lg text-[10px] font-bold text-foreground">
                          {cert.subcategory?.name || cert.name || 'General'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-muted-foreground">{cert.certificateNo || 'N/A'}</td>
                      <td className="p-4 text-muted-foreground whitespace-nowrap">{formatDate(cert.issueDate)}</td>
                      <td className="p-4 text-muted-foreground whitespace-nowrap">{formatDate(cert.expiryDate)}</td>
                      <td className={`p-4 font-bold whitespace-nowrap ${isExpired ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {isExpired ? `${Math.abs(daysLeft)}d expired` : `${daysLeft} days`}
                      </td>
                      <td className="p-4">
                        {cert.isResolved ? (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Clock size={11} />
                            <span>Process Ongoing</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isExpired 
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                              : isWarning 
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isExpired ? <ShieldAlert size={11} /> : isWarning ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                            <span>{isExpired ? 'Expired' : isWarning ? 'Warning' : 'Active'}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1">
                          {canModify && (
                            <button
                              type="button"
                              onClick={() => openEditModal(cert)}
                              className="p-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand transition-colors cursor-pointer"
                              title="Edit Certificate"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(cert)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors cursor-pointer"
                              title="Delete Certificate"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Universal Server-Side Pagination Bar */}
          <div className="p-4 border-t border-border bg-muted/10">
            <PaginationControls
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalRecords={pagination.total}
              limit={limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => { setLimit(l); setPage(1); }}
              pageSizeOptions={[10, 25, 50, 100]}
              itemLabel="certificates"
            />
          </div>
        </div>
      )}

      {/* Enterprise Bulk Register Modal */}
      <BulkRegisterModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        categoriesList={categoriesList}
        subcategoriesList={subcategoriesList}
      />

      {/* Single Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
              <h3 className="text-sm font-bold text-foreground">Register Compliance Certificate</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold text-red-600 flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Category</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none cursor-pointer focus:border-brand"
                  >
                    <option value="">-- Choose Category --</option>
                    {categoriesList.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Subcategory</label>
                  <select
                    required
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    disabled={!formData.category}
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none cursor-pointer disabled:opacity-50 focus:border-brand"
                  >
                    <option value="">-- Choose Subcategory --</option>
                    {formFilteredSubcategories.map((sub) => (
                      <option key={sub._id} value={sub._id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Certificate Number</label>
                <input
                  type="text"
                  value={formData.certificateNo}
                  onChange={(e) => setFormData({ ...formData, certificateNo: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none focus:border-brand font-mono"
                  placeholder="Optional - e.g. ISO/27001/2026"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none focus:border-brand font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none focus:border-brand font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none h-16 resize-none focus:border-brand"
                  placeholder="Add optional notes..."
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-muted font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-brand hover:bg-brand-dark disabled:bg-brand/60 text-white rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  {formLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Submit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
              <h3 className="text-sm font-bold text-foreground">Edit Certificate</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold text-red-600 flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Category</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Category --</option>
                    {categoriesList.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Certificate Number</label>
                  <input
                    type="text"
                    value={formData.certificateNo}
                    onChange={(e) => setFormData({ ...formData, certificateNo: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none font-mono"
                    placeholder="Optional - e.g. ISO/27001/2026"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Subcategory</label>
                  <select
                    required
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    disabled={!formData.category}
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">-- Choose Subcategory --</option>
                    {formFilteredSubcategories.map((sub) => (
                      <option key={sub._id} value={sub._id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Issuing Authority / Supplier</label>
                  <input
                    type="text"
                    required
                    value={formData.issuingAuthority}
                    onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none"
                    placeholder="e.g. Bureau Veritas / Supplier Name"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Issuing Authority / Supplier</label>
                <input
                  type="text"
                  required
                  value={formData.issuingAuthority}
                  onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none h-16 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-muted font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-brand hover:bg-brand-dark disabled:bg-brand/60 text-white rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  {formLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedCert && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center shrink-0">
                  <FileCheck size={20} />
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-sm font-bold text-foreground truncate">
                    {selectedCert.subcategory?.name || selectedCert.name || 'Compliance Document'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    Category: {selectedCert.category?.name || 'General'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-medium">
              {/* Status Badge Bar */}
              <div className="p-3 rounded-xl border flex items-center justify-between bg-muted/20 border-border">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Status:</span>
                  {selectedCert.isResolved ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
                      <Clock size={11} />
                      <span>Process Ongoing</span>
                    </span>
                  ) : getDaysRemaining(selectedCert.expiryDate) <= 0 ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/10 text-red-500 border border-red-500/20 uppercase">
                      <ShieldAlert size={11} />
                      <span>Expired</span>
                    </span>
                  ) : getDaysRemaining(selectedCert.expiryDate) <= 90 ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
                      <Clock size={11} />
                      <span>Warning</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase">
                      <CheckCircle2 size={11} />
                      <span>Active & Valid</span>
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className={`font-black text-xs ${
                    getDaysRemaining(selectedCert.expiryDate) <= 0 
                      ? 'text-red-500' 
                      : getDaysRemaining(selectedCert.expiryDate) <= 90 
                      ? 'text-amber-500' 
                      : 'text-emerald-500'
                  }`}>
                    {getDaysRemaining(selectedCert.expiryDate) <= 0
                      ? `${Math.abs(getDaysRemaining(selectedCert.expiryDate))} Days Expired`
                      : `${getDaysRemaining(selectedCert.expiryDate)} Days Remaining`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Subcategory</p>
                  <p className="font-bold text-foreground mt-0.5">{selectedCert.subcategory?.name || 'General'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Category</p>
                  <p className="font-bold text-foreground mt-0.5">{selectedCert.category?.name || 'General'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Certificate Number</p>
                  <p className="font-mono font-bold text-foreground mt-0.5">{selectedCert.certificateNo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Issue Date</p>
                  <p className="font-semibold text-foreground mt-0.5">{selectedCert.issueDate ? formatDate(selectedCert.issueDate) : '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Expiry Date</p>
                <p className="font-semibold text-foreground mt-0.5">{formatDate(selectedCert.expiryDate)}</p>
              </div>

              {selectedCert.remarks && (
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Remarks / Notes</p>
                  <p className="text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/60">{selectedCert.remarks}</p>
                </div>
              )}

              {/* Modal Footer Action Controls */}
              <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                {/* Left: Edit & Delete Actions */}
                <div className="flex items-center space-x-2">
                  {canModify && (
                    <button
                      type="button"
                      onClick={() => {
                        const cert = selectedCert;
                        setIsViewModalOpen(false);
                        openEditModal(cert);
                      }}
                      className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer active:scale-95"
                      title="Edit Certificate"
                    >
                      <Edit size={13} />
                      <span>Edit</span>
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        const cert = selectedCert;
                        setIsViewModalOpen(false);
                        handleDelete(cert);
                      }}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer active:scale-95"
                      title="Delete Certificate"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                {/* Right: Primary Compliance Actions & Close */}
                <div className="flex items-center space-x-2">
                  {canModify && (
                    <button
                      type="button"
                      onClick={() => {
                        resolveMutation.mutate(selectedCert._id);
                        setIsViewModalOpen(false);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-soft active:scale-95 whitespace-nowrap ${
                        selectedCert.isResolved
                          ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                      title={selectedCert.isResolved ? 'Mark process as complete & set back active' : 'Mark renewal process as ongoing'}
                    >
                      <Clock size={13} />
                      <span>{selectedCert.isResolved ? '✓ Active' : 'Process Ongoing'}</span>
                    </button>
                  )}

                  {canModify && getDaysRemaining(selectedCert.expiryDate) <= 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const cert = selectedCert;
                        setIsViewModalOpen(false);
                        openRenewModal(cert);
                      }}
                      className="px-3.5 py-2 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-soft transition-colors cursor-pointer active:scale-95 whitespace-nowrap"
                    >
                      <RefreshCw size={13} />
                      <span>Renew</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold text-foreground cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renew Certificate Modal */}
      {renewCert && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-premium w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
              <h3 className="text-sm font-bold text-foreground flex items-center space-x-2">
                <RefreshCw size={16} className="text-brand" />
                <span>Renew Certificate</span>
              </h3>
              <button onClick={() => setRenewCert(null)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRenewSubmit} className="p-6 space-y-4">
              {renewError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-600 flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>{renewError}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Certificate Name</label>
                <input
                  type="text"
                  disabled
                  value={renewCert.name}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-muted text-muted-foreground font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Certificate Number</label>
                <input
                  type="text"
                  disabled
                  value={renewCert.certificateNo}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-muted text-muted-foreground font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">New Expiry Date</label>
                <input
                  type="date"
                  required
                  value={renewDate}
                  onChange={(e) => setRenewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none focus:border-brand font-medium"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setRenewCert(null)}
                  className="px-4 py-2 border border-border rounded-lg text-xs hover:bg-muted font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-brand hover:bg-brand-dark disabled:bg-brand/60 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer shadow-soft"
                >
                  {formLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  <span>Save Renewal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DELETE CERTIFICATE POP-UP MODAL */}
      {deleteConfirmCert && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-red-500/10">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <ShieldAlert size={20} />
                <h3 className="text-sm font-bold">Delete Certificate Record</h3>
              </div>
              <button 
                onClick={() => setDeleteConfirmCert(null)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to permanently delete certificate <strong className="text-foreground font-bold">"{deleteConfirmCert.name}"</strong> (Cert #{deleteConfirmCert.certificateNo}) from the database?
              </p>

              <div className="p-3 bg-muted rounded-xl text-[11px] font-mono text-muted-foreground border border-border space-y-1">
                <p>• Certificate: {deleteConfirmCert.name}</p>
                <p>• Cert Number: {deleteConfirmCert.certificateNo}</p>
                <p>• Action: PERMANENT DATABASE DELETION</p>
              </div>

              <div className="pt-3 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCert(null)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-muted font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteDeleteCert}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-soft transition-all"
                >
                  <Trash2 size={14} />
                  <span>Confirm Permanent Deletion</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Certificates;
