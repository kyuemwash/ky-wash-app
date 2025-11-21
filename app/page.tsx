"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Plus, X, LogOut, User, Clock, Droplet, Wind, Settings, AlertCircle, CheckCircle, QrCode, TrendingUp, Wrench, Moon, Sun } from 'lucide-react';

interface User {
  name: string;
  studentId: string;
  phone: string;
}

interface Machine {
  id: number;
  type: string;
  status: string;
  category: string;
  timeLeft: number;
  currentUser: User | null;
  enabled: boolean;
  qrCode: string;
  totalCycles: number;
  lastMaintenance: string;
  issues: string[];
}

interface WaitlistItem extends User {
  id: number;
  timestamp: string;
}

interface Notification {
  id: number;
  user: User;
  type: string;
  machineId: number;
  timestamp: string;
  message: string;
}

interface UsageHistory {
  id: number;
  machineId: number;
  machineType: string;
  user: string;
  category: string;
  timestamp: string;
  duration: number;
}

const KYWash = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [machines, setMachines] = useState<Machine[]>([
    { id: 1, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, qrCode: 'WASH-001', totalCycles: 245, lastMaintenance: '2024-11-15', issues: [] },
    { id: 2, type: 'washer', status: 'disabled', category: 'normal', timeLeft: 0, currentUser: null, enabled: false, qrCode: 'WASH-002', totalCycles: 189, lastMaintenance: '2024-11-10', issues: ['Motor issue', 'Needs repair'] },
    { id: 3, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, qrCode: 'WASH-003', totalCycles: 312, lastMaintenance: '2024-11-18', issues: [] },
    { id: 4, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, qrCode: 'WASH-004', totalCycles: 278, lastMaintenance: '2024-11-12', issues: [] },
    { id: 5, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, qrCode: 'WASH-005', totalCycles: 401, lastMaintenance: '2024-11-16', issues: [] },
    { id: 6, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, qrCode: 'WASH-006', totalCycles: 156, lastMaintenance: '2024-11-19', issues: [] },
    { id: 7, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, qrCode: 'DRY-001', totalCycles: 334, lastMaintenance: '2024-11-14', issues: [] },
    { id: 8, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, qrCode: 'DRY-002', totalCycles: 289, lastMaintenance: '2024-11-17', issues: [] },
    { id: 9, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, qrCode: 'DRY-003', totalCycles: 267, lastMaintenance: '2024-11-13', issues: [] },
    { id: 10, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, qrCode: 'DRY-004', totalCycles: 412, lastMaintenance: '2024-11-11', issues: [] },
    { id: 11, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, qrCode: 'DRY-005', totalCycles: 198, lastMaintenance: '2024-11-19', issues: [] },
    { id: 12, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, qrCode: 'DRY-006', totalCycles: 223, lastMaintenance: '2024-11-15', issues: [] },
  ]);
  const [washerWaitlist, setWasherWaitlist] = useState<WaitlistItem[]>([]);
  const [dryerWaitlist, setDryerWaitlist] = useState<WaitlistItem[]>([]);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [selectedMachineType, setSelectedMachineType] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ machine: Machine; category: string } | null>(null);
  const [formData, setFormData] = useState({ name: '', studentId: '', phone: '' });
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const washCategories = {
    quick: { name: 'Quick Wash', time: 15 },
    normal: { name: 'Normal', time: 30 },
    heavy: { name: 'Heavy Duty', time: 45 },
  };

const dryCategories = {
    quick: { name: 'Quick Dry', time: 20 },
    normal: { name: 'Normal', time: 40 },
    heavy: { name: 'Heavy Dry', time: 60 },
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setMachines(prev => prev.map(m => {
        if (m.status === 'in-use' && m.timeLeft > 0) {
          const newTime = m.timeLeft - 1;
          if (newTime === 0) {
            if (m.currentUser) addNotification(m.currentUser, m.type, m.id);
            logUsage(m);
            return { ...m, status: 'completed', timeLeft: 0, totalCycles: m.totalCycles + 1 };
          }
          return { ...m, timeLeft: newTime };
        }
        return m;
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const logUsage = (machine: Machine) => {
    const usage = {
      id: Date.now(),
      machineId: machine.id,
      machineType: machine.type,
      user: machine.currentUser?.name || 'Unknown',
      category: machine.category,
      timestamp: new Date().toISOString(), // store ISO for reliable parsing
      duration: machine.type === 'washer' ? washCategories[machine.category as keyof typeof washCategories].time : dryCategories[machine.category as keyof typeof dryCategories].time,
    };
    setUsageHistory(prev => [...prev, usage]);
  };

  const addNotification = (userData: User, type: string, machineId: number) => {
    if (!userData) return;

const message = `${userData.name}, your ${type} #${machineId} is done!`;

const notif = {
  id: Date.now(),
  user: userData,
  type,
  machineId,
  timestamp: new Date().toLocaleTimeString(),
  message,
};

setNotifications(prev => [...prev, notif]);

    // client-safe guard
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('KY Wash', {
          body: notif.message,
          icon: '/laundry-icon.png'
        });
      } catch {
        // ignore notification errors in non-secure contexts
      }
    }
  };

  const requestNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch {
        // ignore
      }
    }
  };

  const handleAuth = () => {
    if (formData.name && formData.studentId && formData.phone) {
      const userData = { ...formData };
      setUser(userData);
      setIsAdmin(formData.studentId.toUpperCase() === 'ADMIN');
      setShowAuth(false);
      requestNotificationPermission();
    }
  };

  const handleQRScan = () => {
    const code = qrInput.trim().toUpperCase();
    const machine = machines.find(m => m.qrCode === code);
    if (machine) {
      setSelectedMachine(machine);
      setShowQRScanner(false);
      setQrInput('');
      if (typeof document !== 'undefined') {
        document.getElementById(`machine-${machine.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      alert('Invalid QR code! Please scan a valid machine QR code.');
    }
  };

  const handleConfirmStart = (machine: Machine, category: string) => {
    setConfirmModal({ machine, category });
  };

  const handleStartMachine = () => {
    if (!confirmModal || !user) return;
    const { machine, category } = confirmModal;
    if (machine.status !== 'available' || !machine.enabled) {
      setConfirmModal(null);
      return;
    }

    const categories = machine.type === 'washer' ? washCategories : dryCategories;
    const cycle = categories[category as keyof typeof categories];
    if (!cycle) {
      setConfirmModal(null);
      return;
    }
    const time = cycle.time * 60;

    setMachines(prev => prev.map(m =>
      m.id === machine.id
        ? { ...m, status: 'in-use', category, timeLeft: time, currentUser: user }
        : m
    ));
    setConfirmModal(null);
    setSelectedMachine(null);
  };

  const handleCancelMachine = (machineId: number) => {
    setMachines(prev => prev.map(m =>
      m.id === machineId
        ? { ...m, status: 'available', timeLeft: 0, currentUser: null, category: 'normal' }
        : m
    ));
  };

const handleEndCycle = (machineId: number) => {
    const machine = machines.find(m => m.id === machineId);
    if (machine) {
      logUsage(machine);
    }
    setMachines(prev => prev.map(m =>
      m.id === machineId
        ? { ...m, status: 'completed', timeLeft: 0, totalCycles: m.totalCycles + 1 }
        : m
    ));
  };

  const handleClothesCollected = (machineId: number) => {
    setMachines(prev => prev.map(m =>
      m.id === machineId
        ? { ...m, status: 'available', timeLeft: 0, currentUser: null, category: 'normal' }
        : m
    ));

    const machine = machines.find(m => m.id === machineId);
    if (!machine) return;
    const waitlist = machine.type === 'washer' ? washerWaitlist : dryerWaitlist;
    if (waitlist.length > 0) {
      alert(`Attention: ${machine.type} #${machineId} is now available!`);
    }
  };

  const handleJoinWaitlist = (type: string) => {
    if (!user) return;
    const newItem = {
      id: Date.now(),
      ...user,
      timestamp: new Date().toLocaleTimeString(),
    };

    if (type === 'washer') {
      setWasherWaitlist(prev => [...prev, newItem]);
    } else {
      setDryerWaitlist(prev => [...prev, newItem]);
    }
    setShowWaitlistModal(false);
  };

  const handleLeaveWaitlist = (type: string, itemId: number) => {
    if (type === 'washer') {
      setWasherWaitlist(prev => prev.filter(item => item.id !== itemId));
    } else {
      setDryerWaitlist(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const toggleMachineAvailability = (machineId: number) => {
    setMachines(prev => prev.map(m => {
      if (m.id === machineId) {
        const newEnabled = !m.enabled;
        return {
          ...m,
          enabled: newEnabled,
          status: newEnabled ? 'available' : 'disabled',
          timeLeft: 0,
          currentUser: null
        };
      }
      return m;
    }));
  };

  const handleAddMaintenanceNote = () => {
    if (!maintenanceNote.trim() || !selectedMachine) return;
    setMachines(prev => prev.map(m => {
      if (m.id === selectedMachine.id) {
        return {
          ...m,
          issues: [...m.issues, maintenanceNote.trim()],
          lastMaintenance: new Date().toISOString().split('T')[0]
        };
      }
      return m;
    }));

    setMaintenanceNote('');
    setShowMaintenanceModal(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAvailableCount = (type: string) => {
    return machines.filter(m => m.type === type && m.status === 'available' && m.enabled).length;
  };

  const getTotalCount = (type: string) => {
    return machines.filter(m => m.type === type && m.enabled).length;
  };

  const getPeakHours = () => {
    const hours: { [key: number]: number } = {};
    usageHistory.forEach(u => {
      // timestamp stored as ISO; safe to parse
      const d = new Date(u.timestamp);
      const hour = isNaN(d.getTime()) ? null : d.getHours();
      if (hour !== null) {
        hours[hour] = (hours[hour] || 0) + 1;
      }
    });
    const sorted = Object.entries(hours).sort((a, b) => (b[1] as number) - (a[1] as number));
    return sorted.slice(0, 3).map(([hour]) => `${hour}:00`).join(', ') || 'No data yet';
  };

  const getMostUsedCategory = () => {
    const categories: { [key: string]: number } = {};
    usageHistory.forEach(u => {
      categories[u.category] = (categories[u.category] || 0) + 1;
    });
    const sorted = Object.entries(categories).sort((a, b) => (b[1] as number) - (a[1] as number));
    return sorted[0]?.[0] || 'No data yet';
  };

  if (showAuth) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} flex items-center justify-center p-4`}>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-8 w-full max-w-md`}>
          <div className="text-center mb-8">
            <div className={`inline-block p-3 ${darkMode ? 'bg-blue-900' : 'bg-blue-100'} rounded-full mb-4`}>
              <Droplet className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>KY Wash</h1>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>Smart Laundry Management System</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                authMode === 'login' 
                  ? 'bg-blue-600 text-white' 
                  : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                authMode === 'register' 
                  ? 'bg-blue-600 text-white' 
                  : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Register
            </button>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              className={`w-full px-4 py-3 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <input
              type="text"
              placeholder="Student ID (Use 'ADMIN' for admin access)"
              className={`w-full px-4 py-3 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              value={formData.studentId}
              onChange={(e) => setFormData({...formData, studentId: e.target.value})}
            />
            <input
              type="tel"
              placeholder="Phone Number"
              className={`w-full px-4 py-3 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
            <button
              onClick={handleAuth}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full mt-4 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-sm border-b sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplet className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>KY Wash</h1>
              {isAdmin && <span className="text-xs text-orange-600 font-medium">Admin Mode</span>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowQRScanner(true)}
              className="text-blue-600 hover:text-blue-700"
              title="Scan QR Code"
            >
              <QrCode className="w-6 h-6" />
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAnalytics(true)}
                className="text-green-600 hover:text-green-700"
                title="View Analytics"
              >
                <TrendingUp className="w-6 h-6" />
              </button>
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} hover:text-gray-800`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="relative">
              <Bell className={`w-6 h-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'} cursor-pointer hover:text-blue-600 transition`} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </div>
            {user && (
              <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <User className="w-4 h-4" />
                <span>{user.name}</span>
              </div>
            )}
            <button
              onClick={() => {
                setUser(null);
                setShowAuth(true);
                setIsAdmin(false);
              }}
              className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} hover:text-gray-800 transition`}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <div className={`${darkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-50 border-blue-100'} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'} font-medium`}>Washers</p>
          <p className={`text-3xl font-bold ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>{getAvailableCount('washer')}/{getTotalCount('washer')}</p>
        </div>
        <Droplet className={`w-10 h-10 ${darkMode ? 'text-blue-400' : 'text-blue-400'}`} />
      </div>
    </div>
    <div className={`${darkMode ? 'bg-purple-900 border-purple-800' : 'bg-purple-50 border-purple-100'} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-600'} font-medium`}>Dryers</p>
          <p className={`text-3xl font-bold ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>{getAvailableCount('dryer')}/{getTotalCount('dryer')}</p>
        </div>
        <Wind className={`w-10 h-10 ${darkMode ? 'text-purple-400' : 'text-purple-400'}`} />
      </div>
    </div>
    <div className={`${darkMode ? 'bg-orange-900 border-orange-800' : 'bg-orange-50 border-orange-100'} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${darkMode ? 'text-orange-300' : 'text-orange-600'} font-medium`}>Washer Waitlist</p>
          <p className={`text-3xl font-bold ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>{washerWaitlist.length}</p>
        </div>
        <Clock className={`w-10 h-10 ${darkMode ? 'text-orange-400' : 'text-orange-400'}`} />
      </div>
    </div>
    <div className={`${darkMode ? 'bg-pink-900 border-pink-800' : 'bg-pink-50 border-pink-100'} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${darkMode ? 'text-pink-300' : 'text-pink-600'} font-medium`}>Dryer Waitlist</p>
          <p className={`text-3xl font-bold ${darkMode ? 'text-pink-200' : 'text-pink-700'}`}>{dryerWaitlist.length}</p>
        </div>
        <Clock className={`w-10 h-10 ${darkMode ? 'text-pink-400' : 'text-pink-400'}`} />
      </div>
    </div>
  </div>

  {notifications.length > 0 && (
    <div className={`mb-6 ${darkMode ? 'bg-yellow-900 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-800'} flex items-center gap-2`}>
          <Bell className="w-5 h-5" />
          Recent Notifications
        </h3>
        <button
          onClick={() => setNotifications([])}
          className={`${darkMode ? 'text-yellow-400 hover:text-yellow-200' : 'text-yellow-700 hover:text-yellow-900'} text-sm`}
        >
          Clear All
        </button>
      </div>
      <div className="space-y-2">
        {notifications.slice(-3).reverse().map(notif => (
          <div key={notif.id} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-3 text-sm`}>
            <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{notif.message}</p>
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>{notif.timestamp}</p>
          </div>
        ))}
      </div>
    </div>
  )}

  <div className="space-y-6">
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Washing Machines</h2>
        <button
          onClick={() => {
            setSelectedMachineType('washer');
            setShowWaitlistModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Join Waitlist
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.filter(m => m.type === 'washer').map(machine => (
          <MachineCard
            key={machine.id}
            machine={machine}
            darkMode={darkMode}
            selectedMachine={selectedMachine}
            isAdmin={isAdmin}
            user={user}
            categories={washCategories}
            onConfirmStart={handleConfirmStart}
            onCancel={handleCancelMachine}
            onEndCycle={handleEndCycle}
            onCollected={handleClothesCollected}
            onToggleAvailability={toggleMachineAvailability}
            onShowMaintenance={(m: Machine) => { setSelectedMachine(m); setShowMaintenanceModal(true); }}
            formatTime={formatTime}
          />
        ))}
      </div>
    </div>

    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Dryers</h2>
        <button
          onClick={() => {
            setSelectedMachineType('dryer');
            setShowWaitlistModal(true);
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Join Waitlist
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.filter(m => m.type === 'dryer').map(machine => (
          <MachineCard
            key={machine.id}
            machine={machine}
            darkMode={darkMode}
            selectedMachine={selectedMachine}
            isAdmin={isAdmin}
            user={user}
            categories={dryCategories}
            onConfirmStart={handleConfirmStart}
            onCancel={handleCancelMachine}
            onEndCycle={handleEndCycle}
            onCollected={handleClothesCollected}
            onToggleAvailability={toggleMachineAvailability}
            onShowMaintenance={(m: Machine) => { setSelectedMachine(m); setShowMaintenanceModal(true); }}
            formatTime={formatTime}
          />
        ))}
      </div>
    </div>
  </div>

  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl p-5 shadow-sm border`}>
      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Washer Waitlist</h3>
      {washerWaitlist.length === 0 ? (
        <p className={`${darkMode ? 'text-gray-500' : 'text-gray-500'} text-center py-4`}>No one waiting</p>
      ) : (
        <div className="space-y-2">
          {washerWaitlist.map((item) => (
            <div key={item.id} className={`flex items-center justify-between p-3 ${darkMode ? 'bg-blue-900' : 'bg-blue-50'} rounded-lg`}>
              <div>
                <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.name}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{item.timestamp}</span>
                {(user && (user.studentId === item.studentId || isAdmin)) && (
                  <button
                    onClick={() => handleLeaveWaitlist('washer', item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl p-5 shadow-sm border`}>
      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Dryer Waitlist</h3>
      {dryerWaitlist.length === 0 ? (
        <p className={`${darkMode ? 'text-gray-500' : 'text-gray-500'} text-center py-4`}>No one waiting</p>
      ) : (
        <div className="space-y-2">
          {dryerWaitlist.map((item) => (
            <div key={item.id} className={`flex items-center justify-between p-3 ${darkMode ? 'bg-purple-900' : 'bg-purple-50'} rounded-lg`}>
              <div>
                <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.name}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{item.timestamp}</span>
                {(user && (user.studentId === item.studentId || isAdmin)) && (
                  <button
                    onClick={() => handleLeaveWaitlist('dryer', item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>

      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 max-w-sm w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Scan QR Code</h3>
              <button onClick={() => setShowQRScanner(false)} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} hover:text-gray-700`}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Enter the QR code from the machine</p>
            <input
              type="text"
              placeholder="e.g., WASH-001 or DRY-003"
              className={`w-full px-4 py-3 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4`}
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQRScan()}
            />
            <button
              onClick={handleQRScan}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
            >
              Find Machine
            </button>
          </div>
        </div>
      )}

      {showWaitlistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 max-w-sm w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Join Waitlist</h3>
              <button onClick={() => setShowWaitlistModal(false)} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} hover:text-gray-700`}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>You will be notified when a machine becomes available</p>
            <button
              onClick={() => selectedMachineType && handleJoinWaitlist(selectedMachineType)}
              disabled={!selectedMachineType || !user}
              className={`w-full py-3 rounded-lg font-medium transition ${
                selectedMachineType === 'washer'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {selectedMachineType ? `Join ${selectedMachineType === 'washer' ? 'Washer' : 'Dryer'} Waitlist` : 'Select a machine type first'}
            </button>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 max-w-sm w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Confirm Start</h3>
              <button onClick={() => setConfirmModal(null)} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} hover:text-gray-700`}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-6">
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Start <strong>{confirmModal.machine.type} #{confirmModal.machine.id}</strong>
              </p>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                Cycle: <strong>{confirmModal.machine.type === 'washer' ? washCategories[confirmModal.category as keyof typeof washCategories].name : dryCategories[confirmModal.category as keyof typeof dryCategories].name}</strong>
              </p>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                Duration: <strong>{confirmModal.machine.type === 'washer' ? washCategories[confirmModal.category as keyof typeof washCategories].time : dryCategories[confirmModal.category as keyof typeof dryCategories].time} minutes</strong>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className={`flex-1 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} py-3 rounded-lg font-medium transition`}
              >
                Cancel
              </button>
              <button
                onClick={handleStartMachine}
                disabled={!user}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showMaintenanceModal && selectedMachine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 max-w-md w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Maintenance Log</h3>
              <button onClick={() => setShowMaintenanceModal(false)} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} hover:text-gray-700`}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-4">
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                <strong>{selectedMachine.type.toUpperCase()} #{selectedMachine.id}</strong>
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Cycles: {selectedMachine.totalCycles}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Last Maintenance: {selectedMachine.lastMaintenance}
              </p>
            </div>
            {selectedMachine.issues.length > 0 && (
              <div className="mb-4">
                <h4 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Issue History:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedMachine.issues.map((issue, idx) => (
                    <p key={`${selectedMachine.id}-issue-${idx}`} className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                      • {issue}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <textarea
              placeholder="Add maintenance note..."
              className={`w-full px-4 py-3 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4`}
              rows={3}
              value={maintenanceNote}
              onChange={(e) => setMaintenanceNote(e.target.value)}
            />
            <button
              onClick={handleAddMaintenanceNote}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
            >
              Add Note
            </button>
          </div>
        </div>
      )}

      {showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 max-w-2xl w-full my-8`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Usage Analytics</h3>
              <button onClick={() => setShowAnalytics(false)} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} hover:text-gray-700`}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`${darkMode ? 'bg-blue-900' : 'bg-blue-50'} rounded-lg p-4`}>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'} font-medium mb-2`}>Total Cycles Today</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>{usageHistory.length}</p>
              </div>
              <div className={`${darkMode ? 'bg-green-900' : 'bg-green-50'} rounded-lg p-4`}>
                <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-600'} font-medium mb-2`}>Machines Active</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-green-200' : 'text-green-700'}`}>
                  {machines.filter(m => m.status === 'in-use').length}
                </p>
              </div>
              <div className={`${darkMode ? 'bg-purple-900' : 'bg-purple-50'} rounded-lg p-4`}>
                <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-600'} font-medium mb-2`}>Peak Hours</p>
                <p className={`text-sm font-bold ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>{getPeakHours()}</p>
              </div>
              <div className={`${darkMode ? 'bg-orange-900' : 'bg-orange-50'} rounded-lg p-4`}>
                <p className={`text-sm ${darkMode ? 'text-orange-300' : 'text-orange-600'} font-medium mb-2`}>Most Used Cycle</p>
                <p className={`text-sm font-bold ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>{getMostUsedCategory()}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>Machine Health</h4>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {machines.map(m => (
                  <div key={m.id} className={`flex items-center justify-between p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {m.type.toUpperCase()} #{m.id}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {m.totalCycles} cycles | {m.issues.length} issues
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      m.totalCycles > 350 ? darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700' :
                      m.totalCycles > 250 ? darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-700' :
                      darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'
                    }`}>
                      {m.totalCycles > 350 ? 'High Usage' : m.totalCycles > 250 ? 'Medium' : 'Good'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>Recent Usage History</h4>
              <div className={`space-y-2 max-h-48 overflow-y-auto ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-3`}>
                {usageHistory.length === 0 ? (
                  <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'} text-center py-4`}>No usage data yet</p>
                ) : (
                  usageHistory.slice(-10).reverse().map(usage => (
                    <div key={usage.id} className={`flex items-center justify-between text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span>{usage.machineType.toUpperCase()} #{usage.machineId} - {usage.user}</span>
                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{new Date(usage.timestamp).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

interface MachineCardProps {
  machine: Machine;
  darkMode: boolean;
  selectedMachine: Machine | null;
  isAdmin: boolean;
  user: User | null;
  categories: { [key: string]: { name: string; time: number } };
  onConfirmStart: (machine: Machine, category: string) => void;
  onCancel: (id: number) => void;
  onEndCycle: (id: number) => void;
  onCollected: (id: number) => void;
  onToggleAvailability: (id: number) => void;
  onShowMaintenance: (machine: Machine) => void;
  formatTime: (seconds: number) => string;
}

const MachineCard = ({ machine, darkMode, selectedMachine, isAdmin, user, categories, onConfirmStart, onCancel, onEndCycle, onCollected, onToggleAvailability, onShowMaintenance, formatTime }: MachineCardProps) => {
  return (
    <div 
      id={`machine-${machine.id}`}
      className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 shadow-sm border-2 transition ${
        selectedMachine?.id === machine.id ? 'border-blue-500 ring-2 ring-blue-300' :
        machine.status === 'available' && machine.enabled ? darkMode ? 'border-green-700' : 'border-green-200' : 
        machine.status === 'disabled' ? 'border-gray-300 opacity-60' : darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {machine.type === 'washer' ? 'Washer' : 'Dryer'} #{machine.id}
          </span>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} flex items-center gap-1`}>
            <QrCode className="w-3 h-3" />
            {machine.qrCode}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            machine.status === 'available' && machine.enabled
              ? darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'
              : machine.status === 'in-use'
              ? darkMode ? 'bg-orange-900 text-orange-200' : 'bg-orange-100 text-orange-700'
              : machine.status === 'completed'
              ? darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'
              : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}>            {machine.status === 'disabled' ? 'Disabled' : 
             machine.status === 'available' ? 'Available' : 
             machine.status === 'completed' ? 'Done' : 'In Use'}
          </span>
          {isAdmin && (
            <>
              <button
                onClick={() => onToggleAvailability(machine.id)}
                className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} hover:text-gray-800`}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => onShowMaintenance(machine)}
                className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} hover:text-gray-800`}
              >
                <Wrench className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mb-3`}>
          <p>Cycles: {machine.totalCycles} | Last: {machine.lastMaintenance}</p>
          {machine.issues.length > 0 && (
            <p className="text-red-500 mt-1">⚠️ {machine.issues[machine.issues.length - 1]}</p>
          )}
        </div>
      )}

      {machine.status === 'in-use' && (
        <div className="mb-4">
          <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
            <Clock className="w-4 h-4" />
            <span>{formatTime(machine.timeLeft)} remaining</span>
          </div>
          <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mb-3`}>
            User: {machine.currentUser?.name || 'Unknown'}
          </div>
          {user && user.studentId === machine.currentUser?.studentId && (
            <div className="flex gap-2">
              <button
                onClick={() => onCancel(machine.id)}
                className={`flex-1 ${darkMode ? 'bg-red-900 hover:bg-red-800 text-red-200' : 'bg-red-50 hover:bg-red-100 text-red-700'} py-2 rounded-lg text-sm font-medium transition`}
              >
                Cancel
              </button>
              {isAdmin && (
                <button
                  onClick={() => onEndCycle(machine.id)}
                  className={`flex-1 ${darkMode ? 'bg-blue-900 hover:bg-blue-800 text-blue-200' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'} py-2 rounded-lg text-sm font-medium transition`}
                >
                  End Now
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {machine.status === 'completed' && (
        <div className="space-y-2">
          <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-green-400' : 'text-green-600'} mb-2`}>
            <CheckCircle className="w-4 h-4" />
            <span>Cycle completed!</span>
          </div>
          <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mb-3`}>
            User: {machine.currentUser?.name || 'Unknown'}
          </div>
          {user && user.studentId === machine.currentUser?.studentId && (
            <button
              onClick={() => onCollected(machine.id)}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              Clothes Collected
            </button>
          )}
        </div>
      )}

      {machine.status === 'available' && machine.enabled && (
        <div className="space-y-2">
          {Object.entries(categories).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => onConfirmStart(machine, key)}
              className={`w-full ${
                machine.type === 'washer' 
                  ? darkMode ? 'bg-blue-900 hover:bg-blue-800 text-blue-200' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                  : darkMode ? 'bg-purple-900 hover:bg-purple-800 text-purple-200' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
              } py-2 rounded-lg text-sm font-medium transition`}
            >
              {cat.name} ({cat.time}min)
            </button>
          ))}
        </div>
      )}

      {machine.status === 'disabled' && (
        <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          <AlertCircle className="w-4 h-4" />
          <span>Machine temporarily unavailable</span>
        </div>
      )}
    </div>
  );
};

export default KYWash;
