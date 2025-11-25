/**
 * KY Wash WebSocket Hook
 * Manages real-time bidirectional communication with backend
 * 
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Event type handling (machine_update, waitlist_update, etc.)
 * - Connection state tracking
 * - Message queuing during disconnection
 * - Error handling and logging
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getStoredUser, WS_URL } from './api';

export type WebSocketEventType =
  | 'machine_update'
  | 'waitlist_update'
  | 'activity_logged'
  | 'notification_received'
  | 'fault_reported'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface WebSocketMessage {
  event: WebSocketEventType;
  data: any;
  timestamp: string;
}

export interface WebSocketState {
  isConnected: boolean;
  isReconnecting: boolean;
  messageQueue: any[];
}

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_INITIAL_RETRY_DELAY = 1000; // 1 second
const DEFAULT_MAX_RETRY_DELAY = 30000; // 30 seconds

export function useWebSocket(
  onMessage: (message: WebSocketMessage) => void,
  options?: {
    maxRetries?: number;
    initialRetryDelay?: number;
    maxRetryDelay?: number;
    debug?: boolean;
  }
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const messageQueueRef = useRef<any[]>([]);
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isReconnecting: false,
    messageQueue: [],
  });

  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const initialRetryDelay = options?.initialRetryDelay ?? DEFAULT_INITIAL_RETRY_DELAY;
  const maxRetryDelay = options?.maxRetryDelay ?? DEFAULT_MAX_RETRY_DELAY;
  const debug = options?.debug ?? false;

  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[WebSocket] ${message}`, data);
      }
    },
    [debug]
  );

  const getRetryDelay = useCallback((): number => {
    const delay = initialRetryDelay * Math.pow(2, reconnectCountRef.current);
    return Math.min(delay, maxRetryDelay);
  }, [initialRetryDelay, maxRetryDelay]);

  const disconnect = useCallback(() => {
    log('Disconnecting WebSocket');
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [log]);

  const reconnect = useCallback(() => {
    if (reconnectCountRef.current >= maxRetries) {
      log('Max reconnection attempts reached');
      setState((prev) => ({
        ...prev,
        isReconnecting: false,
      }));
      return;
    }

    const delay = getRetryDelay();
    log(`Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current + 1}/${maxRetries})`);

    setState((prev) => ({
      ...prev,
      isReconnecting: true,
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectCountRef.current++;
      connect();
    }, delay);
  }, [maxRetries, getRetryDelay, log]);

  const sendMessage = useCallback(
    (data: any) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        log('WebSocket not connected, queuing message', data);
        messageQueueRef.current.push(data);
        setState((prev) => ({
          ...prev,
          messageQueue: [...messageQueueRef.current],
        }));
        return;
      }

      try {
        wsRef.current.send(JSON.stringify(data));
        log('Message sent', data);
      } catch (error) {
        log('Failed to send message', error);
        messageQueueRef.current.push(data);
      }
    },
    [log]
  );

  const flushMessageQueue = useCallback(() => {
    while (messageQueueRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      const message = messageQueueRef.current.shift();
      try {
        wsRef.current.send(JSON.stringify(message));
        log('Flushed queued message', message);
      } catch (error) {
        log('Failed to flush message', error);
        messageQueueRef.current.unshift(message);
        break;
      }
    }

    setState((prev) => ({
      ...prev,
      messageQueue: [...messageQueueRef.current],
    }));
  }, [log]);

  const connect = useCallback(() => {
    if (wsRef.current) {
      log('WebSocket already connected or connecting');
      return;
    }

    log('Attempting to connect to WebSocket');

    try {
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        log('WebSocket connected');
        reconnectCountRef.current = 0;

        setState((prev) => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
        }));

        // Send user_id to authenticate
        const user = getStoredUser();
        if (user?.id) {
          sendMessage({ user_id: user.id });
          log('Sent user authentication', { user_id: user.id });
        }

        // Flush queued messages
        flushMessageQueue();

        // Notify listeners
        onMessage({
          event: 'connected',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          log('Message received', message);
          onMessage(message);
        } catch (error) {
          log('Failed to parse WebSocket message', event.data);
        }
      };

      wsRef.current.onerror = (error) => {
        log('WebSocket error', error);
        onMessage({
          event: 'error',
          data: { error: error },
          timestamp: new Date().toISOString(),
        });
      };

      wsRef.current.onclose = () => {
        log('WebSocket disconnected');
        wsRef.current = null;

        setState((prev) => ({
          ...prev,
          isConnected: false,
        }));

        // Notify listeners
        onMessage({
          event: 'disconnected',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });

        // Attempt to reconnect
        reconnect();
      };
    } catch (error) {
      log('Failed to create WebSocket connection', error);
      reconnect();
    }
  }, [log, sendMessage, flushMessageQueue, reconnect, onMessage]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: state.isConnected,
    isReconnecting: state.isReconnecting,
    messageQueue: state.messageQueue,
    send: sendMessage,
    disconnect,
    reconnect,
  };
}

/**
 * Custom hook to handle specific WebSocket events
 */
export function useWebSocketEvent(
  eventType: WebSocketEventType,
  callback: (data: any) => void
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.event === eventType) {
      callbackRef.current(message.data);
    }
  }, [eventType]);

  return useWebSocket(handleMessage);
}

/**
 * Custom hook to aggregate all machine updates
 */
export function useMachineUpdates(callback: (machine: any) => void) {
  return useWebSocketEvent('machine_update', callback);
}

/**
 * Custom hook to aggregate all waitlist updates
 */
export function useWaitlistUpdates(callback: (waitlist: any) => void) {
  return useWebSocketEvent('waitlist_update', callback);
}

/**
 * Custom hook to handle activity logs
 */
export function useActivityUpdates(callback: (activity: any) => void) {
  return useWebSocketEvent('activity_logged', callback);
}

/**
 * Custom hook to handle notifications
 */
export function useNotificationUpdates(callback: (notification: any) => void) {
  return useWebSocketEvent('notification_received', callback);
}

/**
 * Custom hook to handle fault reports
 */
export function useFaultUpdates(callback: (fault: any) => void) {
  return useWebSocketEvent('fault_reported', callback);
}
