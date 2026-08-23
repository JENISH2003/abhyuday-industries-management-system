import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Users, Ban, Check, Shield, Trash2, KeyRound, Search, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import { formatDateTime } from '../utils';
import { RootState } from '../store';
import { User } from '../types';
import { PaginationControls } from '../components/PaginationControls';

export const UsersList: React.FC = () => {
  const queryClient = useQueryClient();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  // Confirmation Modal States
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [statusConfirmUser, setStatusConfirmUser] = useState<{ user: User; targetStatus: 'active' | 'blocked' } | null>(null);

  // Fetch users with search & pagination
  const { data, isLoading } = useQuery({
    queryKey: ['users-admin-list', page, limit, search],
    queryFn: async () => {
      const res = await api.get('/users', {
        params: { page, limit, search }
      });
      return res.data;
    }
  });

  const users: User[] = data?.users || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit, pages: 1 };

  // Mutations
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'blocked' }) => {
      return api.put(`/users/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-admin-list'] });
      setStatusConfirmUser(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update user status.');
      setStatusConfirmUser(null);
    }
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      return api.put(`/users/${id}/role`, { role });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users-admin-list'] });
      alert(res.data?.message || 'User role updated successfully.');
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ['users-admin-list'] });
      alert(err.response?.data?.message || 'Failed to update user role.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-admin-list'] });
      setDeleteConfirmUser(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete user.');
      setDeleteConfirmUser(null);
    }
  });

  const handleStatusClick = (u: User) => {
    if (u.role === 'super_admin') {
      alert('Action denied: Cannot modify Super Admin status.');
      return;
    }
    const targetStatus = u.status === 'active' ? 'blocked' : 'active';
    setStatusConfirmUser({ user: u, targetStatus });
  };

  const handleExecuteStatusChange = () => {
    if (statusConfirmUser) {
      const userId = statusConfirmUser.user.id || statusConfirmUser.user._id;
      if (!userId) {
        alert('Error: Could not identify user ID.');
        return;
      }
      statusMutation.mutate({ id: userId, status: statusConfirmUser.targetStatus });
    }
  };

  const handleRoleChange = (id: string, targetRole: string, currentRole: string) => {
    const currentUserId = currentUser?.id || currentUser?._id;
    if (id === currentUserId && targetRole !== 'super_admin') {
      alert('Action denied: You cannot demote your own Super Admin account.');
      return;
    }
    if (targetRole === 'super_admin') {
      alert('Action denied: System lock active. There can only be 1 primary Super Admin account.');
      return;
    }
    roleMutation.mutate({ id, role: targetRole });
  };

  const handleDeleteClick = (u: User) => {
    if (u.role === 'super_admin') {
      alert('Action denied: Cannot delete Super Admin account.');
      return;
    }
    setDeleteConfirmUser(u);
  };

  const handleExecuteDeleteUser = () => {
    if (deleteConfirmUser) {
      const userId = deleteConfirmUser.id || deleteConfirmUser._id;
      if (!userId) {
        alert('Error: Could not identify user ID.');
        return;
      }
      deleteMutation.mutate(userId);
    }
  };

  const isSuperAdmin = currentUser && (currentUser.role === 'super_admin' || currentUser.email === 'jenishkpatel2003@gmail.com');
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.email === 'jenishkpatel2003@gmail.com');

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <Users className="text-brand" size={22} />
            <span>User Account Directory</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage registered operator accounts, access clearance roles, and suspension states.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-soft">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-xs bg-background/50 focus:bg-background outline-none transition-all focus:ring-2 focus:ring-brand/25 focus:border-brand"
          />
        </div>
      </div>

      {/* Main Users Table */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-2xl p-16 animate-pulse space-y-4">
          <div className="h-4 bg-muted w-1/4 rounded"></div>
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center shadow-soft">
          <Users size={48} className="mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Users Found</h3>
          <p className="text-xs text-muted-foreground mt-1">Try expanding your search query.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/30 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role / Clearance</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Last Active</th>
                  {isAdmin && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-medium">
                {users.map((u) => {
                  const uId = u.id || u._id || '';
                  const currentUserId = currentUser?.id || currentUser?._id;
                  const isCurrentSuperUser = uId === currentUserId;

                  return (
                  <tr key={uId} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-semibold text-foreground whitespace-nowrap">
                      {u.name}
                    </td>
                    <td className="p-4 text-muted-foreground whitespace-nowrap">{u.email}</td>
                    <td className="p-4 whitespace-nowrap">
                      {isSuperAdmin && u.role !== 'super_admin' && !isCurrentSuperUser ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(uId, e.target.value, u.role)}
                          className="px-2.5 py-1 rounded-lg border border-border text-xs bg-card outline-none font-bold cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="user">Operator</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          u.role === 'super_admin'
                            ? 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20'
                            : u.role === 'admin'
                            ? 'bg-brand/10 text-brand dark:text-brand-light border-brand/20'
                            : u.role === 'manager'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}>
                          {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : u.role === 'manager' ? 'Manager' : 'Operator'}
                        </span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {u.status === 'active' ? <Check size={11} /> : <Ban size={11} />}
                        <span>{u.status}</span>
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground whitespace-nowrap">{formatDateTime(u.lastLogin)}</td>
                    {isAdmin && (
                      <td className="p-4 text-right">
                        {u.role !== 'super_admin' ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleStatusClick(u)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                u.status === 'active' 
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500' 
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500'
                              }`}
                              title={u.status === 'active' ? 'Suspend Account' : 'Reinstate Account'}
                            >
                              <Ban size={14} />
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteClick(u)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors cursor-pointer"
                                title="Delete Account"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-semibold flex items-center justify-end space-x-1">
                            <KeyRound size={12} className="text-brand" />
                            <span>System Lock</span>
                          </span>
                        )}
                      </td>
                    )}
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
              itemLabel="users"
            />
          </div>
        </div>
      )}

      {/* CONFIRMATION DELETE USER POP-UP MODAL */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-red-500/10">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <ShieldAlert size={20} />
                <h3 className="text-sm font-bold">Delete User Account</h3>
              </div>
              <button 
                onClick={() => setDeleteConfirmUser(null)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to permanently delete user account <strong className="text-foreground font-bold">"{deleteConfirmUser.name}"</strong> ({deleteConfirmUser.email}) from the system database?
              </p>

              <div className="p-3 bg-muted rounded-xl text-[11px] font-mono text-muted-foreground border border-border space-y-1">
                <p>• Account: {deleteConfirmUser.name}</p>
                <p>• Email: {deleteConfirmUser.email}</p>
                <p>• Role: {deleteConfirmUser.role.toUpperCase()}</p>
                <p>• Action: PERMANENT DATABASE DELETION</p>
              </div>

              <div className="pt-3 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmUser(null)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-muted font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteDeleteUser}
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

      {/* CONFIRMATION STATUS CHANGE POP-UP MODAL */}
      {statusConfirmUser && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-amber-500/10">
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={20} />
                <h3 className="text-sm font-bold">
                  {statusConfirmUser.targetStatus === 'blocked' ? 'Suspend Account' : 'Reinstate Account'}
                </h3>
              </div>
              <button 
                onClick={() => setStatusConfirmUser(null)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to <strong className="text-foreground font-bold">{statusConfirmUser.targetStatus === 'blocked' ? 'suspend' : 'reinstate'}</strong> access for account <strong className="text-foreground font-bold">"{statusConfirmUser.user.name}"</strong>?
              </p>

              <div className="pt-3 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setStatusConfirmUser(null)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-muted font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteStatusChange}
                  className="px-5 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-soft transition-all"
                >
                  <span>Confirm Status Update</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default UsersList;
