import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  History, 
  X, 
  Loader2, 
  Sparkles,
  Zap
} from 'lucide-react';
import { api } from '../services/api';

interface ExecutionLog {
  triggeredAt: string;
  slot: string;
  status: string;
  details?: string;
}

interface PersonalReminderItem {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  preferredTime: string;
  status: 'active' | 'completed' | 'paused';
  notifyEmail: boolean;
  notifySystem: boolean;
  lastTriggeredAt?: string;
  executionHistory: ExecutionLog[];
  createdAt: string;
}

export const PersonalReminders: React.FC = () => {
  const [reminders, setReminders] = useState<PersonalReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<PersonalReminderItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [toastAlert, setToastAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToastAlert({ message, type });
    setTimeout(() => {
      setToastAlert(null);
    }, 4000);
  };

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    preferredTime: '09:00 AM, 02:00 PM',
    notifyEmail: true,
    notifySystem: true,
  });

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/personal-reminders');
      if (res.data?.success) {
        setReminders(res.data.reminders || []);
      }
    } catch (err: any) {
      showNotification('Failed to fetch personal reminders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleOpenCreateModal = () => {
    setFormData({
      id: '',
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      preferredTime: '09:00 AM, 02:00 PM',
      notifyEmail: true,
      notifySystem: true,
    });
    setSelectedReminder(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: PersonalReminderItem) => {
    setSelectedReminder(item);
    setFormData({
      id: item._id,
      title: item.title,
      description: item.description || '',
      startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
      endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
      preferredTime: item.preferredTime || '09:00 AM, 02:00 PM',
      notifyEmail: item.notifyEmail,
      notifySystem: item.notifySystem,
    });
    setModalOpen(true);
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showNotification('Please provide a reminder title', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (formData.id) {
        // Edit
        await api.put(`/personal-reminders/${formData.id}`, formData);
        showNotification('Reminder updated successfully', 'success');
      } else {
        // Create
        await api.post('/personal-reminders', formData);
        showNotification('Personal reminder created successfully!', 'success');
      }
      setModalOpen(false);
      fetchReminders();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save reminder';
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await api.patch(`/personal-reminders/${id}/status`);
      showNotification(res.data.message || 'Status updated', 'success');
      fetchReminders();
    } catch (err) {
      showNotification('Failed to toggle status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this personal reminder?')) return;
    try {
      await api.delete(`/personal-reminders/${id}`);
      showNotification('Reminder deleted', 'success');
      fetchReminders();
    } catch (err) {
      showNotification('Failed to delete reminder', 'error');
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      setTriggeringId(id);
      const res = await api.post(`/personal-reminders/${id}/trigger`);
      showNotification(res.data.message || 'Triggered successfully!', 'success');
      fetchReminders();
    } catch (err: any) {
      showNotification('Failed to trigger reminder', 'error');
    } finally {
      setTriggeringId(null);
    }
  };

  const openHistory = (item: PersonalReminderItem) => {
    setSelectedReminder(item);
    setHistoryModalOpen(true);
  };

  const activeCount = reminders.filter((r) => r.status === 'active').length;
  const completedCount = reminders.filter((r) => r.status === 'completed').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {toastAlert && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-md transition-all ${
            toastAlert.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
              : 'bg-red-500/10 border border-red-500/20 text-red-600'
          }`}
        >
          <span className="flex items-center gap-2">
            {toastAlert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toastAlert.message}</span>
          </span>
          <button onClick={() => setToastAlert(null)} className="p-1 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-brand font-semibold text-xs tracking-wider uppercase mb-1">
            <Sparkles size={16} />
            <span>Automated Task Scheduling</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Personal Reminders</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Set custom reminders with start/end dates. Checked automatically <strong className="text-foreground">2 times daily at 9:00 AM & 2:00 PM</strong>.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold text-xs px-5 py-3 rounded-xl shadow-md transition-all active:scale-95"
        >
          <Plus size={16} />
          <span>New Personal Reminder</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between shadow-soft">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Reminders</p>
            <h3 className="text-2xl font-extrabold text-brand mt-1">{activeCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
            <Bell size={20} />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between shadow-soft">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Automated Cron Schedule</p>
            <h3 className="text-sm font-bold text-foreground mt-1.5 flex items-center gap-1.5">
              <Clock size={15} className="text-emerald-500" />
              <span>9:00 AM & 2:00 PM</span>
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Zap size={20} />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between shadow-soft">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Completed Reminders</p>
            <h3 className="text-2xl font-extrabold text-foreground mt-1">{completedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Reminders List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 size={32} className="animate-spin text-brand mb-3" />
          <p className="text-xs font-medium">Loading personal reminders...</p>
        </div>
      ) : reminders.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-4">
            <Bell size={28} />
          </div>
          <h3 className="text-md font-bold text-foreground">No Personal Reminders Created</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            You haven't set up any personal reminders yet. Click the button below to add your first reminder.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-5 inline-flex items-center gap-2 bg-brand text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-soft"
          >
            <Plus size={15} />
            <span>Create First Reminder</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reminders.map((item) => {
            const isActive = item.status === 'active';
            const isCompleted = item.status === 'completed';

            return (
              <div
                key={item._id}
                className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                <div>
                  {/* Card Badge Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : isCompleted
                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}
                    >
                      {item.status}
                    </span>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Mail size={13} className={item.notifyEmail ? 'text-emerald-500' : 'opacity-40'} />
                      <Zap size={13} className={item.notifySystem ? 'text-amber-500' : 'opacity-40'} />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-foreground group-hover:text-brand transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Date Range Info */}
                  <div className="mt-4 p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs text-foreground">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-brand" /> Start:
                      </span>
                      <strong className="text-foreground">{new Date(item.startDate).toLocaleDateString()}</strong>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-brand" /> End:
                      </span>
                      <strong className="text-foreground">{new Date(item.endDate).toLocaleDateString()}</strong>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-emerald-500" /> Runs:
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">9:00 AM & 2:00 PM</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(item._id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isActive
                          ? 'text-amber-600 hover:bg-amber-500/10'
                          : 'text-emerald-600 hover:bg-emerald-500/10'
                      }`}
                      title={isActive ? 'Pause Reminder' : 'Activate Reminder'}
                    >
                      {isActive ? <Pause size={16} /> : <Play size={16} />}
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      title="Edit Reminder"
                    >
                      <Edit3 size={16} />
                    </button>

                    <button
                      onClick={() => openHistory(item)}
                      className="p-2 text-muted-foreground hover:text-brand hover:bg-brand/10 rounded-lg transition-colors relative"
                      title="View Trigger History"
                    >
                      <History size={16} />
                      {item.executionHistory?.length > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Reminder"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleRunNow(item._id)}
                    disabled={triggeringId === item._id}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-[11px] px-3 py-1.5 rounded-lg transition-all"
                  >
                    {triggeringId === item._id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Play size={12} fill="currentColor" />
                    )}
                    <span>Run Now</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-xl animate-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold text-foreground">
              {formData.id ? 'Edit Personal Reminder' : 'Create Personal Reminder'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set start & end dates. System will check 2 times daily at 9:00 AM and 2:00 PM.
            </p>

            <form onSubmit={handleSaveReminder} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Monthly Compliance Review Meeting"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Message / Details (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide message details to include in the email notification..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-brand resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <Clock size={14} /> Cron Checking Schedule:
                </span>
                <span className="font-bold">2 Times Daily (9:00 AM & 2:00 PM)</span>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.notifyEmail}
                    onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-brand accent-brand cursor-pointer"
                  />
                  <span>Send Email Alerts</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.notifySystem}
                    onChange={(e) => setFormData({ ...formData, notifySystem: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-brand accent-brand cursor-pointer"
                  />
                  <span>Record Audit Activity Logs</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-soft transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{formData.id ? 'Save Changes' : 'Create Reminder'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Drawer Modal */}
      {historyModalOpen && selectedReminder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-xl relative">
            <button
              onClick={() => setHistoryModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <History size={18} className="text-brand" />
              <span>Execution Logs: {selectedReminder.title}</span>
            </h3>

            <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {!selectedReminder.executionHistory || selectedReminder.executionHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No automated triggers recorded yet for this reminder.
                </p>
              ) : (
                selectedReminder.executionHistory
                  .slice()
                  .reverse()
                  .map((log, idx) => (
                    <div key={idx} className="p-3 bg-muted/40 rounded-xl text-xs flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-foreground">{log.slot}</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(log.triggeredAt).toLocaleString()}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          log.status === 'sent'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalReminders;
