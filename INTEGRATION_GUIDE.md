# KY Wash System - Backend & Frontend Integration Guide

This guide explains how to integrate the FastAPI backend with the existing Next.js frontend application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js/React)                 │
│                    /workspaces/ky-wash-app/app/              │
│  - Machine UI, Waitlist UI, Activity Feed, Profile Mgmt      │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP API & WebSocket
┌─────────────────▼───────────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│               /workspaces/ky-wash-app/backend/               │
│  - REST API, Real-time WebSocket, Database, Business Logic   │
└─────────────────┬───────────────────────────────────────────┘
                  │ SQLAlchemy ORM
┌─────────────────▼───────────────────────────────────────────┐
│                 Database (SQLite/PostgreSQL)                 │
│              Persistent State & Audit Logging                │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Backend Setup (COMPLETED)

✅ **Backend Infrastructure Created**

The following have been implemented:

### Core Files
- `backend/config.py` - Configuration management
- `backend/app/database.py` - SQLAlchemy async session management
- `backend/app/models.py` - 8 SQLAlchemy ORM models:
  - User, Machine, WaitlistItem, FaultReport, Activity, Notification, Session
- `backend/app/schemas.py` - 30+ Pydantic request/response schemas
- `backend/app/security.py` - JWT, password hashing, token utilities
- `backend/app/websocket_manager.py` - Real-time connection management

### API Routes (7 routers)
- `backend/app/routes/auth.py` - Register, Login, Token Refresh
- `backend/app/routes/machines.py` - Machine operations (start, cancel, end cycles)
- `backend/app/routes/waitlist.py` - Waitlist management (join, leave, list)
- `backend/app/routes/faults.py` - Fault reporting with photo evidence
- `backend/app/routes/activities.py` - Activities, Profile, Notifications

### Ready to Deploy
- `backend/run.sh` - Linux/Mac startup script
- `backend/run.bat` - Windows startup script
- `backend/.env` - Configuration with sensible defaults
- `backend/requirements.txt` - All Python dependencies

### Documentation
- `backend/README.md` - Comprehensive API documentation
- This file - Integration guide

## Phase 2: Backend Deployment (NEXT)

### Step 1: Install Dependencies

```bash
cd /workspaces/ky-wash-app/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install all dependencies
pip install -r requirements.txt
```

### Step 2: Configure Environment

```bash
# Edit .env file with your settings
nano .env  # Or use your preferred editor

# Key settings to review:
# - DEBUG=false (for production)
# - SECRET_KEY (change to random value)
# - DATABASE_URL (sqlite for dev, postgresql for prod)
# - CORS_ORIGINS (add your frontend URL)
```

### Step 3: Start Backend Server

```bash
# Using the startup script (recommended)
bash run.sh          # Linux/Mac
run.bat              # Windows

# Or manually with uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Server will be available at:**
- API: `http://localhost:8000`
- Documentation: `http://localhost:8000/api/docs` (Swagger UI)
- Health Check: `http://localhost:8000/api/health`

### Step 4: Verify Backend is Running

```bash
# In another terminal, test the API
curl http://localhost:8000/api/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-01T00:00:00","version":"1.0.0","active_connections":0}
```

## Phase 3: Frontend Integration (PENDING)

The frontend (`app/page.tsx`) currently uses localStorage for state management. The following changes will migrate it to use the FastAPI backend:

### 3.1 Create API Client (`app/lib/api.ts`)

```typescript
// New file: app/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function registerUser(studentId: string, pin: string, phone: string) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, pin, phone_number: phone })
  });
  return response.json();
}

export async function loginUser(studentId: string, pin: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, pin })
  });
  return response.json();
}

export async function getMachines(token: string) {
  const response = await fetch(`${API_BASE}/machines/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

// ... more API functions for machines, waitlist, faults, activities, profile
```

### 3.2 Create WebSocket Hook (`app/lib/useWebSocket.ts`)

```typescript
// New file: app/lib/useWebSocket.ts
import { useEffect, useCallback } from 'react';

export function useWebSocket(userId: number, token: string, onMessage: (data: any) => void) {
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/api/ws`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ user_id: userId }));
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage(message);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => ws.close();
  }, [userId, token, onMessage]);
}
```

### 3.3 Update Authentication Flow

Replace localStorage-based auth with backend API calls:

```typescript
// In app/page.tsx - handleAuth function
async function handleAuth(studentId: string, pin: string, phone?: string) {
  try {
    if (isRegistering) {
      // Call register endpoint
      const response = await registerUser(studentId, pin, phone!);
      // Store tokens in sessionStorage
      sessionStorage.setItem('accessToken', response.access_token);
      sessionStorage.setItem('refreshToken', response.refresh_token);
      setUser(response.user);
    } else {
      // Call login endpoint
      const response = await loginUser(studentId, pin);
      sessionStorage.setItem('accessToken', response.access_token);
      sessionStorage.setItem('refreshToken', response.refresh_token);
      setUser(response.user);
    }
  } catch (error) {
    console.error('Auth failed:', error);
  }
}
```

### 3.4 Update Machine Operations

Replace localStorage operations with API calls:

```typescript
// Machine start - call backend API
async function handleStartMachine(id: number, type: 'washer' | 'dryer', category: string) {
  try {
    const token = sessionStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE}/machines/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        machine_id: id,
        machine_type: type,
        category: category
      })
    });
    
    if (!response.ok) throw new Error('Failed to start machine');
    const data = await response.json();
    
    // WebSocket will broadcast update to all clients
    // No need to manually update state - server handles it
  } catch (error) {
    console.error('Error starting machine:', error);
  }
}
```

### 3.5 Real-time Updates via WebSocket

```typescript
// In useEffect, set up WebSocket listener
useEffect(() => {
  const unsubscribe = useWebSocket(user.id, accessToken, (message) => {
    if (message.event === 'machine_update') {
      // Update machine in state
      setSharedState(prev => ({
        ...prev,
        machines: prev.machines.map(m => 
          m.id === message.data.machine_id ? { ...m, ...message.data } : m
        )
      }));
    } else if (message.event === 'activity_logged') {
      // Add activity to feed
      logActivity(message.data);
    }
    // ... handle other event types
  });
  
  return unsubscribe;
}, [user, accessToken]);
```

## Phase 4: Data Migration Strategy

### Option A: Gradual Migration (Recommended)

1. **Keep localStorage as fallback** during transition
2. **Enable both** API and localStorage simultaneously
3. **Gradually migrate** each feature:
   - Week 1: Authentication
   - Week 2: Machine operations
   - Week 3: Waitlist management
   - Week 4: Full backend integration

### Option B: Parallel Run

1. **Run both systems** side-by-side
2. **Compare results** for data consistency
3. **Switch over** when verified stable

### Option C: Fresh Start

1. **Clear existing data**
2. **Migrate to backend** directly
3. **Start fresh** with database

## API Integration Checklist

### Authentication
- [ ] Register endpoint working
- [ ] Login endpoint working
- [ ] Token refresh working
- [ ] Token included in all requests

### Machines
- [ ] GET /machines/ returns all machines
- [ ] POST /machines/start creates activity log
- [ ] POST /machines/cancel works
- [ ] POST /machines/end works
- [ ] Machine state syncs across clients

### Waitlist
- [ ] GET /waitlist/{type} returns list
- [ ] POST /waitlist/join adds to list
- [ ] POST /waitlist/leave removes from list
- [ ] Positions update correctly

### Faults
- [ ] POST /faults/report saves fault
- [ ] Photo data uploads correctly
- [ ] Machine disables after 3 reports
- [ ] GET /faults/{type}/{id} returns count

### Activities
- [ ] GET /activities/ returns feed
- [ ] New activities appear in real-time
- [ ] Activity types are correct

### Real-time (WebSocket)
- [ ] WebSocket connects successfully
- [ ] User ID transmitted on connect
- [ ] Machine updates broadcast to all
- [ ] Waitlist updates broadcast
- [ ] Activities logged in real-time
- [ ] Multiple clients see same data

## Environment Variables Needed

### Backend (.env)
```
DATABASE_URL=sqlite:///./kywash.db
SECRET_KEY=your-secure-random-key
DEBUG=true
CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/ws
```

## Testing

### Manual Testing

```bash
# 1. Start backend
cd backend && bash run.sh

# 2. In another terminal, test API
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "123456",
    "pin": "1234",
    "phone_number": "1234567890"
  }'

# 3. Start frontend
cd .. && npm run dev

# 4. Test in browser
# - Register a user
# - Start a machine
# - Open another browser tab
# - Verify real-time updates
```

### Automated Testing

```bash
cd backend
pytest tests/ -v
```

## Production Checklist

Before deploying to production:

- [ ] Change SECRET_KEY to random value
- [ ] Set DEBUG=false
- [ ] Configure production DATABASE_URL
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure CORS_ORIGINS for production domain
- [ ] Set up automated backups for database
- [ ] Configure logging and monitoring
- [ ] Test all API endpoints
- [ ] Load testing (locust, k6)
- [ ] Security audit

## Troubleshooting

### CORS Issues

**Problem**: Frontend requests fail with CORS error

**Solution**: Update CORS_ORIGINS in backend/.env
```
CORS_ORIGINS=["http://localhost:3000", "https://yourdomain.com"]
```

### WebSocket Connection Failed

**Problem**: Real-time updates not working

**Solution**: 
1. Check WebSocket URL is correct
2. Verify firewall allows WebSocket connections
3. Check browser console for errors

### Database Locked

**Problem**: "Database is locked" error

**Solution**:
```bash
# For SQLite, only one write at a time
# Use PostgreSQL for production
# Or increase connection pool timeout
```

### Token Expired

**Problem**: Getting "Invalid authentication credentials"

**Solution**:
1. Use refresh token endpoint to get new access token
2. Store tokens in sessionStorage (not localStorage)
3. Automatically refresh before expiry

## Next Steps

1. **Phase 2**: Deploy backend server
2. **Phase 3**: Integrate frontend with API
3. **Phase 4**: Real-time testing with multiple clients
4. **Phase 5**: Production deployment

## Support & Questions

For issues or questions during integration:

1. Check backend logs: `tail -f backend.log`
2. Check frontend console: Browser DevTools
3. Test API directly: Use Postman or Thunder Client
4. Check database: `sqlite3 kywash.db .schema`

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [WebSocket Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

**Backend Creation Date**: 2024
**Integration Status**: Ready for Phase 3 (Frontend Integration)
**Last Updated**: 2024-01-01
