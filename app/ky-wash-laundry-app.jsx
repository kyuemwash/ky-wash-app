import React, { useState, useEffect } from 'react';
import { Bell, Loader2, Plus, X, LogOut, User, Clock, Droplet, Wind, Shield, XCircle, CheckCircle, Mail } from 'lucide-react';

const KYWash = () => {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [machines, setMachines] = useState([
    { id: 1, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null },
    { id: 2, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null },
    { id: 3, type: 'washer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null },
    { id: 4, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null },
    { id: 5, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null },
    { id: 6, type: 'dryer', status: 'available', category: 'normal', timeLeft: 0, currentUser: null },
  ]);
  const [queue, setQueue] = useState([]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [formData, setFormData] = useState({ name: '', studentId: '', phone: '' });
  const [adminCredentials, setAdminCredentials] = useState({ username: '', password: '' });
  const [notifications, setNotifications] = useState([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);

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
            // Create notification
            const notif = {
              id: Date.now(),
              userName: m.currentUser?.name,
              userPhone: m.currentUser?.phone,
              machineType: m.type,
              machineId: m.id,
              timestamp: new Date().toLocaleTimeString()
            };
            setNotifications(n => [...n, notif]);
            setCurrentNotification(notif);
            setShowNotificationModal(true);
            
            return { ...m, status: 'completed', timeLeft: 0 };
          }
          return { ...m, timeLeft: newTime };
        }
        return m;
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAuth = () => {
    if (formData.name && formData.studentId && formData.phone) {
      setUser(formData);
      setShowAuth(false);
      setIsAdmin(false);
    }
  };

  const handleAdminLogin = () => {
    // Demo credentials - in production, use proper authentication
    if (adminCredentials.username === 'admin' && adminCredentials.password === 'admin123') {
      setUser({ name: 'Admin', isAdmin: true });
      setShowAuth(false);
      setIsAdmin(true);
    } else {
      alert('Invalid admin credentials');
    }
  };

  const handleStartMachine = (machine, category) => {
    if (machine.status !== 'available') return;
    
    const categories = machine.type === 'washer' ? washCategories : dryCategories;
    const time = categories[category].time * 60;
    
    setMachines(prev => prev.map(m => 
      m.id === machine.id 
        ? { ...m, status: 'in-use', category, timeLeft: time, currentUser: user }
        : m
    ));
  };

  const handleCancelMachine = (machineId) => {
    if (window.confirm('Are you sure you want to cancel this cycle?')) {
      setMachines(prev => prev.map(m => 
        m.id === machineId && m.currentUser?.studentId === user?.studentId
          ? { ...m, status: 'available', timeLeft: 0, currentUser: null, category: 'normal' }
          : m
      ));
    }
  };

  const handleEndMachine = (machineId) => {
    setMachines(prev => prev.map(m => 
      m.id === machineId && m.currentUser?.studentId === user?.studentId
        ? { ...m, status: 'awaiting-collection', timeLeft: 0 }
        : m
    ));
  };

  const handleClothesCollected = (machineId) => {
    setMachines(prev => prev.map(m => 
      m.id === machineId && m.currentUser?.studentId === user?.studentId
        ? { ...m, status: 'available', currentUser: null, category: 'normal' }
        : m
    ));
    
    // Check if anyone is waiting in queue
    const machine = machines.find(m => m.id === machineId);
    const nextInQueue = queue.find(q => q.machineType === machine.type);
    if (nextInQueue) {
      alert(`${nextInQueue.name}, a ${machine.type} is now available for you!`);
      setQueue(prev => prev.filter(q => q.id !== nextInQueue.id));
    }
  };

  const handleJoinQueue = (machineType) => {
    const newQueueItem = {
      id: Date.now(),
      ...user,
      machineType,
      timestamp: new Date().toLocaleTimeString(),
    };
    setQueue(prev => [...prev, newQueueItem]);
    setShowQueueModal(false);
  };

  const sendEmailNotification = (notif) => {
    const subject = `KY Wash - Your ${notif.machineType} is ready!`;
    const body = `Hi ${notif.userName},

Your ${notif.machineType} #${notif.machineId} has completed its cycle at ${notif.timestamp}.

Please collect your clothes as soon as possible.

Thank you for using KY Wash!`;
    
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const availableWashers = machines.filter(m => m.type === 'washer' && m.status === 'available').length;
  const availableDryers = machines.filter(m => m.type === 'dryer' && m.status === 'available').length;

  // Auth Screen
  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
              <Droplet className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">KY WASH</h1>
            <p className="text-gray-600 mt-2">Smart Laundry Management by KYUEM</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                authMode === 'login' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Student Login
            </button>
            <button
              onClick={() => setAuthMode('admin')}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                authMode === 'admin' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-1" />
              Admin
            </button>
          </div>

          {authMode === 'admin' ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Admin Username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={adminCredentials.username}
                onChange={(e) => setAdminCredentials({...adminCredentials, username: e.target.value})}
              />
              <input
                type="password"
                placeholder="Admin Password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={adminCredentials.password}
                onChange={(e) => setAdminCredentials({...adminCredentials, password: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
              <button
                onClick={handleAdminLogin}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                Admin Login
              </button>
              <p className="text-xs text-gray-500 text-center">Demo: admin / admin123</p>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <input
                type="text"
                placeholder="Student ID"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.studentId}
                onChange={(e) => setFormData({...formData, studentId: e.target.value})}
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
              <button
                onClick={handleAuth}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Login & Continue
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin Dashboard
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-indigo-100">KY Wash Management</p>
              </div>
            </div>
            <button
              onClick={() => {
                setUser(null);
                setShowAuth(true);
                setIsAdmin(false);
              }}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <p className="text-sm text-gray-600 mb-1">Washers Available</p>
              <p className="text-3xl font-bold text-blue-600">{availableWashers}/3</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <p className="text-sm text-gray-600 mb-1">Dryers Available</p>
              <p className="text-3xl font-bold text-purple-600">{availableDryers}/3</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <p className="text-sm text-gray-600 mb-1">Queue (Washers)</p>
              <p className="text-3xl font-bold text-orange-600">{queue.filter(q => q.machineType === 'washer').length}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <p className="text-sm text-gray-600 mb-1">Queue (Dryers)</p>
              <p className="text-3xl font-bold text-orange-600">{queue.filter(q => q.machineType === 'dryer').length}</p>
            </div>
          </div>

          {/* Active Machines */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Active Machines</h2>
            <div className="space-y-3">
              {machines.filter(m => m.status === 'in-use' || m.status === 'completed').map(machine => (
                <div key={machine.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {machine.type === 'washer' ? 'Washer' : 'Dryer'} #{machine.id}
                    </p>
                    <p className="text-sm text-gray-600">
                      {machine.currentUser?.name} • ID: {machine.currentUser?.studentId} • {machine.currentUser?.phone}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {washCategories[machine.category]?.name || dryCategories[machine.category]?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    {machine.status === 'in-use' ? (
                      <div>
                        <p className="text-lg font-mono font-bold text-blue-600">{formatTime(machine.timeLeft)}</p>
                        <p className="text-xs text-gray-500">In Progress</p>
                      </div>
                    ) : (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {machines.filter(m => m.status === 'in-use' || m.status === 'completed').length === 0 && (
                <p className="text-gray-500 text-center py-8">No active machines</p>
              )}
            </div>
          </div>

          {/* Waiting List */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Waiting List</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Washer Queue ({queue.filter(q => q.machineType === 'washer').length})</h3>
                <div className="space-y-2">
                  {queue.filter(q => q.machineType === 'washer').map((item, idx) => (
                    <div key={item.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="font-medium text-gray-800">#{idx + 1} - {item.name}</p>
                      <p className="text-sm text-gray-600">ID: {item.studentId} • {item.phone}</p>
                    </div>
                  ))}
                  {queue.filter(q => q.machineType === 'washer').length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">No one waiting</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Dryer Queue ({queue.filter(q => q.machineType === 'dryer').length})</h3>
                <div className="space-y-2">
                  {queue.filter(q => q.machineType === 'dryer').map((item, idx) => (
                    <div key={item.id} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="font-medium text-gray-800">#{idx + 1} - {item.name}</p>
                      <p className="text-sm text-gray-600">ID: {item.studentId} • {item.phone}</p>
                    </div>
                  ))}
                  {queue.filter(q => q.machineType === 'dryer').length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">No one waiting</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Student Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">KY WASH</h1>
              <p className="text-sm text-blue-100">by KYUEM</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-blue-100">{user.studentId}</p>
            </div>
            <button
              onClick={() => {
                setUser(null);
                setShowAuth(true);
              }}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border-2 border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Washers Available</p>
                <p className="text-3xl font-bold text-blue-700">{availableWashers}/3</p>
              </div>
              <Droplet className="w-10 h-10 text-blue-300" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-2 border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Dryers Available</p>
                <p className="text-3xl font-bold text-purple-700">{availableDryers}/3</p>
              </div>
              <Wind className="w-10 h-10 text-purple-300" />
            </div>
          </div>
        </div>

        {/* Machines */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Washing Machines</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {machines.filter(m => m.type === 'washer').map(machine => (
                <div key={machine.id} className={`bg-white rounded-xl p-5 shadow-sm border-2 transition ${
                  machine.status === 'available' ? 'border-green-200' : 
                  machine.status === 'completed' && machine.currentUser?.studentId === user.studentId ? 'border-yellow-300' :
                  'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-800">Washer #{machine.id}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      machine.status === 'available' ? 'bg-green-100 text-green-700' : 
                      machine.status === 'completed' ? 'bg-yellow-100 text-yellow-700' :
                      machine.status === 'awaiting-collection' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {machine.status === 'available' ? 'Available' : 
                       machine.status === 'completed' ? 'Done!' :
                       machine.status === 'awaiting-collection' ? 'Collect' : 'In Use'}
                    </span>
                  </div>

                  {machine.status === 'in-use' && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono font-bold">{formatTime(machine.timeLeft)}</span>
                      </div>
                      {machine.currentUser?.studentId === user.studentId ? (
                        <div className="space-y-2">
                          <div className="text-xs text-blue-600 font-medium">Your cycle - {washCategories[machine.category]?.name}</div>
                          <button
                            onClick={() => handleCancelMachine(machine.id)}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel Cycle
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">In use by {machine.currentUser?.name}</div>
                      )}
                    </div>
                  )}

                  {machine.status === 'completed' && machine.currentUser?.studentId === user.studentId && (
                    <button
                      onClick={() => handleEndMachine(machine.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      End & Prepare Collection
                    </button>
                  )}

                  {machine.status === 'awaiting-collection' && machine.currentUser?.studentId === user.studentId && (
                    <button
                      onClick={() => handleClothesCollected(machine.id)}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 animate-pulse"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Clothes Collected
                    </button>
                  )}

                  {machine.status === 'available' && (
                    <div className="space-y-2">
                      {Object.entries(dryCategories).map(([key, cat]) => (
                        <button
                          key={key}
                          onClick={() => handleStartMachine(machine, key)}
                          className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 py-2 rounded-lg text-sm font-medium transition"
                        >
                          {cat.name} ({cat.time}min)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Queue Section */}
        <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Waiting Queue ({queue.length})
            </h2>
            <button
              onClick={() => setShowQueueModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Join Queue
            </button>
          </div>
          
          {queue.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No one in queue</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-sm">Washer Queue</h3>
                {queue.filter(q => q.machineType === 'washer').map((item, idx) => (
                  <div key={item.id} className="mb-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="font-medium text-gray-800">#{idx + 1} - {item.name}</p>
                    <p className="text-sm text-gray-600">ID: {item.studentId}</p>
                  </div>
                ))}
                {queue.filter(q => q.machineType === 'washer').length === 0 && (
                  <p className="text-gray-400 text-sm py-2">No one waiting</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-sm">Dryer Queue</h3>
                {queue.filter(q => q.machineType === 'dryer').map((item, idx) => (
                  <div key={item.id} className="mb-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="font-medium text-gray-800">#{idx + 1} - {item.name}</p>
                    <p className="text-sm text-gray-600">ID: {item.studentId}</p>
                  </div>
                ))}
                {queue.filter(q => q.machineType === 'dryer').length === 0 && (
                  <p className="text-gray-400 text-sm py-2">No one waiting</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Queue Modal */}
      {showQueueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Join Queue</h3>
              <button onClick={() => setShowQueueModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">Select machine type to join queue:</p>
            <div className="space-y-3">
              <button
                onClick={() => handleJoinQueue('washer')}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <Droplet className="w-5 h-5" />
                Washer Queue
              </button>
              <button
                onClick={() => handleJoinQueue('dryer')}
                className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <Wind className="w-5 h-5" />
                Dryer Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotificationModal && currentNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="inline-block p-4 bg-green-100 rounded-full mb-3">
                <Bell className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Cycle Complete! 🎉</h3>
              <p className="text-gray-600">
                Hi {currentNotification.userName}, your {currentNotification.machineType} #{currentNotification.machineId} has finished!
              </p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
              <p className="text-sm text-blue-800 mb-2">
                <strong>💡 Quick Tip:</strong> You can send notifications via Gmail for better tracking!
              </p>
              <p className="text-xs text-blue-600">
                Gmail allows you to schedule reminders and keep a history of all your laundry cycles.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  sendEmailNotification(currentNotification);
                  setShowNotificationModal(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Send Email Notification
              </button>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYWash;-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 animate-pulse"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Clothes Collected
                    </button>
                  )}

                  {machine.status === 'available' && (
                    <div className="space-y-2">
                      {Object.entries(washCategories).map(([key, cat]) => (
                        <button
                          key={key}
                          onClick={() => handleStartMachine(machine, key)}
                          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-medium transition"
                        >
                          {cat.name} ({cat.time}min)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Dryers</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {machines.filter(m => m.type === 'dryer').map(machine => (
                <div key={machine.id} className={`bg-white rounded-xl p-5 shadow-sm border-2 transition ${
                  machine.status === 'available' ? 'border-green-200' : 
                  machine.status === 'completed' && machine.currentUser?.studentId === user.studentId ? 'border-yellow-300' :
                  'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-800">Dryer #{machine.id}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      machine.status === 'available' ? 'bg-green-100 text-green-700' : 
                      machine.status === 'completed' ? 'bg-yellow-100 text-yellow-700' :
                      machine.status === 'awaiting-collection' ? 'bg-orange-100 text-orange-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {machine.status === 'available' ? 'Available' : 
                       machine.status === 'completed' ? 'Done!' :
                       machine.status === 'awaiting-collection' ? 'Collect' : 'In Use'}
                    </span>
                  </div>

                  {machine.status === 'in-use' && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono font-bold">{formatTime(machine.timeLeft)}</span>
                      </div>
                      {machine.currentUser?.studentId === user.studentId ? (
                        <div className="space-y-2">
                          <div className="text-xs text-purple-600 font-medium">Your cycle - {dryCategories[machine.category]?.name}</div>
                          <button
                            onClick={() => handleCancelMachine(machine.id)}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel Cycle
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">In use by {machine.currentUser?.name}</div>
                      )}
                    </div>
                  )}

                  {machine.status === 'completed' && machine.currentUser?.studentId === user.studentId && (
                    <button
                      onClick={() => handleEndMachine(machine.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      End & Prepare Collection
                    </button>
                  )}

                  {machine.status === 'awaiting-collection' && machine.currentUser?.studentId === user.studentId && (
                    <button
                      onClick={() => handleClothesCollected(machine.id)}
                      className="w-full bg-orange