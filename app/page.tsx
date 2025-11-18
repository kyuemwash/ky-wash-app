import React, { useState, useEffect } from 'react';
import { Bell, Loader2, Plus, X, LogOut, User, Clock, Droplet, Wind } from 'lucide-react';

const KYWash = () => {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login');
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
            // Notify user
            if (m.currentUser) {
              alert(`${m.currentUser.name}, your ${m.type} (#${m.id}) is done!`);
            }
            // Check queue for next user
            const nextInQueue = queue.find(q => q.machineType === m.type);
            if (nextInQueue) {
              alert(`${nextInQueue.name}, ${m.type} #${m.id} is now available for you!`);
              setQueue(prev => prev.filter(q => q.id !== nextInQueue.id));
            }
            return { ...m, status: 'available', timeLeft: 0, currentUser: null };
          }
          return { ...m, timeLeft: newTime };
        }
        return m;
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [queue]);

  const handleAuth = () => {
    if (formData.name && formData.studentId && formData.phone) {
      setUser(formData);
      setShowAuth(false);
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const availableWashers = machines.filter(m => m.type === 'washer' && m.status === 'available').length;
  const availableDryers = machines.filter(m => m.type === 'dryer' && m.status === 'available').length;

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
              <Droplet className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">KY Wash</h1>
            <p className="text-gray-600 mt-2">Smart Laundry Management</p>
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
              Login
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                authMode === 'register' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Register
            </button>
          </div>

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
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplet className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">KY Wash</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{user.name}</span>
            </div>
            <button
              onClick={() => {
                setUser(null);
                setShowAuth(true);
              }}
              className="text-gray-600 hover:text-gray-800 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Washers Available</p>
                <p className="text-3xl font-bold text-blue-700">{availableWashers}/3</p>
              </div>
              <Droplet className="w-10 h-10 text-blue-400" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Dryers Available</p>
                <p className="text-3xl font-bold text-purple-700">{availableDryers}/3</p>
              </div>
              <Wind className="w-10 h-10 text-purple-400" />
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
                  machine.status === 'available' ? 'border-green-200' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-800">Washer #{machine.id}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      machine.status === 'available' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {machine.status === 'available' ? 'Available' : 'In Use'}
                    </span>
                  </div>

                  {machine.status === 'in-use' && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(machine.timeLeft)} remaining</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        User: {machine.currentUser?.name}
                      </div>
                    </div>
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
                  machine.status === 'available' ? 'border-green-200' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-800">Dryer #{machine.id}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      machine.status === 'available' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {machine.status === 'available' ? 'Available' : 'In Use'}
                    </span>
                  </div>

                  {machine.status === 'in-use' && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(machine.timeLeft)} remaining</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        User: {machine.currentUser?.name}
                      </div>
                    </div>
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
            <h2 className="text-xl font-bold text-gray-800">Queue ({queue.length})</h2>
            <button
              onClick={() => setShowQueueModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Join Queue
            </button>
          </div>
          
          {queue.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No one in queue</p>
          ) : (
            <div className="space-y-2">
              {queue.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">#{idx + 1} - {item.name}</p>
                    <p className="text-sm text-gray-600">{item.machineType} • {item.phone}</p>
                  </div>
                  <span className="text-xs text-gray-500">{item.timestamp}</span>
                </div>
              ))}
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
            <p className="text-gray-600 mb-4">Select machine type:</p>
            <div className="space-y-3">
              <button
                onClick={() => handleJoinQueue('washer')}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-lg font-medium transition"
              >
                Washer Queue
              </button>
              <button
                onClick={() => handleJoinQueue('dryer')}
                className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 py-3 rounded-lg font-medium transition"
              >
                Dryer Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYWash;
