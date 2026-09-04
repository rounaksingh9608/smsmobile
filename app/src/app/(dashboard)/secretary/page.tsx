'use client';

import { useState, useEffect } from 'react';
import { logout } from '@/app/actions/auth';
import { showToast } from '@/app/components/Toast';
import { getComplaints, broadcastNotice, getExpectedVisitors, getUsers, createUser, deleteUser, updateComplaintStatus } from '@/app/actions/secretary';

export default function SecretaryDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [complaints, setComplaints] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Modals state
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('Resident');
  const [newUserApartment, setNewUserApartment] = useState('');
  const [newUserTower, setNewUserTower] = useState('');
  
  const [isComplaintDetailsOpen, setIsComplaintDetailsOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const complaintData = await getComplaints();
    setComplaints(complaintData);
    
    const visitorData = await getExpectedVisitors();
    setVisitors(visitorData);

    const userData = await getUsers();
    setUsers(userData);
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle || !noticeContent) return;
    
    showToast('Broadcasting notice...', 'info');
    await broadcastNotice(noticeTitle, noticeContent);
    showToast('Notice broadcasted to all residents!', 'success');
    
    setNoticeTitle('');
    setNoticeContent('');
    setIsBroadcastOpen(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName) return;
    
    showToast('Creating user...', 'info');
    await createUser(
      newUserName, 
      newUserRole, 
      newUserRole === 'Resident' ? newUserApartment : undefined, 
      newUserRole === 'Resident' ? newUserTower : undefined
    );
    showToast('User created successfully!', 'success');
    
    setNewUserName('');
    setNewUserApartment('');
    setNewUserTower('');
    loadData();
  };

  const handleDeleteUser = async (id: string) => {
    showToast('Deleting user...', 'info');
    await deleteUser(id);
    showToast('User deleted.', 'success');
    loadData();
  };

  const handleResolveComplaint = async (id: string) => {
    showToast('Resolving complaint...', 'info');
    await updateComplaintStatus(id, 'RESOLVED');
    showToast('Complaint resolved!', 'success');
    loadData();
  };

  const handleCycleStatus = async (id: string, currentStatus: string) => {
    let newStatus = 'OPEN';
    if (currentStatus === 'OPEN') newStatus = 'IN_PROGRESS';
    else if (currentStatus === 'IN_PROGRESS') newStatus = 'RESOLVED';
    
    showToast(`Status updated to ${newStatus.replace('_', ' ')}`, 'info');
    await updateComplaintStatus(id, newStatus);
    loadData();
  };

  return (
    <div className="bg-surface-subtle text-on-surface font-body-md antialiased min-h-screen pb-24">
      {/* TopAppBar */}
      <header className="bg-surface shadow-sm w-full top-0 sticky z-40 flex justify-between items-center px-container-margin-mobile py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center font-bold text-on-secondary-container shadow-sm">
            SC
          </div>
          <div className="font-headline-md text-headline-md font-bold text-primary">Secretary Hub</div>
        </div>
        
        <div className="flex items-center gap-2">
          <form action={logout}>
            <button type="submit" className="p-2 text-status-danger hover:bg-status-danger/10 rounded-full transition-colors flex items-center justify-center" title="Logout">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-container-margin-mobile py-stack-md flex flex-col gap-stack-lg max-w-md mx-auto">
        
        {/* --- HOME TAB --- */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-stack-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Actions Grid */}
            <section className="grid grid-cols-2 gap-stack-sm">
              <button 
                onClick={() => setIsManageUsersOpen(true)}
                className="bg-surface rounded-xl p-stack-sm shadow-sm border border-border-low flex flex-col items-center justify-center h-28 active:scale-95 transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-secondary-container text-primary flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[20px]">groups</span>
                </div>
                <span className="font-headline-md text-body-md font-semibold">Manage Users</span>
              </button>
              
              <button 
                onClick={() => setIsBroadcastOpen(true)}
                className="bg-surface rounded-xl p-stack-sm shadow-sm border border-border-low flex flex-col items-center justify-center h-28 active:scale-95 transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-secondary-container text-primary flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[20px]">campaign</span>
                </div>
                <span className="font-headline-md text-body-md font-semibold text-center">Broadcast<br/>Notice</span>
              </button>
            </section>

            {/* Complaints (Action Required) */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-headline-md text-headline-md text-on-surface">Active Complaints ({complaints.filter(c => c.status === 'OPEN').length})</h2>
                <button onClick={loadData} className="text-primary font-body-sm font-bold active:opacity-50">Refresh</button>
              </div>
              
              <div className="space-y-3">
                {complaints.filter(c => c.status === 'OPEN').length === 0 ? (
                  <div className="p-8 text-center text-on-surface-variant bg-surface rounded-xl shadow-sm border border-border-low">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">task_alt</span>
                    <p>No active complaints!</p>
                  </div>
                ) : complaints.filter(c => c.status === 'OPEN').map((complaint) => (
                  <div key={complaint.id} className="bg-surface rounded-xl p-4 shadow-sm border border-border-low flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
                        <span className="material-symbols-outlined">support_agent</span>
                      </div>
                      <div>
                        <h3 className="font-headline-md text-body-md font-bold">{complaint.title}</h3>
                        <p className="font-body-sm text-xs text-on-surface-variant">{complaint.author}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleResolveComplaint(complaint.id)}
                      className="bg-primary/10 text-primary font-label-caps text-[10px] px-3 py-2 rounded-full font-bold active:scale-95 transition-transform"
                    >
                      RESOLVE
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Expected Visitors */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-headline-md text-headline-md text-on-surface">Expected Visitors ({visitors.length})</h2>
              </div>
              
              <div className="space-y-3">
                {visitors.length === 0 ? (
                  <div className="p-8 text-center text-on-surface-variant bg-surface rounded-xl shadow-sm border border-border-low">
                    <p>No expected visitors today.</p>
                  </div>
                ) : visitors.map((visitor) => (
                  <div key={visitor.id} className="bg-surface rounded-xl p-4 shadow-sm border border-border-low flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary-container text-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                      <div>
                        <h3 className="font-headline-md text-body-md font-bold">{visitor.name}</h3>
                        <p className="font-body-sm text-xs text-on-surface-variant">To: {visitor.destination} • Guests: {visitor.guestCount}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-status-info bg-status-info/10 px-2 py-1 rounded-full uppercase">Expected</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* --- FINANCES TAB --- */}
        {activeTab === 'finances' && (
          <div className="flex flex-col gap-stack-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Financial Overview</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary text-on-primary rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                <span className="material-symbols-outlined mb-2 opacity-80">account_balance_wallet</span>
                <p className="font-label-caps text-xs opacity-90">TOTAL BALANCE</p>
                <p className="font-headline-lg font-bold mt-1">$45,230</p>
              </div>
              <div className="bg-surface border border-border-low rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                <span className="material-symbols-outlined mb-2 text-status-warning">pending_actions</span>
                <p className="font-label-caps text-xs text-on-surface-variant">PENDING DUES</p>
                <p className="font-headline-lg font-bold text-on-surface mt-1">$3,150</p>
              </div>
            </div>

            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-headline-md text-headline-md text-on-surface">Recent Transactions</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-surface rounded-xl p-4 shadow-sm border border-border-low flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-status-success/10 text-status-success flex items-center justify-center">
                      <span className="material-symbols-outlined">arrow_downward</span>
                    </div>
                    <div>
                      <h4 className="font-headline-md text-body-md font-bold">Maintenance Fee</h4>
                      <p className="font-body-sm text-xs text-on-surface-variant">Unit 402 • Today</p>
                    </div>
                  </div>
                  <span className="font-bold text-status-success">+$150</span>
                </div>
                
                <div className="bg-surface rounded-xl p-4 shadow-sm border border-border-low flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center">
                      <span className="material-symbols-outlined">arrow_upward</span>
                    </div>
                    <div>
                      <h4 className="font-headline-md text-body-md font-bold">Plumbing Repair</h4>
                      <p className="font-body-sm text-xs text-on-surface-variant">Vendor Payout • Yesterday</p>
                    </div>
                  </div>
                  <span className="font-bold text-on-surface">-$420</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* --- REQUESTS TAB --- */}
        {activeTab === 'requests' && (
          <div className="flex flex-col gap-stack-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">All Requests & Complaints</h2>
            
            <div className="space-y-3">
              {complaints.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant bg-surface rounded-xl shadow-sm border border-border-low">
                  <p>No requests found.</p>
                </div>
              ) : complaints.map((complaint) => (
                <div key={complaint.id} className="bg-surface rounded-xl p-4 shadow-sm border border-border-low flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center">
                        <span className="material-symbols-outlined">assignment</span>
                      </div>
                      <div>
                        <h3 className="font-headline-md text-body-md font-bold">{complaint.title}</h3>
                        <p className="font-body-sm text-xs text-on-surface-variant">From: {complaint.author}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                      complaint.status === 'OPEN' ? 'bg-status-danger/10 text-status-danger' :
                      complaint.status === 'IN_PROGRESS' ? 'bg-status-warning/10 text-status-warning' :
                      'bg-status-success/10 text-status-success'
                    }`}>
                      {complaint.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={() => handleCycleStatus(complaint.id, complaint.status)}
                      className="flex-1 bg-primary/10 text-primary font-label-caps text-[10px] py-2 rounded-lg font-bold active:scale-95 transition-transform"
                    >
                      UPDATE STATUS
                    </button>
                    <button 
                      onClick={() => { setSelectedComplaint(complaint); setIsComplaintDetailsOpen(true); }}
                      className="flex-1 bg-surface-container text-on-surface-variant font-label-caps text-[10px] py-2 rounded-lg font-bold active:scale-95 transition-transform"
                    >
                      VIEW DETAILS
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="bg-surface rounded-2xl shadow-sm border border-border-low overflow-hidden mb-4">
                <div className="bg-secondary-container h-24"></div>
                <div className="px-6 pb-6 relative">
                  <div className="w-20 h-20 rounded-full bg-surface border-4 border-surface shadow-md absolute -top-10 flex items-center justify-center text-4xl">
                     👩‍💼
                  </div>
                  <div className="pt-12">
                    <h2 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface">Sarah Connor</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Secretary • Metropolis Tower</p>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-border-low pb-3">
                        <span className="material-symbols-outlined text-secondary">email</span>
                        <div>
                          <p className="font-label-caps text-xs text-on-surface-variant">CONTACT</p>
                          <p className="font-body-md text-on-surface font-semibold">secretary@metropolis.com</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-secondary">shield</span>
                        <div>
                          <p className="font-label-caps text-xs text-on-surface-variant">ACCESS LEVEL</p>
                          <p className="font-body-md text-on-surface font-semibold">Administrative</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>

             <button onClick={() => setIsAccountModalOpen(true)} className="w-full bg-surface rounded-xl p-4 shadow-sm border border-border-low flex items-center justify-between active:scale-95 transition-transform">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">settings</span>
                  <span className="font-headline-md font-semibold text-on-surface">Account Settings</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
             </button>
          </div>
        )}
      </main>

      {/* Broadcast Modal */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <h2 className="font-headline-md text-headline-md font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">campaign</span> Broadcast Notice
              </h2>
              <button onClick={() => setIsBroadcastOpen(false)} className="active:scale-95 hover:bg-white/10 rounded-full p-1 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleBroadcastSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Notice Title</label>
                  <input 
                    type="text"
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    className="w-full bg-surface-subtle border border-border-low/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    placeholder="e.g. Water Supply Interruption"
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Content</label>
                  <textarea 
                    value={noticeContent}
                    onChange={(e) => setNoticeContent(e.target.value)}
                    className="w-full bg-surface-subtle border border-border-low/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-shadow min-h-[120px]"
                    placeholder="Enter notice details here..."
                    required
                  ></textarea>
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-primary text-on-primary font-headline-md py-3 rounded-xl shadow-md active:scale-95 transition-transform font-bold flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">send</span> Send Broadcast
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manage Users Modal */}
      {isManageUsersOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <h2 className="font-headline-md text-headline-md font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">groups</span> Manage Users
              </h2>
              <button onClick={() => setIsManageUsersOpen(false)} className="active:scale-95 hover:bg-white/10 rounded-full p-1 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex flex-col gap-4">
              <form onSubmit={handleCreateUser} className="bg-surface-subtle border border-border-low rounded-xl p-4">
                <h3 className="font-headline-md font-bold text-on-surface mb-3">Add New User</h3>
                <div className="flex flex-col gap-3">
                  <input 
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-surface border border-border-low rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Full Name"
                    required
                  />
                  <div className="flex gap-2">
                    <select 
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="flex-1 bg-surface border border-border-low rounded-lg px-3 py-2 text-on-surface focus:outline-none"
                    >
                      <option>Resident</option>
                      <option>Guard</option>
                      <option>Secretary</option>
                    </select>
                    <button type="submit" className="bg-primary text-on-primary px-4 py-2 rounded-lg font-bold active:scale-95">Add</button>
                  </div>
                  {newUserRole === 'Resident' && (
                    <div className="flex flex-col gap-3 mt-1">
                      <input 
                        type="text"
                        value={newUserApartment}
                        onChange={(e) => setNewUserApartment(e.target.value)}
                        className="w-full bg-surface border border-border-low rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Apartment (e.g. 402)"
                        required
                      />
                      <input 
                        type="text"
                        value={newUserTower}
                        onChange={(e) => setNewUserTower(e.target.value)}
                        className="w-full bg-surface border border-border-low rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Tower/Wing (e.g. A)"
                        required
                      />
                    </div>
                  )}
                </div>
              </form>

              <div className="flex flex-col gap-2">
                <h3 className="font-headline-md font-bold text-on-surface mt-2">Registered Users ({users.length})</h3>
                {users.map(user => (
                  <div key={user.id} className="flex justify-between items-center bg-surface border border-border-low rounded-xl p-3 shadow-sm">
                    <div>
                      <p className="font-body-md font-bold text-on-surface">{user.name}</p>
                      <p className="font-body-sm text-xs text-on-surface-variant">
                        {user.role} 
                        {user.role === 'Resident' && user.tower && user.apartment && ` • Tower ${user.tower}, Apt ${user.apartment}`}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteUser(user.id)} className="text-status-danger p-2 hover:bg-status-danger/10 rounded-full active:scale-95">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                ))}
                {users.length === 0 && <p className="text-center text-on-surface-variant py-4">No users found.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <h2 className="font-headline-md text-headline-md font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">settings</span> Account Settings
              </h2>
              <button onClick={() => setIsAccountModalOpen(false)} className="active:scale-95 hover:bg-white/10 rounded-full p-1 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-4">
              <form onSubmit={(e) => { e.preventDefault(); showToast('Profile updated successfully', 'success'); setIsAccountModalOpen(false); }} className="space-y-4">
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Full Name</label>
                  <input 
                    type="text"
                    defaultValue="Sarah Connor"
                    className="w-full bg-surface-subtle border border-border-low/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Email Address</label>
                  <input 
                    type="email"
                    defaultValue="secretary@metropolis.com"
                    className="w-full bg-surface-subtle border border-border-low/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    required
                  />
                </div>

                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Phone Number</label>
                  <input 
                    type="tel"
                    defaultValue="+1 (555) 998-3321"
                    className="w-full bg-surface-subtle border border-border-low/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    required
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-primary text-on-primary font-headline-md py-3 rounded-xl shadow-md active:scale-95 transition-transform font-bold flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">save</span> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Details Modal */}
      {isComplaintDetailsOpen && selectedComplaint && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <h2 className="font-headline-md text-headline-md font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">info</span> Complaint Details
              </h2>
              <button onClick={() => { setIsComplaintDetailsOpen(false); setSelectedComplaint(null); }} className="active:scale-95 hover:bg-white/10 rounded-full p-1 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div>
                <p className="font-label-caps text-xs text-on-surface-variant mb-1">TITLE</p>
                <p className="font-body-md font-bold text-on-surface">{selectedComplaint.title}</p>
              </div>
              
              <div>
                <p className="font-label-caps text-xs text-on-surface-variant mb-1">AUTHOR</p>
                <p className="font-body-md text-on-surface">{selectedComplaint.author}</p>
              </div>

              <div>
                <p className="font-label-caps text-xs text-on-surface-variant mb-1">STATUS</p>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase inline-block ${
                  selectedComplaint.status === 'OPEN' ? 'bg-status-danger/10 text-status-danger' :
                  selectedComplaint.status === 'IN_PROGRESS' ? 'bg-status-warning/10 text-status-warning' :
                  'bg-status-success/10 text-status-success'
                }`}>
                  {selectedComplaint.status.replace('_', ' ')}
                </span>
              </div>
              
              <div>
                <p className="font-label-caps text-xs text-on-surface-variant mb-1">LOGGED ON</p>
                <p className="font-body-md text-on-surface">{new Date(selectedComplaint.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="p-4 bg-surface-subtle border-t border-border-low flex gap-3">
               <button 
                 onClick={() => { handleCycleStatus(selectedComplaint.id, selectedComplaint.status); setIsComplaintDetailsOpen(false); }}
                 className="flex-1 bg-primary text-on-primary font-label-caps font-bold py-3 rounded-xl active:scale-95 transition-transform"
               >
                 UPDATE STATUS
               </button>
            </div>
          </div>
        </div>
      )}

      {/* BottomNavBar */}
      <nav className="bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.05)] fixed bottom-0 w-full z-50 rounded-t-xl flex justify-around items-center h-16 px-2 pb-safe border-t border-border-low">
        {[
          { id: 'home', icon: 'dashboard', label: 'Home' },
          { id: 'finances', icon: 'account_balance', label: 'Finances' },
          { id: 'requests', icon: 'assignment', label: 'Requests' },
          { id: 'settings', icon: 'settings', label: 'Settings' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center px-4 py-1 active:scale-90 transition-transform ${
              activeTab === tab.id 
                ? 'bg-secondary-container text-primary rounded-full' 
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>
              {tab.icon}
            </span>
            <span className="font-label-caps text-label-caps mt-1 text-[10px]">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
