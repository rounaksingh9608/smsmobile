import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, Alert, ActivityIndicator, FlatList, Modal, ScrollView, Platform, Vibration, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';


// IMPORTANT: Replace this with your computer's local IP address
const API_URL = 'http://10.73.68.28:3000'; 

function EmergencyListener() {
  const [activeEvent, setActiveEvent] = useState(null);
  const player = useAudioPlayer('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

  useEffect(() => {
    let poller = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/emergency`);
        const data = await res.json();
        if (data && data.status === 'ACTIVE') {
          if (!activeEvent || activeEvent.id !== data.id) {
            setActiveEvent(data);
          }
        } else {
          setActiveEvent(null);
        }
      } catch (e) {}
    }, 3000);
    return () => clearInterval(poller);
  }, [activeEvent]);

  useEffect(() => {
    if (activeEvent) {
      try {
        Vibration.vibrate([300, 100, 300, 100, 300], true);
        if (player) {
          player.loop = true;
          player.play();
        }
      } catch(e) {}
    } else {
      try { 
        if (player) {
          player.pause(); 
          player.seekTo(0);
        }
      } catch(e) {}
      Vibration.cancel();
    }

    return () => {
      Vibration.cancel();
    };
  }, [activeEvent, player]);

  const handleResolve = async () => {
    if (activeEvent) {
      await fetch(`${API_URL}/api/emergency`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id: activeEvent.id, status: 'RESOLVED' }) });
      setActiveEvent(null);
    }
  };

  if (!activeEvent) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(220, 38, 38, 0.95)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }]}>
      <MaterialIcons name="warning" size={120} color="#fff" />
      <Text style={{ fontSize: 40, fontWeight: 'bold', color: '#fff', marginVertical: 20 }}>EMERGENCY</Text>
      <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold' }}>{activeEvent.type}</Text>
      <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 40 }}>Triggered by: {activeEvent.triggeredBy}</Text>
      <TouchableOpacity onPress={handleResolve} style={{ backgroundColor: '#fff', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 15 }}>
        <Text style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 20 }}>RESOLVE EMERGENCY</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  
  let content;
  if (!isAuthenticated) {
    content = <LoginScreen onLogin={(role) => {
      setCurrentRole(role);
      setIsAuthenticated(true);
    }} />;
  } else if (currentRole === 'resident') {
    content = <ResidentMainDashboard onLogout={() => setIsAuthenticated(false)} />;
  } else if (currentRole === 'secretary') {
    content = <SecretaryMainDashboard onLogout={() => setIsAuthenticated(false)} />;
  } else {
    content = <GuardMainDashboard onLogout={() => setIsAuthenticated(false)} />;
  }

  return (
    <>
      {content}
      {isAuthenticated && <EmergencyListener />}
    </>
  );
}

// ==========================================
// 1. LOGIN SCREEN
// ==========================================
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('demo@estatepillar.com');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState('resident');

  const handleLogin = () => {
    if (email && password) {
      onLogin(role);
    } else {
      Alert.alert("Error", "Please enter credentials.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.loginContainer}>
        
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{ width: 64, height: 64, backgroundColor: '#0ea5e9', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>EP</Text>
          </View>
          <Text style={styles.logoText}>Estate Pillar</Text>
          <Text style={styles.subtitleText}>Sign in to your account</Text>
        </View>

        <Text style={styles.label}>Select Your Role</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          {['resident', 'guard', 'secretary'].map((r) => (
            <TouchableOpacity 
              key={r} 
              style={[styles.roleBtn, role === r && styles.roleBtnActive]} 
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="demo@estatepillar.com"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="password123"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        
        <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// 2. RESIDENT DASHBOARD
// ==========================================
function ResidentMainDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState({ notices: [], complaints: [], facilities: [], bookings: [], invoices: [], familyMembers: [], vehicles: [] });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/resident/data`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={[styles.topHeader, {backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.avatarBubble, {backgroundColor: '#e0e7ff'}]}>
            <Text style={{color: '#3730a3', fontWeight: 'bold'}}>R</Text>
          </View>
          <View>
            <Text style={{fontSize: 18, fontWeight: 'bold', color: '#1e40af'}}>Estate Pillar</Text>
            <Text style={{fontSize: 12, color: '#64748b'}}>🟢 Unit 402</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onLogout} style={{padding: 4, borderRadius: 20}}>
          <MaterialIcons name="logout" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentArea}>
        {loading ? (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" color="#0ea5e9"/></View>
        ) : (
          <>
            {activeTab === 'home' && <ResidentHomeTab data={data} loadData={loadData} />}
            {activeTab === 'complaints' && <ResidentComplaintsTab complaints={data.complaints} loadData={loadData} />}
            {activeTab === 'payments' && <ResidentPaymentsTab invoices={data.invoices} loadData={loadData} />}
            {activeTab === 'profile' && <ResidentProfileTab data={data} onLogout={onLogout} loadData={loadData} />}
          </>
        )}
      </View>

      <View style={styles.bottomNav}>
        <NavButton id="home" icon="home" label="Home" activeTab={activeTab} onPress={setActiveTab} />
        <NavButton id="complaints" icon="support-agent" label="Support" activeTab={activeTab} onPress={setActiveTab} />
        <NavButton id="payments" icon="payments" label="Payments" activeTab={activeTab} onPress={setActiveTab} />
        <NavButton id="profile" icon="person" label="Profile" activeTab={activeTab} onPress={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

function ResidentHomeTab({ data, loadData }) {
  const [modalVisible, setModalVisible] = useState(null);
  const [form, setForm] = useState({});
  const [generatedQr, setGeneratedQr] = useState(null);
  const qrRef = useRef();

  const shareQR = () => {
    if (qrRef.current) {
      qrRef.current.toDataURL(async (dataURL) => {
        try {
          const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
          const uri = FileSystem.cacheDirectory + 'gate-pass.png';
          await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: 'base64' });
          
          const caption = `Your Gate Pass Token is: ${generatedQr}`;
          
          if (Platform.OS === 'ios') {
            await Share.share({ url: uri, message: caption });
          } else {
            await Clipboard.setStringAsync(caption);
            await Sharing.shareAsync(uri, { 
              mimeType: 'image/png', 
              dialogTitle: caption, 
              UTI: 'public.png' 
            });
            Alert.alert("Caption Copied", "The token has been copied to your clipboard. Just hit 'Paste' in WhatsApp!");
          }
        } catch (err) {
          Alert.alert("Error", err.message || "Could not share QR code");
        }
      });
    }
  };

  const pendingDues = data.invoices.filter(i => i.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);

  const handleInvite = async () => {
    try {
      const res = await fetch(`${API_URL}/api/resident/invite`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(form) });
      const d = await res.json();
      setGeneratedQr(d.qrToken);
    } catch(e) {}
  };

  const handleComplaint = async () => {
    try {
      await fetch(`${API_URL}/api/resident/complaints`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(form) });
      Alert.alert("Success", "Complaint raised!");
      setModalVisible(null); setForm({}); loadData();
    } catch(e) {}
  };

  const handleBook = async () => {
    try {
      await fetch(`${API_URL}/api/resident/bookings`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(form) });
      Alert.alert("Success", "Facility Booked!");
      setModalVisible(null); setForm({}); loadData();
    } catch(e) {}
  };

  const triggerSOS = async () => {
    Alert.alert("Emergency", "Trigger SOS?", [
      { text: "Cancel", style: "cancel" },
      { text: "TRIGGER", style: "destructive", onPress: async () => {
        try {
          await fetch(`${API_URL}/api/emergency`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ title: 'SOS - RESIDENT', author: 'Ritesh (Unit 402)' }) });
          Alert.alert("Sent", "Emergency SOS sent.");
        } catch(e) {}
      }}
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      {/* Banner */}
      <View style={{ backgroundColor: '#0ea5e9', borderRadius: 20, padding: 20, marginBottom: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5 }}>Hi, Ritesh</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 15 }}>You have {data.invoices.filter(i => i.status === 'PENDING').length} pending payment(s)</Text>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>MAINTENANCE DUE</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>${pendingDues.toFixed(2)}</Text>
          </View>
          <TouchableOpacity onPress={() => {/* In App.js we can't easily switch tab from child component without passing a prop, but let's mock it for now */ Alert.alert('Notice', 'Go to Payments tab to pay.')}} style={{ backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: '#0ea5e9', fontWeight: 'bold' }}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 }}>
        <TouchableOpacity style={styles.gridBtnAlt} onPress={() => setModalVisible('invite')}>
          <View style={[styles.gridIconBubble, {backgroundColor: '#e0e7ff'}]}><MaterialIcons name="person-add" size={24} color="#4f46e5" /></View>
          <Text style={styles.gridBtnTextAlt}>Invite{"\n"}Visitor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridBtnAlt} onPress={() => setModalVisible('complaint')}>
          <View style={[styles.gridIconBubble, {backgroundColor: '#f3e8ff'}]}><MaterialIcons name="support-agent" size={24} color="#9333ea" /></View>
          <Text style={styles.gridBtnTextAlt}>Raise{"\n"}Issue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridBtnAlt} onPress={() => setModalVisible('facility')}>
          <View style={[styles.gridIconBubble, {backgroundColor: '#dcfce7'}]}><MaterialIcons name="pool" size={24} color="#16a34a" /></View>
          <Text style={styles.gridBtnTextAlt}>Book{"\n"}Facility</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gridBtnAlt, {width: '100%', height: 60, flexDirection: 'row', backgroundColor: '#fee2e2', marginTop: 10}]} onPress={triggerSOS}>
          <MaterialIcons name="emergency" size={24} color="#dc2626" />
          <Text style={{ color: '#dc2626', fontWeight: 'bold', marginLeft: 10, fontSize: 16 }}>SOS Emergency</Text>
        </TouchableOpacity>
      </View>

      {data.bookings && data.bookings.length > 0 && (
        <View style={{marginBottom: 20}}>
          <Text style={styles.sectionTitle}>Active Passes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {data.bookings.map(b => (
              <View key={b.id} style={{backgroundColor: '#fff', padding: 15, borderRadius: 12, marginRight: 15, width: 220, borderWidth: 1, borderColor: '#e2e8f0'}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center'}}>
                  <View style={{width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center'}}>
                    <MaterialIcons name={b.facility.icon.replace(/_/g, '-')} size={16} color="#0ea5e9" />
                  </View>
                  <Text style={{fontSize: 10, color: '#16a34a', fontWeight: 'bold', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, overflow: 'hidden'}}>{b.status}</Text>
                </View>
                <Text style={{fontWeight: 'bold', color: '#1e293b', fontSize: 16}}>{b.facility.name}</Text>
                <Text style={{fontSize: 12, color: '#64748b', marginTop: 5}}>Starts: {new Date(b.date).toLocaleDateString()}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {data.notices.length === 0 ? <Text style={{color: '#94a3b8'}}>No recent activity.</Text> : data.notices.slice(0,3).map(n => (
        <View key={n.id} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#0ea5e9' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1e293b' }}>{n.title}</Text>
          <Text style={{ color: '#64748b', marginVertical: 5 }}>{n.content}</Text>
        </View>
      ))}
      <View style={{height: 50}} />

      {/* Invites Modal */}
      <Modal visible={modalVisible === 'invite'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Invite Visitor</Text><TouchableOpacity onPress={() => {setModalVisible(null); setGeneratedQr(null); setForm({});}}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              {generatedQr ? (
                <View style={{alignItems: 'center'}}>
                  <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 10}}>Pass Generated!</Text>
                  <View style={{padding: 20, backgroundColor: '#fff', borderRadius: 10, marginBottom: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 5, shadowOffset: {width: 0, height: 2}, shadowRadius: 5}}>
                    <QRCode value={generatedQr} size={200} getRef={(c) => (qrRef.current = c)} />
                    <Text style={{fontSize: 24, fontWeight: 'bold', letterSpacing: 5, marginTop: 15}}>{generatedQr}</Text>
                  </View>
                  <TouchableOpacity style={[styles.buttonPrimary, {backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', marginBottom: 15, width: '100%', justifyContent: 'center'}]} onPress={shareQR}>
                    <MaterialIcons name="share" size={20} color="#fff" />
                    <Text style={[styles.buttonText, {marginLeft: 10}]}>Share Pass & Token</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.buttonPrimary, {width: '100%'}]} onPress={() => {setModalVisible(null); setGeneratedQr(null); setForm({}); loadData();}}><Text style={styles.buttonText}>Done</Text></TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Visitor Name</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({...form, name: t})} />
                  <Text style={styles.inputLabel}>Guests Count</Text>
                  <TextInput style={styles.textInput} keyboardType="numeric" onChangeText={t => setForm({...form, guestCount: t})} />
                  <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20}]} onPress={handleInvite}><Text style={styles.buttonText}>Generate Pass</Text></TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Complaint Modal */}
      <Modal visible={modalVisible === 'complaint'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Raise Complaint</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Issue Description</Text>
              <TextInput style={[styles.textInput, {minHeight: 100, textAlignVertical: 'top'}]} multiline placeholder="E.g., The elevator in Tower B is making strange noises..." onChangeText={t => setForm({...form, title: t})} />
              <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}]} onPress={handleComplaint}>
                <MaterialIcons name="send" size={20} color="#fff" style={{marginRight: 8}}/>
                <Text style={styles.buttonText}>Submit Issue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Facility Modal */}
      <Modal visible={modalVisible === 'facility'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Book Facility</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <ScrollView style={{ padding: 20, maxHeight: 400 }}>
              {!form.facilityId ? data.facilities.map(f => (
                <TouchableOpacity key={f.id} style={{backgroundColor: '#f8fafc', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0'}} onPress={() => setForm({...form, facilityId: f.id, facilityObj: f})}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <View style={{width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', marginRight: 15}}>
                      <MaterialIcons name={f.icon ? f.icon.replace(/_/g, '-') : 'pool'} size={24} color="#0ea5e9" />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={{fontWeight: 'bold', fontSize: 16, color: '#1e293b'}}>{f.name}</Text>
                      <Text style={{fontSize: 12, color: '#64748b', marginTop: 2}}>{f.description}</Text>
                    </View>
                    <View style={{alignItems: 'flex-end'}}>
                      <Text style={{color: '#0ea5e9', fontWeight: 'bold', fontSize: 18}}>${f.rate}</Text>
                      <Text style={{fontSize: 10, color: '#94a3b8', textTransform: 'uppercase'}}>per {f.validity}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )) : (
                <>
                  <View style={{backgroundColor: '#e0f2fe', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#bae6fd'}}>
                    <MaterialIcons name={form.facilityObj?.icon ? form.facilityObj.icon.replace(/_/g, '-') : 'pool'} size={40} color="#0284c7" style={{marginBottom: 10}}/>
                    <Text style={{fontSize: 18, fontWeight: 'bold', color: '#0369a1'}}>{form.facilityObj?.name}</Text>
                    <Text style={{fontSize: 14, color: '#0284c7', fontWeight: 'bold', marginTop: 5}}>${form.facilityObj?.rate} / {form.facilityObj?.validity}</Text>
                  </View>
                  
                  <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({...form, date: t})} placeholder="2026-09-03" />
                  
                  {form.facilityObj?.validity === 'Daily' && (
                    <>
                      <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
                      <TextInput style={styles.textInput} onChangeText={t => setForm({...form, endDate: t})} placeholder="2026-09-04" />
                    </>
                  )}
                  
                  <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}]} onPress={handleBook}>
                    <MaterialIcons name="payments" size={20} color="#fff" style={{marginRight: 8}}/>
                    <Text style={styles.buttonText}>Pay & Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{marginTop: 15, alignItems: 'center'}} onPress={() => setForm({})}><Text style={{color: '#64748b', fontWeight: 'bold'}}>Back to Facilities</Text></TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ResidentComplaintsTab({ complaints, loadData }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({});

  const handleComplaint = async () => {
    try {
      await fetch(`${API_URL}/api/resident/complaints`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(form) });
      Alert.alert("Success", "Complaint raised!");
      setModalVisible(false); setForm({}); loadData();
    } catch(e) {}
  };

  return (
    <View style={{ flex: 1, padding: 15 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Text style={styles.sectionTitle}>My Complaints</Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={loadData} style={{marginRight: 15}}><MaterialIcons name="refresh" size={24} color="#64748b" /></TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={{backgroundColor: '#0ea5e9', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8}}>
            <Text style={{color: '#fff', fontWeight: 'bold'}}>Raise Issue</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {complaints.length === 0 ? (
        <View style={{padding: 40, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0'}}>
          <MaterialIcons name="done-all" size={40} color="#94a3b8" style={{marginBottom: 10, opacity: 0.5}} />
          <Text style={{color: '#64748b', fontSize: 16}}>You have no active complaints.</Text>
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold', color: '#1e293b', flex: 1, fontSize: 16 }} numberOfLines={2} ellipsizeMode="tail">{item.title}</Text>
                <View style={{ backgroundColor: item.status === 'OPEN' ? '#fef3c7' : item.status === 'IN_PROGRESS' ? '#e0f2fe' : '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 10, borderWidth: 1, borderColor: item.status === 'OPEN' ? '#fde68a' : item.status === 'IN_PROGRESS' ? '#bae6fd' : '#bbf7d0' }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: item.status === 'OPEN' ? '#d97706' : item.status === 'IN_PROGRESS' ? '#0369a1' : '#15803d' }}>{item.status}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          )}
        />
      )}

      {/* Complaint Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Raise Complaint</Text><TouchableOpacity onPress={() => setModalVisible(false)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Issue Description</Text>
              <TextInput style={[styles.textInput, {minHeight: 100, textAlignVertical: 'top'}]} multiline placeholder="E.g., The elevator in Tower B is making strange noises..." onChangeText={t => setForm({...form, title: t})} />
              <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}]} onPress={handleComplaint}>
                <MaterialIcons name="send" size={20} color="#fff" style={{marginRight: 8}}/>
                <Text style={styles.buttonText}>Submit Issue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ResidentPaymentsTab({ invoices, loadData }) {
  const handlePay = async (id) => {
    try {
      await fetch(`${API_URL}/api/resident/pay`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ invoiceId: id }) });
      Alert.alert("Success", "Payment processed!");
      loadData();
    } catch(e) {}
  };

  return (
    <View style={{ flex: 1, padding: 15 }}>
      <Text style={styles.sectionTitle}>Pending Dues</Text>
      <FlatList
        data={invoices.filter(i => i.status === 'PENDING')}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#fca5a5' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1e293b' }}>{item.title}</Text>
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold' }}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0ea5e9' }}>${item.amount.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.buttonPrimary} onPress={() => handlePay(item.id)}>
              <Text style={styles.buttonText}>Pay Now</Text>
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          <View style={{marginTop: 20}}>
            <Text style={styles.sectionTitle}>History</Text>
            {invoices.filter(i => i.status === 'PAID').map(item => (
              <View key={item.id} style={{ backgroundColor: '#f8fafc', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontWeight: 'bold', color: '#64748b' }}>{item.title}</Text>
                  <Text style={{ fontSize: 10, color: '#94a3b8' }}>Paid: {new Date(item.paidAt).toLocaleDateString()}</Text>
                </View>
                <Text style={{ fontWeight: 'bold', color: '#64748b' }}>${item.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        }
      />
    </View>
  );
}

function ResidentProfileTab({ data, onLogout, loadData }) {
  const [modalVisible, setModalVisible] = useState(null);
  const [form, setForm] = useState({});
  const [profile, setProfile] = useState({ name: 'Ritesh', email: 'ritesh@example.com', phone: '+1 (555) 123-4567' });
  const [privacy, setPrivacy] = useState({ password: '', confirm: '' });

  const handleFamily = async (action, id = null) => {
    try {
      await fetch(`${API_URL}/api/resident/family`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action, id, ...form }) });
      setModalVisible(null); setForm({}); loadData();
    } catch(e) {}
  };

  const handleVehicle = async (action, id = null) => {
    try {
      await fetch(`${API_URL}/api/resident/vehicles`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action, id, ...form }) });
      setModalVisible(null); setForm({}); loadData();
    } catch(e) {}
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' }}>
        <View style={{ height: 80, backgroundColor: '#e0e7ff' }}></View>
        <View style={{ padding: 20, paddingTop: 40, alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: -30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1 }}>
            <Text style={{ fontSize: 30 }}>👨‍💼</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b' }}>{profile.name}</Text>
          <Text style={{ color: '#64748b', marginBottom: 20 }}>Resident • Unit 402</Text>

          <View style={{ width: '100%', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 15, paddingBottom: 15, borderBottomWidth: 1 }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
              <Text style={{fontWeight: 'bold', color: '#64748b'}}>FAMILY MEMBERS ({data.familyMembers?.length || 0})</Text>
              <TouchableOpacity onPress={() => setModalVisible('addFamily')}><MaterialIcons name="add-circle" size={24} color="#0ea5e9" /></TouchableOpacity>
            </View>
            {data.familyMembers?.map(m => (
              <View key={m.id} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 5}}>
                <View>
                  <Text style={{fontWeight: 'bold'}}>{m.name}</Text>
                  <Text style={{fontSize: 10, color: '#0ea5e9', fontWeight: 'bold'}}>{m.relationship}</Text>
                </View>
                <TouchableOpacity onPress={() => handleFamily('remove', m.id)}><MaterialIcons name="delete" size={20} color="#ef4444" /></TouchableOpacity>
              </View>
            ))}
          </View>
          
          <View style={{ width: '100%', paddingTop: 15 }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
              <Text style={{fontWeight: 'bold', color: '#64748b'}}>VEHICLES ({data.vehicles?.length || 0})</Text>
              <TouchableOpacity onPress={() => setModalVisible('addVehicle')}><MaterialIcons name="add-circle" size={24} color="#0ea5e9" /></TouchableOpacity>
            </View>
            {data.vehicles?.map(v => (
              <View key={v.id} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 5}}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <MaterialIcons name={v.type === 'Car' ? 'directions-car' : 'two-wheeler'} size={20} color="#94a3b8" style={{marginRight: 10}}/>
                  <View>
                    <Text style={{fontWeight: 'bold'}}>{v.makeModel}</Text>
                    <Text style={{fontSize: 10, color: '#64748b'}}>{v.registration}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleVehicle('remove', v.id)}><MaterialIcons name="delete" size={20} color="#ef4444" /></TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity onPress={() => setModalVisible('account')} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><MaterialIcons name="settings" size={24} color="#64748b" /><Text style={{ marginLeft: 10, fontWeight: 'bold', color: '#1e293b' }}>Account Settings</Text></View>
        <MaterialIcons name="chevron-right" size={24} color="#64748b" />
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => setModalVisible('privacy')} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><MaterialIcons name="lock" size={24} color="#64748b" /><Text style={{ marginLeft: 10, fontWeight: 'bold', color: '#1e293b' }}>Privacy & Security</Text></View>
        <MaterialIcons name="chevron-right" size={24} color="#64748b" />
      </TouchableOpacity>

      <View style={{height: 50}} />

      {/* Add Family Modal */}
      <Modal visible={modalVisible === 'addFamily'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Add Family Member</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Member Name</Text>
              <TextInput style={styles.textInput} onChangeText={t => setForm({...form, name: t})} />
              <Text style={styles.inputLabel}>Relationship</Text>
              <TextInput style={styles.textInput} onChangeText={t => setForm({...form, relationship: t})} />
              <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20}]} onPress={() => handleFamily('add')}><Text style={styles.buttonText}>Add Member</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Settings Modal */}
      <Modal visible={modalVisible === 'account'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Account Settings</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput style={styles.textInput} value={profile.name} onChangeText={t => setProfile({...profile, name: t})} />
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput style={styles.textInput} value={profile.email} onChangeText={t => setProfile({...profile, email: t})} />
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput style={styles.textInput} value={profile.phone} onChangeText={t => setProfile({...profile, phone: t})} />
              <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20}]} onPress={() => { Alert.alert("Success", "Profile updated"); setModalVisible(null); }}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Settings Modal */}
      <Modal visible={modalVisible === 'privacy'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Privacy & Security</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Change Password</Text>
              <TextInput style={styles.textInput} secureTextEntry placeholder="New Password" value={privacy.password} onChangeText={t => setPrivacy({...privacy, password: t})} />
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput style={styles.textInput} secureTextEntry placeholder="Confirm New Password" value={privacy.confirm} onChangeText={t => setPrivacy({...privacy, confirm: t})} />
              <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20}]} onPress={() => { Alert.alert("Success", "Security settings updated"); setModalVisible(null); setPrivacy({ password: '', confirm: '' }); }}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={onLogout} style={{ marginTop: 20, padding: 15, backgroundColor: '#fee2e2', borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
        <MaterialIcons name="logout" size={20} color="#ef4444" style={{marginRight: 8}}/>
        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Logout</Text>
      </TouchableOpacity>

      {/* Add Vehicle Modal */}
      <Modal visible={modalVisible === 'addVehicle'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Add Vehicle</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Type (Car/Bike)</Text>
              <TextInput style={styles.textInput} onChangeText={t => setForm({...form, type: t})} />
              <Text style={styles.inputLabel}>Make & Model</Text>
              <TextInput style={styles.textInput} onChangeText={t => setForm({...form, makeModel: t})} />
              <Text style={styles.inputLabel}>Registration Plate</Text>
              <TextInput style={styles.textInput} onChangeText={t => setForm({...form, registration: t})} />
              <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20}]} onPress={() => handleVehicle('add')}><Text style={styles.buttonText}>Add Vehicle</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ==========================================
// 3. GUARD DASHBOARD (Pre-existing)
// ==========================================
function GuardMainDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#e8eefc" />
      
      <View style={styles.topHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.avatarBubble}>
            <Text style={styles.avatarText}>MG</Text>
          </View>
          <View>
            <Text style={styles.headerGateText}>Main Gate 1</Text>
            <Text style={styles.headerOfficerText}>Officer Jenkins</Text>
          </View>
        </View>
      </View>

      <View style={styles.contentArea}>
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'scan' && <ScanTab />}
        {activeTab === 'profile' && <ProfileTab onLogout={onLogout} />}
      </View>

      <View style={styles.bottomNav}>
        <NavButton id="home" icon="home" label="Home" activeTab={activeTab} onPress={setActiveTab} />
        <NavButton id="logs" icon="list-alt" label="Logs" activeTab={activeTab} onPress={setActiveTab} />
        <NavButton id="scan" icon="qr-code-scanner" label="Scan" activeTab={activeTab} onPress={setActiveTab} />
        <NavButton id="profile" icon="person" label="Profile" activeTab={activeTab} onPress={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

function NavButton({ id, icon, label, activeTab, onPress }) {
  const isActive = activeTab === id;
  return (
    <TouchableOpacity style={styles.navButton} onPress={() => onPress(id)}>
      <View style={[styles.navIconContainer, isActive && styles.navIconActive]}>
        <MaterialIcons name={icon} size={24} color={isActive ? "#033882" : "#64748b"} />
      </View>
      <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// GUARD TABS
function HomeTab() {
  const [visitors, setVisitors] = useState([]);
  const [modalVisible, setModalVisible] = useState(null);
  const [form, setForm] = useState({});

  const loadVisitors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/visitors`);
      if (response.ok) {
        const data = await response.json();
        setVisitors(data.visitors || []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadVisitors(); }, []);

  const triggerEmergency = async () => {
    Alert.alert("Emergency", "Trigger Gate Emergency?", [
      { text: "Cancel", style: "cancel" },
      { text: "TRIGGER", style: "destructive", onPress: async () => {
        try {
          await fetch(`${API_URL}/api/emergency`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ title: 'GATE EMERGENCY', author: 'Officer Jenkins (Main Gate 1)' }) });
          Alert.alert("Sent", "Emergency SOS triggered.");
        } catch(e) {}
      }}
    ]);
  };

  const handleAction = async (actionType) => {
    let payload = { type: actionType, ...form };
    try {
      const res = await fetch(`${API_URL}/api/visitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        Alert.alert("Success", `${actionType} logged successfully!`);
        setModalVisible(null); setForm({}); loadVisitors();
      }
    } catch (e) { Alert.alert("Error", "Failed to log entry."); }
  };

  const updateStatus = async (id, status) => {
    try {
      await fetch(`${API_URL}/api/visitors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      loadVisitors();
    } catch(e) {}
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={visitors}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.visitorCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={styles.visitorIconBubble}><MaterialIcons name={item.icon === 'local_shipping' ? 'local-shipping' : item.icon === 'directions_car' ? 'directions-car' : 'person'} size={24} color="#64748b" /></View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.visitorName}>{item.name}</Text>
                <Text style={styles.visitorDest}>Destination: {item.destination}</Text>
                <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{item.status}</Text></View>
              </View>
            </View>
            {item.icon === 'person' ? (
              <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => updateStatus(item.id, 'Entered')}><Text style={styles.actionBtnText}>Log Entry</Text></TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.actionBtnPrimary, {flex:1}]} onPress={() => updateStatus(item.id, 'Entered')}><Text style={styles.actionBtnText}>Allow</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtnSecondary, {flex:1}]} onPress={() => updateStatus(item.id, 'Denied')}><Text style={styles.actionBtnTextSecondary}>Deny</Text></TouchableOpacity>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={{ padding: 15 }}
        ListHeaderComponent={
          <>
            <View style={styles.gridContainer}>
              <TouchableOpacity style={styles.gridBtn} onPress={() => setModalVisible('visitor')}>
                <View style={styles.gridIconBubble}><MaterialIcons name="person-add" size={28} color="#1c3671" /></View>
                <Text style={styles.gridBtnText}>Visitor{"\n"}Entry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => setModalVisible('delivery')}>
                <View style={styles.gridIconBubble}><MaterialIcons name="local-shipping" size={28} color="#1c3671" /></View>
                <Text style={styles.gridBtnText}>Delivery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => setModalVisible('vehicle')}>
                <View style={styles.gridIconBubble}><MaterialIcons name="directions-car" size={28} color="#1c3671" /></View>
                <Text style={styles.gridBtnText}>Vehicle{"\n"}Entry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.gridBtn, {backgroundColor: '#ba1a1a'}]} onPress={triggerEmergency}>
                <View style={[styles.gridIconBubble, {backgroundColor: 'rgba(255,255,255,0.2)'}]}><MaterialIcons name="emergency" size={28} color="#fff" /></View>
                <Text style={[styles.gridBtnText, {color: '#fff'}]}>Emergency</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.sectionTitle}>Visitors Waiting ({visitors.length})</Text>
              <TouchableOpacity onPress={loadVisitors} style={{ padding: 5 }}><MaterialIcons name="refresh" size={24} color="#033882" /></TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={<View style={styles.emptyBox}><MaterialIcons name="task-alt" size={40} color="#94a3b8" /><Text style={styles.emptyText}>All clear!</Text></View>}
      />

      <Modal visible={modalVisible !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalVisible === 'visitor' ? 'Visitor Entry' : modalVisible === 'delivery' ? 'Log Delivery' : 'Log Vehicle'}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(null); setForm({}); }}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              {modalVisible === 'visitor' && (
                <>
                  <Text style={styles.inputLabel}>Visitor Name</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({...form, name: t})} />
                  <Text style={styles.inputLabel}>Destination</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({...form, destination: t})} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                    <View style={{ flex: 1, marginRight: 5 }}>
                      <Text style={styles.inputLabel}>Age</Text>
                      <TextInput style={styles.textInput} keyboardType="numeric" onChangeText={t => setForm({...form, age: t})} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 5 }}>
                      <Text style={styles.inputLabel}>Guests</Text>
                      <TextInput style={styles.textInput} keyboardType="numeric" onChangeText={t => setForm({...form, guestCount: t})} />
                    </View>
                  </View>
                </>
              )}
              {modalVisible === 'delivery' && (
                <>
                  <Text style={styles.inputLabel}>Vendor/Company Name</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({...form, vendor: t})} />
                  <Text style={styles.inputLabel}>Destination (Unit/Flat)</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({...form, destination: t})} />
                </>
              )}
              {modalVisible === 'vehicle' && (
                <>
                  <Text style={styles.inputLabel}>Vehicle Registration</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({...form, registration: t})} />
                  <Text style={styles.inputLabel}>Destination (Unit/Flat)</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({...form, destination: t})} />
                </>
              )}
              <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20}]} onPress={() => handleAction(modalVisible)}><Text style={styles.buttonText}>Log Entry</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { fetch(`${API_URL}/api/logs`).then(r => r.json()).then(d => setLogs(d.logs || [])).catch(e => console.error(e)); }, []);
  return (
    <View style={{ flex: 1, padding: 15 }}>
      <Text style={styles.sectionTitle}>Gate History</Text>
      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.logCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.visitorIconBubble, {width: 40, height: 40}]}><MaterialIcons name={item.icon === 'local_shipping' ? 'local-shipping' : item.icon === 'directions_car' ? 'directions-car' : 'person'} size={20} color="#64748b" /></View>
              <View style={{ marginLeft: 10 }}><Text style={{ fontWeight: 'bold', color: '#1e293b' }}>{item.name}</Text><Text style={{ fontSize: 12, color: '#64748b' }}>To: {item.destination}</Text></View>
            </View>
            <View style={{ alignItems: 'flex-end' }}><Text style={{ fontSize: 10, fontWeight: 'bold', color: item.status === 'Entered' ? '#15803d' : '#b91c1c', backgroundColor: item.status === 'Entered' ? '#dcfce7' : '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' }}>{item.status.toUpperCase()}</Text></View>
          </View>
        )}
      />
    </View>
  );
}

function ScanTab() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [token, setToken] = useState('');

  if (!permission) return <View />;

  const verifyToken = async (qrToken) => {
    try {
      const res = await fetch(`${API_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: qrToken })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Access Granted", data.message);
        setToken(''); // Reset manual entry input on success
      } else {
        Alert.alert("Access Denied", data.message || "Invalid Pass");
      }
    } catch (e) {
      Alert.alert("Error", "Could not verify token. Check connection.");
    } finally {
      setTimeout(() => setScanned(false), 3000); // Allow scanning again after 3 seconds
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    verifyToken(data.trim().toUpperCase());
  };

  const handleManualVerify = () => {
    if (!token.trim()) return;
    setScanned(true);
    verifyToken(token.trim().toUpperCase());
  };

  return (
    <View style={{ flex: 1, padding: 20, alignItems: 'center' }}>
      <Text style={[styles.sectionTitle, {alignSelf: 'flex-start'}]}>Scan Resident Pass</Text>
      
      {!permission.granted ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{textAlign: 'center', marginBottom: 20}}>We need your permission to show the camera</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.buttonPrimary}><Text style={styles.buttonText}>Grant Permission</Text></TouchableOpacity>
        </View>
      ) : (
        <View style={{ width: 300, height: 300, borderRadius: 20, overflow: 'hidden', marginBottom: 30 }}>
          <CameraView 
            style={StyleSheet.absoluteFillObject} 
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
        </View>
      )}

      <Text style={{fontWeight: 'bold', color: '#64748b', marginBottom: 10, alignSelf: 'flex-start'}}>Or enter token manually:</Text>
      <View style={{flexDirection: 'row', width: '100%'}}>
        <TextInput value={token} onChangeText={setToken} style={[styles.textInput, {flex: 1, marginRight: 10, textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase'}]} placeholder="TOKEN" />
        <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 0, justifyContent: 'center', paddingHorizontal: 30}]} onPress={handleManualVerify} disabled={scanned}><Text style={styles.buttonText}>Verify</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function ProfileTab({ onLogout }) {
  const [modalVisible, setModalVisible] = useState(null);
  const [profile, setProfile] = useState({ name: 'Officer Jenkins', email: 'jenkins@security.com', phone: '+1 (555) 019-2034' });
  const [privacy, setPrivacy] = useState({ password: '', confirm: '' });

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
        <View style={{ backgroundColor: '#1c3671', height: 80 }} />
        <View style={{ padding: 20, alignItems: 'center', marginTop: -40 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 10 }}>
            <Text style={{ fontSize: 40 }}>👮</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b' }}>{profile.name}</Text>
          <Text style={{ color: '#64748b', marginBottom: 20 }}>Security Guard • Main Gate 1</Text>
          
          <View style={{ width: '100%', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <MaterialIcons name="schedule" size={24} color="#033882" />
              <View style={{ marginLeft: 15 }}>
                <Text style={{ fontSize: 10, color: '#64748b', fontWeight: 'bold' }}>CURRENT SHIFT</Text>
                <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>08:00 AM - 08:00 PM</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <MaterialIcons name="badge" size={24} color="#033882" />
              <View style={{ marginLeft: 15 }}>
                <Text style={{ fontSize: 10, color: '#64748b', fontWeight: 'bold' }}>BADGE NUMBER</Text>
                <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>SEC-8291</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="phone" size={24} color="#033882" />
              <View style={{ marginLeft: 15 }}>
                <Text style={{ fontSize: 10, color: '#64748b', fontWeight: 'bold' }}>SUPERVISOR HELPLINE</Text>
                <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>+1 (555) 019-2034</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      
      <TouchableOpacity onPress={() => setModalVisible('account')} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><MaterialIcons name="settings" size={24} color="#64748b" /><Text style={{ marginLeft: 10, fontWeight: 'bold', color: '#1e293b' }}>Account Settings</Text></View>
        <MaterialIcons name="chevron-right" size={24} color="#64748b" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setModalVisible('privacy')} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><MaterialIcons name="lock" size={24} color="#64748b" /><Text style={{ marginLeft: 10, fontWeight: 'bold', color: '#1e293b' }}>Privacy & Security</Text></View>
        <MaterialIcons name="chevron-right" size={24} color="#64748b" />
      </TouchableOpacity>

      <Modal visible={modalVisible === 'account'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Account Settings</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput style={styles.textInput} value={profile.name} onChangeText={t => setProfile({...profile, name: t})} />
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput style={styles.textInput} value={profile.email} onChangeText={t => setProfile({...profile, email: t})} />
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput style={styles.textInput} value={profile.phone} onChangeText={t => setProfile({...profile, phone: t})} />
              <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20}]} onPress={() => { Alert.alert("Success", "Profile updated"); setModalVisible(null); }}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible === 'privacy'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Privacy & Security</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Change Password</Text>
              <TextInput style={styles.textInput} secureTextEntry placeholder="New Password" value={privacy.password} onChangeText={t => setPrivacy({...privacy, password: t})} />
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput style={styles.textInput} secureTextEntry placeholder="Confirm New Password" value={privacy.confirm} onChangeText={t => setPrivacy({...privacy, confirm: t})} />
              <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20}]} onPress={() => { Alert.alert("Success", "Security settings updated"); setModalVisible(null); setPrivacy({ password: '', confirm: '' }); }}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={onLogout} style={{ marginTop: 20, padding: 15, backgroundColor: '#fee2e2', borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
        <MaterialIcons name="logout" size={20} color="#ef4444" style={{ marginRight: 10 }} />
        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>LOGOUT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ==========================================
// 4. SECRETARY DASHBOARD
// ==========================================
function SecretaryMainDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState({ complaints: [], visitors: [], users: [] });
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    fetch(`${API_URL}/api/secretary/data`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  return (
    <SafeAreaView style={styles.mainContainer}>
      <View style={[styles.topHeader, {backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.avatarBubble, {backgroundColor: '#e0e7ff'}]}>
            <Text style={{color: '#3730a3', fontWeight: 'bold'}}>SC</Text>
          </View>
          <View>
            <Text style={{fontSize: 18, fontWeight: 'bold', color: '#1e40af'}}>Secretary Hub</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onLogout} style={{padding: 4, borderRadius: 20}}>
          <MaterialIcons name="logout" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentArea}>
        {loading ? (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" color="#0ea5e9"/></View>
        ) : (
          <>
            {activeTab === 'home' && <SecretaryHomeTab data={data} loadData={loadData} />}
            {activeTab === 'finances' && <SecretaryFinancesTab />}
            {activeTab === 'requests' && <SecretaryRequestsTab data={data} loadData={loadData} />}
            {activeTab === 'settings' && <SecretarySettingsTab />}
          </>
        )}
      </View>

      <View style={styles.bottomNav}>
        <NavButton id="home" icon="dashboard" label="Home" activeTab={activeTab} onPress={setActiveTab} />
        <NavButton id="finances" icon="account-balance" label="Finances" activeTab={activeTab} onPress={setActiveTab} />
        <NavButton id="requests" icon="assignment" label="Requests" activeTab={activeTab} onPress={setActiveTab} />
        <NavButton id="settings" icon="settings" label="Settings" activeTab={activeTab} onPress={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

function SecretaryHomeTab({ data, loadData }) {
  const [modalVisible, setModalVisible] = useState(null);
  const [form, setForm] = useState({ role: 'Resident' });

  const activeComplaints = data.complaints.filter(c => c.status === 'OPEN');

  const handleBroadcast = async () => {
    try {
      await fetch(`${API_URL}/api/secretary/notice`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(form) });
      Alert.alert("Success", "Notice Broadcasted!");
      setModalVisible(null); setForm({ role: 'Resident' });
    } catch(e) {}
  };

  const handleUserAction = async (action, id = null) => {
    try {
      await fetch(`${API_URL}/api/secretary/users`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action, id, ...form }) });
      setModalVisible(null); setForm({ role: 'Resident' }); loadData();
    } catch(e) {}
  };

  const handleResolve = async (id) => {
    try {
      await fetch(`${API_URL}/api/secretary/complaints`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, status: 'RESOLVED' }) });
      loadData();
    } catch(e) {}
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <View style={[styles.gridContainer, {marginTop: 10, marginBottom: 20}]}>
        <TouchableOpacity style={[styles.gridBtnAlt, {width: '48%', minHeight: 120, padding: 15, justifyContent: 'center'}]} onPress={() => setModalVisible('users')}>
          <View style={[styles.gridIconBubble, {backgroundColor: '#e0e7ff', width: 50, height: 50, borderRadius: 25}]}><MaterialIcons name="groups" size={28} color="#4f46e5" /></View>
          <Text style={[styles.gridBtnTextAlt, {fontSize: 14, marginTop: 10, textAlign: 'center'}]}>Manage Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gridBtnAlt, {width: '48%', minHeight: 120, padding: 15, justifyContent: 'center'}]} onPress={() => setModalVisible('broadcast')}>
          <View style={[styles.gridIconBubble, {backgroundColor: '#f3e8ff', width: 50, height: 50, borderRadius: 25}]}><MaterialIcons name="campaign" size={28} color="#9333ea" /></View>
          <Text style={[styles.gridBtnTextAlt, {fontSize: 14, marginTop: 10, textAlign: 'center'}]}>Broadcast Notice</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Active Complaints ({activeComplaints.length})</Text>
      {activeComplaints.length === 0 ? <Text style={{color: '#94a3b8', marginBottom: 20}}>No active complaints.</Text> : activeComplaints.map(c => (
        <View key={c.id} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><MaterialIcons name="support-agent" size={20} color="#ef4444" /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>{c.title}</Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>{c.author}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleResolve(c.id)} style={{ backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
            <Text style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: 10 }}>RESOLVE</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={[styles.sectionTitle, {marginTop: 10}]}>Expected Visitors ({data.visitors.length})</Text>
      {data.visitors.length === 0 ? <Text style={{color: '#94a3b8'}}>No visitors today.</Text> : data.visitors.map(v => (
        <View key={v.id} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><MaterialIcons name="person" size={20} color="#4f46e5" /></View>
            <View>
              <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>{v.name}</Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>To: {v.destination}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0ea5e9', backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' }}>EXPECTED</Text>
        </View>
      ))}
      <View style={{height: 50}} />

      {/* Broadcast Modal */}
      <Modal visible={modalVisible === 'broadcast'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Broadcast Notice</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Notice Title</Text>
              <TextInput style={styles.textInput} onChangeText={t => setForm({...form, title: t})} />
              <Text style={styles.inputLabel}>Content</Text>
              <TextInput style={[styles.textInput, {height: 100}]} multiline onChangeText={t => setForm({...form, content: t})} />
              <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20}]} onPress={handleBroadcast}><Text style={styles.buttonText}>Send Broadcast</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Users Modal */}
      <Modal visible={modalVisible === 'users'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {maxHeight: '90%'}]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Manage Users</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <ScrollView style={{ padding: 20 }}>
              <View style={{ backgroundColor: '#f8fafc', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 }}>
                <Text style={{fontWeight: 'bold', marginBottom: 10}}>Add New User</Text>
                <TextInput style={[styles.textInput, {marginBottom: 10, backgroundColor: '#fff'}]} placeholder="Full Name" onChangeText={t => setForm({...form, name: t})} />
                <View style={{flexDirection: 'row', marginBottom: 10}}>
                  <TouchableOpacity onPress={() => setForm({...form, role: 'Resident'})} style={{flex: 1, backgroundColor: form.role === 'Resident' ? '#0ea5e9' : '#fff', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderTopLeftRadius: 5, borderBottomLeftRadius: 5}}><Text style={{color: form.role === 'Resident' ? '#fff' : '#64748b', fontWeight: 'bold'}}>Resident</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setForm({...form, role: 'Guard'})} style={{flex: 1, backgroundColor: form.role === 'Guard' ? '#0ea5e9' : '#fff', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0'}}><Text style={{color: form.role === 'Guard' ? '#fff' : '#64748b', fontWeight: 'bold'}}>Guard</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setForm({...form, role: 'Secretary'})} style={{flex: 1, backgroundColor: form.role === 'Secretary' ? '#0ea5e9' : '#fff', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderTopRightRadius: 5, borderBottomRightRadius: 5}}><Text style={{color: form.role === 'Secretary' ? '#fff' : '#64748b', fontWeight: 'bold'}}>Secretary</Text></TouchableOpacity>
                </View>
                {form.role === 'Resident' && (
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <TextInput style={[styles.textInput, {flex: 1, marginRight: 5, backgroundColor: '#fff'}]} placeholder="Apt (e.g. 402)" onChangeText={t => setForm({...form, apartment: t})} />
                    <TextInput style={[styles.textInput, {flex: 1, marginLeft: 5, backgroundColor: '#fff'}]} placeholder="Tower (e.g. A)" onChangeText={t => setForm({...form, tower: t})} />
                  </View>
                )}
                <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 15}]} onPress={() => handleUserAction('create')}><Text style={styles.buttonText}>Add</Text></TouchableOpacity>
              </View>

              <Text style={{fontWeight: 'bold', marginBottom: 10}}>Registered Users ({data.users.length})</Text>
              {data.users.map(u => (
                <View key={u.id} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: '#f1f5f9'}}>
                  <View>
                    <Text style={{fontWeight: 'bold'}}>{u.name}</Text>
                    <Text style={{fontSize: 10, color: '#64748b'}}>{u.role} {u.role === 'Resident' && u.tower ? `• Tower ${u.tower}, Apt ${u.apartment}` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleUserAction('delete', u.id)}><MaterialIcons name="delete" size={20} color="#ef4444" /></TouchableOpacity>
                </View>
              ))}
              <View style={{height: 50}} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SecretaryFinancesTab() {
  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <Text style={[styles.sectionTitle, {fontSize: 24}]}>Financial Overview</Text>
      
      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
        <View style={{width: '48%', backgroundColor: '#0ea5e9', padding: 15, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.1}}>
          <MaterialIcons name="account-balance-wallet" size={24} color="#e0f2fe" style={{marginBottom: 5}}/>
          <Text style={{color: '#e0f2fe', fontSize: 10, fontWeight: 'bold'}}>TOTAL BALANCE</Text>
          <Text style={{color: '#fff', fontSize: 24, fontWeight: 'bold'}}>$45,230</Text>
        </View>
        <View style={{width: '48%', backgroundColor: '#fff', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#e2e8f0'}}>
          <MaterialIcons name="pending-actions" size={24} color="#f59e0b" style={{marginBottom: 5}}/>
          <Text style={{color: '#64748b', fontSize: 10, fontWeight: 'bold'}}>PENDING DUES</Text>
          <Text style={{color: '#1e293b', fontSize: 24, fontWeight: 'bold'}}>$3,150</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      <View style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><MaterialIcons name="arrow-downward" size={20} color="#16a34a" /></View>
          <View>
            <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>Maintenance Fee</Text>
            <Text style={{ fontSize: 12, color: '#64748b' }}>Unit 402 • Today</Text>
          </View>
        </View>
        <Text style={{ fontWeight: 'bold', color: '#16a34a' }}>+$150</Text>
      </View>
      <View style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><MaterialIcons name="arrow-upward" size={20} color="#ef4444" /></View>
          <View>
            <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>Plumbing Repair</Text>
            <Text style={{ fontSize: 12, color: '#64748b' }}>Vendor Payout • Yesterday</Text>
          </View>
        </View>
        <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>-$420</Text>
      </View>
    </ScrollView>
  );
}

function SecretaryRequestsTab({ data, loadData }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState(null);

  const handleCycleStatus = async (id, current) => {
    let newStatus = 'OPEN';
    if (current === 'OPEN') newStatus = 'IN_PROGRESS';
    else if (current === 'IN_PROGRESS') newStatus = 'RESOLVED';
    
    try {
      await fetch(`${API_URL}/api/secretary/complaints`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, status: newStatus }) });
      loadData();
      if(selected) setSelected({...selected, status: newStatus});
    } catch(e) {}
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <Text style={[styles.sectionTitle, {fontSize: 24, marginBottom: 20}]}>All Requests & Complaints</Text>
      
      {data.complaints.map(c => (
        <View key={c.id} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10}}>
            <View style={{flexDirection: 'row', flex: 1}}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><MaterialIcons name="assignment" size={20} color="#64748b" /></View>
              <View style={{flex: 1}}>
                <Text style={{ fontWeight: 'bold', color: '#1e293b', fontSize: 16 }}>{c.title}</Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>From: {c.author}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: c.status === 'OPEN' ? '#ef4444' : c.status === 'IN_PROGRESS' ? '#f59e0b' : '#16a34a', backgroundColor: c.status === 'OPEN' ? '#fee2e2' : c.status === 'IN_PROGRESS' ? '#fef3c7' : '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' }}>{c.status.replace('_', ' ')}</Text>
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 5}}>
            <TouchableOpacity onPress={() => handleCycleStatus(c.id, c.status)} style={{flex: 1, backgroundColor: '#e0e7ff', padding: 8, borderRadius: 8, alignItems: 'center', marginRight: 5}}>
              <Text style={{color: '#4f46e5', fontWeight: 'bold', fontSize: 10}}>UPDATE STATUS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {setSelected(c); setModalVisible(true);}} style={{flex: 1, backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8, alignItems: 'center', marginLeft: 5}}>
              <Text style={{color: '#64748b', fontWeight: 'bold', fontSize: 10}}>VIEW DETAILS</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <View style={{height: 50}} />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Complaint Details</Text><TouchableOpacity onPress={() => setModalVisible(false)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            {selected && (
              <View style={{ padding: 20 }}>
                <Text style={{fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 2}}>TITLE</Text>
                <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 15}}>{selected.title}</Text>
                
                <Text style={{fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 2}}>AUTHOR</Text>
                <Text style={{fontSize: 16, marginBottom: 15}}>{selected.author}</Text>
                
                <Text style={{fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 2}}>STATUS</Text>
                <Text style={{ fontSize: 12, alignSelf: 'flex-start', fontWeight: 'bold', color: selected.status === 'OPEN' ? '#ef4444' : selected.status === 'IN_PROGRESS' ? '#f59e0b' : '#16a34a', backgroundColor: selected.status === 'OPEN' ? '#fee2e2' : selected.status === 'IN_PROGRESS' ? '#fef3c7' : '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden', marginBottom: 15 }}>{selected.status.replace('_', ' ')}</Text>
                
                <Text style={{fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 2}}>LOGGED ON</Text>
                <Text style={{fontSize: 14, marginBottom: 15}}>{new Date(selected.createdAt).toLocaleString()}</Text>

                <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 10}]} onPress={() => {handleCycleStatus(selected.id, selected.status); setModalVisible(false);}}><Text style={styles.buttonText}>UPDATE STATUS</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SecretarySettingsTab() {
  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' }}>
        <View style={{ height: 80, backgroundColor: '#e0e7ff' }}></View>
        <View style={{ padding: 20, paddingTop: 40, alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: -30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1 }}>
            <Text style={{ fontSize: 30 }}>👩‍💼</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b' }}>Sarah Connor</Text>
          <Text style={{ color: '#64748b', marginBottom: 20 }}>Secretary • Metropolis Tower</Text>

          <View style={{ width: '100%', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 15, paddingBottom: 15 }}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}>
              <MaterialIcons name="email" size={24} color="#0ea5e9" style={{marginRight: 10}}/>
              <View>
                <Text style={{fontSize: 10, fontWeight: 'bold', color: '#64748b'}}>CONTACT</Text>
                <Text style={{fontWeight: 'bold', color: '#1e293b'}}>secretary@metropolis.com</Text>
              </View>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <MaterialIcons name="shield" size={24} color="#0ea5e9" style={{marginRight: 10}}/>
              <View>
                <Text style={{fontSize: 10, fontWeight: 'bold', color: '#64748b'}}>ACCESS LEVEL</Text>
                <Text style={{fontWeight: 'bold', color: '#1e293b'}}>Administrative</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function SecretaryProfileTab({ onLogout }) {
  const [modalVisible, setModalVisible] = useState(null);
  const [profile, setProfile] = useState({ name: 'Sarah Miller', email: 'sarah@estatepillar.com', phone: '+1 (555) 012-3456' });
  const [privacy, setPrivacy] = useState({ password: '', confirm: '' });

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
        <View style={{ backgroundColor: '#1e1b4b', height: 80 }} />
        <View style={{ padding: 20, alignItems: 'center', marginTop: -40 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 10 }}>
            <Text style={{ fontSize: 40 }}>👩‍💼</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b' }}>{profile.name}</Text>
          <Text style={{ color: '#64748b', marginBottom: 20 }}>Secretary • Administration</Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => setModalVisible('account')} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><MaterialIcons name="settings" size={24} color="#64748b" /><Text style={{ marginLeft: 10, fontWeight: 'bold', color: '#1e293b' }}>Account Settings</Text></View>
        <MaterialIcons name="chevron-right" size={24} color="#64748b" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setModalVisible('privacy')} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><MaterialIcons name="lock" size={24} color="#64748b" /><Text style={{ marginLeft: 10, fontWeight: 'bold', color: '#1e293b' }}>Privacy & Security</Text></View>
        <MaterialIcons name="chevron-right" size={24} color="#64748b" />
      </TouchableOpacity>

      <Modal visible={modalVisible === 'account'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Account Settings</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput style={styles.textInput} value={profile.name} onChangeText={t => setProfile({...profile, name: t})} />
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput style={styles.textInput} value={profile.email} onChangeText={t => setProfile({...profile, email: t})} />
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput style={styles.textInput} value={profile.phone} onChangeText={t => setProfile({...profile, phone: t})} />
              <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20}]} onPress={() => { Alert.alert("Success", "Profile updated"); setModalVisible(null); }}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible === 'privacy'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Privacy & Security</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Change Password</Text>
              <TextInput style={styles.textInput} secureTextEntry placeholder="New Password" value={privacy.password} onChangeText={t => setPrivacy({...privacy, password: t})} />
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput style={styles.textInput} secureTextEntry placeholder="Confirm New Password" value={privacy.confirm} onChangeText={t => setPrivacy({...privacy, confirm: t})} />
              <TouchableOpacity style={[styles.buttonPrimary, {marginTop: 20}]} onPress={() => { Alert.alert("Success", "Security settings updated"); setModalVisible(null); setPrivacy({ password: '', confirm: '' }); }}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={onLogout} style={{ marginTop: 20, padding: 15, backgroundColor: '#fee2e2', borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
        <MaterialIcons name="logout" size={20} color="#ef4444" style={{ marginRight: 10 }} />
        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>LOGOUT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  mainContainer: { flex: 1, backgroundColor: '#f1f5f9', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  loginContainer: { padding: 30 },
  logoText: { fontSize: 42, fontWeight: 'bold', color: '#38bdf8', marginBottom: 5 },
  subtitleText: { fontSize: 18, color: '#94a3b8', marginBottom: 20 },
  roleBtn: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 10, marginHorizontal: 4, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  roleBtnActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  roleBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  roleBtnTextActive: { color: '#fff' },
  inputContainer: { marginBottom: 20 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 15, color: '#fff', fontSize: 16 },
  buttonPrimary: { backgroundColor: '#0ea5e9', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  topHeader: { backgroundColor: '#e8eefc', padding: 15, paddingTop: 10, shadowColor: '#000', shadowOpacity: 0.05, zIndex: 10 },
  avatarBubble: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1c3671', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  headerGateText: { fontSize: 18, fontWeight: 'bold', color: '#03204c' },
  headerOfficerText: { fontSize: 12, color: '#03204c', opacity: 0.7 },
  
  contentArea: { flex: 1 },
  
  bottomNav: { flexDirection: 'row', backgroundColor: '#fff', height: 70, borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, elevation: 5 },
  navButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIconContainer: { paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 },
  navIconActive: { backgroundColor: '#e0e7ff' },
  navLabel: { fontSize: 10, color: '#64748b', marginTop: 4 },
  navLabelActive: { color: '#033882', fontWeight: 'bold' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  gridBtn: { width: '48%', backgroundColor: '#f6f8ff', padding: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center', height: 110, marginBottom: 10 },
  gridIconBubble: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e1e8f8', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  gridBtnText: { color: '#033882', fontWeight: 'bold', textAlign: 'center' },
  
  gridBtnAlt: { width: '31%', backgroundColor: '#fff', padding: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', height: 125, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  gridBtnTextAlt: { color: '#1e293b', fontWeight: 'bold', textAlign: 'center', fontSize: 13, marginTop: 2 },

  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  
  visitorCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#0ea5e9' },
  visitorIconBubble: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  visitorName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  visitorDest: { fontSize: 12, color: '#64748b' },
  statusBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginTop: 5 },
  statusBadgeText: { color: '#0369a1', fontSize: 10, fontWeight: 'bold' },
  actionBtnPrimary: { backgroundColor: '#1d4ed8', padding: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnSecondary: { backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold' },
  actionBtnTextSecondary: { color: '#64748b', fontWeight: 'bold' },

  logCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  emptyBox: { alignItems: 'center', padding: 30, backgroundColor: '#fff', borderRadius: 15, marginTop: 20 },
  emptyText: { color: '#94a3b8', marginTop: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
  modalHeader: { backgroundColor: '#1c3671', padding: 15, flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  inputLabel: { fontWeight: 'bold', color: '#1e293b', marginBottom: 5, marginTop: 15 },
  textInput: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, color: '#1e293b' }
});
