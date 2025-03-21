import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Principal } from '@dfinity/principal';
import { icpAdapter } from '../lib/icp-adapter';
import { useToast } from '@/hooks/use-toast';

// Development mode constants
const IS_DEVELOPMENT_MODE = true; // In production, this would be set to false
const DEV_MODE_PRINCIPAL = {
  toString: () => 'devmode-principal-2vxsx-fae', 
  toText: () => 'devmode-principal-2vxsx-fae',
  toHex: () => '0x123456789abcdef',
  isAnonymous: () => false,
  toUint8Array: () => new Uint8Array([0, 1, 2, 3, 4, 5]),
};

interface IcpAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  principal: Principal | undefined;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const IcpAuthContext = createContext<IcpAuthContextType | undefined>(undefined);

export const IcpAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [principal, setPrincipal] = useState<Principal | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      if (IS_DEVELOPMENT_MODE) {
        // In development mode, just check if we have a stored auth state
        const hasDevAuth = localStorage.getItem('dev_auth_active') === 'true';
        setIsAuthenticated(hasDevAuth);
        if (hasDevAuth) {
          setPrincipal(DEV_MODE_PRINCIPAL as unknown as Principal);
        }
        setIsLoading(false);
        return;
      }

      // Real ICP authentication for production
      try {
        const authenticated = await icpAdapter.isAuthenticated();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          const userPrincipal = await icpAdapter.getUserPrincipal();
          setPrincipal(userPrincipal);
        }
      } catch (error) {
        console.error('Failed to check authentication status:', error);
        toast({
          title: 'Authentication Error',
          description: 'Could not verify ICP authentication status',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [toast]);

  const login = async () => {
    setIsLoading(true);
    
    if (IS_DEVELOPMENT_MODE) {
      // Use development mode simulation for auth
      try {
        // Simulate a delay to mimic network request
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Set the development auth state
        localStorage.setItem('dev_auth_active', 'true');
        setIsAuthenticated(true);
        setPrincipal(DEV_MODE_PRINCIPAL as unknown as Principal);
        
        toast({
          title: 'Development Authentication',
          description: 'Successfully logged in with development mode credentials',
          variant: 'default',
        });
      } catch (error) {
        console.error('Failed in development mode login:', error);
        toast({
          title: 'Authentication Error',
          description: 'Could not log in with development credentials',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Production mode - attempt to connect to ICP
    try {
      await icpAdapter.login();
      const authenticated = await icpAdapter.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const userPrincipal = await icpAdapter.getUserPrincipal();
        setPrincipal(userPrincipal);
        toast({
          title: 'Authentication Success',
          description: 'Successfully logged in to Internet Computer',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to login:', error);
      toast({
        title: 'Authentication Error',
        description: 'Could not log in to Internet Computer',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    if (IS_DEVELOPMENT_MODE) {
      // Development mode logout
      try {
        // Simulate a delay to mimic network request
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clear development auth state
        localStorage.removeItem('dev_auth_active');
        setIsAuthenticated(false);
        setPrincipal(undefined);
        
        toast({
          title: 'Development Logout',
          description: 'Successfully logged out from development mode',
          variant: 'default',
        });
      } catch (error) {
        console.error('Failed in development mode logout:', error);
        toast({
          title: 'Logout Error',
          description: 'Could not log out from development mode',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Production mode logout
    try {
      await icpAdapter.logout();
      setIsAuthenticated(false);
      setPrincipal(undefined);
      toast({
        title: 'Logged Out',
        description: 'Successfully logged out from Internet Computer',
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to logout:', error);
      toast({
        title: 'Logout Error',
        description: 'Could not log out from Internet Computer',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IcpAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        principal,
        login,
        logout,
      }}
    >
      {children}
    </IcpAuthContext.Provider>
  );
};

export const useIcpAuth = () => {
  const context = useContext(IcpAuthContext);
  if (context === undefined) {
    throw new Error('useIcpAuth must be used within an IcpAuthProvider');
  }
  return context;
};