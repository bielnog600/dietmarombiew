import { create } from 'zustand';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  refreshSession: () => Promise<void>;
  checkAndRefreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),

  checkAndRefreshSession: async () => {
    try {
      if (!get().user) return;

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('No active session found');
        await get().signOut();
        return;
      }

      const tokenExpirationTime = session.expires_at ? session.expires_at * 1000 : 0;
      const isExpiringSoon = tokenExpirationTime - Date.now() < 1 * 60 * 1000; // 1 minute

      if (isExpiringSoon && !get().loading) {
        console.log('Token expiring soon, scheduling session refresh...');
        
        setTimeout(async () => {
          set({ loading: true });
          await get().refreshSession();
          set({ loading: false });
        }, 500); // Wait 500ms to avoid multiple calls when minimizing/restoring
      } else {
        setTimeout(async () => {
          await get().refreshUserData();
        }, 500);
      }
    } catch (err) {
      console.error('Error checking session:', err);
      await get().signOut();
    }
  },

  refreshSession: async () => {
    try {
      if (!get().user) return;

      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        await get().signOut();
        return;
      }

      if (!session) {
        console.warn('No session after refresh');
        await get().signOut();
        return;
      }

      await get().refreshUserData();
    } catch (err) {
      console.error('Error refreshing session:', err);
      await get().signOut();
    }
  },

  refreshUserData: async () => {
    try {
      if (!get().user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        await get().signOut();
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (userError) throw userError;
      if (userData) {
        set({ user: userData, loading: false });
      } else {
        await get().signOut();
      }
    } catch (err) {
      console.error('Error refreshing user data:', err);
      await get().signOut();
    }
  },

  signUp: async (email, password, name) => {
    try {
      set({ loading: true });

      await supabase.auth.signOut();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            name: name
          }
        }
      });
      
      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('User already registered');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No authentication data received');
      }

      // Wait a moment for the auth user to be fully created
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: userData, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            name,
            daily_calories: 2000,
            water_intake: 2000,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('User insert error:', insertError);
        await supabase.auth.signOut();
        throw insertError;
      }

      if (userData) {
        set({ user: userData, loading: false });
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      await supabase.auth.signOut();
      set({ loading: false });
      throw error;
    }
  },

  signIn: async (email, password) => {
    try {
      set({ loading: true });

      await supabase.auth.signOut();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        throw authError;
      }
      
      if (!authData.user) throw new Error('No authentication data received');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (userError) {
        console.error('User fetch error:', userError);
        await supabase.auth.signOut();
        throw userError;
      }

      if (userData) {
        set({ user: userData, loading: false });
      } else {
        throw new Error('User profile not found. Please contact support.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      await supabase.auth.signOut();
      set({ loading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      
      localStorage.clear();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('Error during sign out:', signOutError);
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      set({ user: null, loading: false });
      window.location.href = '/login';
    }
  },

  initializeAuth: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        set({ user: null, loading: false });
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (userError) throw userError;
      if (userData) {
        set({ user: userData, loading: false });
      } else {
        await supabase.auth.signOut();
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      await supabase.auth.signOut();
      set({ user: null, loading: false });
    }

    let authChangeTimeout: NodeJS.Timeout;

    const unsubscribe = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(authChangeTimeout);

      authChangeTimeout = setTimeout(async () => {
        console.log(`Auth event: ${event}`);

        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          set({ user: null, loading: false });
          window.location.href = '/login';
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (userError) {
              console.error('Error fetching user data:', userError);
              await supabase.auth.signOut();
              set({ user: null, loading: false });
              return;
            }

            if (userData) {
              set({ user: userData, loading: false });
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            await supabase.auth.signOut();
            set({ user: null, loading: false });
          }
        }
      }, 1000); // Wait 1 second to avoid multiple calls
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && get().user) {
        console.log('App back in focus, scheduling refresh...');
        get().checkAndRefreshSession();
      }
    });

    return () => {
      clearTimeout(authChangeTimeout);
      unsubscribe();
    };
  },
}));

useAuthStore.getState().initializeAuth();