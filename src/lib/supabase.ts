import { createClient } from '@supabase/supabase-js';
import { syncPendingChanges } from './db';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

// Create Supabase client with enhanced configuration
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // Enable session persistence
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage, // Explicitly use localStorage
    storageKey: 'marombiew-auth', // Custom storage key
    flowType: 'pkce' // More secure authentication flow
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  },
  global: {
    headers: { 'x-application-name': 'marombiew' }
  },
  db: {
    schema: 'public'
  }
});

// Connection state management
let isConnected = true;
let reconnectTimeout: number | null = null;
let heartbeatInterval: number | null = null;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;

// Initialize heartbeat mechanism
function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = window.setInterval(async () => {
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      if (!error) {
        if (!isConnected) {
          // Connection restored, sync pending changes
          isConnected = true;
          reconnectAttempts = 0;
          document.dispatchEvent(new CustomEvent('supabase-status', { detail: { connected: true } }));
          await syncPendingChanges();
        }
      } else {
        handleDisconnection();
      }
    } catch (err) {
      handleDisconnection();
    }
  }, HEARTBEAT_INTERVAL);
}

// Handle disconnection
function handleDisconnection() {
  isConnected = false;
  document.dispatchEvent(new CustomEvent('supabase-status', { detail: { connected: false } }));

  // Check if session is still valid
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) {
      // If no valid session, trigger sign out
      supabase.auth.signOut();
      return;
    }

    // Attempt to reconnect if we have a valid session
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      if (!reconnectTimeout) {
        reconnectTimeout = window.setTimeout(() => {
          reconnectAttempts++;
          reconnectTimeout = null;
          startHeartbeat();
        }, 5000 * Math.pow(2, reconnectAttempts)); // Exponential backoff
      }
    }
  });
}

// Initialize connection monitoring
const channel = supabase.channel('system')
  .on('system', { event: '*' }, (status) => {
    if (status === 'SUBSCRIBED') {
      isConnected = true;
      reconnectAttempts = 0;
      document.dispatchEvent(new CustomEvent('supabase-status', { detail: { connected: true } }));
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      // Sync any pending changes when connection is restored
      syncPendingChanges().catch(console.error);
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      handleDisconnection();
    }
  })
  .subscribe();

// Start heartbeat when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    startHeartbeat();
    // Refresh auth session when coming back online
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.auth.refreshSession();
        // Sync pending changes when coming back online
        syncPendingChanges().catch(console.error);
      }
    });
  });
  
  window.addEventListener('offline', () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    handleDisconnection();
  });
  
  // Start initial heartbeat
  startHeartbeat();

  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      startHeartbeat();
      // Refresh auth session when tab becomes visible
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase.auth.refreshSession();
          // Sync pending changes when tab becomes visible
          syncPendingChanges().catch(console.error);
        }
      });
    } else {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    }
  });
}

// Export connection state check
export const isSupabaseConnected = () => isConnected;

// Retry mechanism for database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check session before operation
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No valid session');
      }

      const result = await operation();
      isConnected = true;
      reconnectAttempts = 0;
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a network error, session expired, or auth error
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('JWT expired') ||
          error.message?.includes('Network request failed') ||
          error.message?.includes('No valid session') ||
          error.status === 401 ||
          error.status === 403) {
        
        handleDisconnection();
        
        // Try to refresh the session
        try {
          const { data } = await supabase.auth.refreshSession();
          if (!data.session) {
            throw new Error('Session refresh failed');
          }
        } catch (refreshError) {
          // If refresh fails, force sign out
          await supabase.auth.signOut();
          throw new Error('Authentication failed');
        }
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  throw lastError;
}

// Cleanup function
export function cleanup() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  if (channel) {
    supabase.removeChannel(channel);
  }
}