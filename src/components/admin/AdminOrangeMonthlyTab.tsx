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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Calendar, CheckCircle, XCircle, Clock, AlertTriangle, Ban } from 'lucide-react';
import { format } from 'date-fns';

interface MonthlySubscription {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
  start_date: string;
  end_date: string;
  amount: number;
  mandate_created: boolean;
  auto_renew: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
}

// Format date in Indian timezone (IST)
const formatIndianDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export function AdminOrangeMonthlyTab() {
  const { isAdmin, loading: adminLoading, upgradeUserPlan, downgradeUserPlan } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<MonthlySubscription[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const refreshTimerRef = useRef<number | null>(null);

  const fetchSubscriptions = async () => {
    // Fetch monthly subscriptions - exclude pending payment and failed (those go to Subscriptions tab)
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('plan_type', 'monthly')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return;
    }

    // Enrich with user info
    const enriched = await Promise.all(
      (data || []).map(async (sub) => {
        const [profileRes, cardRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('user_id', sub.user_id)
            .maybeSingle(),
          supabase
            .from('cards')
            .select('full_name, phone')
            .eq('user_id', sub.user_id)
            .eq('is_default', true)
            .maybeSingle(),
        ]);

        return {
          ...sub,
          user_name: profileRes.data?.full_name || cardRes.data?.full_name || 'Unknown',
          user_email: profileRes.data?.email || 'Unknown',
          user_phone: profileRes.data?.phone || cardRes.data?.phone || null,
        };
      })
    );

    setSubscriptions(enriched as MonthlySubscription[]);
  };

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      await fetchSubscriptions();
      setLoading(false);
    };

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        fetchSubscriptions();
      }, 300);
    };

    load();

    const channel = supabase
      .channel('admin-orange-monthly-subs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [adminLoading, isAdmin]);

  // Filter subscriptions - show active and previously active (completed, cancelled, halted)
  // Include: admin-created (payment_status = 'admin'), paid subscriptions
  // Exclude: pending payment_status, failed payment_status (those go to Subscriptions tab)
  const filteredSubscriptions = subscriptions.filter(sub => {
    // Include admin-created subscriptions
    if (sub.payment_status === 'admin') {
      switch (activeTab) {
        case 'active':
          return sub.status === 'active';
        case 'halted':
          return sub.status === 'halted';
        case 'cancelled':
          return sub.status === 'cancelled';
        case 'completed':
          return sub.status === 'completed' || sub.status === 'expired';
        default:
          return true;
      }
    }

    // Skip pending payment or failed payment - those are in Subscriptions tab
    if (sub.payment_status === 'pending' || sub.payment_status === 'failed') {
      // But include if status is active/completed/cancelled/halted (meaning they had a successful payment before)
      if (sub.status !== 'active' && sub.status !== 'completed' && sub.status !== 'cancelled' && sub.status !== 'halted') {
        return false;
      }
    }

    switch (activeTab) {
      case 'active':
        return sub.status === 'active';
      case 'halted':
        return sub.status === 'halted';
      case 'cancelled':
        return sub.status === 'cancelled';
      case 'completed':
        return sub.status === 'completed' || sub.status === 'expired';
      default:
        return true;
    }
  });

  const getTabCount = (tab: string) => {
    return subscriptions.filter(sub => {
      // Include admin-created subscriptions
      if (sub.payment_status === 'admin') {
        switch (tab) {
          case 'active':
            return sub.status === 'active';
          case 'halted':
            return sub.status === 'halted';
          case 'cancelled':
            return sub.status === 'cancelled';
          case 'completed':
            return sub.status === 'completed' || sub.status === 'expired';
          default:
            return true;
        }
      }

      // Skip pending/failed payment that never had active subscription
      if (sub.payment_status === 'pending' || sub.payment_status === 'failed') {
        if (sub.status !== 'active' && sub.status !== 'completed' && sub.status !== 'cancelled' && sub.status !== 'halted') {
          return false;
        }
      }

      switch (tab) {
        case 'active':
          return sub.status === 'active';
        case 'halted':
          return sub.status === 'halted';
        case 'cancelled':
          return sub.status === 'cancelled';
        case 'completed':
          return sub.status === 'completed' || sub.status === 'expired';
        default:
          return true;
      }
    }).length;
  };

  const handleStatusChange = async (sub: MonthlySubscription, newStatus: string) => {
    setUpdatingId(sub.id);
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'cancelled' && sub.status !== 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
        updateData.auto_renew = false;
      }

      if (newStatus === 'halted') {
        updateData.auto_renew = false;
        updateData.cancellation_reason = 'Bank mandate halted by admin';
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', sub.id);

      if (error) throw error;

      // Handle plan upgrade / downgrade (correct logic)

// 1️⃣ Activate → upgrade immediately
if (newStatus === 'active' && sub.status !== 'active') {
  await upgradeUserPlan(sub.user_id, 'Orange');
  toast.success('Subscription activated and user upgraded to Orange');
}

// 2️⃣ Completed / Expired → downgrade immediately
else if (newStatus === 'completed' || newStatus === 'expired') {
  await downgradeUserPlan(sub.user_id);
  toast.success('Subscription expired and user downgraded to Free');
}

// 3️⃣ Halted → downgrade immediately (payment retries failed)
else if (newStatus === 'halted') {
  await downgradeUserPlan(sub.user_id);
  toast.success('Subscription halted and user downgraded to Free');
}

// 4️⃣ Cancelled → DO NOT downgrade
else if (newStatus === 'cancelled') {
  toast.success('Subscription cancelled. User will downgrade after end date.');
}

// 5️⃣ Default
else {
  toast.success('Status updated');
}
      await fetchSubscriptions();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAutoRenewToggle = async (sub: MonthlySubscription) => {
    setUpdatingId(sub.id);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          auto_renew: !sub.auto_renew,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id);

      if (error) throw error;
      toast.success(`Auto-renew ${!sub.auto_renew ? 'enabled' : 'disabled'}`);
      await fetchSubscriptions();
    } catch (error) {
      console.error('Error toggling auto-renew:', error);
      toast.error('Failed to update auto-renew');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'halted':
        return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Halted</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'completed':
      case 'expired':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 text-white">Paid</Badge>;
      case 'admin':
        return <Badge className="bg-purple-500 text-white">Admin</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMandateBadge = (sub: MonthlySubscription) => {
    if (sub.status === 'halted') {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Halted</Badge>;
    }
    if (sub.mandate_created) {
      return <Badge className="bg-green-500 text-white">Active</Badge>;
    }
    return <Badge variant="outline">Not Set</Badge>;
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
        <Calendar className="h-5 w-5 text-orange-500" />
        <Badge className="bg-orange-500 text-white">{getTabCount('all')} Monthly Subscriptions</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="active" className="flex items-center gap-1 text-xs">
            <CheckCircle className="w-3 h-3" />
            Active ({getTabCount('active')})
          </TabsTrigger>
          <TabsTrigger value="halted" className="flex items-center gap-1 text-xs text-destructive">
            <Ban className="w-3 h-3" />
            Halted ({getTabCount('halted')})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-1 text-xs">
            <XCircle className="w-3 h-3" />
            Cancelled ({getTabCount('cancelled')})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3" />
            Expired ({getTabCount('completed')})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>E-Mandate</TableHead>
                  <TableHead>Auto Renew</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No monthly subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => {
                    const isUpdating = updatingId === sub.id;

                    return (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.user_name}</p>
                            <p className="text-xs text-muted-foreground">{sub.user_email}</p>
                            {sub.user_phone && (
                              <p className="text-xs text-muted-foreground">{sub.user_phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell>{getPaymentBadge(sub.payment_status)}</TableCell>
                        <TableCell className="text-sm">
                          {formatIndianDate(sub.start_date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatIndianDate(sub.end_date)}
                        </TableCell>
                        <TableCell>₹{Number(sub.amount).toLocaleString()}/mo</TableCell>
                        <TableCell>{getMandateBadge(sub)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={sub.auto_renew ? 'default' : 'outline'}
                            className={`cursor-pointer ${isUpdating ? 'opacity-50' : ''}`}
                            onClick={() => !isUpdating && handleAutoRenewToggle(sub)}
                          >
                            {sub.auto_renew ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={sub.status}
                            onValueChange={(value) => handleStatusChange(sub, value)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="w-[130px]">
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="halted">Halted</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="completed">Expired</SelectItem>
                            </SelectContent>
                          </Select>
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

      {/* Show cancellation info for cancelled/halted subscriptions */}
      {filteredSubscriptions.some(sub => sub.cancellation_reason) && (
        <div className="text-xs text-muted-foreground mt-2">
          * Halted subscriptions indicate bank e-mandate failure after payment retries.
        </div>
      )}
    </div>
  );
}
