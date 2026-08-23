import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  Plus, 
  Trash2, 
  Copy, 
  Save, 
  Loader2, 
  AlertCircle, 
  Building, 
  FileCheck,
  Layers,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import { Category, Subcategory } from '../types';

interface BulkCertificateRow {
  id: string;
  category: string;
  subcategory: string;
  certificateNo: string;
  remarks?: string;
}

interface BulkRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoriesList?: Category[];
  subcategoriesList?: Subcategory[];
}

export const BulkRegisterModal: React.FC<BulkRegisterModalProps> = ({
  isOpen,
  onClose,
  categoriesList = [],
  subcategoriesList = [],
}) => {
  const queryClient = useQueryClient();
  const certificateNoInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Common Master Fields State
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [commonRemarks, setCommonRemarks] = useState('');

  // Dynamic Rows Table State
  const [rows, setRows] = useState<BulkCertificateRow[]>([]);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // React Query Mutation Hook (MUST be called at top-level before early returns)
  const bulkMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/certificates/bulk', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-soon'] });

      onClose();
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to execute bulk certificate registration.');
    }
  });

  // Safe helper to extract category ID from string or object
  const getSubCatCategoryId = (s: Subcategory): string => {
    if (!s || !s.category) return '';
    return typeof s.category === 'object' ? (s.category as any)._id || '' : String(s.category);
  };

  const safeCategories = categoriesList || [];
  const safeSubcategories = subcategoriesList || [];

  // Initialize or reset modal form when opened
  useEffect(() => {
    if (isOpen) {
      const defaultCat = safeCategories[0]?._id || '';
      const matchingSubs = safeSubcategories.filter(s => getSubCatCategoryId(s) === defaultCat);

      setRows([
        {
          id: 'row-1',
          category: defaultCat,
          subcategory: matchingSubs[0]?._id || '',
          certificateNo: '',
          remarks: '',
        }
      ]);
      setFormError('');
    }
  }, [isOpen, safeCategories.length]);

  const handleAddRow = () => {
    const nextId = `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const defaultCat = safeCategories[0]?._id || '';
    const matchingSubs = safeSubcategories.filter(s => getSubCatCategoryId(s) === defaultCat);

    setRows(prev => [
      ...prev,
      {
        id: nextId,
        category: defaultCat,
        subcategory: matchingSubs[0]?._id || '',
        certificateNo: '',
        remarks: '',
      }
    ]);

    setTimeout(() => {
      if (certificateNoInputRefs.current[nextId]) {
        certificateNoInputRefs.current[nextId]?.focus();
      }
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === rows.length - 1) {
        handleAddRow();
      } else {
        const nextId = rows[index + 1]?.id;
        if (nextId && certificateNoInputRefs.current[nextId]) {
          certificateNoInputRefs.current[nextId]?.focus();
        }
      }
    }
  };

  const handleCopyPreviousRow = (index: number) => {
    if (index <= 0 || !rows[index - 1]) return;
    const prevRow = rows[index - 1];
    setRows(current => {
      const updated = [...current];
      updated[index] = {
        ...updated[index],
        category: prevRow.category,
        subcategory: prevRow.subcategory,
        remarks: prevRow.remarks || '',
      };
      return updated;
    });
  };

  const handleDeleteRow = (index: number) => {
    if (rows.length <= 1) {
      setFormError('At least 1 certificate row is required.');
      return;
    }
    setFormError('');
    setRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index: number, field: keyof BulkCertificateRow, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      if (!updated[index]) return prev;

      updated[index] = { ...updated[index], [field]: value };

      if (field === 'category') {
        const matchingSubs = safeSubcategories.filter(s => getSubCatCategoryId(s) === value);
        updated[index].subcategory = matchingSubs[0]?._id || '';
      }

      return updated;
    });
  };

  // Inline Validation Helpers
  const isDuplicateNo = (no: string, idx: number) => {
    if (!no.trim()) return false;
    return rows.some((r, i) => i !== idx && r.certificateNo.trim().toUpperCase() === no.trim().toUpperCase());
  };

  const resetForm = () => {
    setIssuingAuthority('');
    setIssueDate('');
    setExpiryDate('');
    setCommonRemarks('');
    setFormError('');
    setLoading(false);
    const defaultCat = safeCategories[0]?._id || '';
    const matchingSubs = safeSubcategories.filter(s => getSubCatCategoryId(s) === defaultCat);
    setRows([
      {
        id: 'row-1',
        category: defaultCat,
        subcategory: matchingSubs[0]?._id || '',
        certificateNo: '',
        remarks: '',
      }
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!issueDate || !expiryDate) {
      setFormError('Please enter Issue Date and Expiry Date.');
      return;
    }

    if (rows.length === 0) {
      setFormError('Please add at least one certificate row.');
      return;
    }

    // Validate rows
    const certNumbers = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.category) {
        setFormError(`Row #${i + 1}: Please select a Category.`);
        return;
      }
      if (!r.subcategory) {
        setFormError(`Row #${i + 1}: Please select a Subcategory.`);
        return;
      }

      const cleanNo = r.certificateNo?.trim().toUpperCase();
      if (cleanNo && certNumbers.has(cleanNo)) {
        setFormError(`Row #${i + 1}: Duplicate Certificate Number "${r.certificateNo}" detected in form.`);
        return;
      }
      if (cleanNo) certNumbers.add(cleanNo);
    }

    setLoading(true);
    bulkMutation.mutate({
      issuingAuthority: issuingAuthority.trim() || 'General',
      issueDate,
      expiryDate,
      remarks: commonRemarks.trim(),
      certificates: rows.map(r => ({
        name: '',
        category: r.category,
        subcategory: r.subcategory,
        certificateNo: r.certificateNo.trim(),
        remarks: r.remarks?.trim() || '',
      }))
    }, {
      onSettled: () => setLoading(false)
    });
  };

  // Safe early return AFTER all React Hooks have been declared
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brand/10 text-brand dark:text-brand-light">
              <FileCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Bulk Certificate Registration</h3>
              <p className="text-xs text-muted-foreground">Register multiple certificates for a supplier in a single bulk action</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {formError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold text-red-600 flex items-center space-x-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* SECTION 1: Master Common Fields */}
            <div className="bg-muted/20 border border-border/80 rounded-2xl p-4 space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-foreground">
                <Building size={15} className="text-brand" />
                <span>Master Supplier & Validity Period (Applies to all rows below)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">Issuing Authority / Supplier (Optional)</label>
                  <input
                    type="text"
                    value={issuingAuthority}
                    onChange={(e) => setIssuingAuthority(e.target.value)}
                    placeholder="Optional supplier or authority"
                    className="w-full px-3.5 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none focus:border-brand focus:bg-background transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">Common Issue Date</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none focus:border-brand focus:bg-background transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">Common Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-border rounded-xl text-xs bg-background/50 outline-none focus:border-brand focus:bg-background transition-all font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Dynamic Certificate Table */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 text-xs font-bold text-foreground">
                  <Layers size={15} className="text-brand" />
                  <span>Certificate Items Table ({rows.length} {rows.length === 1 ? 'record' : 'records'})</span>
                  <span className="text-[10px] text-muted-foreground font-normal ml-2">(Press Enter in last row to add next)</span>
                </div>

                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand dark:text-brand-light border border-brand/20 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Plus size={14} />
                  <span>Add Row</span>
                </button>
              </div>

              <div className="border border-border rounded-2xl overflow-hidden shadow-soft">
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-muted/40 backdrop-blur-md border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider z-10">
                      <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Subcategory</th>
                        <th className="p-3">Certificate No.</th>
                        <th className="p-3">Remarks</th>
                        <th className="p-3 text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-medium">
                      {rows.map((row, index) => {
                        const matchingSubs = safeSubcategories.filter(s => getSubCatCategoryId(s) === row.category);
                        const dupNo = isDuplicateNo(row.certificateNo, index);

                        return (
                          <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3 text-center font-bold text-muted-foreground">{index + 1}</td>
                            <td className="p-2">
                              <select
                                required
                                value={row.category}
                                onChange={(e) => handleRowChange(index, 'category', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background outline-none text-xs font-semibold cursor-pointer focus:border-brand"
                              >
                                {safeCategories.length === 0 ? (
                                  <option value="">No categories</option>
                                ) : (
                                  safeCategories.map(cat => (
                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                  ))
                                )}
                              </select>
                            </td>
                            <td className="p-2">
                              <select
                                value={row.subcategory}
                                onChange={(e) => handleRowChange(index, 'subcategory', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background outline-none text-xs font-semibold cursor-pointer focus:border-brand"
                              >
                                {matchingSubs.length === 0 ? (
                                  <option value="">General</option>
                                ) : (
                                  matchingSubs.map(sub => (
                                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                                  ))
                                )}
                              </select>
                            </td>
                            <td className="p-2">
                              <div className="space-y-0.5">
                                <input
                                  ref={(el) => { certificateNoInputRefs.current[row.id] = el; }}
                                  type="text"
                                  placeholder="Optional - e.g. ISO-001"
                                  value={row.certificateNo}
                                  onChange={(e) => handleRowChange(index, 'certificateNo', e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, index)}
                                  className={`w-full px-3 py-1.5 border rounded-lg bg-background outline-none text-xs font-mono font-bold transition-all ${
                                    dupNo ? 'border-red-500 focus:border-red-500 text-red-600 bg-red-500/5' : 'border-border focus:border-brand'
                                  }`}
                                />
                                {dupNo && (
                                  <p className="text-[10px] text-red-500 font-bold flex items-center space-x-1">
                                    <AlertTriangle size={10} />
                                    <span>Duplicate No.</span>
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="Optional remarks"
                                value={row.remarks || ''}
                                onChange={(e) => handleRowChange(index, 'remarks', e.target.value)}
                                className="w-full px-3 py-1.5 border border-border rounded-lg bg-background outline-none text-xs font-semibold transition-all focus:border-brand"
                              />
                            </td>
                            <td className="p-2 text-right pr-4">
                              <div className="flex items-center justify-end space-x-1">
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPreviousRow(index)}
                                    className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    title="Copy details from previous row"
                                  >
                                    <Copy size={13} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(index)}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors cursor-pointer"
                                  title="Delete row"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

          {/* Modal Footer Controls */}
          <div className="p-5 border-t border-border bg-muted/20 flex justify-between items-center shrink-0">
            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs font-bold text-brand hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Another Certificate Row</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-border rounded-xl text-xs font-bold hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-brand hover:bg-brand-dark disabled:bg-brand/60 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-soft active:scale-[0.98] cursor-pointer transition-all"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save All ({rows.length} {rows.length === 1 ? 'Certificate' : 'Certificates'})</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
export default BulkRegisterModal;
