'use client';

import { useState, useEffect } from 'react';
import { logout } from '@/app/actions/auth';
import { showToast } from '@/app/components/Toast';
import { triggerEmergency } from '@/app/actions/emergency';
import { getNotices, getComplaints, raiseComplaint, inviteVisitor, getFacilities, getMyBookings, bookFacility, getInvoices, payInvoice, getFamilyMembers, getVehicles, addFamilyMember, removeFamilyMember, addVehicle, removeVehicle } from '@/app/actions/resident';

export default function ResidentDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [notices, setNotices] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  
  // Add Member State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRel, setNewMemberRel] = useState('');
  const [newMemberAge, setNewMemberAge] = useState('');
  
  // Add Vehicle State
  const [newVehicleType, setNewVehicleType] = useState('Car');
  const [newVehicleMake, setNewVehicleMake] = useState('');
  const [newVehicleReg, setNewVehicleReg] = useState('');
  
  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteAge, setInviteAge] = useState('');
  const [inviteGuests, setInviteGuests] = useState('1');
  const [invitePhone, setInvitePhone] = useState('');
  const [generatedQr, setGeneratedQr] = useState<string | null>(null);

  // Complaint Modal State
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [complaintTitle, setComplaintTitle] = useState('');

  // Facility Booking Modal State
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingEndDate, setBookingEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [noticesData, complaintsData, facilitiesData, bookingsData, invoicesData, familyData, vehiclesData] = await Promise.all([
      getNotices(),
      getComplaints(),
      getFacilities(),
      getMyBookings(),
      getInvoices(),
      getFamilyMembers(),
      getVehicles()
    ]);
    setNotices(noticesData);
    setComplaints(complaintsData);
    setFacilities(facilitiesData);
    setMyBookings(bookingsData);
    setInvoices(invoicesData);
    setFamilyMembers(familyData);
    setVehicles(vehiclesData);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName) {
      showToast('Please enter a name', 'error');
      return;
    }
    
    showToast('Generating Pass...', 'info');
    const result = await inviteVisitor(inviteName, inviteAge ? parseInt(inviteAge) : 0, parseInt(inviteGuests), invitePhone);
    setGeneratedQr(result.qrToken || null);
    
    setInviteName('');
    setInviteAge('');
    setInvitePhone('');
    setInviteGuests('1');
    showToast('Pass Generated!', 'success');
  };

  const handleRaiseComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintTitle) {
      showToast('Please describe your issue', 'error');
      return;
    }
    
    showToast('Submitting complaint...', 'info');
    await raiseComplaint(complaintTitle);
    showToast('Complaint submitted successfully!', 'success');
    
    setComplaintTitle('');
    setIsComplaintModalOpen(false);
    loadData(); // Refresh list
  };

  const handleBookFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility || !bookingDate) {
      showToast('Please select a date', 'error');
      return;
    }
    if (selectedFacility.validity === 'Daily' && !bookingEndDate) {
      showToast('Please select an end date', 'error');
      return;
    }

    showToast('Processing Payment...', 'info');
    // Simulate payment delay
    setTimeout(async () => {
      await bookFacility(selectedFacility.id, new Date(bookingDate), bookingEndDate ? new Date(bookingEndDate) : undefined);
      showToast('Facility booked successfully!', 'success');
      setSelectedFacility(null);
      setBookingDate('');
      setBookingEndDate('');
      setIsFacilityModalOpen(false);
      loadData();
    }, 1000);
  };

  const handlePay = async (invoiceId: string) => {
    showToast('Processing payment...', 'info');
    await payInvoice(invoiceId);
    showToast('Payment successful!', 'success');
    loadData();
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberRel || !newMemberAge) return;
    await addFamilyMember(newMemberName, newMemberRel, parseInt(newMemberAge));
    showToast('Family member added', 'success');
    setNewMemberName(''); setNewMemberRel(''); setNewMemberAge('');
    setIsAddMemberModalOpen(false);
    loadData();
  };

  const handleRemoveMember = async (id: string) => {
    await removeFamilyMember(id);
    showToast('Family member removed', 'success');
    loadData();
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleMake || !newVehicleReg) return;
    await addVehicle(newVehicleType, newVehicleMake, newVehicleReg);
    showToast('Vehicle added', 'success');
    setNewVehicleType('Car'); setNewVehicleMake(''); setNewVehicleReg('');
    setIsAddVehicleModalOpen(false);
    loadData();
  };

  const handleRemoveVehicle = async (id: string) => {
    await removeVehicle(id);
    showToast('Vehicle removed', 'success');
    loadData();
  };

  return (
    <div className="bg-surface-subtle font-body-md text-on-surface antialiased min-h-screen pb-24 relative">
      {/* TopAppBar */}
      <header className="bg-surface shadow-sm w-full top-0 sticky z-40 flex justify-between items-center px-container-margin-mobile py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container shadow-sm">
            R
          </div>
          <div>
            <div className="font-headline-md text-headline-md font-bold text-primary">Estate Pillar</div>
            <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-status-success inline-block"></span> Unit 402
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <form action={logout}>
            <button type="submit" className="p-2 text-status-danger hover:bg-status-danger/10 rounded-full transition-colors flex items-center justify-center" title="Logout">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Content (Bento Grid Style) */}
      <main className="px-container-margin-mobile py-stack-md flex flex-col gap-stack-lg max-w-md mx-auto">
        
        {/* --- HOME TAB --- */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-stack-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Welcome & Pending Action */}
            <section className="bg-primary text-on-primary rounded-2xl p-6 shadow-md relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-20">
                 <span className="material-symbols-outlined text-[100px]">home</span>
               </div>
               <div className="relative z-10">
                 <h2 className="font-headline-lg-mobile text-3xl font-bold mb-1">Hi, Ritesh</h2>
                 <p className="font-body-md text-on-primary/80 mb-6">You have {invoices.filter(i => i.status === 'PENDING').length} pending payment(s)</p>
                 
                 <div className="bg-surface/10 rounded-xl p-4 backdrop-blur-md border border-white/20 flex justify-between items-center">
                    <div>
                      <span className="font-label-caps text-xs opacity-80 block">MAINTENANCE DUE</span>
                      <span className="font-display-metrics text-2xl font-bold">${invoices.filter(i => i.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}</span>
                    </div>
                    <button onClick={() => setActiveTab('payments')} className="bg-white text-primary font-headline-md px-5 py-2.5 rounded-lg shadow-sm active:scale-95 transition-transform">
                      Pay Now
                    </button>
                 </div>
               </div>
            </section>

            {/* Quick Actions Grid */}
            <section>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-sm">Quick Actions</h3>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-surface rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-border-low active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary-container text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">person_add</span>
                  </div>
                  <span className="font-label-caps text-xs text-on-surface font-semibold text-center leading-tight">Invite<br/>Visitor</span>
                </button>

                <button 
                  onClick={() => setIsComplaintModalOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-surface rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-border-low active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-container-highest text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">support_agent</span>
                  </div>
                  <span className="font-label-caps text-xs text-on-surface font-semibold text-center leading-tight">Raise<br/>Complaint</span>
                </button>

                <button 
                  onClick={() => setIsFacilityModalOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-surface rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-border-low active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">pool</span>
                  </div>
                  <span className="font-label-caps text-xs text-on-surface font-semibold text-center leading-tight">Book<br/>Facility</span>
                </button>

                {/* Calm but prominent Emergency CTA */}
                <button 
                  onClick={async () => {
                    showToast('Triggering emergency...', 'error');
                    await triggerEmergency('SOS - RESIDENT', 'Ritesh (Unit 402)');
                  }}
                  className="col-span-3 flex items-center justify-center gap-3 p-4 bg-error text-on-error rounded-xl shadow-md active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined">e911_emergency</span>
                  <span className="font-headline-md text-headline-md uppercase tracking-wide">SOS Emergency</span>
                </button>
              </div>
            </section>

            {/* My Bookings */}
            {myBookings.length > 0 && (
              <section>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-sm">Active Passes</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                  {myBookings.map((booking) => (
                    <div key={booking.id} className="min-w-[240px] snap-center bg-surface rounded-2xl p-4 shadow-sm border border-border-low relative overflow-hidden">
                      <div className="absolute -bottom-4 -right-4 opacity-5">
                        <span className="material-symbols-outlined text-[100px]">{booking.facility.icon}</span>
                      </div>
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined">{booking.facility.icon}</span>
                        </div>
                        <span className="bg-status-success/10 text-status-success font-label-caps text-[10px] px-2 py-1 rounded-full border border-status-success/20 uppercase">
                          {booking.status}
                        </span>
                      </div>
                      <h4 className="font-headline-md text-body-md font-bold text-on-surface relative z-10">{booking.facility.name}</h4>
                      <p className="font-body-sm text-[12px] text-on-surface-variant relative z-10 mt-1">Starts: {new Date(booking.date).toLocaleDateString()}</p>
                      {booking.endDate && (
                        <p className="font-body-sm text-[12px] text-on-surface-variant relative z-10">Ends: {new Date(booking.endDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Notices */}
            <section>
              <div className="flex justify-between items-center mb-stack-sm">
                <h3 className="font-headline-md text-headline-md text-on-surface">Recent Activity</h3>
                <button onClick={loadData} className="text-primary font-body-sm font-bold active:opacity-50">Refresh</button>
              </div>
              <div className="flex flex-col gap-3">
                {notices.length === 0 ? (
                  <div className="p-4 bg-surface rounded-xl text-center text-on-surface-variant text-body-sm">
                    No recent activity.
                  </div>
                ) : notices.map((notice) => (
                  <div key={notice.id} className="bg-surface rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-l-4 border-status-info flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined">{notice.type === 'ALERT' ? 'campaign' : 'info'}</span>
                    </div>
                    <div>
                      <h4 className="font-headline-md text-body-md text-on-surface font-bold">{notice.title}</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{notice.content}</p>
                      <p className="font-label-caps text-[10px] text-on-surface-variant mt-2 uppercase">{new Date(notice.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* --- COMPLAINTS TAB --- */}
        {activeTab === 'complaints' && (
          <div className="flex flex-col gap-stack-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            <section>
              <div className="flex justify-between items-center mb-stack-sm">
                <h3 className="font-headline-md text-headline-md text-on-surface">My Complaints</h3>
                <button 
                  onClick={() => setIsComplaintModalOpen(true)}
                  className="bg-primary text-on-primary font-body-sm font-bold px-4 py-2 rounded-lg shadow-sm active:scale-95 transition-transform"
                >
                  Raise Issue
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                {complaints.length === 0 ? (
                  <div className="p-8 bg-surface rounded-xl text-center text-on-surface-variant border border-border-low flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">done_all</span>
                    <p className="font-body-md">You have no active complaints.</p>
                  </div>
                ) : complaints.map((complaint) => (
                  <div key={complaint.id} className="bg-surface rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border border-border-low flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-headline-md text-body-md text-on-surface font-bold">{complaint.title}</h4>
                      <span className={`font-label-caps text-[10px] px-2 py-1 rounded-full uppercase ${
                        complaint.status === 'OPEN' ? 'bg-status-warning/10 text-status-warning border border-status-warning/20' : 
                        complaint.status === 'IN_PROGRESS' ? 'bg-status-info/10 text-status-info border border-status-info/20' : 
                        'bg-status-success/10 text-status-success border border-status-success/20'
                      }`}>
                        {complaint.status}
                      </span>
                    </div>
                    <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">{new Date(complaint.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* --- PAYMENTS TAB --- */}
        {activeTab === 'payments' && (
          <div className="flex flex-col gap-stack-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            <section>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-sm">Pending Dues</h3>
              <div className="flex flex-col gap-3">
                {invoices.filter(i => i.status === 'PENDING').length === 0 ? (
                  <div className="p-4 bg-surface rounded-xl text-center text-on-surface-variant text-body-sm border border-border-low">
                    No pending dues. You're all caught up!
                  </div>
                ) : invoices.filter(i => i.status === 'PENDING').map(invoice => (
                  <div key={invoice.id} className="bg-surface rounded-xl p-4 shadow-sm border border-status-warning/30 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-headline-md text-body-md text-on-surface font-bold">{invoice.title}</h4>
                        <p className="font-body-sm text-[12px] text-status-danger font-semibold mt-1">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-display-metrics text-xl font-bold text-primary">${invoice.amount.toFixed(2)}</span>
                      </div>
                    </div>
                    <button onClick={() => handlePay(invoice.id)} className="w-full bg-primary text-on-primary font-headline-md py-3 rounded-lg shadow-sm active:scale-95 transition-transform font-bold">
                      Pay Now
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-sm">Payment History</h3>
              <div className="flex flex-col gap-3">
                {invoices.filter(i => i.status === 'PAID').length === 0 ? (
                  <div className="p-4 bg-surface rounded-xl text-center text-on-surface-variant text-body-sm border border-border-low">
                    No payment history.
                  </div>
                ) : invoices.filter(i => i.status === 'PAID').map(invoice => (
                  <div key={invoice.id} className="bg-surface-subtle rounded-xl p-4 border border-border-low flex justify-between items-center opacity-80">
                    <div>
                      <h4 className="font-headline-md text-body-sm text-on-surface font-bold">{invoice.title}</h4>
                      <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">Paid on: {new Date(invoice.paidAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-body-md font-bold text-on-surface">${invoice.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="bg-surface rounded-2xl shadow-sm border border-border-low overflow-hidden mb-4">
                <div className="bg-primary-container h-24"></div>
                <div className="px-6 pb-6 relative">
                  <div className="w-20 h-20 rounded-full bg-surface border-4 border-surface shadow-md absolute -top-10 flex items-center justify-center text-4xl">
                     👨‍💼
                  </div>
                  <div className="pt-12">
                    <h2 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface">Ritesh</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Resident • Unit 402</p>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 border-b border-border-low pb-3">
                        <span className="material-symbols-outlined text-primary mt-1">family_home</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <p className="font-label-caps text-xs text-on-surface-variant">MEMBERS ({familyMembers.length})</p>
                            <button onClick={() => setIsAddMemberModalOpen(true)} className="text-primary hover:bg-primary/10 rounded-full p-1 active:scale-95 transition-colors">
                              <span className="material-symbols-outlined text-sm">add</span>
                            </button>
                          </div>
                          <div className="mt-2 space-y-2">
                            {familyMembers.map(member => (
                              <div key={member.id} className="flex justify-between items-center bg-surface-subtle p-2 rounded-lg border border-border-low group">
                                <div>
                                  <span className="font-body-sm font-semibold mr-2">{member.name}</span>
                                  <span className="font-label-caps text-[10px] bg-secondary-container text-primary px-2 py-0.5 rounded-full">{member.relationship}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => showToast('Edit coming soon', 'info')} className="text-on-surface-variant hover:text-primary active:scale-95"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                                  <button onClick={() => handleRemoveMember(member.id)} className="text-status-danger hover:text-status-danger active:scale-95"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 border-b border-border-low pb-3">
                        <span className="material-symbols-outlined text-primary mt-1">directions_car</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <p className="font-label-caps text-xs text-on-surface-variant">VEHICLES ({vehicles.length})</p>
                            <button onClick={() => setIsAddVehicleModalOpen(true)} className="text-primary hover:bg-primary/10 rounded-full p-1 active:scale-95 transition-colors">
                              <span className="material-symbols-outlined text-sm">add</span>
                            </button>
                          </div>
                          <div className="mt-2 space-y-2">
                            {vehicles.map(vehicle => (
                              <div key={vehicle.id} className="flex justify-between items-center bg-surface-subtle p-2 rounded-lg border border-border-low">
                                <div className="flex gap-2 items-center">
                                  <span className="material-symbols-outlined text-primary text-sm opacity-50">{vehicle.type === 'Car' ? 'directions_car' : 'two_wheeler'}</span>
                                  <div>
                                    <div className="font-body-sm font-semibold">{vehicle.makeModel}</div>
                                    <div className="font-label-caps text-[10px] text-on-surface-variant">{vehicle.registration}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => showToast('Edit coming soon', 'info')} className="text-on-surface-variant hover:text-primary active:scale-95"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                                  <button onClick={() => handleRemoveVehicle(vehicle.id)} className="text-status-danger hover:text-status-danger active:scale-95"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">verified</span>
                        <div>
                          <p className="font-label-caps text-xs text-on-surface-variant">STATUS</p>
                          <p className="font-body-md text-status-success font-semibold">Verified Owner</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>

             <button onClick={() => setIsSettingsModalOpen(true)} className="w-full bg-surface rounded-xl p-4 shadow-sm border border-border-low flex items-center justify-between active:scale-95 transition-transform mb-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">settings</span>
                  <span className="font-headline-md font-semibold text-on-surface">Account Settings</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
             </button>
             
             <button onClick={() => setIsPrivacyModalOpen(true)} className="w-full bg-surface rounded-xl p-4 shadow-sm border border-border-low flex items-center justify-between active:scale-95 transition-transform">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">lock</span>
                  <span className="font-headline-md font-semibold text-on-surface">Privacy & Security</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
             </button>
          </div>
        )}
      </main>

      {/* Facility Booking Modal */}
      {isFacilityModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <h2 className="font-headline-md text-headline-md font-bold">
                {selectedFacility ? 'Confirm Booking' : 'Book Facility'}
              </h2>
              <button 
                onClick={() => { 
                  if(selectedFacility) setSelectedFacility(null); 
                  else setIsFacilityModalOpen(false); 
                }} 
                className="active:scale-95"
              >
                <span className="material-symbols-outlined">{selectedFacility ? 'arrow_back' : 'close'}</span>
              </button>
            </div>
            
            <div className="overflow-y-auto p-4">
              {!selectedFacility ? (
                <div className="flex flex-col gap-3">
                  {facilities.map(facility => (
                    <div 
                      key={facility.id} 
                      onClick={() => setSelectedFacility(facility)}
                      className="bg-surface-subtle border border-border-low rounded-xl p-4 flex gap-4 items-center cursor-pointer hover:border-primary transition-colors active:scale-95"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-2xl">{facility.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-headline-md text-body-md font-bold text-on-surface">{facility.name}</h3>
                        <p className="font-body-sm text-[11px] text-on-surface-variant leading-tight mt-0.5">{facility.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display-metrics text-lg font-bold text-primary">${facility.rate}</p>
                        <p className="font-label-caps text-[9px] text-on-surface-variant uppercase">per {facility.validity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleBookFacility} className="space-y-6">
                  <div className="bg-primary-container/30 rounded-xl p-6 text-center border border-primary/10">
                    <span className="material-symbols-outlined text-4xl text-primary mb-2">{selectedFacility.icon}</span>
                    <h3 className="font-headline-md text-xl font-bold text-on-surface">{selectedFacility.name}</h3>
                    <p className="font-body-md text-primary font-semibold mt-1">${selectedFacility.rate} / {selectedFacility.validity}</p>
                  </div>

                  <div>
                    <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-2">Select Start Date</label>
                    <input 
                      type="date" 
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  {selectedFacility.validity === 'Daily' && (
                    <div>
                      <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-2">Select End Date</label>
                      <input 
                        type="date" 
                        value={bookingEndDate}
                        onChange={(e) => setBookingEndDate(e.target.value)}
                        className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        min={bookingDate}
                        required
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <button type="submit" className="w-full bg-primary text-on-primary font-headline-md py-4 rounded-xl shadow-md active:scale-95 transition-transform font-bold flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">payments</span> Pay & Confirm
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visitor Invitation Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center">
              <h2 className="font-headline-md text-headline-md font-bold">Invite Visitor</h2>
              <button onClick={() => { setIsInviteModalOpen(false); setGeneratedQr(null); }} className="active:scale-95">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            {generatedQr ? (
              <div className="p-6 flex flex-col items-center text-center animate-in zoom-in-95">
                 <h3 className="font-headline-md font-bold text-on-surface mb-2">Gate Pass Ready</h3>
                 <p className="font-body-sm text-on-surface-variant mb-6">Share this pass. It expires in 24 hours.</p>
                 
                 <div className="bg-white p-4 rounded-2xl shadow-sm border border-border-low mb-6 flex flex-col items-center">
                   <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${generatedQr}`} alt="QR Code" className="w-48 h-48" />
                   <p className="font-label-caps mt-3 text-on-surface-variant font-bold uppercase tracking-widest">{generatedQr}</p>
                 </div>
                 
                 <a 
                   href={`https://wa.me/?text=Here%20is%20your%20gate%20pass%20QR%20Code:%20https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${generatedQr}%0A%0AToken:%20${generatedQr}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="w-full bg-[#25D366] text-white font-headline-md py-3 rounded-xl shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 mb-3"
                 >
                   <span className="material-symbols-outlined">chat</span> Share via WhatsApp
                 </a>
                 
                 <button onClick={() => { setIsInviteModalOpen(false); setGeneratedQr(null); }} className="text-on-surface-variant font-body-sm font-bold">
                   Done
                 </button>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Visitor Name</label>
                  <input 
                    type="text" 
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">WhatsApp Phone (Optional)</label>
                  <input 
                    type="tel" 
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="+1 234 567 8900"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Age (Optional)</label>
                    <input 
                      type="number" 
                      value={inviteAge}
                      onChange={(e) => setInviteAge(e.target.value)}
                      className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g. 28"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Guests</label>
                    <input 
                      type="number" 
                      value={inviteGuests}
                      onChange={(e) => setInviteGuests(e.target.value)}
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
                    <span className="material-symbols-outlined">qr_code</span> Generate Pass
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {isComplaintModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center">
              <h2 className="font-headline-md text-headline-md font-bold">Raise Complaint</h2>
              <button onClick={() => setIsComplaintModalOpen(false)} className="active:scale-95">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleRaiseComplaintSubmit} className="p-6 space-y-4">
              <div>
                <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Issue Description</label>
                <textarea 
                  value={complaintTitle}
                  onChange={(e) => setComplaintTitle(e.target.value)}
                  className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                  placeholder="E.g., The elevator in Tower B is making strange noises..."
                  required
                />
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-primary text-on-primary font-headline-md py-3 rounded-xl shadow-md active:scale-95 transition-transform font-bold flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">send</span> Submit Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center">
              <h2 className="font-headline-md text-headline-md font-bold">Account Settings</h2>
              <button onClick={() => setIsSettingsModalOpen(false)} className="active:scale-95">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block font-body-sm font-bold text-on-surface mb-1">Email</label>
                <input type="email" value="ritesh@example.com" disabled className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface-variant opacity-70" />
              </div>
              <div>
                <label className="block font-body-sm font-bold text-on-surface mb-1">Phone</label>
                <input type="tel" value="+1 234 567 890" disabled className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface-variant opacity-70" />
              </div>
              <button onClick={() => { setIsSettingsModalOpen(false); showToast('Contact Admin to update profile', 'info'); }} className="w-full bg-primary-container text-primary font-headline-md py-3 rounded-xl font-bold">
                Request Profile Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center">
              <h2 className="font-headline-md text-headline-md font-bold">Privacy & Security</h2>
              <button onClick={() => setIsPrivacyModalOpen(false)} className="active:scale-95">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <button className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface flex justify-between items-center">
                <span className="font-body-md font-semibold">Change Password</span>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
              <div className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="font-body-md font-semibold text-on-surface">Two-Factor Auth</span>
                <span className="bg-status-success/20 text-status-success font-label-caps px-2 py-1 rounded">ENABLED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center">
              <h2 className="font-headline-md text-headline-md font-bold">Add Family Member</h2>
              <button onClick={() => setIsAddMemberModalOpen(false)} className="active:scale-95">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Name</label>
                <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface" placeholder="e.g. Aditi" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Relation</label>
                  <input type="text" value={newMemberRel} onChange={e => setNewMemberRel(e.target.value)} required className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface" placeholder="e.g. Spouse" />
                </div>
                <div>
                  <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Age</label>
                  <input type="number" value={newMemberAge} onChange={e => setNewMemberAge(e.target.value)} required className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface" min="1" max="100" />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary text-on-primary font-headline-md py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">add</span> Add Member
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {isAddVehicleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center">
              <h2 className="font-headline-md text-headline-md font-bold">Add Vehicle</h2>
              <button onClick={() => setIsAddVehicleModalOpen(false)} className="active:scale-95">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddVehicle} className="p-6 space-y-4">
              <div>
                <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Vehicle Type</label>
                <select value={newVehicleType} onChange={e => setNewVehicleType(e.target.value)} className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface">
                  <option value="Car">Car</option>
                  <option value="Bike">Bike</option>
                </select>
              </div>
              <div>
                <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Make & Model</label>
                <input type="text" value={newVehicleMake} onChange={e => setNewVehicleMake(e.target.value)} required className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface" placeholder="e.g. Maruti Swift" />
              </div>
              <div>
                <label className="block font-body-sm text-body-sm font-bold text-on-surface mb-1">Registration No</label>
                <input type="text" value={newVehicleReg} onChange={e => setNewVehicleReg(e.target.value)} required className="w-full bg-surface-subtle border border-border-low rounded-xl px-4 py-3 text-on-surface uppercase" placeholder="e.g. MH 12 AB 1234" />
              </div>
              <button type="submit" className="w-full bg-primary text-on-primary font-headline-md py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">add</span> Add Vehicle
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BottomNavBar */}
      <nav className="bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.05)] fixed bottom-0 w-full z-40 rounded-t-xl flex justify-around items-center h-16 px-2 pb-safe border-t border-border-low">
        {[
          { id: 'home', icon: 'home', label: 'Home' },
          { id: 'complaints', icon: 'support_agent', label: 'Complaints' },
          { id: 'payments', icon: 'account_balance_wallet', label: 'Payments' },
          { id: 'profile', icon: 'person', label: 'Profile' }
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
