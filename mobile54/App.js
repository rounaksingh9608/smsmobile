import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, Alert, ActivityIndicator, FlatList, Modal, ScrollView, Platform, Vibration, Linking, Share, Image, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';


// IMPORTANT: Replace this with your computer's local IP address
const API_URL = 'https://sociohub-backend-0pz8.onrender.com';

function EmergencyListener() {
  const [activeEvent, setActiveEvent] = useState(null);
  const player = useAudioPlayer(null);

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
      } catch (e) { }
    }, 3000);
    return () => clearInterval(poller);
  }, [activeEvent]);

  useEffect(() => {
    if (activeEvent) {
      try {
        Vibration.vibrate([300, 100, 300, 100, 300], true);
        if (player) {
          player.replace({ uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' });
          player.loop = true;
          player.play();
        }
      } catch (e) { }
    } else {
      try {
        if (player) {
          player.pause();
          player.seekTo(0);
        }
      } catch (e) { }
      Vibration.cancel();
    }

    return () => {
      Vibration.cancel();
    };
  }, [activeEvent, player]);

  const handleResolve = async () => {
    if (activeEvent) {
      await fetch(`${API_URL}/api/emergency`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: activeEvent.id, status: 'RESOLVED' }) });
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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const role = await AsyncStorage.getItem('userRole');
        if (token && role) {
          setCurrentRole(role);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error(e);
      }
      setIsReady(true);
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userRole');
      setIsAuthenticated(false);
      setCurrentRole(null);
    } catch (e) { }
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#0066ff" />
      </View>
    );
  }

  let content;
  if (!isAuthenticated) {
    content = <LoginScreen onLogin={async (token, role) => {
      try {
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userRole', role.toLowerCase());
        setCurrentRole(role.toLowerCase());
        setIsAuthenticated(true);
      } catch (e) { }
    }} />;
  } else if (currentRole === 'resident') {
    content = <ResidentMainDashboard onLogout={handleLogout} />;
  } else if (currentRole === 'secretary') {
    content = <SecretaryMainDashboard onLogout={handleLogout} />;
  } else {
    content = <GuardMainDashboard onLogout={handleLogout} />;
  }

  return (
    <SafeAreaProvider>
      {content}
      {isAuthenticated && <EmergencyListener />}
    </SafeAreaProvider>
  );
}

// ==========================================
// 1. LOGIN SCREEN
// ==========================================
function LoginScreen({ onLogin }) {
  const [societies, setSocieties] = useState([]);
  const [societiesLoaded, setSocietiesLoaded] = useState(false);
  const [societyId, setSocietyId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [showSocietyDropdown, setShowSocietyDropdown] = useState(false);
  const [searchSocietyQuery, setSearchSocietyQuery] = useState('');

  const filteredSocieties = societies.filter(s => s.name.toLowerCase().includes(searchSocietyQuery.toLowerCase()));

  useEffect(() => {
    const fetchSocieties = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/societies`);
        if (res.ok) {
          const data = await res.json();
          setSocieties(data);
          if (data.length > 0) setSocietyId(data[0].id);
        } else {
          console.error("Failed to fetch societies: status", res.status);
        }
      } catch (e) {
        console.error("Failed to fetch societies", e);
      } finally {
        setSocietiesLoaded(true);
      }
    };
    fetchSocieties();
  }, []);

  const handleRegister = async () => {
    if (!regName || !regEmail || !regPhone || !regPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register-society`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, phone: regPhone, password: regPassword })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Society registered! You can now log in.');
        setIsRegistering(false);
        // Refresh societies
        setSocietiesLoaded(false);
        const sRes = await fetch(`${API_URL}/api/auth/societies`);
        if (sRes.ok) {
          const sData = await sRes.json();
          setSocieties(sData);
          if (sData.length > 0) setSocietyId(sData[sData.length - 1].id);
        }
        setSocietiesLoaded(true);
      } else {
        Alert.alert('Error', data.error || 'Registration failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Make sure your API_URL is correct.');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!societyId || !identifier || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ societyId, identifier, password })
      });

      const data = await res.json();

      if (res.ok) {
        onLogin(data.token, data.user.role);
      } else {
        Alert.alert("Error", data.error || "Login failed");
      }
    } catch (e) {
      Alert.alert("Error", "Network request failed. Ensure API_URL points to your local machine IP (e.g. http://192.168.x.x:3000) not the production render URL.");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Image
          source={require('./assets/image.png')}
          style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.4, resizeMode: 'cover' }}
        />
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={styles.loginContainer}>

            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 80, height: 80, backgroundColor: '#0066ff', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 15, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
                <Image source={require('./assets/icon.jpg')} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
              </View>
              <Text style={styles.logoText}>SocioHub</Text>
              <Text style={styles.subtitleText}>{isRegistering ? "Register your Society" : "Sign in to your account"}</Text>
            </View>

            {isRegistering ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Society Name</Text>
                  <TextInput style={styles.input} placeholder="e.g. Green Valley" placeholderTextColor="#888" value={regName} onChangeText={setRegName} />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput style={styles.input} placeholder="admin@society.com" placeholderTextColor="#888" value={regEmail} onChangeText={setRegEmail} autoCapitalize="none" keyboardType="email-address" />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput style={styles.input} placeholder="1234567890" placeholderTextColor="#888" value={regPhone} onChangeText={setRegPhone} keyboardType="phone-pad" />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <View>
                    <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#888" value={regPassword} onChangeText={setRegPassword} secureTextEntry={!showRegPassword} />
                    <TouchableOpacity onPress={() => setShowRegPassword(!showRegPassword)} style={{ position: 'absolute', right: 15, top: 13 }}>
                      <MaterialIcons name={showRegPassword ? "visibility-off" : "visibility"} size={24} color="#888" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.buttonPrimary} onPress={handleRegister} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register Society</Text>}
                </TouchableOpacity>

                <View style={{ marginTop: 25, alignItems: 'center' }}>
                  <Text style={{ color: '#888', marginBottom: 5 }}>Already have a society?</Text>
                  <TouchableOpacity onPress={() => setIsRegistering(false)}>
                    <Text style={{ color: '#0066ff', fontWeight: 'bold', fontSize: 16 }}>Sign In here</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Select Your Society</Text>
                <TouchableOpacity
                  style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }]}
                  onPress={() => setShowSocietyDropdown(true)}
                  disabled={!societiesLoaded || societies.length === 0}
                >
                  <Text style={{ color: societyId ? '#fff' : '#888', fontSize: 16 }}>
                    {!societiesLoaded
                      ? 'Loading societies...'
                      : societies.length === 0
                        ? 'No societies found'
                        : societyId
                          ? societies.find(s => s.id === societyId)?.name
                          : 'Tap to select your society'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#888" />
                </TouchableOpacity>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Phone Number or ID</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1234567890 or john@402"
                    placeholderTextColor="#888"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <View>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#888"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 15, top: 13 }}>
                      <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={24} color="#888" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin} disabled={loading || societies.length === 0}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
                </TouchableOpacity>

                <View style={{ marginTop: 25, alignItems: 'center' }}>
                  <Text style={{ color: '#888', marginBottom: 5 }}>Don't have a society yet?</Text>
                  <TouchableOpacity onPress={() => setIsRegistering(true)}>
                    <Text style={{ color: '#0066ff', fontWeight: 'bold', fontSize: 16 }}>Register your Society</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>

        {/* Society Search Dropdown Modal */}
        <Modal visible={showSocietyDropdown} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '50%', width: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Society</Text>
                <TouchableOpacity onPress={() => setShowSocietyDropdown(false)}>
                  <MaterialIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 20, flex: 1 }}>
                <TextInput
                  style={[styles.textInput, { marginBottom: 15, backgroundColor: '#f1f5f9', color: '#000' }]}
                  placeholder="Search societies..."
                  placeholderTextColor="#888"
                  value={searchSocietyQuery}
                  onChangeText={setSearchSocietyQuery}
                  autoFocus
                />
                <ScrollView>
                  {filteredSocieties.length === 0 ? <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 20 }}>No societies found</Text> : null}
                  {filteredSocieties.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={{ padding: 15, borderBottomWidth: 1, borderColor: '#f1f5f9', backgroundColor: societyId === s.id ? '#e0f2fe' : '#fff' }}
                      onPress={() => {
                        setSocietyId(s.id);
                        setShowSocietyDropdown(false);
                        setSearchSocietyQuery('');
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: societyId === s.id ? 'bold' : 'normal', color: societyId === s.id ? '#0284c7' : '#1e293b' }}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ height: 20 }} />
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </KeyboardAvoidingView>
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
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/api/resident/data`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={[styles.topHeader, { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.avatarBubble, { backgroundColor: '#e0e7ff' }]}>
            <Text style={{ color: '#3730a3', fontWeight: 'bold' }}>{data.user?.name ? data.user.name.charAt(0).toUpperCase() : 'R'}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e40af' }}>{data.user?.name || 'SocioHub'}</Text>
            <Text style={{ fontSize: 12, color: '#64748b' }}>🟢 Tower {data.user?.tower}, Apt {data.user?.apartment}</Text>
          </View>
        </View>
      </View>

      <View style={styles.contentArea}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#0066ff" /></View>
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
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
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/api/resident/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(form) });
      const d = await res.json();
      setGeneratedQr(d.qrToken);
    } catch (e) { }
  };

  const handleComplaint = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/resident/complaints`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(form) });
      Alert.alert("Success", "Complaint raised!");
      setModalVisible(null); setForm({}); loadData();
    } catch (e) { }
  };

  const getBookingTotal = () => {
    if (!form.facilityObj) return 0;
    let total = form.facilityObj.rate;
    if (form.date && form.endDate && form.facilityObj.validity === 'Daily') {
      const diffTime = Math.abs(new Date(form.endDate).getTime() - new Date(form.date).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0) total = total * diffDays;
    }
    return total;
  };

  const handleBook = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/resident/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(form) });
      Alert.alert("Success", "Facility Booked!");
      setModalVisible(null); setForm({}); loadData();
    } catch (e) { }
  };

  const triggerSOS = async () => {
    Alert.alert("Emergency", "Trigger SOS?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "TRIGGER", style: "destructive", onPress: async () => {
          try {
            await fetch(`${API_URL}/api/emergency`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'SOS - RESIDENT', author: 'Ritesh (Unit 402)' }) });
            Alert.alert("Sent", "Emergency SOS sent.");
          } catch (e) { }
        }
      }
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      {/* Banner */}
      <View style={{ backgroundColor: '#0066ff', borderRadius: 20, padding: 20, marginBottom: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5 }}>Hi, {data.user?.name ? data.user.name.split(' ')[0] : 'Resident'}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 15 }}>You have {data.invoices.filter(i => i.status === 'PENDING').length} pending payment(s)</Text>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>MAINTENANCE DUE</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>${pendingDues.toFixed(2)}</Text>
          </View>
          <TouchableOpacity onPress={() => {/* In App.js we can't easily switch tab from child component without passing a prop, but let's mock it for now */ Alert.alert('Notice', 'Go to Payments tab to pay.') }} style={{ backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: '#0066ff', fontWeight: 'bold' }}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 }}>
        <TouchableOpacity style={styles.gridBtnAlt} onPress={() => setModalVisible('invite')}>
          <View style={[styles.gridIconBubble, { backgroundColor: '#e0e7ff' }]}><MaterialIcons name="person-add" size={24} color="#4f46e5" /></View>
          <Text style={styles.gridBtnTextAlt}>Invite{"\n"}Visitor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridBtnAlt} onPress={() => setModalVisible('complaint')}>
          <View style={[styles.gridIconBubble, { backgroundColor: '#f3e8ff' }]}><MaterialIcons name="support-agent" size={24} color="#9333ea" /></View>
          <Text style={styles.gridBtnTextAlt}>Raise{"\n"}Issue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridBtnAlt} onPress={() => setModalVisible('facility')}>
          <View style={[styles.gridIconBubble, { backgroundColor: '#dcfce7' }]}><MaterialIcons name="pool" size={24} color="#16a34a" /></View>
          <Text style={styles.gridBtnTextAlt}>Book{"\n"}Facility</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gridBtnAlt, { width: '100%', height: 60, flexDirection: 'row', backgroundColor: '#fee2e2', marginTop: 10 }]} onPress={triggerSOS}>
          <MaterialIcons name="emergency" size={24} color="#dc2626" />
          <Text style={{ color: '#dc2626', fontWeight: 'bold', marginLeft: 10, fontSize: 16 }}>SOS Emergency</Text>
        </TouchableOpacity>
      </View>

      {data.bookings && data.bookings.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionTitle}>Active Passes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {data.bookings.map(b => (
              <View key={b.id} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 12, marginRight: 15, width: 220, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name={b.facility?.icon ? b.facility.icon.replace(/_/g, '-') : 'pool'} size={16} color="#0066ff" />
                  </View>
                  <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: 'bold', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' }}>{b.status}</Text>
                </View>
                <Text style={{ fontWeight: 'bold', color: '#1e293b', fontSize: 16 }}>{b.facility.name}</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 5 }}>Starts: {new Date(b.date).toLocaleDateString()}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {data.notices.length === 0 ? <Text style={{ color: '#94a3b8' }}>No recent activity.</Text> : data.notices.slice(0, 3).map(n => (
        <View key={n.id} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#0066ff' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1e293b' }}>{n.title}</Text>
          <Text style={{ color: '#64748b', marginVertical: 5 }}>{n.content}</Text>
        </View>
      ))}
      <View style={{ height: 50 }} />

      {/* Invites Modal */}
      <Modal visible={modalVisible === 'invite'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Invite Visitor</Text><TouchableOpacity onPress={() => { setModalVisible(null); setGeneratedQr(null); setForm({}); }}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              {generatedQr ? (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Pass Generated!</Text>
                  <View style={{ padding: 20, backgroundColor: '#fff', borderRadius: 10, marginBottom: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 5, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5 }}>
                    <QRCode value={generatedQr} size={200} getRef={(c) => (qrRef.current = c)} />
                    <Text style={{ fontSize: 24, fontWeight: 'bold', letterSpacing: 5, marginTop: 15 }}>{generatedQr}</Text>
                  </View>
                  <TouchableOpacity style={[styles.buttonPrimary, { backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', marginBottom: 15, width: '100%', justifyContent: 'center' }]} onPress={shareQR}>
                    <MaterialIcons name="share" size={20} color="#fff" />
                    <Text style={[styles.buttonText, { marginLeft: 10 }]}>Share Pass & Token</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.buttonPrimary, { width: '100%' }]} onPress={() => { setModalVisible(null); setGeneratedQr(null); setForm({}); loadData(); }}><Text style={styles.buttonText}>Done</Text></TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Visitor Name</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, name: t })} />
                  <Text style={styles.inputLabel}>Guests Count</Text>
                  <TextInput style={styles.textInput} keyboardType="numeric" onChangeText={t => setForm({ ...form, guestCount: t })} />
                  <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20 }]} onPress={handleInvite}><Text style={styles.buttonText}>Generate Pass</Text></TouchableOpacity>
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
              <TextInput style={[styles.textInput, { minHeight: 100, textAlignVertical: 'top' }]} multiline placeholder="E.g., The elevator in Tower B is making strange noises..." onChangeText={t => setForm({ ...form, title: t })} />
              <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={handleComplaint}>
                <MaterialIcons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
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
              {!form.facilityId ? (
                data.facilities && data.facilities.length > 0 ? (
                  data.facilities.map(f => (
                    <TouchableOpacity key={f.id} style={{ backgroundColor: '#f8fafc', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' }} onPress={() => setForm({ ...form, facilityId: f.id, facilityObj: f })}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                          <MaterialIcons name={f.icon ? f.icon.replace(/_/g, '-') : 'pool'} size={24} color="#0066ff" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1e293b' }}>{f.name}</Text>
                          <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{f.description}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: '#0066ff', fontWeight: 'bold', fontSize: 18 }}>${f.rate}</Text>
                          <Text style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>per {f.validity}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>No facilities available for booking.</Text>
                )
              ) : (
                <>
                  <View style={{ backgroundColor: '#e0f2fe', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#bae6fd' }}>
                    <MaterialIcons name={form.facilityObj?.icon ? form.facilityObj.icon.replace(/_/g, '-') : 'pool'} size={40} color="#0284c7" style={{ marginBottom: 10 }} />
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0369a1' }}>{form.facilityObj?.name}</Text>
                    <Text style={{ fontSize: 14, color: '#0284c7', fontWeight: 'bold', marginTop: 5 }}>${form.facilityObj?.rate} / {form.facilityObj?.validity}</Text>
                  </View>

                  <Text style={styles.inputLabel}>Start Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.textInput, { justifyContent: 'center' }]}>
                    <Text style={{ color: form.date ? '#1e293b' : '#94a3b8' }}>{form.date ? new Date(form.date).toLocaleDateString() : 'Select Start Date'}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <View style={{ backgroundColor: '#fff', borderRadius: 10, marginTop: 10, overflow: 'hidden' }}>
                      <Calendar
                        minDate={new Date().toISOString().split('T')[0]}
                        onDayPress={day => {
                          setShowDatePicker(false);
                          setForm({ ...form, date: day.dateString });
                        }}
                        markedDates={{
                          [form.date ? form.date.split('T')[0] : '']: { selected: true, selectedColor: '#0ea5e9' }
                        }}
                      />
                    </View>
                  )}

                  {form.facilityObj?.validity === 'Daily' && (
                    <>
                      <Text style={styles.inputLabel}>End Date</Text>
                      <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={[styles.textInput, { justifyContent: 'center' }]}>
                        <Text style={{ color: form.endDate ? '#1e293b' : '#94a3b8' }}>{form.endDate ? new Date(form.endDate).toLocaleDateString() : 'Select End Date'}</Text>
                      </TouchableOpacity>
                      {showEndDatePicker && (
                        <View style={{ backgroundColor: '#fff', borderRadius: 10, marginTop: 10, overflow: 'hidden' }}>
                          <Calendar
                            minDate={form.date || new Date().toISOString().split('T')[0]}
                            onDayPress={day => {
                              setShowEndDatePicker(false);
                              setForm({ ...form, endDate: day.dateString });
                            }}
                            markedDates={{
                              [form.endDate ? form.endDate.split('T')[0] : '']: { selected: true, selectedColor: '#0ea5e9' }
                            }}
                          />
                        </View>
                      )}
                    </>
                  )}

                  <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={handleBook}>
                    <MaterialIcons name="payments" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Pay ${getBookingTotal()} & Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ marginTop: 15, alignItems: 'center' }} onPress={() => setForm({})}><Text style={{ color: '#64748b', fontWeight: 'bold' }}>Back to Facilities</Text></TouchableOpacity>
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
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/api/resident/complaints`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(form) });
      if (res.ok) {
        Alert.alert("Success", "Complaint raised!");
        setModalVisible(false); setForm({}); loadData();
      } else {
        Alert.alert("Error", "Could not raise complaint");
      }
    } catch (e) { }
  };

  return (
    <View style={{ flex: 1, padding: 15 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Text style={styles.sectionTitle}>My Complaints</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={loadData} style={{ marginRight: 15 }}><MaterialIcons name="refresh" size={24} color="#64748b" /></TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={{ backgroundColor: '#0066ff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Raise Issue</Text>
          </TouchableOpacity>
        </View>
      </View>

      {complaints.length === 0 ? (
        <View style={{ padding: 40, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
          <MaterialIcons name="done-all" size={40} color="#94a3b8" style={{ marginBottom: 10, opacity: 0.5 }} />
          <Text style={{ color: '#64748b', fontSize: 16 }}>You have no active complaints.</Text>
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
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
              <TextInput style={[styles.textInput, { minHeight: 100, textAlignVertical: 'top' }]} multiline placeholder="E.g., The elevator in Tower B is making strange noises..." onChangeText={t => setForm({ ...form, title: t })} />
              <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={handleComplaint}>
                <MaterialIcons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
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
      await fetch(`${API_URL}/api/resident/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoiceId: id }) });
      Alert.alert("Success", "Payment processed!");
      loadData();
    } catch (e) { }
  };

  const totalMaintenance = invoices.filter(i => i.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <View style={{ flex: 1, padding: 15 }}>
      <View style={{ backgroundColor: '#0ea5e9', padding: 20, borderRadius: 12, marginBottom: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
        <Text style={{ color: '#e0f2fe', fontSize: 12, fontWeight: 'bold' }}>TOTAL MAINTENANCE BALANCE</Text>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', marginVertical: 5 }}>${totalMaintenance.toFixed(2)}</Text>
      </View>
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
          <View style={{ marginTop: 20 }}>
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
  const [profile, setProfile] = useState({ name: data.user?.name || '', phone: data.user?.phone || '', gender: data.user?.gender || 'Male' });
  const [privacy, setPrivacy] = useState({ password: '', confirm: '' });

  const handleUpdateProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(profile) });
      Alert.alert("Success", "Profile updated");
      setModalVisible(null);
      loadData();
    } catch (e) { }
  };

  const handleUpdatePrivacy = async () => {
    if (privacy.password !== privacy.confirm) return Alert.alert("Error", "Passwords do not match");
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ password: privacy.password }) });
      Alert.alert("Success", "Security settings updated");
      setModalVisible(null);
      setPrivacy({ password: '', confirm: '' });
    } catch (e) { }
  };

  const handleFamily = async (action, id = null) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/resident/family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action, id, ...form })
      });
      setModalVisible(null); setForm({}); loadData();
    } catch (e) { }
  };

  const handleVehicle = async (action, id = null) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/resident/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action, id, ...form })
      });
      setModalVisible(null); setForm({}); loadData();
    } catch (e) { }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' }}>
        <View style={{ height: 80, backgroundColor: '#e0e7ff' }}></View>
        <View style={{ padding: 20, paddingTop: 40, alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: -30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1 }}>
            <Text style={{ fontSize: 30 }}>{data?.user?.gender?.toLowerCase() === 'female' ? '👩‍💼' : '👨‍💼'}</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b' }}>{data.user?.name || profile.name}</Text>
          <Text style={{ color: '#64748b', marginBottom: 20 }}>Resident • Tower {data.user?.tower}, Apt {data.user?.apartment}</Text>

          <View style={{ width: '100%', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 15, paddingBottom: 15, borderBottomWidth: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontWeight: 'bold', color: '#64748b' }}>FAMILY MEMBERS ({data.familyMembers?.length || 0})</Text>
              <TouchableOpacity onPress={() => setModalVisible('addFamily')}><MaterialIcons name="add-circle" size={24} color="#0ea5e9" /></TouchableOpacity>
            </View>
            {data.familyMembers?.map(m => (
              <View key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 5 }}>
                <View>
                  <Text style={{ fontWeight: 'bold' }}>{m.name}</Text>
                  <Text style={{ fontSize: 10, color: '#0ea5e9', fontWeight: 'bold' }}>{m.relationship}</Text>
                </View>
                <TouchableOpacity onPress={() => handleFamily('remove', m.id)}><MaterialIcons name="delete" size={20} color="#ef4444" /></TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={{ width: '100%', paddingTop: 15 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontWeight: 'bold', color: '#64748b' }}>VEHICLES ({data.vehicles?.length || 0})</Text>
              <TouchableOpacity onPress={() => setModalVisible('addVehicle')}><MaterialIcons name="add-circle" size={24} color="#0ea5e9" /></TouchableOpacity>
            </View>
            {data.vehicles?.map(v => (
              <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name={v.type === 'Car' ? 'directions-car' : 'two-wheeler'} size={20} color="#94a3b8" style={{ marginRight: 10 }} />
                  <View>
                    <Text style={{ fontWeight: 'bold' }}>{v.makeModel}</Text>
                    <Text style={{ fontSize: 10, color: '#64748b' }}>{v.registration}</Text>
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

      <TouchableOpacity onPress={onLogout} style={{ marginTop: 10, padding: 15, backgroundColor: '#fee2e2', borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
        <MaterialIcons name="logout" size={20} color="#ef4444" style={{ marginRight: 8 }} />
        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 50 }} />
      {/* Add Family Modal */}
      <Modal visible={modalVisible === 'addFamily'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Add Family Member</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Member Name</Text>
              <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, name: t })} />
              <Text style={styles.inputLabel}>Relationship</Text>
              <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, relationship: t })} />
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" onChangeText={t => setForm({ ...form, age: t })} />
              <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20 }]} onPress={() => handleFamily('add')}><Text style={styles.buttonText}>Add Member</Text></TouchableOpacity>
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
              <TextInput style={styles.textInput} value={profile.name} onChangeText={t => setProfile({ ...profile, name: t })} />
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput style={styles.textInput} value={profile.phone} onChangeText={t => setProfile({ ...profile, phone: t })} />
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <TouchableOpacity style={[styles.roleBtn, profile.gender === 'Male' && styles.roleBtnActive]} onPress={() => setProfile({ ...profile, gender: 'Male' })}><Text style={[styles.roleBtnText, profile.gender === 'Male' && styles.roleBtnTextActive]}>Male</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.roleBtn, profile.gender === 'Female' && styles.roleBtnActive]} onPress={() => setProfile({ ...profile, gender: 'Female' })}><Text style={[styles.roleBtnText, profile.gender === 'Female' && styles.roleBtnTextActive]}>Female</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20 }]} onPress={handleUpdateProfile}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
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
              <TextInput style={styles.textInput} secureTextEntry placeholder="New Password" value={privacy.password} onChangeText={t => setPrivacy({ ...privacy, password: t })} />
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput style={styles.textInput} secureTextEntry placeholder="Confirm New Password" value={privacy.confirm} onChangeText={t => setPrivacy({ ...privacy, confirm: t })} />
              <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20 }]} onPress={handleUpdatePrivacy}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Add Vehicle Modal */}
      <Modal visible={modalVisible === 'addVehicle'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Add Vehicle</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Type (Car/Bike)</Text>
              <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, type: t })} />
              <Text style={styles.inputLabel}>Make & Model</Text>
              <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, makeModel: t })} />
              <Text style={styles.inputLabel}>Registration Plate</Text>
              <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, registration: t })} />
              <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20 }]} onPress={() => handleVehicle('add')}><Text style={styles.buttonText}>Add Vehicle</Text></TouchableOpacity>
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
  const [data, setData] = useState({ user: null, society: null });

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) { }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#e8eefc" />

      <View style={[styles.topHeader, { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.avatarBubble, { backgroundColor: '#e0f2fe' }]}>
            <Text style={{ color: '#0369a1', fontWeight: 'bold' }}>{data.user?.name ? data.user.name.charAt(0).toUpperCase() : 'G'}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>{data.user?.name || 'Security Guard'}</Text>
            <Text style={{ fontSize: 12, color: '#64748b' }}>{data.society?.name || 'Loading Society...'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.contentArea}>
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'scan' && <ScanTab />}
        {activeTab === 'profile' && <ProfileTab onLogout={onLogout} data={data} loadData={loadData} />}
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
      {
        text: "TRIGGER", style: "destructive", onPress: async () => {
          try {
            await fetch(`${API_URL}/api/emergency`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'GATE EMERGENCY', author: 'Officer Jenkins (Main Gate 1)' }) });
            Alert.alert("Sent", "Emergency SOS triggered.");
          } catch (e) { }
        }
      }
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
    } catch (e) { }
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
                <TouchableOpacity style={[styles.actionBtnPrimary, { flex: 1 }]} onPress={() => updateStatus(item.id, 'Entered')}><Text style={styles.actionBtnText}>Allow</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={() => updateStatus(item.id, 'Denied')}><Text style={styles.actionBtnTextSecondary}>Deny</Text></TouchableOpacity>
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
              <TouchableOpacity style={[styles.gridBtn, { backgroundColor: '#ba1a1a' }]} onPress={triggerEmergency}>
                <View style={[styles.gridIconBubble, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><MaterialIcons name="emergency" size={28} color="#fff" /></View>
                <Text style={[styles.gridBtnText, { color: '#fff' }]}>Emergency</Text>
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
                  <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, name: t })} />
                  <Text style={styles.inputLabel}>Destination</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, destination: t })} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                    <View style={{ flex: 1, marginRight: 5 }}>
                      <Text style={styles.inputLabel}>Age</Text>
                      <TextInput style={styles.textInput} keyboardType="numeric" onChangeText={t => setForm({ ...form, age: t })} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 5 }}>
                      <Text style={styles.inputLabel}>Guests</Text>
                      <TextInput style={styles.textInput} keyboardType="numeric" onChangeText={t => setForm({ ...form, guestCount: t })} />
                    </View>
                  </View>
                </>
              )}
              {modalVisible === 'delivery' && (
                <>
                  <Text style={styles.inputLabel}>Vendor/Company Name</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, vendor: t })} />
                  <Text style={styles.inputLabel}>Destination (Unit/Flat)</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, destination: t })} />
                </>
              )}
              {modalVisible === 'vehicle' && (
                <>
                  <Text style={styles.inputLabel}>Vehicle Registration</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, registration: t })} />
                  <Text style={styles.inputLabel}>Destination (Unit/Flat)</Text>
                  <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, destination: t })} />
                </>
              )}
              <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20 }]} onPress={() => handleAction(modalVisible)}><Text style={styles.buttonText}>Log Entry</Text></TouchableOpacity>
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
              <View style={[styles.visitorIconBubble, { width: 40, height: 40 }]}><MaterialIcons name={item.icon === 'local_shipping' ? 'local-shipping' : item.icon === 'directions_car' ? 'directions-car' : 'person'} size={20} color="#64748b" /></View>
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
      <Text style={[styles.sectionTitle, { alignSelf: 'flex-start' }]}>Scan Resident Pass</Text>

      {!permission.granted ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ textAlign: 'center', marginBottom: 20 }}>We need your permission to show the camera</Text>
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

      <Text style={{ fontWeight: 'bold', color: '#64748b', marginBottom: 10, alignSelf: 'flex-start' }}>Or enter token manually:</Text>
      <View style={{ flexDirection: 'row', width: '100%' }}>
        <TextInput value={token} onChangeText={setToken} style={[styles.textInput, { flex: 1, marginRight: 10, textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' }]} placeholder="TOKEN" />
        <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 0, justifyContent: 'center', paddingHorizontal: 30 }]} onPress={handleManualVerify} disabled={scanned}><Text style={styles.buttonText}>Verify</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function ProfileTab({ onLogout, data, loadData }) {
  const [modalVisible, setModalVisible] = useState(null);
  const [profile, setProfile] = useState({ name: data?.user?.name || '', phone: data?.user?.phone || '', gender: data?.user?.gender || 'Male' });
  const [privacy, setPrivacy] = useState({ password: '', confirm: '' });

  useEffect(() => {
    if (data?.user) setProfile({ name: data.user.name || '', phone: data.user.phone || '', gender: data.user.gender || 'Male' });
  }, [data]);

  const handleUpdateProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(profile) });
      Alert.alert("Success", "Profile updated");
      setModalVisible(null);
      if (loadData) loadData();
    } catch (e) { }
  };

  const handleUpdatePrivacy = async () => {
    if (privacy.password !== privacy.confirm) return Alert.alert("Error", "Passwords do not match");
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ password: privacy.password }) });
      Alert.alert("Success", "Security settings updated");
      setModalVisible(null);
      setPrivacy({ password: '', confirm: '' });
    } catch (e) { }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
        <View style={{ backgroundColor: '#1c3671', height: 80 }} />
        <View style={{ padding: 20, alignItems: 'center', marginTop: -40 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 10 }}>
            <Text style={{ fontSize: 40 }}>{profile.gender === 'Female' ? '👮‍♀️' : '👮‍♂️'}</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b' }}>{profile.name || 'Security Guard'}</Text>
          <Text style={{ color: '#64748b', marginBottom: 20 }}>{data?.user?.role || 'Staff'} • {data?.society?.name || 'Society'}</Text>

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
              <TextInput style={styles.textInput} value={profile.name} onChangeText={t => setProfile({ ...profile, name: t })} />
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput style={styles.textInput} value={profile.phone} onChangeText={t => setProfile({ ...profile, phone: t })} />
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <TouchableOpacity style={[styles.roleBtn, profile.gender === 'Male' && styles.roleBtnActive]} onPress={() => setProfile({ ...profile, gender: 'Male' })}><Text style={[styles.roleBtnText, profile.gender === 'Male' && styles.roleBtnTextActive]}>Male</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.roleBtn, profile.gender === 'Female' && styles.roleBtnActive]} onPress={() => setProfile({ ...profile, gender: 'Female' })}><Text style={[styles.roleBtnText, profile.gender === 'Female' && styles.roleBtnTextActive]}>Female</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20 }]} onPress={handleUpdateProfile}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
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
              <TextInput style={styles.textInput} secureTextEntry placeholder="New Password" value={privacy.password} onChangeText={t => setPrivacy({ ...privacy, password: t })} />
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput style={styles.textInput} secureTextEntry placeholder="Confirm New Password" value={privacy.confirm} onChangeText={t => setPrivacy({ ...privacy, confirm: t })} />
              <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20 }]} onPress={handleUpdatePrivacy}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
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
  const [data, setData] = useState({ complaints: [], visitors: [], users: [], staff: [] });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/api/secretary/data`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  return (
    <SafeAreaView style={styles.mainContainer}>
      <View style={[styles.topHeader, { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.avatarBubble, { backgroundColor: '#e0e7ff' }]}>
            <Text style={{ color: '#3730a3', fontWeight: 'bold' }}>{data.user?.name ? data.user.name.charAt(0).toUpperCase() : 'SC'}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e40af' }}>{data.user?.name || 'Secretary Hub'}</Text>
            <Text style={{ fontSize: 12, color: '#64748b' }}>{data.society?.name || 'Loading Society...'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.contentArea}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#0ea5e9" /></View>
        ) : (
          <>
            {activeTab === 'home' && <SecretaryHomeTab data={data} loadData={loadData} />}
            {activeTab === 'finances' && <SecretaryFinancesTab data={data} loadData={loadData} />}
            {activeTab === 'requests' && <SecretaryRequestsTab data={data} loadData={loadData} />}
            {activeTab === 'settings' && <SecretarySettingsTab data={data} loadData={loadData} onLogout={onLogout} />}
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
  const [staffForm, setStaffForm] = useState({ role: 'Security' });
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  const handleShareCredentials = async () => {
    if (!selectedUserDetails) return;
    try {
      const message = `SocioHub Resident Credentials\n\nName: ${selectedUserDetails.name}\nApp Login ID: ${selectedUserDetails.loginId || selectedUserDetails.phone}\nPassword: ${selectedUserDetails.password}\n\nPlease download the SocioHub app to log in!`;
      await Share.share({ message });
    } catch (error) {
      console.log(error);
    }
  };

  const activeComplaints = data.complaints.filter(c => c.status === 'OPEN');

  const handleBroadcast = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/secretary/notice`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(form) });
      Alert.alert("Success", "Notice Broadcasted!");
      setModalVisible(null); setForm({ role: 'Resident' });
    } catch (e) { }
  };

  const handleUserAction = async (action, id = null, type = 'user') => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const actionForm = type === 'staff' ? staffForm : form;
      await fetch(`${API_URL}/api/secretary/users`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ action, id, ...actionForm }) });
      setModalVisible(null);
      setForm({ role: 'Resident' });
      setStaffForm({ role: 'Security' });
      loadData();
      if (action === 'delete') setSelectedUserDetails(null);
    } catch (e) { }
  };

  const handleResolve = async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/secretary/complaints`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ id, status: 'RESOLVED' }) });
      loadData();
    } catch (e) { }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <View style={[styles.gridContainer, { marginTop: 10, marginBottom: 20 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <TouchableOpacity style={[styles.gridBtnAlt, { width: '48%', minHeight: 120, padding: 15, justifyContent: 'center' }]} onPress={() => setModalVisible('users')}>
            <View style={[styles.gridIconBubble, { backgroundColor: '#e0e7ff', width: 50, height: 50, borderRadius: 25 }]}><MaterialIcons name="groups" size={28} color="#4f46e5" /></View>
            <Text style={[styles.gridBtnTextAlt, { fontSize: 14, marginTop: 10, textAlign: 'center' }]}>Manage Residents</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gridBtnAlt, { width: '48%', minHeight: 120, padding: 15, justifyContent: 'center' }]} onPress={() => setModalVisible('staff')}>
            <View style={[styles.gridIconBubble, { backgroundColor: '#fef08a', width: 50, height: 50, borderRadius: 25 }]}><MaterialIcons name="engineering" size={28} color="#ca8a04" /></View>
            <Text style={[styles.gridBtnTextAlt, { fontSize: 14, marginTop: 10, textAlign: 'center' }]}>Manage Staff</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity style={[styles.gridBtnAlt, { width: '100%', minHeight: 90, padding: 15, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: '#8b5cf6', borderWidth: 0, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 }]} onPress={() => setModalVisible('broadcast')}>
            <View style={[styles.gridIconBubble, { backgroundColor: 'rgba(255, 255, 255, 0.25)', width: 50, height: 50, borderRadius: 25, marginRight: 15 }]}><MaterialIcons name="campaign" size={28} color="#ffffff" /></View>
            <Text style={[styles.gridBtnTextAlt, { fontSize: 18, color: '#ffffff', fontWeight: 'bold', letterSpacing: 0.5 }]}>Broadcast Notice</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Active Complaints ({activeComplaints.length})</Text>
      {activeComplaints.length === 0 ? <Text style={{ color: '#94a3b8', marginBottom: 20 }}>No active complaints.</Text> : activeComplaints.map(c => (
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

      <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Expected Visitors ({data.visitors.length})</Text>
      {data.visitors.length === 0 ? <Text style={{ color: '#94a3b8' }}>No visitors today.</Text> : data.visitors.map(v => (
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

      <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Recent Broadcasts ({(data.notices || []).length})</Text>
      {(!data.notices || data.notices.length === 0) ? <Text style={{ color: '#94a3b8' }}>No broadcasts yet.</Text> : data.notices.map(n => (
        <View key={n.id} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#8b5cf6' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1e293b', marginBottom: 5 }}>{n.title}</Text>
          <Text style={{ fontSize: 14, color: '#475569', marginBottom: 10 }}>{n.content}</Text>
          <Text style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right' }}>{new Date(n.createdAt).toLocaleDateString()}</Text>
        </View>
      ))}

      <View style={{ height: 50 }} />

      {/* Broadcast Modal */}
      <Modal visible={modalVisible === 'broadcast'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Broadcast Notice</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Notice Title</Text>
              <TextInput style={styles.textInput} onChangeText={t => setForm({ ...form, title: t })} />
              <Text style={styles.inputLabel}>Content</Text>
              <TextInput style={[styles.textInput, { height: 100 }]} multiline onChangeText={t => setForm({ ...form, content: t })} />
              <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20 }]} onPress={handleBroadcast}><Text style={styles.buttonText}>Send Broadcast</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Residents Modal */}
      <Modal visible={modalVisible === 'users'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Manage Residents</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <ScrollView style={{ padding: 20 }}>
              <View style={{ backgroundColor: '#f8fafc', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Add New Resident</Text>
                <TextInput style={[styles.textInput, { marginBottom: 10, backgroundColor: '#fff' }]} placeholder="Full Name" onChangeText={t => setForm({ ...form, name: t })} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TextInput style={[styles.textInput, { flex: 1, marginRight: 5, backgroundColor: '#fff' }]} placeholder="Apt (e.g. 402)" onChangeText={t => setForm({ ...form, apartment: t })} />
                  <TextInput style={[styles.textInput, { flex: 1, marginLeft: 5, backgroundColor: '#fff' }]} placeholder="Tower (e.g. A)" onChangeText={t => setForm({ ...form, tower: t })} />
                </View>
                <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 15 }]} onPress={() => handleUserAction('create', null, 'user')}><Text style={styles.buttonText}>Add Resident</Text></TouchableOpacity>
              </View>

              <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Registered Residents ({data.users.length})</Text>
              {data.users.map(u => (
                <View key={u.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: '#f1f5f9' }}>
                  <View>
                    <Text style={{ fontWeight: 'bold' }}>{u.name}</Text>
                    <Text style={{ fontSize: 10, color: '#64748b' }}>{u.role} {u.role === 'Resident' && u.tower ? `• Tower ${u.tower}, Apt ${u.apartment}` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedUserDetails(u)} style={{ backgroundColor: '#e0e7ff', padding: 8, borderRadius: 20 }}>
                    <Text style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: 12 }}>View</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={{ height: 50 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Manage Staff Modal */}
      <Modal visible={modalVisible === 'staff'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Manage Staff</Text><TouchableOpacity onPress={() => setModalVisible(null)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            <ScrollView style={{ padding: 20 }}>
              <View style={{ backgroundColor: '#f8fafc', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Add New Staff</Text>
                <TextInput style={[styles.textInput, { marginBottom: 10, backgroundColor: '#fff' }]} placeholder="Full Name" onChangeText={t => setStaffForm({ ...staffForm, name: t })} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 5 }}>
                  <TouchableOpacity onPress={() => setStaffForm({ ...staffForm, role: 'Security' })} style={{ width: '48%', marginBottom: 10, backgroundColor: staffForm.role === 'Security' ? '#0ea5e9' : '#fff', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5 }}><Text style={{ color: staffForm.role === 'Security' ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: 12 }}>Security</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setStaffForm({ ...staffForm, role: 'Sweeper' })} style={{ width: '48%', marginBottom: 10, backgroundColor: staffForm.role === 'Sweeper' ? '#0ea5e9' : '#fff', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5 }}><Text style={{ color: staffForm.role === 'Sweeper' ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: 12 }}>Sweeper</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setStaffForm({ ...staffForm, role: 'Plumber' })} style={{ width: '48%', marginBottom: 10, backgroundColor: staffForm.role === 'Plumber' ? '#0ea5e9' : '#fff', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5 }}><Text style={{ color: staffForm.role === 'Plumber' ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: 12 }}>Plumber</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setStaffForm({ ...staffForm, role: 'Electrician' })} style={{ width: '48%', marginBottom: 10, backgroundColor: staffForm.role === 'Electrician' ? '#0ea5e9' : '#fff', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5 }}><Text style={{ color: staffForm.role === 'Electrician' ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: 12 }}>Electrician</Text></TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.buttonPrimary]} onPress={() => handleUserAction('create', null, 'staff')}><Text style={styles.buttonText}>Add Staff</Text></TouchableOpacity>
              </View>

              <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Registered Staff ({(data.staff || []).length})</Text>
              {(data.staff || []).map(u => (
                <View key={u.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: '#f1f5f9' }}>
                  <View>
                    <Text style={{ fontWeight: 'bold' }}>{u.name}</Text>
                    <Text style={{ fontSize: 10, color: '#64748b', fontWeight: 'bold', marginTop: 2 }}>{u.role}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedUserDetails(u)} style={{ backgroundColor: '#e0e7ff', padding: 8, borderRadius: 20 }}>
                    <Text style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: 12 }}>View</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={{ height: 50 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* User Details Modal */}
      <Modal visible={!!selectedUserDetails} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resident Details</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                <TouchableOpacity onPress={() => handleUserAction('delete', selectedUserDetails?.id)} style={{ marginRight: 15 }}>
                  <MaterialIcons name="delete" size={24} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedUserDetails(null)}>
                  <MaterialIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            {selectedUserDetails && (
              <ScrollView style={{ padding: 20 }}>
                <View style={{ backgroundColor: '#f8fafc', padding: 15, borderRadius: 10, marginBottom: 15 }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{selectedUserDetails.name}</Text>
                  <Text style={{ color: '#64748b', marginTop: 5 }}>
                    {selectedUserDetails.role} • Tower {selectedUserDetails.tower}, Apt {selectedUserDetails.apartment}
                  </Text>
                </View>

                <View style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View>
                      <Text style={{ fontSize: 10, color: '#64748b', fontWeight: 'bold' }}>APP LOGIN ID</Text>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0ea5e9' }}>{selectedUserDetails.loginId || selectedUserDetails.phone}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 10, color: '#64748b', fontWeight: 'bold' }}>PASSWORD</Text>
                      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{selectedUserDetails.password}</Text>
                    </View>
                  </View>
                </View>

                {selectedUserDetails.familyMembers && selectedUserDetails.familyMembers.length > 0 && (
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 }}>Family Members</Text>
                    {selectedUserDetails.familyMembers.map(fm => (
                      <View key={fm.id} style={{ backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8, marginBottom: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>{fm.name}</Text>
                          <Text style={{ fontSize: 12, color: '#64748b' }}>{fm.relationship} • {fm.age} yrs</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity onPress={handleShareCredentials} style={[styles.buttonPrimary, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 }]}>
                  <MaterialIcons name="share" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Share Credentials</Text>
                </TouchableOpacity>
                <View style={{ height: 50 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SecretaryFinancesTab({ data, loadData }) {
  const allInvoices = data.users?.flatMap(u => u.invoices || []) || [];
  const expenses = data.expenses || [];

  const totalIncoming = allInvoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOutgoing = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const totalBalance = totalIncoming - totalOutgoing;
  const pendingDues = allInvoices.filter(i => i.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);

  // Get 10 most recent transactions (invoices and expenses)
  const recentTransactions = [...allInvoices, ...expenses.map(e => ({ ...e, isExpense: true }))]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  const currentMonthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const isPayrollDone = expenses.some(e => e.title && e.title.includes(currentMonthLabel));

  const runPayroll = async () => {
    if (isPayrollDone) {
      Alert.alert('Notice', 'Already paid for the current month');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/api/secretary/payroll`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('API Error');
      Alert.alert('Success', 'Monthly salaries distributed successfully!');
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to run payroll');
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Text style={[styles.sectionTitle, { fontSize: 24, marginBottom: 0 }]}>Financial Overview</Text>
        <TouchableOpacity
          onPress={runPayroll}
          style={{ backgroundColor: isPayrollDone ? '#94a3b8' : '#10b981', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', opacity: isPayrollDone ? 0.7 : 1 }}
        >
          <MaterialIcons name="payments" size={16} color="#fff" style={{ marginRight: 5 }} />
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isPayrollDone ? 'Paid' : 'Run Payroll'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <View style={{ width: '48%', backgroundColor: '#0ea5e9', padding: 15, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.1 }}>
          <MaterialIcons name="account-balance-wallet" size={24} color="#e0f2fe" style={{ marginBottom: 5 }} />
          <Text style={{ color: '#e0f2fe', fontSize: 10, fontWeight: 'bold' }}>TOTAL BALANCE (PAID)</Text>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>${totalBalance.toFixed(2)}</Text>
        </View>
        <View style={{ width: '48%', backgroundColor: '#fff', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <MaterialIcons name="pending-actions" size={24} color="#f59e0b" style={{ marginBottom: 5 }} />
          <Text style={{ color: '#64748b', fontSize: 10, fontWeight: 'bold' }}>PENDING DUES</Text>
          <Text style={{ color: '#1e293b', fontSize: 24, fontWeight: 'bold' }}>${pendingDues.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {recentTransactions.length === 0 ? <Text style={{ color: '#94a3b8' }}>No transactions found.</Text> : recentTransactions.map(t => (
        <View key={t.id} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.isExpense ? '#fee2e2' : t.status === 'PAID' ? '#dcfce7' : '#fef3c7', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <MaterialIcons name={t.isExpense ? 'money-off' : t.status === 'PAID' ? 'check-circle' : 'pending'} size={20} color={t.isExpense ? '#ef4444' : t.status === 'PAID' ? '#16a34a' : '#d97706'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>{t.title}</Text>
              <Text style={{ fontSize: 12, color: '#64748b' }}>{t.isExpense ? 'SALARY OUT' : t.status} • {new Date(t.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
          <Text style={{ fontWeight: 'bold', color: t.isExpense ? '#ef4444' : t.status === 'PAID' ? '#16a34a' : '#d97706' }}>{t.isExpense ? '-' : ''}${t.amount.toFixed(2)}</Text>
        </View>
      ))}
      <View style={{ height: 50 }} />
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
      await fetch(`${API_URL}/api/secretary/complaints`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: newStatus }) });
      loadData();
      if (selected) setSelected({ ...selected, status: newStatus });
    } catch (e) { }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <Text style={[styles.sectionTitle, { fontSize: 24, marginBottom: 20 }]}>All Requests & Complaints</Text>

      {data.complaints.map(c => (
        <View key={c.id} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', flex: 1 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><MaterialIcons name="assignment" size={20} color="#64748b" /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', color: '#1e293b', fontSize: 16 }}>{c.title}</Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>From: {c.author}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: c.status === 'OPEN' ? '#ef4444' : c.status === 'IN_PROGRESS' ? '#f59e0b' : '#16a34a', backgroundColor: c.status === 'OPEN' ? '#fee2e2' : c.status === 'IN_PROGRESS' ? '#fef3c7' : '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' }}>{c.status.replace('_', ' ')}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
            <TouchableOpacity onPress={() => handleCycleStatus(c.id, c.status)} style={{ flex: 1, backgroundColor: '#e0e7ff', padding: 8, borderRadius: 8, alignItems: 'center', marginRight: 5 }}>
              <Text style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: 10 }}>UPDATE STATUS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSelected(c); setModalVisible(true); }} style={{ flex: 1, backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8, alignItems: 'center', marginLeft: 5 }}>
              <Text style={{ color: '#64748b', fontWeight: 'bold', fontSize: 10 }}>VIEW DETAILS</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <View style={{ height: 50 }} />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Complaint Details</Text><TouchableOpacity onPress={() => setModalVisible(false)}><MaterialIcons name="close" size={24} color="#fff" /></TouchableOpacity></View>
            {selected && (
              <View style={{ padding: 20 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 2 }}>TITLE</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>{selected.title}</Text>

                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 2 }}>AUTHOR</Text>
                <Text style={{ fontSize: 16, marginBottom: 15 }}>{selected.author}</Text>

                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 2 }}>STATUS</Text>
                <Text style={{ fontSize: 12, alignSelf: 'flex-start', fontWeight: 'bold', color: selected.status === 'OPEN' ? '#ef4444' : selected.status === 'IN_PROGRESS' ? '#f59e0b' : '#16a34a', backgroundColor: selected.status === 'OPEN' ? '#fee2e2' : selected.status === 'IN_PROGRESS' ? '#fef3c7' : '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden', marginBottom: 15 }}>{selected.status.replace('_', ' ')}</Text>

                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 2 }}>LOGGED ON</Text>
                <Text style={{ fontSize: 14, marginBottom: 15 }}>{new Date(selected.createdAt).toLocaleString()}</Text>

                <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 10 }]} onPress={() => { handleCycleStatus(selected.id, selected.status); setModalVisible(false); }}><Text style={styles.buttonText}>UPDATE STATUS</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SecretarySettingsTab({ data, loadData, onLogout }) {
  const [modalVisible, setModalVisible] = useState(null);
  const [profile, setProfile] = useState({ name: data?.user?.name || '', phone: data?.user?.phone || '', gender: data?.user?.gender || 'Male' });
  const [privacy, setPrivacy] = useState({ password: '', confirm: '' });

  const handleUpdateProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(profile) });
      Alert.alert("Success", "Profile updated");
      setModalVisible(null);
      loadData();
    } catch (e) { }
  };

  const handleUpdatePrivacy = async () => {
    if (privacy.password !== privacy.confirm) return Alert.alert("Error", "Passwords do not match");
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ password: privacy.password }) });
      Alert.alert("Success", "Security settings updated");
      setModalVisible(null);
      setPrivacy({ password: '', confirm: '' });
    } catch (e) { }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
        <View style={{ backgroundColor: '#1e1b4b', height: 80 }} />
        <View style={{ padding: 20, alignItems: 'center', marginTop: -40 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 10 }}>
            <Text style={{ fontSize: 40 }}>{data?.user?.gender?.toLowerCase() === 'female' ? '👩‍💼' : '👨‍💼'}</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b' }}>{data?.user?.name || profile.name}</Text>
          <Text style={{ color: '#64748b', marginBottom: 20 }}>Secretary • {data?.society?.name || 'Society'}</Text>
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
              <TextInput style={styles.textInput} value={profile.name} onChangeText={t => setProfile({ ...profile, name: t })} />
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput style={styles.textInput} value={profile.phone} onChangeText={t => setProfile({ ...profile, phone: t })} />
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <TouchableOpacity style={[styles.roleBtn, profile.gender === 'Male' && styles.roleBtnActive]} onPress={() => setProfile({ ...profile, gender: 'Male' })}><Text style={[styles.roleBtnText, profile.gender === 'Male' && styles.roleBtnTextActive]}>Male</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.roleBtn, profile.gender === 'Female' && styles.roleBtnActive]} onPress={() => setProfile({ ...profile, gender: 'Female' })}><Text style={[styles.roleBtnText, profile.gender === 'Female' && styles.roleBtnTextActive]}>Female</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20 }]} onPress={handleUpdateProfile}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
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
              <TextInput style={styles.textInput} secureTextEntry placeholder="New Password" value={privacy.password} onChangeText={t => setPrivacy({ ...privacy, password: t })} />
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput style={styles.textInput} secureTextEntry placeholder="Confirm New Password" value={privacy.confirm} onChangeText={t => setPrivacy({ ...privacy, confirm: t })} />
              <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 20 }]} onPress={handleUpdatePrivacy}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
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
