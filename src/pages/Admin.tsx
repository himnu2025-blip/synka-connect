import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminUsersTab } from '@/components/admin/AdminUsersTab';
import { AdminTransactionsTab } from '@/components/admin/AdminTransactionsTab';
import { AdminNFCOrdersTab } from '@/components/admin/AdminNFCOrdersTab';
import { AdminReportsTab } from '@/components/admin/AdminReportsTab';
import { AdminDeletedUsersTab } from '@/components/admin/AdminDeletedUsersTab';
import { AdminChatSessionsTab } from '@/components/admin/AdminChatSessionsTab';
import { AdminBotSettingsTab } from '@/components/admin/AdminBotSettingsTab';
import { AdminControlledLearningTab } from '@/components/admin/AdminControlledLearningTab';
import { AdminNfcWriterTab } from '@/components/admin/AdminNfcWriterTab';
import { AdminSubscriptionsTab } from '@/components/admin/AdminSubscriptionsTab';
import { AdminOrdersTab } from '@/components/admin/AdminOrdersTab';
import { AdminPaymentsTab } from '@/components/admin/AdminPaymentsTab';
import { AdminQueriesTab } from '@/components/admin/AdminQueriesTab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Shield, 
  Users, 
  CreditCard, 
  Package, 
  IndianRupee, 
  TrendingUp,
  Activity,
  FileText,
  Settings,
  MessageSquare,
  Brain,
  Nfc,
  UserX,
  Bell,
  Download,
  RefreshCw,
  BarChart3,
  ShoppingCart,
  Wallet,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface QuickStats {
  totalUsers: number;
  orangeUsers: number;
  newUsersToday: number;
  totalRevenue: number;
  revenueThisMonth: number;
  activeSubscriptions: number;
  pendingOrders: number;
  totalOrders: number;
  newQueriesCount: number;
  chatSessionsToday: number;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading, users, fetchUsers } = useAdmin();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalUsers: 0,
    orangeUsers: 0,
    newUsersToday: 0,
    totalRevenue: 0,
    revenueThisMonth: 0,
    activeSubscriptions: 0,
    pendingOrders: 0,
    totalOrders: 0,
    newQueriesCount: 0,
    chatSessionsToday: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (!authLoading && !adminLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

  const fetchQuickStats = async () => {
    setLoadingStats(true);
    try {
      // Fetch all users
      await fetchUsers();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Fetch various stats in parallel
      const [
        usersData,
        subscriptionsData,
        ordersData,
        queriesData,
        chatSessionsData,
        transactionsData
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('subscriptions').select('*').eq('status', 'active'),
        supabase.from('orders').select('*'),
        supabase.from('queries').select('*').is('read_at', null),
        supabase.from('saira_sessions').select('*').gte('created_at', today.toISOString()),
        supabase.from('transactions').select('amount').eq('status', 'success')
      ]);

      const totalUsers = usersData.data?.length || 0;
      const orangeUsers = usersData.data?.filter(u => u.plan === 'Orange').length || 0;
      const newUsersToday = usersData.data?.filter(u => {
        const createdDate = new Date(u.created_at);
        return createdDate >= today;
      }).length || 0;

      const activeSubscriptions = subscriptionsData.data?.length || 0;
      
      const totalOrders = ordersData.data?.length || 0;
      const pendingOrders = ordersData.data?.filter(o => 
        o.status === 'pending' || o.status === 'placed' || o.status === 'processing'
      ).length || 0;

      const totalRevenue = transactionsData.data?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
      
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const revenueThisMonth = transactionsData.data?.filter(t => 
        new Date(t.created_at) >= firstDayOfMonth
      ).reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

      const newQueriesCount = queriesData.data?.length || 0;
      const chatSessionsToday = chatSessionsData.data?.length || 0;

      setQuickStats({
        totalUsers,
        orangeUsers,
        newUsersToday,
        totalRevenue,
        revenueThisMonth,
        activeSubscriptions,
        pendingOrders,
        totalOrders,
        newQueriesCount,
        chatSessionsToday,
      });
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    } finally {
      setLoadingStats(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchQuickStats();
    }
  }, [adminLoading, isAdmin]);

  const handleRefresh = () => {
    fetchQuickStats();
  };

  if (authLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const statCards = [
    {
      title: 'Total Users',
      value: quickStats.totalUsers,
      icon: Users,
      description: `+${quickStats.newUsersToday} today`,
      trend: quickStats.newUsersToday > 0 ? 'up' : 'neutral',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Orange Users',
      value: quickStats.orangeUsers,
      icon: TrendingUp,
      description: `${((quickStats.orangeUsers / Math.max(quickStats.totalUsers, 1)) * 100).toFixed(1)}% of users`,
      trend: 'up',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      title: 'Total Revenue',
      value: `₹${(quickStats.totalRevenue / 100).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      description: `₹${(quickStats.revenueThisMonth / 100).toLocaleString('en-IN')} this month`,
      trend: quickStats.revenueThisMonth > 0 ? 'up' : 'neutral',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: 'Active Subscriptions',
      value: quickStats.activeSubscriptions,
      icon: Activity,
      description: 'Currently active',
      trend: 'neutral',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: 'Total Orders',
      value: quickStats.totalOrders,
      icon: Package,
      description: `${quickStats.pendingOrders} pending`,
      trend: quickStats.pendingOrders > 0 ? 'warning' : 'neutral',
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950',
    },
    {
      title: 'New Queries',
      value: quickStats.newQueriesCount,
      icon: HelpCircle,
      description: 'Unread support queries',
      trend: quickStats.newQueriesCount > 0 ? 'warning' : 'neutral',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    },
    {
      title: 'Chat Sessions',
      value: quickStats.chatSessionsToday,
      icon: MessageSquare,
      description: 'Today',
      trend: 'neutral',
      color: 'text-pink-500',
      bgColor: 'bg-pink-50 dark:bg-pink-950',
    },
  ];

  return (
    <div className="w-full py-4 sm:py-8 px-3 sm:px-4 md:px-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Last updated: {format(lastRefresh, 'MMM d, yyyy HH:mm:ss')}
            </p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loadingStats}>
          {loadingStats ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Data
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto mb-6 -mx-4 px-4">
          <TabsList className="inline-flex w-auto min-w-full sm:w-auto gap-1 flex-wrap h-auto">
            <TabsTrigger value="overview" className="whitespace-nowrap gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="whitespace-nowrap gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="whitespace-nowrap gap-2">
              <Activity className="h-4 w-4" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="orders" className="whitespace-nowrap gap-2">
              <ShoppingCart className="h-4 w-4" />
              All Orders
            </TabsTrigger>
            <TabsTrigger value="nfc-orders" className="whitespace-nowrap gap-2">
              <Nfc className="h-4 w-4" />
              NFC Orders
            </TabsTrigger>
            <TabsTrigger value="payments" className="whitespace-nowrap gap-2">
              <Wallet className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="transactions" className="whitespace-nowrap gap-2">
              <CreditCard className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="queries" className="whitespace-nowrap gap-2 relative">
              <HelpCircle className="h-4 w-4" />
              Support Queries
              {quickStats.newQueriesCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {quickStats.newQueriesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="chats" className="whitespace-nowrap gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat Sessions
            </TabsTrigger>
            <TabsTrigger value="reports" className="whitespace-nowrap gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="learning" className="whitespace-nowrap gap-2">
              <Brain className="h-4 w-4" />
              AI Learning
            </TabsTrigger>
            <TabsTrigger value="bot" className="whitespace-nowrap gap-2">
              <Settings className="h-4 w-4" />
              Bot Settings
            </TabsTrigger>
            <TabsTrigger value="nfc-writer" className="whitespace-nowrap gap-2">
              <Nfc className="h-4 w-4" />
              NFC Writer
            </TabsTrigger>
            <TabsTrigger value="deleted" className="whitespace-nowrap gap-2">
              <UserX className="h-4 w-4" />
              Deleted Users
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {loadingStats ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        stat.value
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setActiveTab('users')}
              >
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setActiveTab('nfc-orders')}
              >
                <Package className="mr-2 h-4 w-4" />
                View Orders
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setActiveTab('queries')}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Support Queries
                {quickStats.newQueriesCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {quickStats.newQueriesCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setActiveTab('subscriptions')}
              >
                <Activity className="mr-2 h-4 w-4" />
                Subscriptions
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setActiveTab('reports')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate Reports
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setActiveTab('bot')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Bot Settings
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle>System Health & Activity</CardTitle>
              <CardDescription>Real-time overview of platform activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Pending Actions</p>
                      <p className="text-sm text-muted-foreground">
                        {quickStats.pendingOrders} orders awaiting processing
                      </p>
                    </div>
                  </div>
                  {quickStats.pendingOrders > 0 && (
                    <Badge variant="warning">{quickStats.pendingOrders}</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Growth Today</p>
                      <p className="text-sm text-muted-foreground">
                        {quickStats.newUsersToday} new users, {quickStats.chatSessionsToday} chat sessions
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <IndianRupee className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Revenue This Month</p>
                      <p className="text-sm text-muted-foreground">
                        ₹{(quickStats.revenueThisMonth / 100).toLocaleString('en-IN')} from {quickStats.activeSubscriptions} active subscriptions
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Existing Tabs */}
        <TabsContent value="users">
          <AdminUsersTab />
        </TabsContent>

        <TabsContent value="subscriptions">
          <AdminSubscriptionsTab />
        </TabsContent>

        <TabsContent value="orders">
          <AdminOrdersTab />
        </TabsContent>

        <TabsContent value="transactions">
          <AdminTransactionsTab />
        </TabsContent>

        <TabsContent value="nfc-orders">
          <AdminNFCOrdersTab />
        </TabsContent>

        <TabsContent value="payments">
          <AdminPaymentsTab />
        </TabsContent>

        <TabsContent value="queries">
          <AdminQueriesTab />
        </TabsContent>

        <TabsContent value="reports">
          <AdminReportsTab />
        </TabsContent>

        <TabsContent value="chats">
          <AdminChatSessionsTab />
        </TabsContent>

        <TabsContent value="learning">
          <AdminControlledLearningTab />
        </TabsContent>

        <TabsContent value="bot">
          <AdminBotSettingsTab />
        </TabsContent>

        <TabsContent value="nfc-writer">
          <AdminNfcWriterTab />
        </TabsContent>

        <TabsContent value="deleted">
          <AdminDeletedUsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
