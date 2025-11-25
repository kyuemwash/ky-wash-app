# Integration Quick Reference

Fast lookup for common integration patterns and code snippets.

## Imports

```typescript
// API Client
import { 
  // Auth
  loginUser, 
  registerUser, 
  logoutUser, 
  
  // Machines
  getAllMachines, 
  startMachine, 
  cancelMachine, 
  endMachine,
  
  // Waitlist
  getWaitlist, 
  joinWaitlist, 
  leaveWaitlist,
  
  // Faults
  reportFault, 
  getMachineReportCount,
  
  // Other
  getActivityFeed, 
  getNotifications,
  
  // Utilities
  getAccessToken, 
  clearAuthTokens,
  
  // Error Classes
  APIError, 
  AuthError
} from '@/app/lib/api';

// WebSocket Hooks
import { 
  useWebSocket,
  useMachineUpdates,
  useWaitlistUpdates,
  useActivityUpdates,
  useNotificationUpdates,
  useFaultUpdates
} from '@/app/lib/useWebSocket';

// Types & Utilities
import {
  type Machine,
  type User,
  type Activity,
  type Notification,
  MachineType,
  MachineStatus,
  CycleCategory,
  CYCLE_TIMES,
  formatTimeRemaining,
  formatDate,
  isValidStudentId,
  isValidPin,
} from '@/app/lib/types';
```

## Authentication

### Login
```typescript
try {
  await loginUser({
    student_id: '123456',
    pin: '1234'
  });
  // Tokens auto-saved to localStorage
  router.push('/machines');
} catch (error) {
  if (error instanceof APIError) {
    console.error('Login failed:', error.message);
  }
}
```

### Register
```typescript
try {
  await registerUser({
    student_id: '123456',
    pin: '1234',
    phone_number: '5555555555'
  });
  router.push('/machines');
} catch (error) {
  console.error('Registration failed:', error);
}
```

### Logout
```typescript
await logoutUser();
router.push('/login');
```

### Check Authentication
```typescript
const user = localStorage.getItem('kywash_user');
if (user) {
  const userData = JSON.parse(user);
  console.log('Logged in as:', userData.student_id);
} else {
  console.log('Not authenticated');
}
```

## Machines

### List All Machines
```typescript
const machines = await getAllMachines();
// Returns: { washers: Machine[], dryers: Machine[] }

machines.washers.forEach(washer => {
  console.log(`Washer ${washer.machine_id}: ${washer.status}`);
});
```

### Start Machine
```typescript
await startMachine(
  1,                    // machine_id (1-6)
  'washer',             // type: 'washer' | 'dryer'
  'normal'              // category: 'normal' | 'extra_5' | 'extra_10' | 'extra_15'
);
// Returns: updated Machine object
```

### Cancel Machine
```typescript
await cancelMachine(1, 'washer');
// Returns: { success: true }
```

### End Machine
```typescript
await endMachine(1, 'washer');
// Returns: { success: true }
```

### Format Time
```typescript
const seconds = 1234; // 20 min 34 sec
const display = formatTimeRemaining(seconds); // "20:34"
```

### Cycle Times
```typescript
import { CYCLE_TIMES } from '@/app/lib/types';

CYCLE_TIMES.normal;     // 1800 seconds (30 min)
CYCLE_TIMES.extra_5;    // 2100 seconds (35 min)
CYCLE_TIMES.extra_10;   // 2400 seconds (40 min)
CYCLE_TIMES.extra_15;   // 2700 seconds (45 min)
```

## Real-time Updates

### Listen for Machine Updates
```typescript
useMachineUpdates((machine) => {
  console.log('Machine updated:', machine);
  // {
  //   machine_id: 1,
  //   machine_type: 'washer',
  //   status: 'in_use',
  //   time_left_seconds: 1234,
  //   current_user_id: 5
  // }
});
```

### Listen for All WebSocket Events
```typescript
useWebSocket((message) => {
  switch (message.event) {
    case 'machine_update':
      console.log('Machine changed:', message.data);
      break;
    case 'waitlist_update':
      console.log('Waitlist changed:', message.data);
      break;
    case 'notification_received':
      console.log('New notification:', message.data);
      break;
    case 'activity_logged':
      console.log('New activity:', message.data);
      break;
    case 'connected':
      console.log('✅ Connected to WebSocket');
      break;
    case 'disconnected':
      console.log('❌ Disconnected from WebSocket');
      break;
  }
});
```

### Get WebSocket Status
```typescript
const { isConnected, isReconnecting } = useWebSocket(
  (message) => { /* handle */ },
  { debug: true } // Enable console logging
);

return (
  <div>
    {isConnected ? '✅ Connected' : '❌ Disconnected'}
    {isReconnecting && ' (Reconnecting...)'}
  </div>
);
```

## Waitlist

### Get Waitlist
```typescript
const waitlist = await getWaitlist('washer');
// Returns: {
//   machine_type: 'washer',
//   items: [
//     { id: 1, user_id: 5, student_id: '123456', position: 1, ... },
//     { id: 2, user_id: 7, student_id: '789012', position: 2, ... }
//   ],
//   count: 2
// }

waitlist.items.forEach((item, idx) => {
  console.log(`Position ${idx + 1}: Student ${item.student_id}`);
});
```

### Join Waitlist
```typescript
try {
  const result = await joinWaitlist('washer');
  console.log('Joined at position:', result.position);
} catch (error) {
  console.error('Cannot join:', error.message);
  // Could fail if already on list
}
```

### Leave Waitlist
```typescript
await leaveWaitlist('washer');
console.log('Left waitlist');
```

### Listen for Waitlist Changes
```typescript
useWaitlistUpdates((waitlistData) => {
  console.log('Waitlist updated:', waitlistData);
  // {
  //   machine_type: 'washer',
  //   items_with_positions: [...]
  // }
});
```

## Faults

### Report Fault
```typescript
// Without photo
await reportFault(
  1,              // machine_id
  'washer',       // type
  'Water leak detected'  // description
);

// With photo (Base64)
const photoData = canvas.toDataURL('image/jpeg').split(',')[1]; // Remove prefix
await reportFault(
  1,
  'washer',
  'Drum damaged',
  photoData
);
```

### Get Fault Count
```typescript
const report = await getMachineReportCount('washer', 1);
// Returns: {
//   machine_id: 1,
//   machine_type: 'washer',
//   report_count: 2,
//   is_disabled: false
// }

if (report.is_disabled) {
  console.log('⚠️ Machine disabled due to faults');
}
```

### Listen for Fault Reports
```typescript
useFaultUpdates((faultData) => {
  console.log('Fault reported:', faultData);
  // {
  //   machine_id: 3,
  //   machine_type: 'dryer',
  //   report_count: 1,
  //   is_disabled: false,
  //   description: 'Not heating'
  // }
});
```

## Notifications

### Get Notifications
```typescript
const data = await getNotifications();
// Returns: {
//   notifications: [
//     {
//       id: 1,
//       notification_type: 'cycle_complete',
//       title: 'Cycle Complete',
//       message: 'Washer 1 is ready',
//       is_read: false,
//       ...
//     }
//   ],
//   unread_count: 3
// }
```

### Mark as Read
```typescript
await markNotificationAsRead(1);
```

### Delete Notification
```typescript
await deleteNotification(1);
```

### Listen for New Notifications
```typescript
useNotificationUpdates((notification) => {
  console.log('📬 New notification:', notification.title);
  
  // Show toast/alert
  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message
    });
  }
});
```

## Activities

### Get Activity Feed
```typescript
const feed = await getActivityFeed(50, 0); // limit, offset
// Returns: {
//   activities: [
//     {
//       id: 1,
//       user_id: 5,
//       activity_type: 'machine_started',
//       machine_type: 'washer',
//       machine_id: 1,
//       details: 'Started normal cycle',
//       created_at: '2024-01-15T10:30:00'
//     }
//   ],
//   total: 150
// }

feed.activities.forEach(activity => {
  console.log(`${activity.activity_type} at ${formatDate(activity.created_at)}`);
});
```

### Get User Activities
```typescript
const userFeed = await getUserActivities(5, 20, 0); // userId, limit, offset
// Returns: same format as getActivityFeed
```

### Listen for Activity
```typescript
useActivityUpdates((activity) => {
  console.log('Activity logged:', activity);
  // Real-time feed updates
});
```

## Profile

### Get Profile
```typescript
const profile = await getUserProfile();
// Returns: {
//   id: 5,
//   student_id: '123456',
//   phone_number: '5555555555',
//   created_at: '2024-01-01T00:00:00',
//   updated_at: '2024-01-15T10:30:00'
// }
```

### Update Profile
```typescript
await updateUserProfile({
  phone_number: '6666666666'
});
console.log('Profile updated');
```

## Error Handling

### Catch Specific Errors
```typescript
try {
  await loginUser({ student_id: '123456', pin: '1234' });
} catch (error) {
  if (error instanceof APIError) {
    // HTTP error
    if (error.statusCode === 401) {
      console.error('Invalid credentials');
    } else if (error.statusCode === 409) {
      console.error('User already exists');
    } else {
      console.error('API Error:', error.message);
    }
  } else if (error instanceof AuthError) {
    // Auth-specific error
    console.error('Auth Error:', error.message);
  } else {
    // Network or other error
    console.error('Unknown error:', error);
  }
}
```

### Global Error Handler
```typescript
// app/lib/errorHandler.ts
export function handleError(error: unknown, context: string): string {
  if (error instanceof APIError) {
    return `${context}: ${error.message}`;
  } else if (error instanceof AuthError) {
    return `Auth failed: ${error.message}`;
  } else {
    return `${context}: Failed to complete operation`;
  }
}

// Usage
try {
  await startMachine(1, 'washer', 'normal');
} catch (error) {
  const message = handleError(error, 'Failed to start machine');
  showToast(message);
}
```

## Validation

```typescript
import { 
  isValidStudentId, 
  isValidPin, 
  isValidPhoneNumber 
} from '@/app/lib/types';

// Student ID: 6 digits
isValidStudentId('123456')    // true
isValidStudentId('12345')     // false
isValidStudentId('abcdef')    // false

// PIN: 4 digits
isValidPin('1234')            // true
isValidPin('12345')           // false
isValidPin('abc')             // false

// Phone: 10-11 digits
isValidPhoneNumber('5555555555')      // true
isValidPhoneNumber('555-555-5555')    // true (removes non-numeric)
isValidPhoneNumber('555')             // false
isValidPhoneNumber('55555555555555')  // false
```

## Labels & Formatting

```typescript
import {
  getMachineStatusLabel,
  getMachineTypeLabel,
  getCycleCategoryLabel,
  getActivityTypeLabel,
  formatTimeRemaining,
  formatDate,
  getCycleTimeMinutes
} from '@/app/lib/types';

// Status labels
getMachineStatusLabel('available')    // "Available"
getMachineStatusLabel('in_use')       // "In Use"
getMachineStatusLabel('completed')    // "Completed"
getMachineStatusLabel('disabled')     // "Disabled"

// Type labels
getMachineTypeLabel('washer')         // "Washer"
getMachineTypeLabel('dryer')          // "Dryer"

// Cycle labels
getCycleCategoryLabel('normal')       // "Normal (30 min)"
getCycleCategoryLabel('extra_5')      // "Extra 5 min"
getCycleCategoryLabel('extra_10')     // "Extra 10 min"
getCycleCategoryLabel('extra_15')     // "Extra 15 min"

// Cycle times
getCycleTimeMinutes('normal')         // 30
getCycleTimeMinutes('extra_15')       // 45

// Activity labels
getActivityTypeLabel('machine_started') // "Started Machine"
getActivityTypeLabel('joined_waitlist') // "Joined Waitlist"
getActivityTypeLabel('fault_reported')  // "Reported Fault"

// Formatting
formatTimeRemaining(1234)              // "20:34"
formatDate('2024-01-15T10:30:00')      // "Jan 15, 2024 10:30 AM"
```

## Component Patterns

### Machine Card Component
```typescript
function MachineCard({ machine, onAction }: { machine: Machine; onAction: () => void }) {
  return (
    <div className={`machine-card status-${machine.status}`}>
      <h3>
        {getMachineTypeLabel(machine.machine_type)} {machine.machine_id}
      </h3>
      <p>Status: {getMachineStatusLabel(machine.status)}</p>
      
      {machine.status === 'in_use' && (
        <p>Time: {formatTimeRemaining(machine.time_left_seconds)}</p>
      )}
      
      {machine.enabled === false && (
        <p className="warning">⚠️ Disabled</p>
      )}
      
      <button onClick={onAction}>
        {machine.status === 'available' ? 'Start' : 'Cancel'}
      </button>
    </div>
  );
}
```

### Real-time List Component
```typescript
export function MachinesList() {
  const [machines, setMachines] = useState<Machine[]>([]);
  
  // Load initial data
  useEffect(() => {
    getAllMachines().then(data => {
      setMachines([...data.washers, ...data.dryers]);
    });
  }, []);
  
  // Listen for real-time updates
  useMachineUpdates((updatedMachine) => {
    setMachines(prev => 
      prev.map(m => m.id === updatedMachine.id ? updatedMachine : m)
    );
  });
  
  return (
    <div>
      {machines.map(m => (
        <MachineCard key={m.id} machine={m} />
      ))}
    </div>
  );
}
```

### Notification Center Component
```typescript
export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Load initial
  useEffect(() => {
    getNotifications().then(data => {
      setNotifications(data.notifications);
    });
  }, []);
  
  // Real-time updates
  useNotificationUpdates(notification => {
    setNotifications(prev => [notification, ...prev]);
  });
  
  return (
    <div className="notification-center">
      <h2>Notifications ({notifications.length})</h2>
      {notifications.map(n => (
        <div key={n.id} className={n.is_read ? 'read' : 'unread'}>
          <h4>{n.title}</h4>
          <p>{n.message}</p>
          <button onClick={() => markNotificationAsRead(n.id)}>
            Mark as read
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Environment Setup

```bash
# .env.local

# Development
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/ws

# Or Production
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
# NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/api/ws
```

## Common Issues & Solutions

### WebSocket won't connect
```typescript
// Add debug logging
useWebSocket(handleMessage, { debug: true });

// Check browser console for error messages
// Check Network tab for WS connection status
// Verify backend is running on correct port
```

### Tokens not persisting
```typescript
// Check localStorage is enabled in browser
localStorage.setItem('test', 'test');
console.log(localStorage.getItem('test')); // Should print 'test'

// Clear and re-login
localStorage.clear();
await loginUser({ student_id: '123456', pin: '1234' });
```

### API requests failing with 401
```typescript
// Tokens expired or invalid
// Solution: automatic, handled by api.ts
// But if not working, try:
localStorage.clear();
window.location.reload();
```

### Real-time updates not syncing
```typescript
// Verify WebSocket connected
useWebSocket(msg => {
  if (msg.event === 'connected') {
    console.log('✅ WebSocket ready');
  }
});

// Check Network tab → WS → see incoming messages
// Verify machine changes happening on server
```

---

**Everything you need for rapid integration!** Copy-paste code patterns and adjust as needed.
