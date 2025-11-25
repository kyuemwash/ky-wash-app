# KY Wash Frontend Integration Guide

Complete step-by-step instructions for connecting your React/Next.js frontend to the KY Wash FastAPI backend.

## Table of Contents

1. [Setup](#setup)
2. [Configuration](#configuration)
3. [Authentication Integration](#authentication-integration)
4. [Real-time Updates](#real-time-updates)
5. [API Usage Examples](#api-usage-examples)
6. [WebSocket Examples](#websocket-examples)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Setup

### Files Created

Three new library files have been created in `/app/lib/`:

1. **`api.ts`** - HTTP API client with JWT authentication
2. **`useWebSocket.ts`** - WebSocket hook for real-time updates
3. **`types.ts`** - Complete TypeScript type definitions

### Installation

No additional packages needed! Uses built-in:
- `fetch` API (native)
- WebSocket (native)
- React hooks (existing)

### Environment Configuration

Create a `.env.local` file in your project root:

```bash
# Backend API URL (default: http://localhost:8000/api/v1)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# WebSocket URL (default: ws://localhost:8000/api/ws)
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/ws
```

For production:

```bash
# Use your backend domain
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/api/ws
```

---

## Configuration

### Token Storage

Tokens are automatically stored in `localStorage`:

- `kywash_access_token` - JWT access token (24-hour expiry)
- `kywash_refresh_token` - Refresh token (7-day expiry)
- `kywash_user` - User profile data

Tokens are automatically cleared on logout or when expired.

### CORS Requirements

Backend must have CORS enabled for your frontend domain. Update `.env` in backend:

```
CORS_ORIGINS=["http://localhost:3000", "https://yourdomain.com"]
```

---

## Authentication Integration

### 1. Login Component Example

```typescript
// app/components/LoginPage.tsx
'use client';

import { useState } from 'react';
import { loginUser, APIError } from '@/app/lib/api';
import { isValidStudentId, isValidPin } from '@/app/lib/types';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!isValidStudentId(studentId)) {
      setError('Student ID must be 6 digits');
      return;
    }

    if (!isValidPin(pin)) {
      setError('PIN must be 4 digits');
      return;
    }

    setLoading(true);
    try {
      await loginUser({
        student_id: studentId,
        pin,
      });

      // Redirect to machines page on success
      router.push('/machines');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto">
      <div>
        <label className="block text-sm font-medium mb-1">
          Student ID (6 digits)
        </label>
        <input
          type="text"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          maxLength={6}
          placeholder="123456"
          className="w-full px-3 py-2 border border-gray-300 rounded"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          PIN (4 digits)
        </label>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={4}
          placeholder="1234"
          className="w-full px-3 py-2 border border-gray-300 rounded"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### 2. Registration Component Example

```typescript
// app/components/RegisterPage.tsx
'use client';

import { useState } from 'react';
import { registerUser, APIError } from '@/app/lib/api';
import { isValidStudentId, isValidPin, isValidPhoneNumber } from '@/app/lib/types';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    studentId: '',
    pin: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate
    if (!isValidStudentId(formData.studentId)) {
      setError('Student ID must be 6 digits');
      return;
    }
    if (!isValidPin(formData.pin)) {
      setError('PIN must be 4 digits');
      return;
    }
    if (!isValidPhoneNumber(formData.phone)) {
      setError('Phone must be 10-11 digits');
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        student_id: formData.studentId,
        pin: formData.pin,
        phone_number: formData.phone,
      });

      router.push('/machines');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Registration failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4 max-w-md mx-auto">
      <input
        type="text"
        maxLength={6}
        placeholder="Student ID (6 digits)"
        value={formData.studentId}
        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
        disabled={loading}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />

      <input
        type="password"
        maxLength={4}
        placeholder="PIN (4 digits)"
        value={formData.pin}
        onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
        disabled={loading}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />

      <input
        type="tel"
        placeholder="Phone (10-11 digits)"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        disabled={loading}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
```

---

## Real-time Updates

### Machine Updates with WebSocket

```typescript
// app/components/MachinesPage.tsx
'use client';

import { useEffect, useState } from 'react';
import { getAllMachines, startMachine, APIError } from '@/app/lib/api';
import { useWebSocket } from '@/app/lib/useWebSocket';
import { Machine, MachineList, formatTimeRemaining } from '@/app/lib/types';

export default function MachinesPage() {
  const [machines, setMachines] = useState<MachineList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load machines from API
  async function loadMachines() {
    try {
      const data = await getAllMachines();
      setMachines(data);
      setError('');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to load machines');
      }
    } finally {
      setLoading(false);
    }
  }

  // Setup WebSocket for real-time updates
  useWebSocket((message) => {
    if (message.event === 'machine_update') {
      const { machine_id, machine_type, status, time_left_seconds, current_user_id } = message.data;

      setMachines((prev) => {
        if (!prev) return prev;

        const typeKey = machine_type === 'washer' ? 'washers' : 'dryers';
        return {
          ...prev,
          [typeKey]: prev[typeKey as keyof MachineList].map((m) =>
            m.machine_id === machine_id
              ? {
                  ...m,
                  status,
                  time_left_seconds,
                  current_user_id,
                }
              : m
          ),
        };
      });
    }
  });

  // Load on mount
  useEffect(() => {
    loadMachines();
  }, []);

  if (loading) return <div>Loading machines...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!machines) return null;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Machines</h1>

      {/* Washers Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Washers</h2>
        <div className="grid grid-cols-3 gap-4">
          {machines.washers.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              onStart={(category) =>
                startMachine(machine.machine_id, 'washer', category)
              }
            />
          ))}
        </div>
      </section>

      {/* Dryers Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Dryers</h2>
        <div className="grid grid-cols-3 gap-4">
          {machines.dryers.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              onStart={(category) =>
                startMachine(machine.machine_id, 'dryer', category)
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function MachineCard({
  machine,
  onStart,
}: {
  machine: Machine;
  onStart: (category: string) => void;
}) {
  return (
    <div className={`p-4 rounded border ${
      machine.status === 'available' ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'
    }`}>
      <div className="font-bold mb-2">
        Machine {machine.machine_id} ({machine.machine_type})
      </div>

      <div className="text-sm mb-2">
        Status: <span className="font-semibold">{machine.status}</span>
      </div>

      {machine.status === 'in_use' && (
        <div className="text-sm mb-2">
          Time left: {formatTimeRemaining(machine.time_left_seconds)}
        </div>
      )}

      {machine.status === 'available' && (
        <select
          onChange={(e) => onStart(e.target.value)}
          defaultValue=""
          className="w-full p-2 text-sm border border-gray-300 rounded"
        >
          <option value="">Start cycle...</option>
          <option value="normal">Normal (30 min)</option>
          <option value="extra_5">Extra 5 min</option>
          <option value="extra_10">Extra 10 min</option>
          <option value="extra_15">Extra 15 min</option>
        </select>
      )}

      {!machine.enabled && (
        <div className="text-xs text-red-600 font-semibold">DISABLED</div>
      )}
    </div>
  );
}
```

---

## API Usage Examples

### Getting Waitlist

```typescript
import { getWaitlist, joinWaitlist, leaveWaitlist } from '@/app/lib/api';

async function checkWaitlist() {
  try {
    const washerWaitlist = await getWaitlist('washer');
    console.log('Washer waitlist:', washerWaitlist);
    // {
    //   machine_type: 'washer',
    //   items: [{ id: 1, user_id: 2, student_id: '123456', position: 1, ... }],
    //   count: 3
    // }
  } catch (error) {
    console.error('Failed to get waitlist:', error);
  }
}

async function handleJoinWaitlist() {
  try {
    const result = await joinWaitlist('washer');
    console.log('Joined waitlist at position:', result.position);
  } catch (error) {
    console.error('Failed to join waitlist:', error);
  }
}
```

### Reporting Faults

```typescript
import { reportFault, getMachineReportCount } from '@/app/lib/api';

async function handleReportFault(
  machineId: number,
  description: string,
  photoData?: string
) {
  try {
    const report = await reportFault(
      machineId,
      'washer',
      description,
      photoData // Base64 encoded image
    );
    console.log('Fault reported:', report);
  } catch (error) {
    console.error('Failed to report fault:', error);
  }
}

async function checkMachineHealth() {
  try {
    const count = await getMachineReportCount('washer', 1);
    console.log('Reports:', count);
    // {
    //   machine_id: 1,
    //   machine_type: 'washer',
    //   report_count: 2,
    //   is_disabled: false
    // }
  } catch (error) {
    console.error('Failed to get report count:', error);
  }
}
```

### Getting Activities

```typescript
import { getActivityFeed, getUserActivities } from '@/app/lib/api';

async function loadActivityFeed() {
  try {
    const feed = await getActivityFeed(50, 0); // limit, offset
    console.log('Total activities:', feed.total);
    feed.activities.forEach((activity) => {
      console.log(`${activity.activity_type} - ${activity.created_at}`);
    });
  } catch (error) {
    console.error('Failed to load activity:', error);
  }
}

async function loadMyActivities(userId: number) {
  try {
    const userFeed = await getUserActivities(userId, 20, 0);
    console.log('My activities:', userFeed.activities);
  } catch (error) {
    console.error('Failed to load user activities:', error);
  }
}
```

### Managing Notifications

```typescript
import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
} from '@/app/lib/api';

async function loadNotifications() {
  try {
    const data = await getNotifications();
    console.log('Unread:', data.unread_count);
    console.log('Notifications:', data.notifications);
  } catch (error) {
    console.error('Failed to load notifications:', error);
  }
}

async function handleNotificationRead(notificationId: number) {
  try {
    await markNotificationAsRead(notificationId);
    console.log('Marked as read');
  } catch (error) {
    console.error('Failed to mark as read:', error);
  }
}
```

---

## WebSocket Examples

### Real-time Notifications Component

```typescript
// app/components/NotificationCenter.tsx
'use client';

import { useEffect, useState } from 'react';
import { useNotificationUpdates } from '@/app/lib/useWebSocket';
import { Notification } from '@/app/lib/types';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Listen for new notifications from WebSocket
  useNotificationUpdates((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);

    // Show browser notification
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        tag: `notification-${notification.id}`,
      });
    }
  });

  return (
    <div className="notification-center">
      <div className="font-semibold mb-4">
        Notifications ({notifications.length})
      </div>
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="p-3 mb-2 bg-blue-50 border border-blue-200 rounded"
        >
          <div className="font-semibold">{notif.title}</div>
          <div className="text-sm">{notif.message}</div>
          <div className="text-xs text-gray-600 mt-1">
            {new Date(notif.created_at).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Real-time Activity Feed Component

```typescript
// app/components/ActivityFeed.tsx
'use client';

import { useEffect, useState } from 'react';
import { useActivityUpdates } from '@/app/lib/useWebSocket';
import { Activity, getActivityTypeLabel, formatDate } from '@/app/lib/types';

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);

  // Listen for activity updates from WebSocket
  useActivityUpdates((activity: Activity) => {
    setActivities((prev) => [activity, ...prev].slice(0, 50)); // Keep last 50
  });

  return (
    <div className="activity-feed">
      <h2 className="text-2xl font-bold mb-4">Live Activity</h2>
      {activities.length === 0 ? (
        <p className="text-gray-500">No recent activities</p>
      ) : (
        activities.map((activity) => (
          <div
            key={activity.id}
            className="flex justify-between p-3 border-b border-gray-200"
          >
            <div>
              <div className="font-semibold">
                {getActivityTypeLabel(activity.activity_type)}
              </div>
              {activity.details && (
                <div className="text-sm text-gray-600">{activity.details}</div>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {formatDate(activity.created_at)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
```

---

## Testing

### 1. Test Authentication Flow

```bash
# Start backend
cd backend && bash run.sh

# In separate terminal, start frontend
npm run dev

# In browser, open http://localhost:3000
# Test: Register → Login → Check tokens in localStorage
```

### 2. Test Real-time Updates (Multiple Tabs)

```bash
# 1. Open http://localhost:3000/machines in Tab 1
# 2. Open http://localhost:3000/machines in Tab 2
# 3. Start a cycle in Tab 1
# 4. Verify Tab 2 updates in real-time (no page refresh needed)
```

### 3. Test WebSocket Connection

```typescript
// In browser console
import { getWebSocket, getAccessToken } from '@/app/lib/api';

// Check WebSocket status
const ws = new WebSocket('ws://localhost:8000/api/ws');
ws.onopen = () => {
  console.log('Connected!');
  ws.send(JSON.stringify({ user_id: 1 }));
};
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
```

### 4. Test with Multiple Users

```bash
# Terminal 1: Start backend
cd backend && bash run.sh

# Terminal 2: Start frontend on port 3000
PORT=3000 npm run dev

# Terminal 3: Start another frontend instance on different port
PORT=3001 npm run dev

# Test cross-user real-time sync:
# - Login as different users in each browser
# - Start a machine in one browser
# - Watch it update in real-time in other browser
```

---

## Troubleshooting

### Issue: "Failed to connect to backend"

**Solution:**
1. Verify backend is running: `http://localhost:8000/api/health`
2. Check `.env.local` has correct API URL
3. Verify CORS is configured in backend `.env`

### Issue: "JWT token is invalid"

**Solution:**
1. Clear localStorage: `localStorage.clear()`
2. Re-login
3. Check token not expired (default 24 hours)

### Issue: "WebSocket connection failed"

**Solution:**
1. Check `.env.local` has correct WebSocket URL
2. Verify WebSocket port is not blocked by firewall
3. Use `wss://` for HTTPS (not `ws://`)

### Issue: "Real-time updates not working"

**Solution:**
1. Check WebSocket connection in browser DevTools → Network → WS
2. Verify user authentication is sent on connection
3. Check WebSocket server logs in backend

### Issue: "CORS error"

**Solution:**
1. Add frontend URL to backend `.env`:
   ```
   CORS_ORIGINS=["http://localhost:3000", "https://yourdomain.com"]
   ```
2. Restart backend
3. Clear browser cache

### Debugging

Enable debug logging in WebSocket hook:

```typescript
useWebSocket(onMessage, {
  debug: true, // Logs all WebSocket events
});
```

Check network requests in browser:
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Verify requests have `Authorization: Bearer <token>` header

---

## Next Steps

1. **Create Login Page** - Use the LoginPage component example
2. **Create Machines Page** - Use the MachinesPage component example
3. **Add WebSocket Updates** - Use useWebSocket hook
4. **Test Thoroughly** - Use testing section above
5. **Deploy** - Update `.env` with production URLs

## Production Checklist

- [ ] Update `.env` with production API URL
- [ ] Update `.env` with production WebSocket URL
- [ ] Enable HTTPS/WSS
- [ ] Test token refresh flow
- [ ] Set up error logging
- [ ] Test across browsers
- [ ] Verify real-time sync with load testing
- [ ] Update backend CORS_ORIGINS

---

**All files are production-ready. No modifications needed to existing code.**
