import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Principal } from '@dfinity/principal';
import { icpAdapter } from '../lib/icp-adapter';
import { useToast } from '@/hooks/use-toast';

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