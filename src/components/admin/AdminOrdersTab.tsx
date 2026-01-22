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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Package, CheckCircle, XCircle, CreditCard, AlertTriangle, Truck, Clock } from 'lucide-react';
import { format } from 'date-fns';

// Format date in Indian timezone (IST)
const formatIndianDate = (dateStr: string, showTime: boolean = false) => {
  const date = new Date(dateStr);
  if (showTime) {
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

interface Order {
  id: string;
  order_number: string | null;
  user_id: string;
  user_name: string;
  user_email: string;
  product_type: string;
  card_variant?: string;
  quantity: number;
  amount: number;
  status: string;
  razorpay_payment_id?: string;
  created_at: string;
}

export function AdminOrdersTab() {
  const { isAdmin, loading: adminLoading, orders, fetchOrders, updateOrderStatus, upgradeUserPlan } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const [deletedEmails, setDeletedEmails] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('all');
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | null;
    orderId: string | null;
    userId: string | null;
  }>({ open: false, action: null, orderId: null, userId: null });

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
      .channel('admin-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [adminLoading, isAdmin, fetchOrders]);

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    // Exclude orange_upgrade orders - they're handled in subscriptions
    if (order.product_type === 'orange_upgrade') return false;
    
    switch (activeTab) {
      case 'payment_failed':
        return order.status === 'failed' || order.status === 'pending';
      case 'payment_success':
        return order.status === 'paid';
      case 'placed':
        return order.status === 'Placed';
      case 'dispatched':
        return order.status === 'Dispatched';
      case 'delivered':
        return order.status === 'Done';
      case 'cancelled':
        return order.status === 'NA' || order.status === 'cancelled';
      default:
        return true;
    }
  });

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

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'placed':
        return <Badge className="bg-blue-500 text-white"><Package className="w-3 h-3 mr-1" />Placed</Badge>;
      case 'dispatched':
        return <Badge className="bg-orange-500 text-white"><Truck className="w-3 h-3 mr-1" />Dispatched</Badge>;
      case 'done':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>;
      case 'na':
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTabCount = (tab: string) => {
    return orders.filter((order) => {
      if (order.product_type === 'orange_upgrade') return false;
      switch (tab) {
        case 'payment_failed':
          return order.status === 'failed' || order.status === 'pending';
        case 'payment_success':
          return order.status === 'paid';
        case 'placed':
          return order.status === 'Placed';
        case 'dispatched':
          return order.status === 'Dispatched';
        case 'delivered':
          return order.status === 'Done';
        case 'cancelled':
          return order.status === 'NA' || order.status === 'cancelled';
        default:
          return true;
      }
    }).length;
  };

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
        <Package className="h-5 w-5 text-muted-foreground" />
        <Badge variant="secondary">{orders.filter(o => o.product_type !== 'orange_upgrade').length} Card Orders</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="all" className="flex items-center gap-1 text-xs">
            All ({getTabCount('all')})
          </TabsTrigger>
          <TabsTrigger value="payment_failed" className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="w-3 h-3" />
            Payment Failed ({getTabCount('payment_failed')})
          </TabsTrigger>
          <TabsTrigger value="payment_success" className="flex items-center gap-1 text-xs text-green-600">
            <CreditCard className="w-3 h-3" />
            Payment Success ({getTabCount('payment_success')})
          </TabsTrigger>
          <TabsTrigger value="placed" className="flex items-center gap-1 text-xs text-blue-600">
            <Package className="w-3 h-3" />
            Placed ({getTabCount('placed')})
          </TabsTrigger>
          <TabsTrigger value="dispatched" className="flex items-center gap-1 text-xs text-orange-600">
            <Truck className="w-3 h-3" />
            Dispatched ({getTabCount('dispatched')})
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" />
            Delivered ({getTabCount('delivered')})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-1 text-xs">
            Cancelled ({getTabCount('cancelled')})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No orders in this category
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const isUpdating = updatingId === order.id;
                    const isUserDeleted = order.user_email && deletedEmails.has(order.user_email);
                    const isPaid = order.status === 'paid' || order.status === 'Placed' || order.status === 'Dispatched' || order.status === 'Done';

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
                        <TableCell className="text-sm">{order.user_email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase text-xs">
                            {order.product_type === 'pvc' ? 'PVC' : 'Metal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(order as any).card_variant ? (
                            <span className="text-sm capitalize">
                              {(order as any).card_variant.replace(/-/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>
                          {order.amount > 0 ? `₹${Number(order.amount).toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          {isPaid ? (
                            <Select
                              value={order.status}
                              onValueChange={(value) => handleStatusChange(order.id, value)}
                              disabled={isUpdating}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="Placed">Placed</SelectItem>
                                <SelectItem value="Dispatched">Dispatched</SelectItem>
                                <SelectItem value="Done">Done</SelectItem>
                                <SelectItem value="NA">NA</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatIndianDate(order.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, action: null, orderId: null, userId: null });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'approve'
                ? 'Approve Orange Upgrade?'
                : 'Reject Orange Upgrade?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'approve'
                ? 'This will upgrade the user to the Orange plan immediately.'
                : 'This will reject the upgrade request.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmDialog.action === 'approve'
                  ? 'bg-orange-plan hover:bg-orange-plan/90'
                  : ''
              }
            >
              {confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}