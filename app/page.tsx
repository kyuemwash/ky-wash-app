"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Plus, X, LogOut, User, Clock, Droplet, Wind, Settings, AlertCircle, CheckCircle, TrendingUp, Wrench, Moon, Sun, Lock, Flag } from 'lucide-react';

interface User {
  studentId: string;
  pin: string;
  phoneNumber?: string;
}

interface Machine {
  id: number;
  type: string;
  status: string;
  category: string;
  timeLeft: number;
  currentUser: User | null;
  enabled: boolean;
  totalCycles: number;
  lastMaintenance: string;
  issues: string[];
  faultReports: FaultReport[];
}

interface FaultReport {
  id: string;
  studentId: string;
  issue: string;
  timestamp: string;
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

const ADMIN_PASSWORD = "admin123";

// Simulated Supabase - Replace with actual Supabase client
const useRealtimeDatabase = () => {
  const [data, setData] = useState<any>(null);
  
  // Simulate real-time updates
  useEffect(() => {
    const stored = localStorage.getItem('kywash_db');
    if (stored) {
      setData(JSON.parse(stored));
    } else {
      const initialData = {
        machines: [
          { id: 1, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, totalCycles: 245, lastMaintenance: '2024-11-15', issues: [], faultReports: [] },
          { id: 2, type: 'washer', status: 'disabled', category: 'normal', timeLeft: 0, currentUser: null, enabled: false, totalCycles: 189, lastMaintenance: '2024-11-10', issues: ['Motor issue', 'Needs repair'], faultReports: [] },
          { id: 3, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, totalCycles: 312, lastMaintenance: '2024-11-18', issues: [], faultReports: [] },
          { id: 4, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, totalCycles: 278, lastMaintenance: '2024-11-12', issues: [], faultReports: [] },
          { id: 5, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, totalCycles: 401, lastMaintenance: '2024-11-16', issues: [], faultReports: [] },
          { id: 6, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, totalCycles: 156, lastMaintenance: '2024-11-19', issues: [], faultReports: [] },
          { id: 7, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, totalCycles: 334, lastMaintenance: '2024-11-14', issues: [], faultReports: [] },
          { id: 8, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, totalCycles: 289, lastMaintenance: '2024-11-17', issues: [], faultReports: [] },
          { id: 9, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, totalCycles: 267, lastMaintenance: '2024-11-13', issues: [], faultReports: [] },
          { id: 10, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, totalCycles: 412, lastMaintenance: '2024-11-11', issues: [], faultReports: [] },
          { id: 11, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, totalCycles: 198, lastMaintenance: '2024-11-19', issues: [], faultReports: [] },
          { id: 12, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null, enabled: true, totalCycles: 223, lastMaintenance: '2024-11-15', issues: [], faultReports: [] },
        ],
        washerWaitlist: [],
        dryerWaitlist: [],
        usageHistory: [],
        notifications: [],
        lastUpdate: Date.now(),
      };
      setData(initialData);
      localStorage.setItem('kywash_db', JSON.stringify(initialData));
    }

    // Simulate real-time listener
    const interval = setInterval(() => {
      const stored = localStorage.getItem('kywash_db');
      if (stored) {
        const parsed = JSON.parse(stored);
        setData(parsed);
      }
    }, 500); // Check for updates every 500ms

    return () => clearInterval(interval);
  }, []);

  const updateData = (newData: any) => {
    const updated = { ...newData, lastUpdate: Date.now() };
    setData(updated);
    localStorage.setItem('kywash_db', JSON.stringify(updated));
    
    // Broadcast to other tabs
    localStorage.setItem('kywash_broadcast', JSON.stringify({ data: updated, timestamp: Date.now() }));
  };

  return { data, updateData };
};

const KYWash = () => {
  const { data: sharedState, updateData } = useRealtimeDatabase();
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [formData, setFormData] = useState({ studentId: '', pin: '', phoneNumber: '' });
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [selectedMachineType, setSelectedMachineType] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ machine: Machine; category: string } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMachine, setReportMachine] = useState<Machine | null>(null);
  const [reportIssue, setReportIssue] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

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
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Timer for machine countdowns - more efficient implementation
  useEffect(() => {
    if (!sharedState?.machines) return;

    // Check if any machine is currently running
    const hasRunningMachines = sharedState.machines.some((m: Machine) => m.status === 'in-use' && m.timeLeft > 0);
    if (!hasRunningMachines) return; // No need for timer if nothing is running

    const timer = setInterval(() => {
      // Get fresh data from localStorage to avoid stale closure
      const stored = localStorage.getItem('kywash_db');
      if (!stored) return;

      try {
        const currentData = JSON.parse(stored);
        const updatedMachines = currentData.machines.map((m: Machine) => {
          if (m.status === 'in-use' && m.timeLeft > 0) {
            const newTime = m.timeLeft - 1;
            if (newTime === 0) {
              // Machine cycle completed
              if (m.currentUser) {
                sendPushNotification(m.currentUser, m.type, m.id);
                logUsage(m);
              }
              return { 
                ...m, 
                status: 'completed', 
                timeLeft: 0, 
                totalCycles: m.totalCycles + 1 
              };
            }
            // Machine still running, decrement time
            return { ...m, timeLeft: newTime };
          }
          return m;
        });

        // Check if any machine actually changed
        let machinesChanged = false;
        for (let i = 0; i < updatedMachines.length; i++) {
          if (updatedMachines[i].timeLeft !== currentData.machines[i].timeLeft ||
              updatedMachines[i].status !== currentData.machines[i].status) {
            machinesChanged = true;
            break;
          }
        }

        if (machinesChanged) {
          updateData({ ...currentData, machines: updatedMachines });
        }
      } catch (e) {
        console.error('Timer update error:', e);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [sharedState?.machines?.length]); // Only re-run if machine count changes

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          new Notification('KY Wash', {
            body: 'Notifications enabled! You will be alerted when your cycle completes.',
            icon: '/laundry-icon.png'
          });
        }
      }
    }
  };

  const sendPushNotification = (userData: User, type: string, machineId: number) => {
    if (!userData) return;
    const message = `Student ${userData.studentId}, your ${type} #${machineId} is done!`;

    const notif = {
      id: Date.now(),
      user: userData,
      type,
      machineId,
      timestamp: new Date().toLocaleTimeString(),
      message,
    };

    if (sharedState) {
      updateData({
        ...sharedState,
        notifications: [...sharedState.notifications, notif]
      });
    }

    // Browser notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('KY Wash - Cycle Complete! 🎉', {
          body: message,
          icon: '/laundry-icon.png',
          badge: '/laundry-icon.png',
          requireInteraction: true,
          tag: `machine-${machineId}`
        });
        
        // Play notification sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKnn77RiGwU7k9ryynkqBSh+zPLaizsKGGS76+miUhIIQ5zd8sFuJAUvgs/y2Ik3CBtpu+3mn04MClCn4/C2YxwGOJHX8sx5LAUkd8fw3ZBACg==');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch {}
    }

    // Simulate SMS notification (in production, use Twilio)
    console.log(`📱 SMS sent to ${userData.studentId}: ${message}`);
  };

  const logUsage = (machine: Machine) => {
    if (!sharedState) return;

    const usage = {
      id: Date.now(),
      machineId: machine.id,
      machineType: machine.type,
      user: machine.currentUser?.studentId || 'Unknown',
      category: machine.category,
      timestamp: new Date().toISOString(),
      duration: machine.type === 'washer' ? washCategories[machine.category as keyof typeof washCategories].time : dryCategories[machine.category as keyof typeof dryCategories].time,
    };

    updateData({
      ...sharedState,
      usageHistory: [...sharedState.usageHistory, usage]
    });
  };

  const handleAuth = () => {
    if (!formData.studentId || !formData.pin || formData.studentId.length !== 6 || formData.pin.length < 4) {
      alert('Please enter a valid 6-digit Student ID and 4-digit PIN');
      return;
    }
    
    if (authMode === 'register' && (!formData.phoneNumber || formData.phoneNumber.length < 10)) {
      alert('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    // Get registered users from localStorage
    const registeredUsersStr = localStorage.getItem('kywash_users');
    const registeredUsers: User[] = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];

    if (authMode === 'register') {
      // Check if user already exists
      const existingUser = registeredUsers.find(u => u.studentId === formData.studentId);
      if (existingUser) {
        alert('This Student ID is already registered! Please login instead.');
        setAuthMode('login');
        return;
      }

      // Register new user
      const newUser = { studentId: formData.studentId, pin: formData.pin, phoneNumber: formData.phoneNumber };
      registeredUsers.push(newUser);
      localStorage.setItem('kywash_users', JSON.stringify(registeredUsers));
      
      setUser(newUser);
      setShowAuth(false);
      setFormData({ studentId: '', pin: '', phoneNumber: '' });
      requestNotificationPermission();
      alert('Registration successful! You can now use KY Wash.');
    } else {
      // Login existing user
      const existingUser = registeredUsers.find(u => u.studentId === formData.studentId && u.pin === formData.pin);
      
      if (!existingUser) {
        alert('Invalid credentials! Please check your Student ID and PIN, or register if you are a new user.');
        return;
      }

      setUser(existingUser);
      setShowAuth(false);
      setFormData({ studentId: '', pin: '', phoneNumber: '' });
      requestNotificationPermission();
    }
  };

  const handleAdminAuth = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowAdminAuth(false);
      setAdminPassword('');
    } else {
      alert('Incorrect password!');
      setAdminPassword('');
    }
  };

  const handleReportFault = () => {
    if (!reportMachine || !reportIssue.trim() || !user) return;

    const newReport: FaultReport = {
      id: `${Date.now()}`,
      studentId: user.studentId,
      issue: reportIssue.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMachines = sharedState.machines.map((m: Machine) => {
      if (m.id === reportMachine.id) {
        const newReports = [...m.faultReports, newReport];
        
        // Auto-disable after 3 reports
        if (newReports.length >= 3 && m.enabled) {
          return {
            ...m,
            faultReports: newReports,
            enabled: false,
            status: 'disabled',
            issues: [...m.issues, `Auto-disabled: ${newReports.length} fault reports`]
          };
        }
        return { ...m, faultReports: newReports };
      }
      return m;
    });

    updateData({ ...sharedState, machines: updatedMachines });
    setReportIssue('');
    setShowReportModal(false);
    setReportMachine(null);
    alert('Fault reported successfully! Admin will be notified.');
  };

  const handleConfirmStart = (machine: Machine, category: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setConfirmModal({ machine, category });
  };

  const handleStartMachine = () => {
    if (!confirmModal || !user || !sharedState) return;
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

    const updatedMachines = sharedState.machines.map((m: Machine) =>
      m.id === machine.id
        ? { ...m, status: 'in-use', category, timeLeft: time, currentUser: user }
        : m
    );

    updateData({ ...sharedState, machines: updatedMachines });
    setConfirmModal(null);
    setSelectedMachine(null);
  };

  const handleCancelMachine = (machineId: number) => {
    if (!sharedState) return;
    const updatedMachines = sharedState.machines.map((m: Machine) =>
      m.id === machineId
        ? { ...m, status: 'available', timeLeft: 0, currentUser: null, category: 'normal' }
        : m
    );
    updateData({ ...sharedState, machines: updatedMachines });
  };

  const handleEndCycle = (machineId: number) => {
    if (!sharedState) return;
    const machine = sharedState.machines.find((m: Machine) => m.id === machineId);
    if (machine) logUsage(machine);
    
    const updatedMachines = sharedState.machines.map((m: Machine) =>
      m.id === machineId
        ? { ...m, status: 'completed', timeLeft: 0, totalCycles: m.totalCycles + 1 }
        : m
    );
    updateData({ ...sharedState, machines: updatedMachines });
  };

  const handleClothesCollected = (machineId: number) => {
    if (!sharedState) return;
    
    const machine = sharedState.machines.find((m: Machine) => m.id === machineId);
    if (!machine) return;
    
    const waitlist = machine.type === 'washer' ? sharedState.washerWaitlist : sharedState.dryerWaitlist;
    if (waitlist.length > 0) {
      alert(`Attention: ${machine.type} #${machineId} is now available for the next person in line!`);
    }

    const updatedMachines = sharedState.machines.map((m: Machine) =>
      m.id === machineId
        ? { ...m, status: 'available', timeLeft: 0, currentUser: null, category: 'normal' }
        : m
    );

    updateData({ ...sharedState, machines: updatedMachines });
  };

  const handleJoinWaitlist = (type: string) => {
    if (!user || !sharedState) {
      setShowAuth(true);
      return;
    }
    const newItem = {
      id: Date.now(),
      ...user,
      timestamp: new Date().toLocaleTimeString(),
    };

    updateData({
      ...sharedState,
      washerWaitlist: type === 'washer' ? [...sharedState.washerWaitlist, newItem] : sharedState.washerWaitlist,
      dryerWaitlist: type === 'dryer' ? [...sharedState.dryerWaitlist, newItem] : sharedState.dryerWaitlist,
    });
    setShowWaitlistModal(false);
  };

  const handleLeaveWaitlist = (type: string, itemId: number) => {
    if (!sharedState) return;
    updateData({
      ...sharedState,
      washerWaitlist: type === 'washer' ? sharedState.washerWaitlist.filter((item: WaitlistItem) => item.id !== itemId) : sharedState.washerWaitlist,
      dryerWaitlist: type === 'dryer' ? sharedState.dryerWaitlist.filter((item: WaitlistItem) => item.id !== itemId) : sharedState.dryerWaitlist,
    });
  };

  const toggleMachineAvailability = (machineId: number) => {
    if (!sharedState) return;
    const updatedMachines = sharedState.machines.map((m: Machine) => {
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
    });
    updateData({ ...sharedState, machines: updatedMachines });
  };

  const handleAddMaintenanceNote = () => {
    if (!maintenanceNote.trim() || !selectedMachine || !sharedState) return;
    
    const updatedMachines = sharedState.machines.map((m: Machine) => {
      if (m.id === selectedMachine.id) {
        return {
          ...m,
          issues: [...m.issues, maintenanceNote.trim()],
          lastMaintenance: new Date().toISOString().split('T')[0],
          faultReports: [] // Clear fault reports after maintenance
        };
      }
      return m;
    });

    updateData({ ...sharedState, machines: updatedMachines });
    setMaintenanceNote('');
    setShowMaintenanceModal(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getUserInfo = (studentId: string) => {
    const registeredUsersStr = localStorage.getItem('kywash_users');
    const registeredUsers: User[] = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];
    const userInfo = registeredUsers.find(u => u.studentId === studentId);
    return userInfo;
  };

  const getAvailableCount = (type: string) => {
    if (!sharedState) return 0;
    return sharedState.machines.filter((m: Machine) => m.type === type && m.status === 'available' && m.enabled).length;
  };

  const getTotalCount = (type: string) => {
    if (!sharedState) return 0;
    return sharedState.machines.filter((m: Machine) => m.type === type && m.enabled).length;
  };

  const getPeakHours = () => {
    if (!sharedState) return 'No data yet';
    const hours: { [key: number]: number } = {};
    sharedState.usageHistory.forEach((u: UsageHistory) => {
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
    if (!sharedState) return 'No data yet';
    const categories: { [key: string]: number } = {};
    sharedState.usageHistory.forEach((u: UsageHistory) => {
      categories[u.category] = (categories[u.category] || 0) + 1;
    });
    const sorted = Object.entries(categories).sort((a, b) => (b[1] as number) - (a[1] as number));
    return sorted[0]?.[0] || 'No data yet';
  };

  if (!sharedState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Droplet className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading KY Wash...</p>
        </div>
      </div>
    );
  }

  if (showAdminAuth) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} flex items-center justify-center p-4`}>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-8 w-full max-w-md`}>
          <div className="text-center mb-8">
            <div className={`inline-block p-3 ${darkMode ? 'bg-orange-900' : 'bg-orange-100'} rounded-full mb-4`}>
              <Lock className={`w-8 h-8 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>Admin Access</h1>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-700'} mt-2`}>Enter admin password to continue</p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              placeholder="Admin Password"
              className={`w-full px-4 py-3 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-black'} rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminAuth()}
            />
            <button
              onClick={handleAdminAuth}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 transition"
            >
              Login as Admin
            </button>
            <button
              onClick={() => setShowAdminAuth(false)}
              className={`w-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-black'} py-3 rounded-lg font-medium hover:bg-gray-200 transition`}
            >
              Back to Main
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sharedState) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <p className={`text-xl font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || showAuth) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} flex items-center justify-center p-4`}>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-8 w-full max-w-md`}>
          <div className="text-center mb-8">
            <div className={`inline-block p-3 ${darkMode ? 'bg-blue-900' : 'bg-blue-100'} rounded-full mb-4`}>
              <Droplet className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>KY Wash</h1>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-700'} mt-2`}>Laundry Management System</p>
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
              placeholder="Student ID (6 digits)"
              maxLength={6}
              className={`w-full px-4 py-3 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-black'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              value={formData.studentId}
              onChange={(e) => setFormData({...formData, studentId: e.target.value.replace(/\D/g, '')})}
            />
            <input
              type="password"
              placeholder="PIN (4 digits)"
              maxLength={4}
              className={`w-full px-4 py-3 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-black'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              value={formData.pin}
              onChange={(e) => setFormData({...formData, pin: e.target.value})}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            />
            {authMode === 'register' && (
              <input
                type="tel"
                placeholder="Phone Number (for communication)"
                className={`w-full px-4 py-3 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-black'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                value={formData.phoneNumber}
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value.replace(/\D/g, '')})}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              />
            )}
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Droplet className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>KY Wash</h1>
              {isAdmin && <span className="text-xs text-orange-600 font-medium">Admin Mode</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {notificationPermission === 'default' && user && (
              <button
                onClick={requestNotificationPermission}
                className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-yellow-600 transition flex items-center gap-1"
              >
                <Bell className="w-3 h-3" />
                Enable Alerts
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowAnalytics(true)}
                className="text-green-600 hover:text-green-700"
                title="View Analytics"
              >
                <TrendingUp className="w-6 h-6" />
              </button>
            )}
            {!isAdmin && (
              <button
                onClick={() => setShowAdminAuth(true)}
                className="text-orange-600 hover:text-orange-700"
                title="Admin Login"
              >
                <Lock className="w-6 h-6" />
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
              {sharedState.notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {sharedState.notifications.length}
                </span>
              )}
            </div>
            {user ? (
              <>
                <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-black'}`}>
                  <User className="w-4 h-4" />
                  <span>ID: {user.studentId}</span>
                </div>
                <button
                  onClick={() => {
                    setUser(null);
                    setIsAdmin(false);
                  }}
                  className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} hover:text-gray-800 transition`}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
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
                  <p className={`text-3xl font-bold ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>{sharedState.washerWaitlist.length}</p>
                </div>
                <Clock className={`w-10 h-10 ${darkMode ? 'text-orange-400' : 'text-orange-400'}`} />
              </div>
            </div>
            <div className={`${darkMode ? 'bg-pink-900 border-pink-800' : 'bg-pink-50 border-pink-100'} rounded-xl p-4 border`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-pink-300' : 'text-pink-600'} font-medium`}>Dryer Waitlist</p>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-pink-200' : 'text-pink-700'}`}>{sharedState.dryerWaitlist.length}</p>
                </div>
                <Clock className={`w-10 h-10 ${darkMode ? 'text-pink-400' : 'text-pink-400'}`} />
              </div>
            </div>
          </div>

          {sharedState.notifications.length > 0 && (
            <div className={`mb-6 ${darkMode ? 'bg-yellow-900 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-800'} flex items-center gap-2`}>
                  <Bell className="w-5 h-5" />
                  Recent Notifications
                </h3>
                <button
                  onClick={() => updateData({ ...sharedState, notifications: [] })}
                  className={`${darkMode ? 'text-yellow-400 hover:text-yellow-200' : 'text-yellow-700 hover:text-yellow-900'} text-sm`}
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-2">
                {sharedState.notifications.slice(-3).reverse().map((notif: Notification) => (
                  <div key={notif.id} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-3 text-sm`}>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-black'}`}>{notif.message}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'} mt-1`}>{notif.timestamp}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>Washing Machines</h2>
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
                {sharedState.machines.filter((m: Machine) => m.type === 'washer').map((machine: Machine) => (
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
                    onReportFault={(m: Machine) => { setReportMachine(m); setShowReportModal(true); }}
                    formatTime={formatTime}
                    getUserInfo={getUserInfo}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>Dryers</h2>
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
                {sharedState.machines.filter((m: Machine) => m.type === 'dryer').map((machine: Machine) => (
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
                    onReportFault={(m: Machine) => { setReportMachine(m); setShowReportModal(true); }}
                    formatTime={formatTime}
                    getUserInfo={getUserInfo}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl p-5 shadow-sm border`}>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-black'} mb-4`}>Washer Waitlist</h3>
              {sharedState.washerWaitlist.length === 0 ? (
                <p className={`${darkMode ? 'text-gray-500' : 'text-gray-600'} text-center py-4`}>No one waiting</p>
              ) : (
                <div className="space-y-2">
                  {sharedState.washerWaitlist.map((item: WaitlistItem) => (
                    <div key={item.id} className={`flex items-center justify-between p-3 ${darkMode ? 'bg-blue-900' : 'bg-blue-50'} rounded-lg`}>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-black'}`}>Student ID: {item.studentId}</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.timestamp}</p>
                      </div>
                      <div className="flex items-center gap-2">
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
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-black'} mb-4`}>Dryer Waitlist</h3>
              {sharedState.dryerWaitlist.length === 0 ? (
                <p className={`${darkMode ? 'text-gray-500' : 'text-gray-600'} text-center py-4`}>No one waiting</p>
              ) : (
                <div className="space-y-2">
                  {sharedState.dryerWaitlist.map((item: WaitlistItem) => (
                    <div key={item.id} className={`flex items-center justify-between p-3 ${darkMode ? 'bg-purple-900' : 'bg-purple-50'} rounded-lg`}>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-black'}`}>Student ID: {item.studentId}</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.timestamp}</p>
                      </div>
                      <div className="flex items-center gap-2">
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
        </div>
      </div>

      {showWaitlistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 max-w-sm w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>Join Waitlist</h3>
              <button onClick={() => setShowWaitlistModal(false)} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} hover:text-gray-700`}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-700'} mb-4`}>You will be notified when a machine becomes available</p>
            <button
              onClick={() => selectedMachineType && handleJoinWaitlist(selectedMachineType)}
              disabled={!selectedMachineType}
              className={`w-full py-3 rounded-lg font-medium transition ${
                selectedMachineType === 'washer'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {selectedMachineType ? `Join ${selectedMachineType === 'washer' ? 'Washer' : 'Dryer'} Waitlist` : 'Select a machine type'}
            </button>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 max-w-sm w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>Confirm Start</h3>
              <button onClick={() => setConfirmModal(null)} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} hover:text-gray-700`}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-6">
              <p className={`${darkMode ? 'text-gray-300' : 'text-black'} mb-2`}>
                Start <strong>{confirmModal.machine.type} #{confirmModal.machine.id}</strong>
              </p>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-700'} text-sm`}>
                Cycle: <strong>{confirmModal.machine.type === 'washer' ? washCategories[confirmModal.category as keyof typeof washCategories].name : dryCategories[confirmModal.category as keyof typeof dryCategories].name}</strong>
              </p>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-700'} text-sm`}>
                Duration: <strong>{confirmModal.machine.type === 'washer' ? washCategories[confirmModal.category as keyof typeof washCategories].time : dryCategories[confirmModal.category as keyof typeof dryCategories].time} minutes</strong>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className={`flex-1 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-black'} py-3 rounded-lg font-medium transition`}
              >
                Cancel
              </button>
              <button
                onClick={handleStartMachine}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
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
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>Maintenance Log</h3>
              <button onClick={() => setShowMaintenanceModal(false)} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} hover:text-gray-700`}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-4">
              <p className={`${darkMode ? 'text-gray-300' : 'text-black'} mb-2`}>
                <strong>{selectedMachine.type.toUpperCase()} #{selectedMachine.id}</strong>
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                Total Cycles: {selectedMachine.totalCycles}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                Last Maintenance: {selectedMachine.lastMaintenance}
              </p>
            </div>
            {selectedMachine.faultReports.length > 0 && (
              <div className="mb-4">
                <h4 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-black'} mb-2`}>Fault Reports:</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedMachine.faultReports.map((report) => (
                    <div key={report.id} className={`${darkMode ? 'bg-red-900' : 'bg-red-50'} rounded p-2`}>
                      <p className={`text-sm ${darkMode ? 'text-red-200' : 'text-red-700'}`}>{report.issue}</p>
                      <p className={`text-xs ${darkMode ? 'text-red-300' : 'text-red-600'} mt-1`}>
                        By: {report.studentId} - {new Date(report.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedMachine.issues.length > 0 && (
              <div className="mb-4">
                <h4 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-black'} mb-2`}>Maintenance History:</h4>
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
              className={`w-full px-4 py-3 border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-black'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4`}
              rows={3}
              value={maintenanceNote}
              onChange={(e) => setMaintenanceNote(e.target.value)}
            />
            <button
              onClick={handleAddMaintenanceNote}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
            >
              Add Note & Clear Faults
            </button>
          </div>
        </div>
      )}

      {showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 max-w-2xl w-full my-8`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>Usage Analytics</h3>
              <button onClick={() => setShowAnalytics(false)} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} hover:text-gray-700`}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`${darkMode ? 'bg-blue-900' : 'bg-blue-50'} rounded-lg p-4`}>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'} font-medium mb-2`}>Total Cycles Today</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>{sharedState.usageHistory.length}</p>
              </div>
              <div className={`${darkMode ? 'bg-green-900' : 'bg-green-50'} rounded-lg p-4`}>
                <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-600'} font-medium mb-2`}>Machines Active</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-green-200' : 'text-green-700'}`}>
                  {sharedState.machines.filter((m: Machine) => m.status === 'in-use').length}
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
              <h4 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-black'} mb-3`}>Machine Health</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sharedState.machines.map((m: Machine) => (
                  <div key={m.id} className={`flex items-center justify-between p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-black'}`}>
                        {m.type.toUpperCase()} #{m.id}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                        {m.totalCycles} cycles | {m.issues.length} issues | {m.faultReports.length} faults
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
              <h4 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-black'} mb-3`}>Recent Usage History</h4>
              <div className={`space-y-2 max-h-48 overflow-y-auto ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-3`}>
                {sharedState.usageHistory.length === 0 ? (
                  <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'} text-center py-4`}>No usage data yet</p>
                ) : (
                  sharedState.usageHistory.slice(-10).reverse().map((usage: UsageHistory) => (
                    <div key={usage.id} className={`flex items-center justify-between text-sm ${darkMode ? 'text-gray-300' : 'text-black'}`}>
                      <span>{usage.machineType.toUpperCase()} #{usage.machineId} - ID: {usage.user}</span>
                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>{new Date(usage.timestamp).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
  onReportFault: (machine: Machine) => void;
  formatTime: (seconds: number) => string;
  getUserInfo: (studentId: string) => User | undefined;
}

const MachineCard = ({ machine, darkMode, selectedMachine, isAdmin, user, categories, onConfirmStart, onCancel, onEndCycle, onCollected, onToggleAvailability, onShowMaintenance, onReportFault, formatTime, getUserInfo }: MachineCardProps) => {
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
          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
            {machine.type === 'washer' ? 'Washer' : 'Dryer'} #{machine.id}
          </span>
          {machine.faultReports.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Flag className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-500">{machine.faultReports.length} report(s)</span>
            </div>
          )}
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
          }`}>
            {machine.status === 'disabled' ? 'Disabled' : 
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
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'} mb-3`}>
          <p>Cycles: {machine.totalCycles} | Last: {machine.lastMaintenance}</p>
          {machine.issues.length > 0 && (
            <p className="text-red-500 mt-1">⚠️ {machine.issues[machine.issues.length - 1]}</p>
          )}
        </div>
      )}

      {machine.status === 'in-use' && (
        <div className="mb-4">
          <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'} mb-2`}>
            <Clock className="w-4 h-4" />
            <span>{formatTime(machine.timeLeft)} remaining</span>
          </div>
          <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'} mb-3 space-y-1`}>
            <p>ID: {machine.currentUser?.studentId || 'Unknown'}</p>
            {machine.currentUser?.studentId && (
              <p>Phone: {getUserInfo(machine.currentUser.studentId)?.phoneNumber || 'N/A'}</p>
            )}
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
          <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'} mb-3 space-y-1`}>
            <p>ID: {machine.currentUser?.studentId || 'Unknown'}</p>
            {machine.currentUser?.studentId && (
              <p>Phone: {getUserInfo(machine.currentUser.studentId)?.phoneNumber || 'N/A'}</p>
            )}
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
          {user && (
            <button
              onClick={() => onReportFault(machine)}
              className={`w-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2`}
            >
              <Flag className="w-3 h-3" />
              Report Issue
            </button>
          )}
        </div>
      )}

      {machine.status === 'disabled' && (
        <div>
          <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'} mb-2`}>
            <AlertCircle className="w-4 h-4" />
            <span>Machine temporarily unavailable</span>
          </div>
          {machine.faultReports.length > 0 && (
            <div className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-600'} mt-2`}>
              Latest report: {machine.faultReports[machine.faultReports.length - 1].issue}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KYWash;
