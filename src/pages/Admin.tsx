import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminUsersTab } from '@/components/admin/AdminUsersTab';
import { AdminPvcOrdersTab } from '@/components/admin/AdminPvcOrdersTab';
import { AdminMetalOrdersTab } from '@/components/admin/AdminMetalOrdersTab';
import { AdminOrangeMonthlyTab } from '@/components/admin/AdminOrangeMonthlyTab';
import { AdminOrangeAnnuallyTab } from '@/components/admin/AdminOrangeAnnuallyTab';
import { AdminSubscriptionsTab } from '@/components/admin/AdminSubscriptionsTab';
import { AdminReportsTab } from '@/components/admin/AdminReportsTab';
import { AdminDeletedUsersTab } from '@/components/admin/AdminDeletedUsersTab';
import { AdminChatSessionsTab } from '@/components/admin/AdminChatSessionsTab';
import { AdminBotSettingsTab } from '@/components/admin/AdminBotSettingsTab';
import { AdminControlledLearningTab } from '@/components/admin/AdminControlledLearningTab';
import { AdminNfcWriterTab } from '@/components/admin/AdminNfcWriterTab';
import AdminPaymentsTab from '@/components/admin/AdminPaymentsTab';
import { Loader2, Shield, Users, ShoppingCart, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [mainSection, setMainSection] = useState<'users' | 'orders'>('users');
  const [usersTab, setUsersTab] = useState('all-users');
  const [ordersTab, setOrdersTab] = useState('pvc');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (!authLoading && !adminLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

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

  return (
    <div className="w-full py-4 sm:py-8 px-3 sm:px-4 md:px-6 max-w-7xl mx-auto">
      {/* Header with main navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
        </div>
        
        {/* Main section toggle */}
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setMainSection('users')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              mainSection === 'users' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-4 w-4" />
            Users
          </button>
          <button
            onClick={() => setMainSection('orders')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              mainSection === 'orders' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            Orders
          </button>
        </div>
      </div>

      {/* Users Section */}
      {mainSection === 'users' && (
        <Tabs value={usersTab} onValueChange={setUsersTab} className="w-full">
          <div className="overflow-x-auto mb-6 -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto gap-1">
              <TabsTrigger value="all-users" className="whitespace-nowrap">All Users</TabsTrigger>
              <TabsTrigger value="chats" className="whitespace-nowrap">Chat Sessions</TabsTrigger>
              <TabsTrigger value="learning" className="whitespace-nowrap">Controlled Learning</TabsTrigger>
              <TabsTrigger value="bot" className="whitespace-nowrap">Bot Settings</TabsTrigger>
              <TabsTrigger value="nfc" className="whitespace-nowrap">NFC Writer</TabsTrigger>
              <TabsTrigger value="deleted" className="whitespace-nowrap">Deleted Users</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all-users">
            <AdminUsersTab />
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

          <TabsContent value="nfc">
            <AdminNfcWriterTab />
          </TabsContent>

          <TabsContent value="deleted">
            <AdminDeletedUsersTab />
          </TabsContent>
        </Tabs>
      )}

      {/* Orders Section */}
      {mainSection === 'orders' && (
        <Tabs value={ordersTab} onValueChange={setOrdersTab} className="w-full">
          <div className="overflow-x-auto mb-6 -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto gap-1">
              <TabsTrigger value="pvc" className="whitespace-nowrap">PVC Cards</TabsTrigger>
              <TabsTrigger value="metal" className="whitespace-nowrap">Metal Cards</TabsTrigger>
              <TabsTrigger value="subscriptions" className="whitespace-nowrap">Subscriptions</TabsTrigger>
              <TabsTrigger value="payments" className="whitespace-nowrap">Payments</TabsTrigger>
              <TabsTrigger value="orange-monthly" className="whitespace-nowrap">Orange Monthly</TabsTrigger>
              <TabsTrigger value="orange-annually" className="whitespace-nowrap">Orange Annually</TabsTrigger>
              <TabsTrigger value="reports" className="whitespace-nowrap">Reports</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pvc">
            <AdminPvcOrdersTab />
          </TabsContent>

          <TabsContent value="metal">
            <AdminMetalOrdersTab />
          </TabsContent>

          <TabsContent value="subscriptions">
            <AdminSubscriptionsTab />
          </TabsContent>

          <TabsContent value="payments">
            <AdminPaymentsTab />
          </TabsContent>

          <TabsContent value="orange-monthly">
            <AdminOrangeMonthlyTab />
          </TabsContent>

          <TabsContent value="orange-annually">
            <AdminOrangeAnnuallyTab />
          </TabsContent>

          <TabsContent value="reports">
            <AdminReportsTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
