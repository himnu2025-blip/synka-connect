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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const getPaymentStatusBadge = (status: string) => {
  // Determine payment status from order status
  if (status === 'paid' || status === 'Placed' || status === 'Approved' || status === 'Dispatched' || status === 'Done') {
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
        <CheckCircle className="w-3 h-3 mr-1" />
        Paid
      </Badge>
    );
  }
  if (status === 'payment_failed') {
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  }
  if (status === 'pending' || status === 'created') {
    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  }
  if (status === 'NA') {
    return (
      <Badge variant="outline">
        <XCircle className="w-3 h-3 mr-1" />
        Cancelled
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
};

const getDispatchStatus = (status: string) => {
  // Map payment/order status to dispatch status for dropdown
  if (status === 'paid') return 'Placed';
  if (['Placed', 'Approved', 'Dispatched', 'Done', 'NA'].includes(status)) return status;
  return 'pending'; // For pending/created/payment_failed - no dispatch status yet
};

export function AdminPvcOrdersTab() {
  const { isAdmin, loading: adminLoading, orders, fetchOrders, updateOrderStatus } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const [deletedEmails, setDeletedEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        await fetchOrders();
        const { data: deletedUsers } = await supabase
          .from('deleted_users')
          .select('email, user_id');
        
        if (deletedUsers) {
          const { data: activeProfiles } = await supabase
            .from('profiles')
            .select('user_id');
          
          const activeUserIds = new Set((activeProfiles || []).map(p => p.user_id));
          const trulyDeletedEmails = deletedUsers
            .filter(u => !activeUserIds.has(u.user_id))
            .map(u => u.email)
            .filter(Boolean) as string[];
          
          setDeletedEmails(new Set(trulyDeletedEmails));
        }
      } finally {
        setLoading(false);
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        fetchOrders();
      }, 300);
    };

    load();

    const channel = supabase
      .channel('admin-pvc-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [adminLoading, isAdmin, fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success('Order status updated');
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const pvcOrders = orders.filter(order => order.product_type === 'pvc');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <CreditCard className="h-5 w-5 text-muted-foreground" />
        <Badge variant="secondary">{pvcOrders.length} PVC orders</Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Dispatch</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pvcOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No PVC orders yet
                </TableCell>
              </TableRow>
            ) : (
              pvcOrders.map((order) => {
                const isUpdating = updatingId === order.id;
                const isUserDeleted = order.user_email && deletedEmails.has(order.user_email);
                const dispatchStatus = getDispatchStatus(order.status);
                const isPaid = order.status === 'paid' || ['Placed', 'Approved', 'Dispatched', 'Done'].includes(order.status);

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium text-sm">
                      {order.order_number || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.user_name}
                      {isUserDeleted && (
                        <Badge variant="destructive" className="ml-2 text-xs">Deleted</Badge>
                      )}
                    </TableCell>
                    <TableCell>{order.user_email}</TableCell>
                    <TableCell>{(order as any).user_phone || '-'}</TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">
                        {(order as any).card_variant?.replace(/-/g, ' ') || '-'}
                      </span>
                    </TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      {order.amount > 0 ? `₹${Number(order.amount).toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      {isPaid ? (
                        <Select
                          value={dispatchStatus}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Placed">Placed</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Dispatched">Dispatched</SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                            <SelectItem value="NA">NA</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
