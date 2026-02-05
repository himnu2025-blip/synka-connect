import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminStatus } from '@/hooks/useAdminData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminUsersTab } from '@/components/admin/AdminUsersTab';
import { AdminTransactionsTab } from '@/components/admin/AdminTransactionsTab';
import { AdminNFCOrdersTab } from '@/components/admin/AdminNFCOrdersTab';
import { AdminReportsTab } from '@/components/admin/AdminReportsTab';
import { AdminDeletedUsersTab } from '@/components/admin/AdminDeletedUsersTab';
import { AdminChatSessionsTab } from '@/components/admin/AdminChatSessionsTab';
import { AdminBotSettingsTab } from '@/components/admin/AdminBotSettingsTab';
import { AdminControlledLearningTab } from '@/components/admin/AdminControlledLearningTab';
import { AdminNfcWriterTab } from '@/components/admin/AdminNfcWriterTab';
import { AdminDeletionRequestsTab } from '@/components/admin/AdminDeletionRequestsTab';
import { Loader2, Shield } from 'lucide-react';

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  // Redirect non-admin users
  if (!authLoading && !user) {
    navigate('/login');
    return null;
  }

  if (!authLoading && !adminLoading && !isAdmin) {
    navigate('/dashboard');
    return null;
  }

  // Only show loader if we truly don't know admin status yet
  if (authLoading || (adminLoading && !isAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return isAdmin ? (
    <div className="w-full py-4 sm:py-8 px-3 sm:px-4 md:px-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto mb-6 -mx-4 px-4">
          <TabsList className="inline-flex w-auto min-w-full sm:w-auto gap-1">
            <TabsTrigger value="users" className="whitespace-nowrap">Users</TabsTrigger>
            <TabsTrigger value="transactions" className="whitespace-nowrap">Transactions</TabsTrigger>
            <TabsTrigger value="nfc-orders" className="whitespace-nowrap">NFC Orders</TabsTrigger>
            <TabsTrigger value="reports" className="whitespace-nowrap">Reports</TabsTrigger>
            <TabsTrigger value="deletion-requests" className="whitespace-nowrap">Delete Account</TabsTrigger>
            <TabsTrigger value="chats" className="whitespace-nowrap">Chat Sessions</TabsTrigger>
            <TabsTrigger value="learning" className="whitespace-nowrap">Controlled Learning</TabsTrigger>
            <TabsTrigger value="bot" className="whitespace-nowrap">Bot Settings</TabsTrigger>
            <TabsTrigger value="nfc-writer" className="whitespace-nowrap">NFC Writer</TabsTrigger>
            <TabsTrigger value="deleted" className="whitespace-nowrap">Deleted Users</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users">
          <AdminUsersTab />
        </TabsContent>

        <TabsContent value="transactions">
          <AdminTransactionsTab />
        </TabsContent>

        <TabsContent value="nfc-orders">
          <AdminNFCOrdersTab />
        </TabsContent>

        <TabsContent value="reports">
          <AdminReportsTab />
        </TabsContent>

        <TabsContent value="deletion-requests">
          <AdminDeletionRequestsTab />
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
  ) : null;
}
