# Real-Time Sync Testing Guide

Complete instructions for testing the KY Wash frontend-backend integration with real-time updates across multiple devices.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Single Device Testing](#single-device-testing)
3. [Multi-Device Testing](#multi-device-testing)
4. [WebSocket Testing](#websocket-testing)
5. [Token Refresh Testing](#token-refresh-testing)
6. [Stress Testing](#stress-testing)
7. [Checklist](#checklist)

---

## Quick Start

### Prerequisites

- Backend running: `http://localhost:8000/api/health`
- Frontend running: `http://localhost:3000`
- Browser DevTools open

### 5-Minute Smoke Test

```bash
# 1. Clear localStorage
# In browser console: localStorage.clear()

# 2. Register new account
# URL: http://localhost:3000/register
# Student ID: 654321
# PIN: 9999
# Phone: 1234567890

# 3. Login
# URL: http://localhost:3000/login
# Use credentials above

# 4. Check machines page
# URL: http://localhost:3000/machines
# Verify 6 washers + 6 dryers displayed
# Start a cycle on any machine

# 5. Verify tokens saved
# In console: localStorage.getItem('kywash_access_token')
# Should show JWT token (starts with 'eyJ')
```

---

## Single Device Testing

### Test 1: Authentication Flow

```bash
# 1. Clear all data
localStorage.clear()

# 2. Register
# Input: Student 111111, PIN 1111, Phone 5555555555
# Expected: Redirect to /machines

# 3. Check token storage
localStorage.getItem('kywash_access_token')  // Should exist
localStorage.getItem('kywash_refresh_token') // Should exist
localStorage.getItem('kywash_user')         // Should be JSON

# 4. Logout
# Expected: Redirect to /login, tokens cleared

# 5. Login
# Use same credentials
# Expected: Redirect to /machines, tokens restored
```

### Test 2: Machine Operations

```bash
# 1. Navigate to /machines
# Expected: 6 washers + 6 dryers visible

# 2. Start a cycle
# Select "Normal (30 min)"
# Expected: Machine status changes to "in_use"
# Expected: Timer counts down

# 3. Watch timer countdown
# Every second, time_left_seconds should decrease by 1
# Expected: formatTimeRemaining() updates display to MM:SS

# 4. Verify no page refresh needed
# Machine status updates in real-time via WebSocket

# 5. Cancel cycle
# Click cancel button
# Expected: Machine returns to "available"

# 6. End cycle early
# Start cycle → wait 5 seconds → end cycle
# Expected: Machine status → "completed" → "available"
```

### Test 3: Waitlist Operations

```bash
# 1. Find unavailable machine
# Locate a machine in "completed" or "in_use" status

# 2. Join waitlist
# Click "Join Waitlist"
# Expected: Position shows (e.g., "Position 2")

# 3. Verify waitlist in API
# In console: localStorage.getItem('kywash_access_token')
# Call: fetch('http://localhost:8000/api/v1/waitlist/washer', {
#   headers: { Authorization: `Bearer ${token}` }
# })
# Expected: Your user_id in items array

# 4. Leave waitlist
# Click "Leave Waitlist"
# Expected: Position removed

# 5. Rejoin waitlist
# Expected: Different position
```

### Test 4: Fault Reporting

```bash
# 1. Navigate to Faults page
# URL: /faults

# 2. Report a fault
# Machine: Washer 3
# Description: "Water not draining"
# Photo: Optional (can test with/without)

# 3. Verify fault created
# Check faults list
# Expected: New fault appears with description and photo

# 4. Check fault count
# In console:
# fetch('http://localhost:8000/api/v1/faults/washer/3', {
#   headers: { Authorization: `Bearer ${token}` }
# })
# Expected: report_count increases

# 5. Multiple reports
# Report fault on same machine again
# Expected: is_disabled changes to true when report_count >= 2
# Machine should be disabled in UI
```

### Test 5: Notifications

```bash
# 1. Start a machine cycle (Normal - 30 minutes or use shorter cycle)
# Expected: Notification will appear when cycle completes

# Note: For testing with shorter timeouts, you can:
# - Modify CYCLE_TIMES in backend/app/config.py temporarily
# - Or use the "extra_5" cycle (35 minutes)

# 2. Verify notification receives via WebSocket
# Open DevTools → Network → WS tab
# Start a cycle
# Expected: WebSocket message with type "notification_received"

# 3. Click notification
# Expected: Navigate to relevant machine

# 4. Mark as read
# In notifications panel
# Expected: Visual change (e.g., remove bold)
```

### Test 6: Profile Operations

```bash
# 1. Navigate to Profile page
# Expected: Current user info displayed

# 2. Update phone number
# Change to: 9876543210
# Click Save
# Expected: Success message

# 3. Verify update persisted
# Refresh page
# Expected: Phone number still shows 9876543210

# 4. Check via API
# fetch('http://localhost:8000/api/v1/profile/me', {
#   headers: { Authorization: `Bearer ${token}` }
# })
# Expected: phone_number field updated
```

---

## Multi-Device Testing

### Setup: Two Browsers/Tabs

```bash
# Browser A: http://localhost:3000
# - Login as User A (Student ID: 111111)

# Browser B: http://localhost:3000
# - Login as User B (Student ID: 222222)

# OR same user in different tabs:
# Tab 1: http://localhost:3000
# Tab 2: http://localhost:3000
# - Both logged in as same user
```

### Test 1: Real-time Machine Status Sync

```bash
# Browser A: Start cycle on Washer 1 (Normal)
# Expected in Browser B: Washer 1 status changes to "in_use" in real-time
# Expected in Browser B: Timer counts down every second

# Verify no page refresh in Browser B needed
# Verify both browsers show identical status/time

# Browser B: Cancel cycle
# Expected in Browser A: Washer 1 immediately shows "available"
```

### Test 2: Real-time Waitlist Sync

```bash
# Browser A: Machine in "in_use", join waitlist
# Expected in Browser B: Position updates show immediately

# Browser A: User at top of waitlist, machine completes
# Expected in Browser B: Your position updates automatically

# Browser B: Leave waitlist
# Expected in Browser A: Your position removed from view
```

### Test 3: Real-time Notifications

```bash
# Browser A: Start a short cycle
# Browser B: Watching same machine

# When cycle completes in Browser A:
# Expected in Browser B: Notification appears in real-time
# Expected: Both browsers receive notification simultaneously

# Browser A: Mark notification as read
# Expected in Browser B: Notification status updates
```

### Test 4: Cross-Tab Activity Feed

```bash
# Browser A & B: Open Activity Feed
# Browser A: Start a cycle
# Expected in Browser B: New activity appears immediately
# Browser A: Report a fault
# Expected in Browser B: Fault activity appears immediately
```

---

## WebSocket Testing

### Check WebSocket Connection Status

```bash
# In browser console:
const ws = new WebSocket('ws://localhost:8000/api/ws');

ws.onopen = () => console.log('✅ Connected');
ws.onclose = () => console.log('❌ Disconnected');
ws.onerror = (e) => console.log('❌ Error:', e);
ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  console.log('📨 Message:', data.event, data.data);
};
```

### Test Message Events

```typescript
// Listen for all WebSocket event types
const eventCounts = {
  machine_update: 0,
  waitlist_update: 0,
  activity_logged: 0,
  notification_received: 0,
  fault_reported: 0,
};

ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  eventCounts[data.event]++;
  console.log('Event totals:', eventCounts);
};

// After 5 minutes:
// Expected: machine_update: 300+ (1 per sec per active machine)
// Expected: Other events as they occur
```

### Test Reconnection

```bash
# 1. Open DevTools → Network
# 2. Filter for "WS"
# 3. Monitor WebSocket connection
# 4. Disconnect network (DevTools → Throttling → Offline)

# Expected:
# - WebSocket closes
# - App shows "Reconnecting..." message
# - After 1-2 seconds: WebSocket reconnects

# 5. Re-enable network
# 6. Verify full functionality restored

# Expected: All real-time updates resume
```

### Test Message Queue

```bash
# 1. Start WebSocket connection
# 2. Simulate offline (DevTools → Offline)
# 3. Start a machine cycle
# 4. Try to join waitlist
# 5. Re-enable network

# Expected: Queued operations complete
# Expected: All status updates arrive once reconnected
```

---

## Token Refresh Testing

### Test Automatic Token Refresh

```bash
# This tests the 401 response handling in api.ts

# 1. Get current access token:
const token = localStorage.getItem('kywash_access_token');

# 2. Manually expire it by setting it to 'invalid':
localStorage.setItem('kywash_access_token', 'invalid');

# 3. Try an API call:
# - Join waitlist
# - Update profile
# - Get notifications

# Expected: 
# - API client detects 401
# - Automatically calls refreshAccessToken()
# - Retries original request
# - Success (no error to user)

# 4. Verify new token issued:
const newToken = localStorage.getItem('kywash_access_token');
# newToken should differ from original
```

### Test Token Expiry Cleanup

```bash
# 1. Note current tokens:
const before = {
  access: localStorage.getItem('kywash_access_token'),
  refresh: localStorage.getItem('kywash_refresh_token'),
};

# 2. Logout
# Click Logout button

# Expected:
# - localStorage cleared
# - Redirect to /login
# - All tokens removed

# 3. Verify cleanup:
localStorage.getItem('kywash_access_token')  // null
localStorage.getItem('kywash_refresh_token') // null
localStorage.getItem('kywash_user')         // null
```

---

## Stress Testing

### Test 1: Rapid Machine Operations

```bash
# 1. Open machines page
# 2. Rapidly start/cancel cycles on different machines
# 3. Expected: All operations succeed, UI stays responsive

# In browser console, measure:
console.time('rapid-ops');
// Start 5 cycles, cancel 3, start 2 more
console.timeEnd('rapid-ops');

# Expected: Complete in < 2 seconds
```

### Test 2: Many Concurrent Updates

```bash
# In backend, modify to increase machine count temporarily
# Or create multiple browser windows with real activity

# Open 5+ browser tabs, all monitoring machines page
# In separate window, rapidly start/end cycles

# Expected:
# - All 5+ tabs update in sync
# - No lag or UI freezing
# - WebSocket handles volume well
```

### Test 3: Long Connection Time

```bash
# 1. Open machines page
# 2. Leave running for 24 hours
# 3. Expected:
#    - WebSocket stays connected
#    - Real-time updates continue
#    - No memory leaks (check DevTools Memory tab)
#    - Page responsive

# For shorter testing:
# 1. Monitor every 1 hour for 4 hours
# 2. Check WebSocket connection count
# 3. Check network activity levels
```

---

## Checklist

### Before Deployment

- [ ] Authentication
  - [ ] Register works
  - [ ] Login works
  - [ ] Logout clears tokens
  - [ ] Token refresh works
  - [ ] Invalid token shows error

- [ ] Machine Operations
  - [ ] List all machines
  - [ ] Start cycle
  - [ ] Cancel cycle
  - [ ] End cycle early
  - [ ] Timer accurate

- [ ] Waitlist
  - [ ] Join waitlist
  - [ ] View waitlist
  - [ ] Leave waitlist
  - [ ] Position updates

- [ ] Faults
  - [ ] Report fault
  - [ ] View fault count
  - [ ] Photo upload works
  - [ ] Machine disables after 2+ faults

- [ ] Real-time Updates
  - [ ] Machine status syncs across tabs
  - [ ] Notifications appear in real-time
  - [ ] Waitlist updates in real-time
  - [ ] Activity feed updates in real-time

- [ ] WebSocket
  - [ ] Connection established
  - [ ] Auto-reconnect works
  - [ ] Message queuing works
  - [ ] No message loss

- [ ] Performance
  - [ ] Page loads in < 2s
  - [ ] Updates render in < 100ms
  - [ ] No memory leaks
  - [ ] Handles 100+ operations/minute

- [ ] Error Handling
  - [ ] Network error shows message
  - [ ] Backend error shows message
  - [ ] Invalid auth shows error
  - [ ] Recovery works

### Deployment Sign-Off

When all checkboxes pass, system is production-ready:

```bash
# Date: ___________
# Tested by: ___________
# Environment: [ ] Dev [ ] Staging [ ] Prod
# All tests: [ ] PASS [ ] FAIL (describe failures)
```

---

## Quick Debug Commands

```typescript
// Check authentication status
localStorage.getItem('kywash_user') ? '✅ Authenticated' : '❌ Not authenticated'

// Check API connectivity
fetch('http://localhost:8000/api/health').then(r => r.json()).then(console.log)

// Check WebSocket status
const ws = new WebSocket('ws://localhost:8000/api/ws');
ws.onopen = () => console.log('✅ WS Connected');

// View all API requests (in Network tab)
// Filter: "fetch" to see HTTP requests
// Filter: "ws" to see WebSocket connection

// Force immediate machine update
// Wait for WebSocket message with type "machine_update"
// Component should re-render without page refresh
```

---

## Support

**Issue: Tests failing?**

1. Check backend is running: `bash run.sh` in backend directory
2. Check frontend is running: `npm run dev` in frontend directory
3. Check `.env.local` has correct URLs
4. Clear browser cache: DevTools → Cmd+Shift+Delete
5. Check browser console for errors
6. Check backend logs for issues

**Issue: WebSocket not connecting?**

1. Verify backend WebSocket handler is running
2. Check network tab for WS connection
3. Verify CORS headers in response
4. Try `wss://` if using HTTPS

**Issue: Real-time updates not syncing?**

1. Verify WebSocket is connected
2. Check browser console for errors
3. Verify user_id is sent on connection
4. Check backend logs for broadcast issues
