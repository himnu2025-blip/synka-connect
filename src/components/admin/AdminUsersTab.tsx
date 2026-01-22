import { useEffect, useRef, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Search, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ConfirmAction {
  type: 'upgrade' | 'downgrade';
  userId: string;
  userName: string;
}

export function AdminUsersTab() {
  const { isAdmin, loading: adminLoading, users, fetchUsers, upgradeUserPlan, downgradeUserPlan } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        await fetchUsers();
      } finally {
        setLoading(false);
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        fetchUsers();
      }, 300);
    };

    load();

    // Subscribe to realtime changes on profiles table (debounced)
    const channel = supabase
      .channel('admin-profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [adminLoading, isAdmin, fetchUsers]);

  const handleUpgradeClick = (userId: string, userName: string) => {
    setConfirmAction({ type: 'upgrade', userId, userName });
  };

  const handleDowngradeClick = (userId: string, userName: string) => {
    setConfirmAction({ type: 'downgrade', userId, userName });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setProcessingId(confirmAction.userId);
    try {
      if (confirmAction.type === 'upgrade') {
        await upgradeUserPlan(confirmAction.userId, 'Orange');
        toast.success(`${confirmAction.userName || 'User'} upgraded to Orange plan`);
      } else {
        await downgradeUserPlan(confirmAction.userId);
        toast.success(`${confirmAction.userName || 'User'} downgraded to Free plan`);
      }
    } catch (error) {
      toast.error(`Failed to ${confirmAction.type} user`);
    } finally {
      setProcessingId(null);
      setConfirmAction(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary">{users.length} users</Badge>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Signup Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell>{user.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={user.plan === 'Orange' ? 'default' : 'secondary'}>
                        {user.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'admin' ? 'destructive' : 'outline'}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {user.role !== 'admin' && (
                        <>
                          {user.plan === 'Free' ? (
                            <Button
                              size="sm"
                              onClick={() => handleUpgradeClick(user.user_id, user.full_name || 'User')}
                              disabled={processingId === user.user_id}
                            >
                              {processingId === user.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                                  Upgrade
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDowngradeClick(user.user_id, user.full_name || 'User')}
                              disabled={processingId === user.user_id}
                            >
                              {processingId === user.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <ArrowDownCircle className="h-4 w-4 mr-1" />
                                  Downgrade
                                </>
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'upgrade' ? 'Upgrade User Plan' : 'Downgrade User Plan'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'upgrade' ? (
                <>
                  Are you sure you want to upgrade <strong>{confirmAction?.userName}</strong> to the <strong>Orange</strong> plan?
                </>
              ) : (
                <>
                  Are you sure you want to downgrade <strong>{confirmAction?.userName}</strong> to the <strong>Free</strong> plan?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {confirmAction?.type === 'upgrade' ? 'Yes, Upgrade' : 'Yes, Downgrade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
