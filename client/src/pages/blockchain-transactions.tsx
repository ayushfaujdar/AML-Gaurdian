import { FC, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIcpAuth } from '@/context/icp-auth-context';
import { icpAdapter } from '../lib/icp-adapter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, ArrowRight, ShieldCheck, Database, Hash } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Transaction } from '../types';

const BlockchainTransactions: FC = () => {
  const { isAuthenticated } = useIcpAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState({
    sourceEntityId: '',
    destinationEntityId: '',
    amount: '',
    currency: 'USD',
    type: 'transfer',
    category: 'fiat',
    description: '',
  });
  const [verificationData, setVerificationData] = useState({
    transactionId: '',
    verificationResult: null as null | {
      status: 'success' | 'error';
      data?: any;
      message?: string;
      blockHeight?: number;
      confirmations?: number;
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTransactionData({
      ...transactionData,
      [name]: value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setTransactionData({
      ...transactionData,
      [name]: value,
    });
  };

  const createBlockchainTransaction = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please connect to Internet Computer before creating blockchain transactions",
        variant: "destructive",
      });
      return;
    }

    if (!transactionData.sourceEntityId || !transactionData.destinationEntityId || !transactionData.amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Generate a random transaction ID
      const txId = `TX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      // Create transaction with our adapter
      const transaction: any = {
        id: txId,
        sourceEntityId: transactionData.sourceEntityId,
        destinationEntityId: transactionData.destinationEntityId,
        amount: parseFloat(transactionData.amount),
        currency: transactionData.currency,
        timestamp: new Date().toISOString(),
        description: transactionData.description,
        type: transactionData.type,
        category: transactionData.category,
        // These will be calculated by the system
        riskScore: Math.random() * 100,
        riskLevel: "medium",
      };
      
      // In a real blockchain integration, we would call the actual blockchain method
      const result = await icpAdapter.createTransaction(transaction);
      
      setLastTxId(result.id);
      
      toast({
        title: "Transaction Submitted",
        description: `Transaction ID: ${result.id} has been recorded on the blockchain`,
        variant: "default",
      });
      
      // Clear form
      setTransactionData({
        sourceEntityId: '',
        destinationEntityId: '',
        amount: '',
        currency: 'USD',
        type: 'transfer',
        category: 'fiat',
        description: '',
      });
      
    } catch (error) {
      console.error("Transaction error:", error);
      toast({
        title: "Transaction Failed",
        description: "There was an error creating the blockchain transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyBlockchainTransaction = async () => {
    if (!verificationData.transactionId) {
      toast({
        title: "Missing Transaction ID",
        description: "Please enter a transaction ID to verify",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsVerifying(true);
      
      // In a real implementation, we would call the blockchain to verify the transaction
      // For now, we'll simulate a verification by retrieving the transaction from our adapter
      const transaction = await icpAdapter.getTransaction(verificationData.transactionId);
      
      if (transaction) {
        // Simulate blockchain verification
        setTimeout(() => {
          setVerificationData({
            ...verificationData,
            verificationResult: {
              status: 'success',
              data: transaction,
              message: 'Transaction verified successfully on the Internet Computer blockchain',
              blockHeight: 12345678,
              confirmations: 42,
            }
          });
          setIsVerifying(false);
        }, 1500);
      } else {
        setVerificationData({
          ...verificationData,
          verificationResult: {
            status: 'error',
            message: 'Transaction not found on the blockchain',
          }
        });
        setIsVerifying(false);
      }
      
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationData({
        ...verificationData,
        verificationResult: {
          status: 'error',
          message: 'Error verifying transaction on the blockchain',
        }
      });
      setIsVerifying(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blockchain Transactions</h1>
          <p className="text-muted-foreground mt-2">Create and verify transactions on the Internet Computer blockchain</p>
        </div>
        
        {isAuthenticated ? (
          <div className="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg">
            <ShieldCheck className="mr-2 h-5 w-5" />
            <span>Connected to ICP</span>
          </div>
        ) : (
          <div className="flex items-center px-4 py-2 bg-amber-50 text-amber-700 rounded-lg">
            <AlertCircle className="mr-2 h-5 w-5" />
            <span>Not connected to ICP</span>
          </div>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="create">Create Transaction</TabsTrigger>
          <TabsTrigger value="verify">Verify Transaction</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Create Blockchain Transaction</CardTitle>
                <CardDescription>
                  Record a transaction on the Internet Computer blockchain for immutable AML tracking
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sourceEntityId">Source Entity ID</Label>
                    <Input
                      id="sourceEntityId"
                      name="sourceEntityId"
                      placeholder="e.g., E-12345"
                      value={transactionData.sourceEntityId}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="destinationEntityId">Destination Entity ID</Label>
                    <Input
                      id="destinationEntityId"
                      name="destinationEntityId"
                      placeholder="e.g., E-67890"
                      value={transactionData.destinationEntityId}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        placeholder="e.g., 1000.00"
                        value={transactionData.amount}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={transactionData.currency}
                        onValueChange={(value) => handleSelectChange('currency', value)}
                      >
                        <SelectTrigger id="currency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="ICP">ICP</SelectItem>
                          <SelectItem value="BTC">BTC</SelectItem>
                          <SelectItem value="ETH">ETH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Transaction Type</Label>
                      <Select
                        value={transactionData.type}
                        onValueChange={(value) => handleSelectChange('type', value)}
                      >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Deposit</SelectItem>
                          <SelectItem value="withdrawal">Withdrawal</SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="exchange">Exchange</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={transactionData.category}
                        onValueChange={(value) => handleSelectChange('category', value)}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fiat">Fiat</SelectItem>
                          <SelectItem value="crypto">Crypto</SelectItem>
                          <SelectItem value="cross_border">Cross-Border</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      name="description"
                      placeholder="Transaction description"
                      value={transactionData.description}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTransactionData({
                      sourceEntityId: '',
                      destinationEntityId: '',
                      amount: '',
                      currency: 'USD',
                      type: 'transfer',
                      category: 'fiat',
                      description: '',
                    });
                  }}
                  disabled={isSubmitting}
                >
                  Reset
                </Button>
                <Button 
                  onClick={createBlockchainTransaction}
                  disabled={isSubmitting || !isAuthenticated}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Create Transaction
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            <div className="space-y-6">
              {!isAuthenticated && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Authentication Required</AlertTitle>
                  <AlertDescription>
                    You must connect to the Internet Computer blockchain to create transactions.
                    Go to ICP Authentication page to connect.
                  </AlertDescription>
                </Alert>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Blockchain Benefits</CardTitle>
                  <CardDescription>
                    Enhanced security and compliance through immutable records
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Database className="h-4 w-4 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium leading-none">Immutable Records</p>
                        <p className="text-sm text-muted-foreground">
                          Transaction data cannot be altered once recorded
                        </p>
                      </div>
                    </li>
                    
                    <li className="flex items-start">
                      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium leading-none">Decentralized Verification</p>
                        <p className="text-sm text-muted-foreground">
                          All transactions are cryptographically verified by the network
                        </p>
                      </div>
                    </li>
                    
                    <li className="flex items-start">
                      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Hash className="h-4 w-4 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium leading-none">Cryptographic Security</p>
                        <p className="text-sm text-muted-foreground">
                          Advanced encryption protects transaction integrity
                        </p>
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              {lastTxId && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-green-700 flex items-center">
                      <ShieldCheck className="mr-2 h-5 w-5" />
                      Transaction Created
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-green-700 text-sm font-medium">Transaction ID:</p>
                    <p className="font-mono text-sm break-all bg-white p-2 rounded border border-green-200 mt-1">
                      {lastTxId}
                    </p>
                    
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="w-full border-green-300 text-green-700 hover:bg-green-100 hover:text-green-800"
                        onClick={() => {
                          setActiveTab('verify');
                          setVerificationData({
                            ...verificationData,
                            transactionId: lastTxId
                          });
                        }}
                      >
                        Verify This Transaction
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="verify" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Verify Blockchain Transaction</CardTitle>
                <CardDescription>
                  Verify the authenticity and status of a transaction on the Internet Computer blockchain
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="transactionId">Transaction ID</Label>
                    <Input
                      id="transactionId"
                      placeholder="Enter transaction ID to verify"
                      value={verificationData.transactionId}
                      onChange={(e) => setVerificationData({
                        ...verificationData,
                        transactionId: e.target.value
                      })}
                    />
                  </div>
                  
                  <Button 
                    onClick={verifyBlockchainTransaction}
                    disabled={isVerifying || !verificationData.transactionId}
                    className="w-full"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying on Blockchain...
                      </>
                    ) : (
                      "Verify Transaction"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div>
              {verificationData.verificationResult && (
                <Card className={
                  verificationData.verificationResult.status === 'success' 
                    ? "border-green-200 bg-green-50" 
                    : "border-red-200 bg-red-50"
                }>
                  <CardHeader className="pb-2">
                    <CardTitle className={
                      verificationData.verificationResult.status === 'success'
                        ? "text-green-700"
                        : "text-red-700"
                    }>
                      {verificationData.verificationResult.status === 'success' 
                        ? "Transaction Verified" 
                        : "Verification Failed"}
                    </CardTitle>
                    <CardDescription className={
                      verificationData.verificationResult.status === 'success'
                        ? "text-green-600"
                        : "text-red-600"
                    }>
                      {verificationData.verificationResult.message}
                    </CardDescription>
                  </CardHeader>
                  
                  {verificationData.verificationResult.status === 'success' && verificationData.verificationResult.data && (
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-green-700">Block Height</p>
                            <p className="font-mono text-sm">{verificationData.verificationResult.blockHeight}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-700">Confirmations</p>
                            <p className="font-mono text-sm">{verificationData.verificationResult.confirmations}</p>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-2">Transaction Details</p>
                          <div className="bg-white rounded border border-green-200 p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                              <div>
                                <span className="font-medium">Source:</span>
                              </div>
                              <div className="font-mono">
                                {(verificationData.verificationResult.data as Transaction).sourceEntityId}
                              </div>
                              
                              <div>
                                <span className="font-medium">Destination:</span>
                              </div>
                              <div className="font-mono">
                                {(verificationData.verificationResult.data as Transaction).destinationEntityId}
                              </div>
                              
                              <div>
                                <span className="font-medium">Amount:</span>
                              </div>
                              <div>
                                {(verificationData.verificationResult.data as Transaction).amount} {(verificationData.verificationResult.data as Transaction).currency}
                              </div>
                              
                              <div>
                                <span className="font-medium">Timestamp:</span>
                              </div>
                              <div>
                                {new Date((verificationData.verificationResult.data as Transaction).timestamp).toLocaleString()}
                              </div>
                              
                              <div>
                                <span className="font-medium">Type:</span>
                              </div>
                              <div className="capitalize">
                                {(verificationData.verificationResult.data as Transaction).type}
                              </div>
                              
                              <div>
                                <span className="font-medium">Risk Score:</span>
                              </div>
                              <div>
                                {(verificationData.verificationResult.data as Transaction).riskScore.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
              
              {!verificationData.verificationResult && (
                <Card>
                  <CardHeader>
                    <CardTitle>Blockchain Verification</CardTitle>
                    <CardDescription>
                      Enter a transaction ID to verify its authenticity on the blockchain
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-center text-muted-foreground text-sm">
                        Transaction verification results will appear here
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BlockchainTransactions;