'use client';

import { useState, useEffect } from 'react';
import { logout } from '@/app/actions/auth';
import { showToast } from '@/app/components/Toast';
import { getVisitors, updateVisitorStatus, getVisitorLogs, manualLogVisitor, scanVisitorQr, manualLogDelivery, manualLogVehicle } from '@/app/actions/visitors';
import { triggerEmergency } from '@/app/actions/emergency';

export default function GuardDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [visitors, setVisitors] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  // Manual Entry Modal State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryName, setEntryName] = useState('');
  const [entryDestination, setEntryDestination] = useState('');
  const [entryAge, setEntryAge] = useState('');
  const [entryGuests, setEntryGuests] = useState('1');
  
  // Settings Modals State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  
  // Delivery Modal State
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryVendor, setDeliveryVendor] = useState('');
  const [deliveryDestination, setDeliveryDestination] = useState('');

  // Vehicle Modal State
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleDestination, setVehicleDestination] = useState('');
  
  // Scan Token State
  const [scanToken, setScanToken] = useState('');

  useEffect(() => {
    if (activeTab === 'home') loadVisitors();
    if (activeTab === 'logs') loadLogs();
  }, [activeTab]);

  const loadVisitors = async () => {
    const data = await getVisitors();
    setVisitors(data.filter(v => v.status !== 'Entered' && v.status !== 'Denied'));
  };

  const loadLogs = async () => {
    const data = await getVisitorLogs();
    setLogs(data);
  };

  const handleAction = (message: string) => {
    showToast(message, 'info');
  };

  const handleVisitorAction = async (id: string, action: string) => {
    let status = '';
    if (action === 'logged in') status = 'Entered';
    if (action === 'approved') status = 'Entered';
    if (action === 'denied') status = 'Denied';
    
    await updateVisitorStatus(id, status);
    
    setVisitors(visitors.filter(v => v.id !== id));
    showToast(`Visitor ${action} successfully!`);
  };

  const handleManualEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryName || !entryDestination || !entryGuests) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    
    showToast('Logging visitor...', 'info');
    await manualLogVisitor(entryName, entryDestination, entryAge ? parseInt(entryAge) : undefined, parseInt(entryGuests));
    showToast('Walk-in visitor logged successfully!', 'success');
    
    // Reset and close
    setEntryName('');
    setEntryDestination('');
    setEntryAge('');
    setEntryGuests('1');
    setIsEntryModalOpen(false);
    loadVisitors();
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryVendor || !deliveryDestination) return;
    
    showToast('Logging delivery...', 'info');
    await manualLogDelivery(deliveryVendor, deliveryDestination);
    showToast('Delivery logged successfully!', 'success');
    
    setDeliveryVendor('');
    setDeliveryDestination('');
    setIsDeliveryModalOpen(false);
    loadVisitors();
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleReg || !vehicleDestination) return;
    
    showToast('Logging vehicle...', 'info');
    await manualLogVehicle(vehicleReg, vehicleDestination);
    showToast('Vehicle logged successfully!', 'success');
    
    setVehicleReg('');
    setVehicleDestination('');
    setIsVehicleModalOpen(false);
    loadVisitors();
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanToken.trim()) return;
    
    showToast('Validating Pass...', 'info');
    const result = await scanVisitorQr(scanToken.trim().toUpperCase());
    
    if (result.success) {
      showToast(result.message, 'success');
      setScanToken('');
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleEmergency = async () => {
    showToast('Triggering emergency...', 'error');
    await triggerEmergency('GATE EMERGENCY', 'Officer Jenkins (Main Gate 1)');
  };

  return (
    <div className="bg-surface-subtle text-on-surface font-body-md min-h-screen pb-20 relative">
      {/* TopAppBar */}
      <header className="bg-[#e8eefc] w-full top-0 sticky z-40 shadow-sm">
        <div className="flex justify-between items-center px-container-margin-mobile py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-base">
            <div className="w-10 h-10 rounded-full bg-[#1c3671] text-white flex items-center justify-center font-bold shadow-sm">
              MG
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-[#03204c]">Main Gate 1</h1>
              <p className="font-body-sm text-body-sm text-[#03204c]/70">Officer Jenkins</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <form action={logout}>
              <button type="submit" className="p-2 text-status-danger hover:bg-status-danger/10 rounded-full transition-colors flex items-center justify-center" title="Logout">
                <span className="material-symbols-outlined">logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-container-margin-mobile py-stack-md max-w-md mx-auto">
        
        {/* --- HOME TAB --- */}
        {activeTab === 'home' && (
          <div className="space-y-stack-md animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Quick Actions */}
            <section className="grid grid-cols-2 gap-3">
              <button onClick={() => setIsEntryModalOpen(true)} className="bg-[#f6f8ff] rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-stack-sm flex flex-col items-center justify-center h-32 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-full bg-[#e1e8f8] text-[#1c3671] mb-3 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">person_add</span>
                </div>
                <span className="font-body-md text-[#033882] font-medium text-center leading-tight">Visitor<br/>Entry</span>
              </button>
              <button onClick={() => setIsDeliveryModalOpen(true)} className="bg-[#f6f8ff] rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-stack-sm flex flex-col items-center justify-center h-32 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-full bg-[#e1e8f8] text-[#1c3671] mb-3 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">local_shipping</span>
                </div>
                <span className="font-body-md text-[#033882] font-medium text-center leading-tight">Delivery</span>
              </button>
              <button onClick={() => setIsVehicleModalOpen(true)} className="bg-[#f6f8ff] rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-stack-sm flex flex-col items-center justify-center h-32 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-full bg-[#e1e8f8] text-[#1c3671] mb-3 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">directions_car</span>
                </div>
                <span className="font-body-md text-[#033882] font-medium text-center leading-tight">Vehicle<br/>Entry</span>
              </button>
              <button onClick={handleEmergency} className="bg-[#ba1a1a] text-white rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] p-stack-sm flex flex-col items-center justify-center h-32 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-full bg-white/20 mb-3 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px] font-bold">emergency</span>
                </div>
                <span className="font-body-md font-medium text-center leading-tight text-white">Emergency</span>
              </button>
            </section>

            {/* Visitors Waiting */}
            <section>
              <div className="flex justify-between items-center mb-stack-sm">
                <h2 className="font-headline-md text-headline-md text-on-surface">Visitors Waiting ({visitors.length})</h2>
                <button onClick={loadVisitors} className="p-2 text-primary bg-primary/10 rounded-full active:scale-95">
                   <span className="material-symbols-outlined text-[20px]">refresh</span>
                </button>
              </div>
              
              {visitors.length === 0 ? (
                 <div className="p-8 text-center text-on-surface-variant bg-surface rounded-xl shadow-sm border border-border-low">
                   <span className="material-symbols-outlined text-4xl mb-2 opacity-50">task_alt</span>
                   <p>All clear! No pending visitors.</p>
                 </div>
              ) : (
                <div className="space-y-stack-sm">
                  {visitors.map(visitor => (
                    <div key={visitor.id} className={`bg-surface rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-stack-sm border-l-4 ${visitor.icon ? 'border-status-info' : 'border-status-warning'} flex flex-col gap-4`}>
                      <div className="flex items-center gap-stack-sm">
                        <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant overflow-hidden shrink-0">
                          {visitor.img ? (
                            <img alt={visitor.name} className="w-full h-full object-cover" src={visitor.img} />
                          ) : (
                            <span className="material-symbols-outlined">{visitor.icon}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-headline-md text-body-md font-bold text-on-surface">{visitor.name}</h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">Destination: {visitor.destination}</p>
                          
                          <div className="flex gap-2 mt-1">
                            {visitor.age && <span className="font-body-sm text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-border-low">Age: {visitor.age}</span>}
                            {visitor.guestCount > 1 && <span className="font-body-sm text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-border-low">Guests: {visitor.guestCount}</span>}
                          </div>

                          <span className={`inline-block mt-2 font-label-caps text-label-caps px-2 py-0.5 rounded-full ${visitor.icon ? 'bg-status-info/10 text-status-info' : 'bg-status-warning/10 text-status-warning'}`}>
                            {visitor.status}
                          </span>
                        </div>
                      </div>
                      {visitor.icon ? (
                         <button onClick={() => handleVisitorAction(visitor.id, 'logged in')} className="bg-primary text-on-primary font-body-sm text-body-sm px-4 py-2 rounded-lg font-bold active:scale-95 transition-transform w-full flex items-center justify-center">Log Entry</button>
                      ) : (
                        <div className="flex gap-2 w-full">
                          <button onClick={() => handleVisitorAction(visitor.id, 'approved')} className="flex-1 bg-primary text-on-primary font-body-sm text-body-sm px-4 py-2 rounded-lg font-bold active:scale-95 transition-transform h-10">Allow</button>
                          <button onClick={() => handleVisitorAction(visitor.id, 'denied')} className="flex-1 bg-surface-container text-on-surface-variant font-body-sm text-body-sm px-4 py-2 rounded-lg active:scale-95 transition-transform h-10">Deny</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* --- LOGS TAB --- */}
        {activeTab === 'logs' && (
          <div className="space-y-stack-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-4">Gate History</h2>
            
            {logs.length === 0 ? (
               <div className="p-8 text-center text-on-surface-variant bg-surface rounded-xl shadow-sm border border-border-low">
                 <span className="material-symbols-outlined text-4xl mb-2 opacity-50">history</span>
                 <p>No recent logs found.</p>
               </div>
            ) : logs.map((log) => (
              <div key={log.id} className="bg-surface rounded-xl p-4 shadow-sm border border-border-low flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                    <span className="material-symbols-outlined">{log.icon || 'person'}</span>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-body-md font-bold">{log.name}</h3>
                    <p className="font-body-sm text-xs text-on-surface-variant">To: {log.destination}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-label-caps text-[10px] px-2 py-1 rounded-full uppercase ${log.status === 'Entered' ? 'bg-status-success/10 text-status-success' : 'bg-status-danger/10 text-status-danger'}`}>
                    {log.status}
                  </span>
                  <p className="font-label-caps text-[10px] text-on-surface-variant mt-2 uppercase">{new Date(log.updatedAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- SCAN TAB --- */}
        {activeTab === 'scan' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col items-center justify-center pt-8">
             <h2 className="font-headline-md text-headline-md text-on-surface mb-6 text-center">Scan Resident Pass</h2>
             
             <div className="relative w-64 h-64 bg-surface-container rounded-3xl overflow-hidden shadow-inner border-4 border-dashed border-primary/30 flex items-center justify-center mb-8">
               <div className="absolute inset-0 bg-primary/10 animate-pulse"></div>
               <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-[bounce_2s_infinite]"></div>
               <span className="material-symbols-outlined text-6xl text-primary/50">qr_code_scanner</span>
             </div>

             <div className="w-full max-w-sm bg-surface p-6 rounded-2xl shadow-sm border border-border-low">
               <p className="font-body-sm text-center text-on-surface-variant mb-4">Or manually verify a generated token:</p>
               <form onSubmit={handleScanSubmit} className="flex flex-col gap-3">
                 <input 
                   type="text" 
                   value={scanToken}
                   onChange={(e) => setScanToken(e.target.value)}
                   placeholder="Enter 8-character token"
                   className="w-full font-label-caps text-center text-lg tracking-[0.2em] bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                   required
                 />
                 <button 
                   type="submit"
                   className="w-full bg-primary text-on-primary font-headline-md py-3 rounded-xl shadow-md active:scale-95 transition-transform"
                 >
                   Verify Token
                 </button>
               </form>
             </div>
          </div>
        )}

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="bg-surface rounded-2xl shadow-sm border border-border-low overflow-hidden mb-4">
                <div className="bg-primary-container h-24"></div>
                <div className="px-6 pb-6 relative">
                  <div className="w-20 h-20 rounded-full bg-surface border-4 border-surface shadow-md absolute -top-10 flex items-center justify-center text-4xl">
                     👮
                  </div>
                  <div className="pt-12">
                    <h2 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface">Officer Jenkins</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Security Guard • Main Gate 1</p>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-border-low pb-3">
                        <span className="material-symbols-outlined text-primary">schedule</span>
                        <div>
                          <p className="font-label-caps text-xs text-on-surface-variant">CURRENT SHIFT</p>
                          <p className="font-body-md text-on-surface font-semibold">08:00 AM - 08:00 PM</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 border-b border-border-low pb-3">
                        <span className="material-symbols-outlined text-primary">badge</span>
                        <div>
                          <p className="font-label-caps text-xs text-on-surface-variant">BADGE NUMBER</p>
                          <p className="font-body-md text-on-surface font-semibold">SEC-8291</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">phone</span>
                        <div>
                          <p className="font-label-caps text-xs text-on-surface-variant">SUPERVISOR HELPLINE</p>
                          <p className="font-body-md text-on-surface font-semibold">+1 (555) 019-2034</p>
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
                  <label className="block font-body-sm text-body-sm font-bold text-[#03204c] mb-1">Full Name</label>
                  <input 
                    type="text"
                    defaultValue="Officer Jenkins"
                    className="w-full bg-[#f6f8ff] border border-border-low/50 rounded-xl px-4 py-3 text-[#03204c] focus:outline-none focus:ring-2 focus:ring-[#1c3671] transition-shadow"
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-[#03204c] mb-1">Email Address</label>
                  <input 
                    type="email"
                    defaultValue="jenkins@security.com"
                    className="w-full bg-[#f6f8ff] border border-border-low/50 rounded-xl px-4 py-3 text-[#03204c] focus:outline-none focus:ring-2 focus:ring-[#1c3671] transition-shadow"
                    required
                  />
                </div>

                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-[#03204c] mb-1">Phone Number</label>
                  <input 
                    type="tel"
                    defaultValue="+1 (555) 019-2034"
                    className="w-full bg-[#f6f8ff] border border-border-low/50 rounded-xl px-4 py-3 text-[#03204c] focus:outline-none focus:ring-2 focus:ring-[#1c3671] transition-shadow"
                    required
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-[#1c3671] text-white font-headline-md py-3 rounded-xl shadow-md active:scale-95 transition-transform font-bold flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">save</span> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manual Visitor Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center">
              <h2 className="font-headline-md text-headline-md font-bold">Manual Entry</h2>
              <button onClick={() => setIsEntryModalOpen(false)} className="active:scale-95">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleManualEntrySubmit} className="p-6 space-y-4">
              <div>
                <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Visitor Name</label>
                <input 
                  type="text" 
                  value={entryName}
                  onChange={(e) => setEntryName(e.target.value)}
                  className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Rajesh Kumar (Guest/Plumber)"
                  required
                />
              </div>

              <div>
                <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Destination</label>
                <input 
                  type="text" 
                  value={entryDestination}
                  onChange={(e) => setEntryDestination(e.target.value)}
                  className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Unit 402"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Age (Optional)</label>
                  <input 
                    type="number" 
                    value={entryAge}
                    onChange={(e) => setEntryAge(e.target.value)}
                    className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. 35"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Guests</label>
                  <input 
                    type="number" 
                    value={entryGuests}
                    onChange={(e) => setEntryGuests(e.target.value)}
                    className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Count"
                    min="1"
                    max="10"
                    required
                  />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-primary text-on-primary font-headline-md py-3 rounded-xl shadow-md active:scale-95 transition-transform font-bold flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">login</span> Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Entry Modal */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#1c3671] text-white flex justify-between items-center shrink-0">
              <h2 className="font-headline-md text-headline-md font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">local_shipping</span> Log Delivery
              </h2>
              <button onClick={() => setIsDeliveryModalOpen(false)} className="active:scale-95 hover:bg-white/10 rounded-full p-1 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleDeliverySubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-[#03204c] mb-1">Vendor/Company Name</label>
                  <input 
                    type="text"
                    value={deliveryVendor}
                    onChange={(e) => setDeliveryVendor(e.target.value)}
                    className="w-full bg-[#f6f8ff] border border-border-low/50 rounded-xl px-4 py-3 text-[#03204c] focus:outline-none focus:ring-2 focus:ring-[#1c3671] transition-shadow"
                    placeholder="e.g. Amazon, Zomato"
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-[#03204c] mb-1">Destination (Unit/Flat)</label>
                  <input 
                    type="text"
                    value={deliveryDestination}
                    onChange={(e) => setDeliveryDestination(e.target.value)}
                    className="w-full bg-[#f6f8ff] border border-border-low/50 rounded-xl px-4 py-3 text-[#03204c] focus:outline-none focus:ring-2 focus:ring-[#1c3671] transition-shadow"
                    placeholder="e.g. Unit 402"
                    required
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-[#1c3671] text-white font-headline-md py-3 rounded-xl shadow-md active:scale-95 transition-transform font-bold flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span> Log Delivery
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Entry Modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#1c3671] text-white flex justify-between items-center shrink-0">
              <h2 className="font-headline-md text-headline-md font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">directions_car</span> Log Vehicle
              </h2>
              <button onClick={() => setIsVehicleModalOpen(false)} className="active:scale-95 hover:bg-white/10 rounded-full p-1 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleVehicleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-[#03204c] mb-1">Vehicle Registration</label>
                  <input 
                    type="text"
                    value={vehicleReg}
                    onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                    className="w-full bg-[#f6f8ff] border border-border-low/50 rounded-xl px-4 py-3 text-[#03204c] focus:outline-none focus:ring-2 focus:ring-[#1c3671] transition-shadow uppercase"
                    placeholder="e.g. MH 12 AB 1234"
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-[#03204c] mb-1">Destination (Unit/Flat)</label>
                  <input 
                    type="text"
                    value={vehicleDestination}
                    onChange={(e) => setVehicleDestination(e.target.value)}
                    className="w-full bg-[#f6f8ff] border border-border-low/50 rounded-xl px-4 py-3 text-[#03204c] focus:outline-none focus:ring-2 focus:ring-[#1c3671] transition-shadow"
                    placeholder="e.g. Unit 402"
                    required
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-[#1c3671] text-white font-headline-md py-3 rounded-xl shadow-md active:scale-95 transition-transform font-bold flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span> Log Vehicle
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* BottomNavBar */}
      <nav className="bg-surface fixed bottom-0 w-full z-50 rounded-t-xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
           {[
            { id: 'home', icon: 'home', label: 'Home' },
            { id: 'logs', icon: 'list_alt', label: 'Logs' },
            { id: 'scan', icon: 'qr_code_scanner', label: 'Scan' },
            { id: 'profile', icon: 'person', label: 'Profile' },
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
              <span className="font-label-caps text-label-caps mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
