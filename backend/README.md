# KY Wash Backend API

Real-time laundry management system backend built with FastAPI, SQLAlchemy, and WebSocket support.

## Features

- **User Authentication**: JWT-based authentication with 6-digit Student ID and 4-digit PIN
- **Real-time Synchronization**: WebSocket-powered live updates across all connected clients
- **Machine Management**: Support for 12 machines (6 washers + 6 dryers) with state management
- **Waitlist System**: Per-machine-type waitlists with position tracking
- **Fault Reporting**: Report machine faults with photo evidence; auto-disable after 3 reports
- **Activity Logging**: Comprehensive activity feed for all user actions
- **Notifications**: User-targeted and broadcast notifications
- **Async/Await**: Full async support for high concurrency
- **CORS Support**: Cross-origin resource sharing for frontend integration

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── database.py             # Database configuration and session management
│   ├── models.py               # SQLAlchemy ORM models
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── security.py             # JWT and password hashing utilities
│   ├── websocket_manager.py    # WebSocket connection manager
│   └── routes/
│       ├── __init__.py
│       ├── auth.py             # Authentication endpoints
│       ├── machines.py         # Machine management endpoints
│       ├── waitlist.py         # Waitlist management endpoints
│       ├── faults.py           # Fault reporting endpoints
│       └── activities.py       # Activities, profile, and notifications
├── config.py                   # Application configuration
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables
├── .env.example                # Example environment file
└── README.md                   # This file
```

## Installation & Setup

### Prerequisites

- Python 3.10+
- pip or poetry
- Virtual environment (recommended)

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Initialize Database

```bash
# The database will be automatically initialized on first run
# For SQLite (development):
# The database file will be created as kywash.db in the backend directory
```

### 5. Run Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
- **API Docs**: `http://localhost:8000/api/docs` (Swagger UI)
- **Health Check**: `http://localhost:8000/api/health`

## API Endpoints

### Authentication (`/api/v1/auth`)

- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout user

### Machines (`/api/v1/machines`)

- `GET /` - Get all machines (organized by type)
- `GET /{machine_type}/{machine_id}` - Get specific machine
- `POST /start` - Start a machine cycle
- `POST /cancel` - Cancel an active cycle
- `POST /end` - End a machine cycle

### Waitlist (`/api/v1/waitlist`)

- `GET /{machine_type}` - Get waitlist for machine type
- `POST /join` - Join a waitlist
- `POST /leave` - Leave a waitlist

### Fault Reporting (`/api/v1/faults`)

- `POST /report` - Report a machine fault with optional photo
- `GET /{machine_type}/{machine_id}` - Get fault report count
- `GET /` - Get all fault reports

### Activities (`/api/v1/activities`)

- `GET /` - Get activity feed (paginated)
- `GET /user/{user_id}` - Get user's activities

### Profile (`/api/v1/profile`)

- `GET /me` - Get current user profile
- `PUT /update` - Update user profile (phone number)

### Notifications (`/api/v1/notifications`)

- `GET /` - Get user notifications
- `PUT /{notification_id}/read` - Mark notification as read
- `DELETE /{notification_id}` - Delete notification

### WebSocket (`/api/ws`)

Real-time bidirectional communication for live updates. Connect with:

```javascript
const ws = new WebSocket('ws://localhost:8000/api/ws');
ws.onopen = () => {
  // Send user_id on connect
  ws.send(JSON.stringify({ user_id: currentUserId }));
};
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Handle different event types
};
```

**Event Types**:
- `machine_update` - Machine status changed
- `waitlist_update` - Waitlist changed
- `activity_logged` - New activity logged
- `notification_received` - New notification
- `fault_reported` - Fault reported

## Authentication

All protected endpoints require JWT Bearer token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

### Getting a Token

1. Register or login to get access token
2. Include token in all subsequent requests
3. Token expires after configured duration (default: 24 hours)
4. Use refresh token to get new access token without re-logging in

## Database Models

### User
- `id`: Primary key
- `student_id`: 6-digit unique identifier
- `pin_hash`: Hashed 4-digit PIN
- `phone_number`: Contact phone (10-11 digits)
- `created_at`, `updated_at`: Timestamps

### Machine
- `id`: Primary key
- `machine_id`: 1-6 (physical machine identifier)
- `machine_type`: "washer" or "dryer"
- `status`: "available", "in_use", "completed", "disabled"
- `current_category`: "normal", "extra_5", "extra_10", "extra_15"
- `time_left_seconds`: Remaining cycle time
- `current_user_id`: FK to User (active operator)
- `enabled`: Boolean (disabled after 3 faults)
- `total_cycles`: Counter

### WaitlistItem
- `id`: Primary key
- `user_id`: FK to User
- `machine_type`: "washer" or "dryer"
- `position`: Queue position
- `joined_at`: Timestamp

### FaultReport
- `id`: Primary key
- `machine_id`: FK to Machine
- `user_id`: FK to User
- `description`: Fault description
- `photo_data`: Base64-encoded fault photo
- `created_at`: Timestamp

### Activity
- `id`: Primary key
- `user_id`: FK to User
- `activity_type`: Type of activity
- `machine_type`: Washer or dryer (if applicable)
- `machine_id`: Machine ID (if applicable)
- `details`: Activity details
- `created_at`: Timestamp

### Notification
- `id`: Primary key
- `user_id`: FK to User
- `notification_type`: Type of notification
- `title`: Notification title
- `message`: Notification message
- `is_read`: Boolean
- `created_at`: Timestamp

## Configuration

### Key Settings (in `config.py`)

- `DEBUG`: Enable debug mode
- `DATABASE_URL`: Database connection string
- `SECRET_KEY`: JWT secret key (change in production!)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time
- `CORS_ORIGINS`: Allowed CORS origins
- `MACHINES_PER_TYPE`: Number of machines per type (default: 6)
- `FAULT_REPORT_DISABLE_THRESHOLD`: Reports before auto-disable (default: 3)

## Cycle Times

- Normal: 30 minutes
- Extra 5: 35 minutes
- Extra 10: 40 minutes
- Extra 15: 45 minutes

## Error Handling

All errors return JSON with appropriate HTTP status codes:

```json
{
  "detail": "Error message",
  "error_code": "optional_error_code",
  "status_code": 400
}
```

## Development

### Running Tests

```bash
pytest tests/ -v
```

### Code Quality

```bash
# Linting
flake8 app/

# Type checking
mypy app/

# Formatting
black app/
```

### Database Migrations (with Alembic)

```bash
# Create migration
alembic revision --autogenerate -m "Migration name"

# Apply migrations
alembic upgrade head
```

## Production Deployment

### 1. Update Configuration

- Set `DEBUG=false`
- Change `SECRET_KEY` to a strong random value
- Update `DATABASE_URL` for PostgreSQL
- Update `CORS_ORIGINS` for your domain

### 2. Use Production Server

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 app.main:app
```

### 3. Environment Variables

Set these via your deployment platform:

```
DATABASE_URL=postgresql://user:pass@localhost/kywash
SECRET_KEY=your-very-secure-random-key-here
DEBUG=false
CORS_ORIGINS=["https://yourdomain.com"]
```

## Frontend Integration

See `/workspaces/ky-wash-app/app/` for the Next.js frontend that uses this API.

### Key Integration Points

1. **Authentication**: Use `/api/v1/auth/register` and `/api/v1/auth/login`
2. **Machine Operations**: Call `/api/v1/machines/*` endpoints
3. **Real-time Updates**: Connect WebSocket at `/api/ws`
4. **Activities**: Fetch from `/api/v1/activities/`
5. **Profile**: Update at `/api/v1/profile/update`

## Troubleshooting

### Database Connection Issues

```bash
# Reset database (development only)
rm kywash.db
# Restart server to recreate
```

### Port Already in Use

```bash
# Use different port
uvicorn app.main:app --reload --port 8001
```

### CORS Issues

Update `CORS_ORIGINS` in `.env` to include your frontend URL

### WebSocket Connection Fails

- Verify WebSocket URL matches server address
- Check firewall doesn't block WebSocket connections
- Ensure user authentication is sent after connection

## License

Proprietary - KY Wash Management System

## Support

For issues or questions, please contact the development team.
