'use client';

import { useState, useEffect } from 'react';
import { logout } from '@/app/actions/auth';
import { showToast } from '@/app/components/Toast';
import { getPlatformStats } from '@/app/actions/super-admin';

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ societies: 0, users: 0 });

  useEffect(() => {
    getPlatformStats().then(setStats);
  }, []);

  const handleAction = (message: string) => {
    showToast(message, 'info');
  };

  return (
    <div className="bg-surface-subtle font-body-md text-body-md text-on-surface antialiased min-h-screen pb-24">
      {/* TopAppBar */}
      <header className="bg-surface shadow-sm w-full top-0 sticky z-40 flex justify-between items-center px-container-margin-mobile py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-on-primary shadow-sm cursor-pointer" onDoubleClick={() => showToast('God mode activated!', 'success')}>
            SA
          </div>
          <div className="font-headline-md text-headline-md font-bold text-primary">Global Command</div>
        </div>
        
        <div className="flex items-center gap-2">
          <form action={logout}>
            <button type="submit" className="p-2 text-status-danger hover:bg-status-danger/10 rounded-full transition-colors flex items-center justify-center" title="Logout">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="px-container-margin-mobile py-stack-md flex flex-col gap-stack-lg max-w-md mx-auto">
        
        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-stack-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            <section>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Platform Status</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span> Systems Operational
                  </p>
                </div>
                <button 
                  onClick={() => {
                    showToast('Syncing global data...', 'info');
                    getPlatformStats().then(setStats);
                  }}
                  className="p-2 bg-surface-container-low text-primary rounded-full active:scale-95 shadow-sm"
                >
                  <span className="material-symbols-outlined">sync</span>
                </button>
              </div>
            </section>

            {/* Core Metrics */}
            <section className="grid grid-cols-2 gap-stack-sm">
              <div 
                onClick={() => handleAction('Opening Societies List')}
                className="bg-surface rounded-xl p-stack-sm shadow-sm border border-border-low flex flex-col active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary bg-primary-container/20 p-1.5 rounded-lg text-[20px]">location_city</span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant">SOCIETIES</span>
                </div>
                <h3 className="font-display-metrics text-3xl text-on-surface">{stats.societies.toLocaleString()}</h3>
                <span className="text-status-success font-body-sm text-xs mt-1 flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">arrow_upward</span> 12 this week</span>
              </div>
              
              <div 
                onClick={() => handleAction('Opening Users Directory')}
                className="bg-surface rounded-xl p-stack-sm shadow-sm border border-border-low flex flex-col active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-secondary bg-secondary-container/20 p-1.5 rounded-lg text-[20px]">group</span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant">USERS</span>
                </div>
                <h3 className="font-display-metrics text-3xl text-on-surface">
                   {stats.users > 1000 ? (stats.users / 1000).toFixed(1) + 'K' : stats.users}
                </h3>
                <span className="text-status-success font-body-sm text-xs mt-1 flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">arrow_upward</span> 5% growth</span>
              </div>

              <div 
                onClick={() => handleAction('Viewing Financial Reports')}
                className="bg-surface rounded-xl p-stack-sm shadow-sm border border-border-low flex flex-col col-span-2 active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-status-success bg-status-success/10 p-1.5 rounded-lg text-[20px]">payments</span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant">MONTHLY REVENUE (MRR)</span>
                </div>
                <div className="flex justify-between items-end">
                  <h3 className="font-display-metrics text-3xl text-on-surface">$142.5K</h3>
                  <button className="text-primary font-body-sm text-body-sm font-semibold">View Report</button>
                </div>
              </div>
            </section>

            {/* Global Actions */}
            <section>
              <button 
                onClick={() => handleAction('Initiating New Society Onboarding')}
                className="w-full bg-primary text-on-primary rounded-xl p-4 flex items-center justify-between shadow-md active:scale-95 transition-transform mb-stack-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">add_business</span>
                  <span className="font-headline-md text-headline-md">Onboard Society</span>
                </div>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
              
              <button 
                onClick={() => showToast('Platform maintenance scheduled', 'success')}
                className="w-full bg-surface-container text-on-surface rounded-xl p-4 flex items-center justify-between shadow-sm active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">engineering</span>
                  <span className="font-headline-md text-headline-md">Schedule Maintenance</span>
                </div>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </section>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="bg-surface rounded-2xl shadow-sm border border-border-low overflow-hidden mb-4">
                <div className="bg-primary-container h-24"></div>
                <div className="px-6 pb-6 relative">
                  <div className="w-20 h-20 rounded-full bg-surface border-4 border-surface shadow-md absolute -top-10 flex items-center justify-center text-4xl">
                     👑
                  </div>
                  <div className="pt-12">
                    <h2 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface">Admin Mode</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Platform God Mode</p>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-border-low pb-3">
                        <span className="material-symbols-outlined text-primary">security</span>
                        <div>
                          <p className="font-label-caps text-xs text-on-surface-variant">CLEARANCE LEVEL</p>
                          <p className="font-body-md text-status-danger font-semibold">Tier 1 (Unrestricted)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">dns</span>
                        <div>
                          <p className="font-label-caps text-xs text-on-surface-variant">CURRENT SERVER</p>
                          <p className="font-body-md text-status-success font-semibold">US-East-1 (Primary)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>

             <button onClick={() => showToast('Opening Security Settings...', 'info')} className="w-full bg-surface rounded-xl p-4 shadow-sm border border-border-low flex items-center justify-between active:scale-95 transition-transform mb-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">admin_panel_settings</span>
                  <span className="font-headline-md font-semibold text-on-surface">Global Security</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
             </button>
             
             <button onClick={() => showToast('Opening Database Management...', 'info')} className="w-full bg-surface rounded-xl p-4 shadow-sm border border-border-low flex items-center justify-between active:scale-95 transition-transform">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">database</span>
                  <span className="font-headline-md font-semibold text-on-surface">Database & Backups</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
             </button>
          </div>
        )}
      </main>

      {/* BottomNavBar */}
      <nav className="bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.05)] fixed bottom-0 w-full z-50 rounded-t-xl flex justify-around items-center h-16 px-2 pb-safe border-t border-border-low">
        {[
          { id: 'overview', icon: 'monitoring', label: 'Overview' },
          { id: 'societies', icon: 'location_city', label: 'Societies' },
          { id: 'users', icon: 'group', label: 'Users' },
          { id: 'settings', icon: 'admin_panel_settings', label: 'Settings' }
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
