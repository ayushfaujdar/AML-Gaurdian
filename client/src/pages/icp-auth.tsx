import { FC, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useIcpAuth } from '@/context/icp-auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, LogIn, LogOut, ShieldCheck, AlertTriangle } from 'lucide-react';

const IcpAuth: FC = () => {
  const { isAuthenticated, isLoading, principal, login, logout } = useIcpAuth();
  const [copying, setCopying] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    // URL param handling for returning from Internet Identity
    const url = new URL(window.location.href);
    const redirected = url.searchParams.get('redirected');
    
    if (redirected === 'true' && !isAuthenticated && !isLoading) {
      // Try to complete the authentication after redirect
      login();
    }
  }, [isLoading, isAuthenticated, login]);

  const handleCopyPrincipal = async () => {
    if (principal) {
      setCopying(true);
      try {
        await navigator.clipboard.writeText(principal.toString());
        setTimeout(() => setCopying(false), 1000);
      } catch (error) {
        console.error('Could not copy principal:', error);
        setCopying(false);
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">ICP Authentication</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Internet Computer Identity
            </CardTitle>
            <CardDescription>
              Authenticate with the Internet Computer blockchain to access decentralized AML features
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                {isLoading ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                  </Badge>
                ) : isAuthenticated ? (
                  <Badge variant="outline" className="bg-green-500 text-white">Authenticated</Badge>
                ) : (
                  <Badge variant="destructive">Not Authenticated</Badge>
                )}
              </div>
              
              {isAuthenticated && principal && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Principal ID:</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCopyPrincipal}
                        disabled={copying}
                      >
                        {copying ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-md text-xs break-all font-mono">
                      {principal.toString()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This is your unique identifier on the Internet Computer blockchain
                    </p>
                  </div>
                </>
              )}
              
              {!isAuthenticated && !isLoading && (
                <div className="flex items-center p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-md gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <p>You need to authenticate to use the decentralized features of the AML Guardian</p>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-2">
            {isAuthenticated ? (
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={logout}
                disabled={isLoading}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log Out of Internet Identity
              </Button>
            ) : (
              <Button 
                variant="default" 
                className="w-full" 
                onClick={login}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Log In with Internet Identity
                  </>
                )}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/')}
            >
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>About Internet Computer Authentication</CardTitle>
            <CardDescription>
              Learn more about secure blockchain authentication with Internet Identity
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p>
              Internet Identity is a blockchain authentication system that allows you to securely access
              applications on the Internet Computer without usernames or passwords.
            </p>
            
            <h3 className="font-semibold text-lg mt-4">Key Benefits:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>No usernames or passwords to remember</li>
              <li>No personal data stored on the blockchain</li>
              <li>Unique anonymous identity for each application</li>
              <li>Support for WebAuthn and biometric authentication</li>
              <li>Control your own identity without relying on third parties</li>
            </ul>
            
            <h3 className="font-semibold text-lg mt-4">AML Guardian Integration:</h3>
            <p>
              The AML Guardian system uses Internet Computer authentication to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Securely access your AML data stored on the blockchain</li>
              <li>Digitally sign regulatory reports</li>
              <li>Provide immutable audit trails for compliance activities</li>
              <li>Enable decentralized access control for sensitive operations</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IcpAuth;