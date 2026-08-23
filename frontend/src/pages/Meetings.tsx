import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Trash2, 
  X, 
  Loader2, 
  AlertCircle,
  Users,
  Video,
  FolderOpen
} from 'lucide-react';
import api from '../services/api';
import { formatDate } from '../utils';
import { RootState } from '../store';
import { Meeting, User, Category, Subcategory } from '../types';
import { renderIcon } from './CategoryAdmin';
import { PaginationControls } from '../components/PaginationControls';

export const Meetings: React.FC = () => {
  const queryClient = useQueryClient();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: 'Zoom Meeting',
    description: '',
    category: '',
    subcategory: '',
    sendEmail: true,
  });

  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

  // Fetch Meetings
  const { data: meetingsData, isLoading: meetingsLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const res = await api.get('/meetings');
      return res.data;
    }
  });

  // Fetch Users (for attendees dropdown)
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
    enabled: isModalOpen
  });

  // Fetch Categories (active only)
  const { data: categoriesData } = useQuery({
    queryKey: ['active-categories'],
    queryFn: async () => {
      const res = await api.get('/categories?status=active');
      return res.data;
    },
    enabled: isModalOpen
  });

  // Fetch Subcategories (active only)
  const { data: subcategoriesData } = useQuery({
    queryKey: ['active-subcategories'],
    queryFn: async () => {
      const res = await api.get('/subcategories?status=active');
      return res.data;
    },
    enabled: isModalOpen
  });

  const meetings: Meeting[] = meetingsData?.meetings || [];
  const users: User[] = usersData?.users || [];
  const categoriesList: Category[] = categoriesData?.categories || [];
  const subcategoriesList: Subcategory[] = subcategoriesData?.subcategories || [];

  // Find and pre-select the 'Meetings' category ID when modal opens
  useEffect(() => {
    if (isModalOpen && categoriesList.length > 0) {
      const meetingCat = categoriesList.find(c => c.name.toLowerCase() === 'meetings');
      if (meetingCat) {
        setFormData(prev => ({ ...prev, category: meetingCat._id }));
      } else {
        setFormData(prev => ({ ...prev, category: categoriesList[0]?._id || '' }));
      }
    }
  }, [isModalOpen, categoriesData]);

  // Filter subcategories for form select
  const formFilteredSubcategories = subcategoriesList.filter(
    (sub) => {
      const catId = typeof sub.category === 'object' ? sub.category._id : sub.category;
      return catId === formData.category;
    }
  );

  // Auto select first subcategory of chosen category
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

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/meetings', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to schedule meeting');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/meetings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      time: '',
      location: 'Zoom Meeting',
      description: '',
      category: '',
      subcategory: '',
      sendEmail: true,
    });
    setSelectedAttendees([]);
    setFormError('');
    setFormLoading(false);
  };

  const handleAttendeeToggle = (userId: string) => {
    setSelectedAttendees(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.time || !formData.location || !formData.category || !formData.subcategory) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setFormLoading(true);
    createMutation.mutate({
      ...formData,
      attendees: selectedAttendees,
    }, {
      onSettled: () => setFormLoading(false)
    });
  };

  const [deleteConfirmMeeting, setDeleteConfirmMeeting] = useState<Meeting | null>(null);

  const handleDelete = (meeting: Meeting) => {
    setDeleteConfirmMeeting(meeting);
  };

  const handleExecuteDeleteMeeting = () => {
    if (deleteConfirmMeeting) {
      deleteMutation.mutate(deleteConfirmMeeting._id);
      setDeleteConfirmMeeting(null);
    }
  };

  const canModify = currentUser && ['super_admin', 'admin', 'manager'].includes(currentUser.role);
  const canDelete = currentUser && ['super_admin', 'admin'].includes(currentUser.role);

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Compliance Discussions</h1>
          <p className="text-xs text-muted-foreground">Schedule and manage compliance discussions and audits</p>
        </div>

        {canModify && (
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-brand hover:bg-brand-dark text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 shadow-soft active:scale-[0.99] cursor-pointer"
          >
            <Plus size={14} />
            <span>Schedule Meeting</span>
          </button>
        )}
      </div>

      {/* Meetings Grid */}
      {meetingsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-card border border-border rounded-lg p-6 shadow-soft animate-pulse" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-16 text-center shadow-soft">
          <Calendar size={48} className="mx-auto text-muted-foreground/60 mb-4" />
          <h3 className="text-sm font-bold text-foreground">No Meetings Scheduled</h3>
          <p className="text-xs text-muted-foreground mt-1">Setup compliance syncs to review upcoming audits.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetings.slice((page - 1) * limit, page * limit).map((meeting) => {
              const catColor = meeting.category?.color || '#6366F1';
              const isInactiveCat = meeting.category?.status === 'inactive';
              
              return (
                <div 
                  key={meeting._id}
                  style={{ borderTop: `4px solid ${isInactiveCat ? '#9CA3AF' : catColor}` }}
                  className="bg-card border border-border rounded-lg p-5 shadow-soft hover:shadow-premium transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span 
                        style={{ color: isInactiveCat ? '#6B7280' : catColor, backgroundColor: isInactiveCat ? '#F3F4F6' : `${catColor}10` }}
                        className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border border-border/40 max-w-[150px] truncate"
                      >
                        {renderIcon(meeting.category?.icon || 'Calendar', 10)}
                        <span className="truncate">{meeting.category?.name || 'Meeting'}</span>
                      </span>

                      {canDelete && (
                        <button
                          onClick={() => handleDelete(meeting)}
                          className="p-1.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Cancel Meeting"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-1">{meeting.title}</h4>
                      <div className="flex items-center space-x-1.5 mt-0.5 text-[9px] text-muted-foreground font-semibold">
                        <span className="bg-muted px-1.5 py-0.5 rounded">{meeting.subcategory?.name || 'General Sync'}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                        {meeting.description || 'No description provided'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border flex flex-col space-y-2 text-[10px] text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Clock size={12} className="text-brand" />
                        <span>{formatDate(meeting.date)} &bull; {meeting.time}{meeting.duration ? ` (${meeting.duration})` : ''}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin size={12} className="text-brand" />
                        <span className="font-semibold text-foreground truncate">{meeting.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users size={12} className="text-brand" />
                        <span>{meeting.attendees?.length || 0} Invited Attendees</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>Organized by:</span>
                    <strong className="text-foreground">{meeting.createdBy?.name || 'System'}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          <PaginationControls
            currentPage={page}
            totalPages={Math.ceil(meetings.length / limit) || 1}
            totalRecords={meetings.length}
            limit={limit}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
            pageSizeOptions={[10, 25, 50, 100]}
            itemLabel="scheduled meetings"
          />
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-premium w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10">
              <h3 className="text-sm font-bold text-foreground">Schedule Compliance Discussion</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-600 flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Meeting Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none focus:border-brand"
                    placeholder="e.g. GMP Compliance Audit Review"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Category</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Category --</option>
                    {categoriesList.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Subcategory</label>
                  <select
                    required
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    disabled={!formData.category}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">-- Choose Subcategory --</option>
                    {formFilteredSubcategories.map((sub) => (
                      <option key={sub._id} value={sub._id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Location or Link</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                      <Video size={13} />
                    </span>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none focus:border-brand"
                      placeholder="e.g. Zoom Meeting or Conference Room A"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none"
                  />
                </div>
              </div>

              {/* Select Attendees */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Invite Attendees</label>
                <div className="border border-border rounded-lg p-3 bg-background/30 max-h-32 overflow-y-auto space-y-2 pr-1">
                  {users.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center">No other operators available.</p>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="flex items-center">
                        <input
                          id={`user-${user.id}`}
                          type="checkbox"
                          checked={selectedAttendees.includes(user.id)}
                          onChange={() => handleAttendeeToggle(user.id)}
                          className="w-3.5 h-3.5 border-border rounded text-brand accent-brand cursor-pointer"
                        />
                        <label htmlFor={`user-${user.id}`} className="ml-2 text-xs text-foreground cursor-pointer select-none">
                          {user.name} <span className="text-[9px] text-muted-foreground">({user.email} &bull; {user.role})</span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background/50 outline-none h-16 resize-none"
                  placeholder="e.g. Scope audit reviews, discuss upcoming renewal policies."
                />
              </div>

              {/* Send Notification Checkbox */}
              <div className="flex items-center">
                <input
                  id="sendEmail"
                  type="checkbox"
                  checked={formData.sendEmail}
                  onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                  className="w-4 h-4 text-brand border-border focus:ring-brand rounded accent-brand cursor-pointer"
                />
                <label htmlFor="sendEmail" className="ml-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                  Automatically dispatch email invitations to attendees
                </label>
              </div>

              <div className="pt-4 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs hover:bg-muted font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-brand hover:bg-brand-dark disabled:bg-brand/60 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  {formLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                  <span>Schedule Sync</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DELETE MEETING POP-UP MODAL */}
      {deleteConfirmMeeting && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-red-500/10">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <AlertCircle size={20} />
                <h3 className="text-sm font-bold">Cancel Meeting Sync</h3>
              </div>
              <button 
                onClick={() => setDeleteConfirmMeeting(null)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to permanently cancel and delete meeting <strong className="text-foreground font-bold">"{deleteConfirmMeeting.title}"</strong> scheduled for <strong className="text-foreground font-bold">{formatDate(deleteConfirmMeeting.date)}</strong>?
              </p>

              <div className="p-3 bg-muted rounded-xl text-[11px] font-mono text-muted-foreground border border-border space-y-1">
                <p>• Meeting Title: {deleteConfirmMeeting.title}</p>
                <p>• Date & Time: {formatDate(deleteConfirmMeeting.date)} ({deleteConfirmMeeting.time})</p>
                <p>• Action: PERMANENT DATABASE DELETION</p>
              </div>

              <div className="pt-3 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmMeeting(null)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-muted font-bold cursor-pointer transition-colors"
                >
                  Keep Meeting
                </button>

                <button
                  type="button"
                  onClick={handleExecuteDeleteMeeting}
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
export default Meetings;
