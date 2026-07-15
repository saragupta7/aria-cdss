import { HeaderClock } from "./HeaderClock";
import { useState, useEffect } from "react";
import { Users, UserPlus, Shield, Activity, ShieldAlert, Loader2, KeyRound } from "lucide-react";
import { authApi } from "../../api/auth";

interface Staff {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'senior' });
  const [creating, setCreating] = useState(false);

  const [resetTarget, setResetTarget] = useState<Staff | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const users = await authApi.getUsers();
      setStaff(users);
    } catch (err) {
      setError("Failed to fetch staff data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await authApi.register(formData);
      setShowModal(false);
      setFormData({ name: '', email: '', password: '', role: 'senior' });
      fetchStaff();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    try {
      await authApi.adminResetPassword(resetTarget._id, tempPassword);
      setNotice(`Temporary password set for ${resetTarget.email}. Share it with them securely — they can change it from the login page.`);
      setResetTarget(null);
      setTempPassword('');
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="p-8 max-w-[1200px] mx-auto min-h-screen bg-slate-50/50">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-slate-500 font-medium mt-1">Manage clinical and administrative access</p>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#0f172a] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <UserPlus className="w-5 h-5" />
            Add Clinician
          </button>
          <HeaderClock />
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium border border-red-100">{error}</div>}
      {notice && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl mb-6 font-medium border border-emerald-100">{notice}</div>}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((user) => (
              <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500 font-medium">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                    user.role === 'admin' ? 'bg-slate-900 text-white' :
                    user.role === 'senior' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {user.role === 'admin' ? <ShieldAlert className="w-3.5 h-3.5" /> : 
                     user.role === 'senior' ? <Shield className="w-3.5 h-3.5" /> : 
                     <Activity className="w-3.5 h-3.5" />}
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Active
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => { setNotice(''); setTempPassword(''); setResetTarget(user); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <KeyRound className="w-4 h-4" />
                    Reset password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Reset password</h2>
            <p className="text-slate-500 font-medium mb-6">
              Set a temporary password for <span className="font-bold text-slate-700">{resetTarget.name}</span> ({resetTarget.email}).
              They can change it themselves from the login page.
            </p>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Temporary Password</label>
                <input required minLength={6} type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} placeholder="At least 6 characters" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setResetTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={resetting} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {resetting ? 'Resetting...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Add New Clinician</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Password (Temporary)</label>
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700">
                  <option value="senior">Senior Clinician</option>
                  <option value="junior">Junior Clinician</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Clinician'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
