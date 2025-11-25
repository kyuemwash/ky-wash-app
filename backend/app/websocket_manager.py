"""
WebSocket Connection Manager for Real-time Updates
"""
from fastapi import WebSocket
from typing import Set, Dict, Optional
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections and broadcasts messages"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.user_connections: Dict[int, Set[WebSocket]] = {}  # user_id -> websockets
        
    async def connect(self, websocket: WebSocket, user_id: Optional[int] = None):
        """Register a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(websocket)
        
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket, user_id: Optional[int] = None):
        """Unregister a WebSocket connection"""
        self.active_connections.discard(websocket)
        
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        # Add timestamp to message
        message["timestamp"] = datetime.utcnow().isoformat()
        message_str = json.dumps(message)
        
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(message_str)
            except Exception as e:
                logger.error(f"Error sending message: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn)
    
    async def broadcast_to_user(self, user_id: int, message: dict):
        """Broadcast message to specific user's connections"""
        message["timestamp"] = datetime.utcnow().isoformat()
        message_str = json.dumps(message)
        
        if user_id not in self.user_connections:
            return
        
        disconnected = set()
        for connection in self.user_connections[user_id]:
            try:
                await connection.send_text(message_str)
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn, user_id)
    
    async def broadcast_machine_update(self, machine_data: dict):
        """Broadcast machine status update"""
        message = {
            "event": "machine_update",
            "data": machine_data
        }
        await self.broadcast(message)
    
    async def broadcast_waitlist_update(self, machine_type: str, waitlist_data: list):
        """Broadcast waitlist update"""
        message = {
            "event": "waitlist_update",
            "machine_type": machine_type,
            "data": waitlist_data
        }
        await self.broadcast(message)
    
    async def broadcast_activity(self, activity_data: dict):
        """Broadcast activity log entry"""
        message = {
            "event": "activity_logged",
            "data": activity_data
        }
        await self.broadcast(message)
    
    async def broadcast_notification(self, user_id: int, notification_data: dict):
        """Broadcast notification to user"""
        message = {
            "event": "notification_received",
            "data": notification_data
        }
        await self.broadcast_to_user(user_id, message)
    
    async def broadcast_fault_report(self, fault_data: dict):
        """Broadcast fault report"""
        message = {
            "event": "fault_reported",
            "data": fault_data
        }
        await self.broadcast(message)
    
    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return len(self.active_connections)
    
    def get_user_connection_count(self, user_id: int) -> int:
        """Get number of connections for a specific user"""
        return len(self.user_connections.get(user_id, set()))

# Global connection manager instance
manager = ConnectionManager()
