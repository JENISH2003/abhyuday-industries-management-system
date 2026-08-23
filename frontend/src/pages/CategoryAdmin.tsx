import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import * as Icons from 'lucide-react';
import { Trash2, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import { RootState } from '../store';
import { Category, Subcategory } from '../types';

// Dynamic icon resolver helper
const renderIcon = (name: string, size = 18) => {
  const IconComponent = (Icons as any)[name];
  if (IconComponent) {
    return <IconComponent size={size} />;
  }
  return <Icons.FolderOpen size={size} />;
};

const preselectedColors = [
  { hex: '#3B82F6', label: 'Blue' },
  { hex: '#10B981', label: 'Emerald' },
  { hex: '#8B5CF6', label: 'Purple' },
  { hex: '#EC4899', label: 'Pink' },
  { hex: '#F59E0B', label: 'Amber' },
  { hex: '#EF4444', label: 'Red' },
  { hex: '#06B6D4', label: 'Cyan' },
  { hex: '#14B8A6', label: 'Teal' },
  { hex: '#6366F1', label: 'Indigo' },
  { hex: '#6B7280', label: 'Gray' },
];

const preselectedIcons = [
  'Award',
  'FlaskConical',
  'FileSpreadsheet',
  'UserCheck',
  'Globe',
  'Settings',
  'ShieldAlert',
  'GraduationCap',
  'Truck',
  'Calendar',
  'Briefcase',
  'ClipboardCheck',
  'ShieldCheck',
  'SearchCode',
];

export const CategoryAdmin: React.FC = () => {
  const queryClient = useQueryClient();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [editCategoryMode, setEditCategoryMode] = useState<Category | null>(null);

  // Confirmation Modal States
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<Category | null>(null);
  const [deleteConfirmSubcategory, setDeleteConfirmSubcategory] = useState<Subcategory | null>(null);

  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#3B82F6');
  const [categoryIcon, setCategoryIcon] = useState('Award');
  const [categoryStatus, setCategoryStatus] = useState<'active' | 'inactive'>('active');

  const [subcategoryName, setSubcategoryName] = useState('');
  const [selectedParentCategory, setSelectedParentCategory] = useState('');
  const [subcategoryError, setSubcategoryError] = useState('');

  // Fetch Categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    }
  });

  // Fetch Subcategories
  const { data: subcategoriesData, isLoading: subcategoriesLoading } = useQuery({
    queryKey: ['admin-subcategories'],
    queryFn: async () => {
      const res = await api.get('/subcategories');
      return res.data;
    }
  });

  const categories: Category[] = categoriesData?.categories || [];
  const subcategories: Subcategory[] = subcategoriesData?.subcategories || [];

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/categories', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsCategoryModalOpen(false);
      resetCategoryForm();
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => api.put(`/categories/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsCategoryModalOpen(false);
      resetCategoryForm();
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subcategories'] });
      setDeleteConfirmCategory(null);
    }
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/subcategories', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subcategories'] });
      setIsSubcategoryModalOpen(false);
      setSubcategoryName('');
    },
    onError: (err: any) => {
      setSubcategoryError(err.response?.data?.message || 'Failed to add subcategory.');
    }
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/subcategories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subcategories'] });
      setDeleteConfirmSubcategory(null);
    }
  });

  const resetCategoryForm = () => {
    setCategoryName('');
    setCategoryColor('#3B82F6');
    setCategoryIcon('Award');
    setCategoryStatus('active');
    setEditCategoryMode(null);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;

    const payload = {
      name: categoryName,
      color: categoryColor,
      icon: categoryIcon,
      status: categoryStatus,
    };

    if (editCategoryMode) {
      updateCategoryMutation.mutate({ id: editCategoryMode._id, payload });
    } else {
      createCategoryMutation.mutate(payload);
    }
  };

  const handleSubcategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcategoryName || !selectedParentCategory) return;
    setSubcategoryError('');
    createSubcategoryMutation.mutate({
      name: subcategoryName,
      category: selectedParentCategory,
    });
  };

  const openEditCategory = (cat: Category) => {
    setEditCategoryMode(cat);
    setCategoryName(cat.name);
    setCategoryColor(cat.color);
    setCategoryIcon(cat.icon);
    setCategoryStatus(cat.status);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategoryClick = (cat: Category) => {
    setDeleteConfirmCategory(cat);
  };

  const handleExecuteDeleteCategory = () => {
    if (deleteConfirmCategory) {
      deleteCategoryMutation.mutate(deleteConfirmCategory._id);
    }
  };

  const handleDeleteSubcategoryClick = (sub: Subcategory) => {
    setDeleteConfirmSubcategory(sub);
  };

  const handleExecuteDeleteSubcategory = () => {
    if (deleteConfirmSubcategory) {
      deleteSubcategoryMutation.mutate(deleteConfirmSubcategory._id);
    }
  };

  const isSuperAdmin = currentUser && (currentUser.role === 'super_admin' || currentUser.email === 'jenishkpatel2003@gmail.com');

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-200 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <Icons.FolderTree className="text-brand" size={22} />
            <span>Category & Subcategory Architecture</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure system compliance categories, visual color tokens, and nested subcategories.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { resetCategoryForm(); setIsCategoryModalOpen(true); }}
              className="px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-soft transition-all cursor-pointer"
            >
              <Icons.Plus size={15} />
              <span>Add Category</span>
            </button>
            <button
              onClick={() => {
                setSelectedParentCategory(categories[0]?._id || '');
                setSubcategoryError('');
                setIsSubcategoryModalOpen(true);
              }}
              disabled={categories.length === 0}
              className="px-4 py-2.5 bg-muted hover:bg-muted/80 disabled:opacity-50 text-foreground text-xs font-bold rounded-xl border border-border flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <Icons.Plus size={15} />
              <span>Add Subcategory</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Categories Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center space-x-2">
            <Icons.Layers className="text-brand" size={16} />
            <span>Master Categories ({categories.length})</span>
          </h2>
        </div>

        {categoriesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-card border border-border rounded-2xl animate-pulse"></div>
            <div className="h-32 bg-card border border-border rounded-2xl animate-pulse"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-soft">
            <Icons.FolderOpen size={40} className="mx-auto text-muted-foreground/50 mb-2" />
            <h3 className="text-xs font-bold text-foreground">No Categories Configured</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Create your first category to organize certificates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat) => {
              const catSubcategories = subcategories.filter((s) => {
                const cId = typeof s.category === 'object' ? s.category._id : s.category;
                return cId === cat._id;
              });

              return (
                <div
                  key={cat._id}
                  className="bg-card border border-border rounded-2xl p-5 shadow-soft hover:shadow-premium transition-all duration-200 flex flex-col justify-between space-y-4"
                  style={{ borderLeft: `5px solid ${cat.color}` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: cat.color }}
                      >
                        {renderIcon(cat.icon, 20)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-foreground">{cat.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                            cat.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {cat.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-semibold mt-0.5 block">
                          {catSubcategories.length} nested subcategories
                        </span>
                      </div>
                    </div>

                    {isSuperAdmin && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditCategory(cat)}
                          className="p-1.5 rounded-lg bg-brand/10 hover:bg-brand-dark/20 text-brand transition-colors cursor-pointer"
                          title="Edit Category"
                        >
                          <Icons.Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategoryClick(cat)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Icons.Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Nested Subcategories Badges */}
                  <div className="pt-3 border-t border-border/60">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Subcategories:</span>
                    {catSubcategories.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground italic">No subcategories attached.</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {catSubcategories.map((sub) => (
                          <div
                            key={sub._id}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-[11px] font-medium text-foreground group"
                          >
                            <span>{sub.name}</span>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteSubcategoryClick(sub)}
                                className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                                title="Delete Subcategory"
                              >
                                <Icons.X size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
              <h3 className="text-sm font-bold text-foreground flex items-center space-x-2">
                {renderIcon(categoryIcon, 16)}
                <span>{editCategoryMode ? 'Edit Category' : 'Create New Category'}</span>
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none focus:border-brand font-semibold"
                  placeholder="e.g. Quality Audits"
                />
              </div>

              {/* Color Picker Grid */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">Color Badge Token</label>
                <div className="flex flex-wrap gap-2">
                  {preselectedColors.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setCategoryColor(c.hex)}
                      className={`w-7 h-7 rounded-lg transition-transform cursor-pointer ${
                        categoryColor === c.hex ? 'ring-2 ring-brand scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Picker Grid */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">Icon Token</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-muted/20 rounded-xl border border-border">
                  {preselectedIcons.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setCategoryIcon(ic)}
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        categoryIcon === ic
                          ? 'border-brand bg-brand/10 text-brand font-bold'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {renderIcon(ic, 16)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Select */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Status</label>
                <select
                  value={categoryStatus}
                  onChange={(e: any) => setCategoryStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none focus:border-brand font-medium"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs hover:bg-muted font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold"
                >
                  {editCategoryMode ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SUBCATEGORY MODAL */}
      {isSubcategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
              <h3 className="text-sm font-bold text-foreground">Add Subcategory</h3>
              <button onClick={() => setIsSubcategoryModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubcategorySubmit} className="p-6 space-y-4">
              {subcategoryError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-600 flex items-center space-x-2">
                  <Icons.AlertCircle size={16} />
                  <span>{subcategoryError}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Parent Master Category</label>
                <select
                  value={selectedParentCategory}
                  onChange={(e) => setSelectedParentCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none focus:border-brand font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Subcategory Name</label>
                <input
                  type="text"
                  required
                  value={subcategoryName}
                  onChange={(e) => setSubcategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none focus:border-brand font-semibold"
                  placeholder="e.g. FSSAI License"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsSubcategoryModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs hover:bg-muted font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold"
                >
                  Add Subcategory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DELETE CATEGORY POP-UP MODAL */}
      {deleteConfirmCategory && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-red-500/10">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <ShieldAlert size={20} />
                <h3 className="text-sm font-bold">Delete Category Architecture</h3>
              </div>
              <button 
                onClick={() => setDeleteConfirmCategory(null)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete category <strong className="text-foreground font-bold">"{deleteConfirmCategory.name}"</strong>? This will cascade delete ALL nested subcategories!
              </p>

              <div className="p-3 bg-muted rounded-xl text-[11px] font-mono text-muted-foreground border border-border space-y-1">
                <p>• Category Name: {deleteConfirmCategory.name}</p>
                <p>• Action: PERMANENT CASCADE DELETION</p>
              </div>

              <div className="pt-3 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCategory(null)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-muted font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteDeleteCategory}
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

      {/* CONFIRMATION DELETE SUBCATEGORY POP-UP MODAL */}
      {deleteConfirmSubcategory && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-red-500/10">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <AlertTriangle size={20} />
                <h3 className="text-sm font-bold">Delete Subcategory</h3>
              </div>
              <button 
                onClick={() => setDeleteConfirmSubcategory(null)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete subcategory <strong className="text-foreground font-bold">"{deleteConfirmSubcategory.name}"</strong>?
              </p>

              <div className="pt-3 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmSubcategory(null)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-muted font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteDeleteSubcategory}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-soft transition-all"
                >
                  <Trash2 size={14} />
                  <span>Confirm Deletion</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CategoryAdmin;
export { renderIcon };
