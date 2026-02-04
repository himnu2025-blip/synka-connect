import { useEffect, useRef, useState, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Calendar, Search, CheckCircle, XCircle, Clock, CreditCard, AlertTriangle, FileText, History, Eye, RefreshCw, Ban, Play } from 'lucide-react';
import { format, addMonths, addYears } from 'date-fns';

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

interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'monthly' | 'annually';
  status: string;
  start_date: string;
  end_date: string;
  amount: number;
  payment_status: string;
  mandate_id: string | null;
  mandate_created: boolean;
  transaction_id: string | null;
  auto_renew: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  razorpay_subscription_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
}

interface UserSubscriptionSummary {
  user_id: string;
  user_name: string;
  user_email: string;
  latest: Subscription;
  history: Subscription[];
  totalPaid: number;
}

// Derive timeline events from subscription data
interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'created' | 'paid' | 'activated' | 'cancelled' | 'halted' | 'resumed' | 'expired' | 'renewed' | 'replaced';
  label: string;
  description: string;
  subscription: Subscription;
}

function deriveTimelineEvents(subscriptions: Subscription[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  subscriptions.forEach((sub, idx) => {
    // Creation event
    events.push({
      id: `${sub.id}-created`,
      timestamp: sub.created_at,
      type: 'created',
      label: 'Subscription Created',
      description: `${sub.plan_type === 'monthly' ? 'Monthly' : 'Annual'} plan - ₹${sub.amount}`,
      subscription: sub,
    });
    
    // Payment event (if paid or admin)
    if (sub.payment_status === 'paid' || sub.payment_status === 'admin') {
      events.push({
        id: `${sub.id}-paid`,
        timestamp: sub.updated_at || sub.created_at,
        type: 'paid',
        label: sub.payment_status === 'admin' ? 'Admin Upgrade' : 'Payment Captured',
        description: `₹${sub.amount} ${sub.payment_status === 'admin' ? '(Manual)' : 'via Razorpay'}`,
        subscription: sub,
      });
    }
    
    // Mandate/E-mandate events
    if (sub.mandate_created) {
      events.push({
        id: `${sub.id}-mandate`,
        timestamp: sub.updated_at || sub.created_at,
        type: 'activated',
        label: 'E-Mandate Authenticated',
        description: sub.mandate_id ? `Mandate: ${sub.mandate_id}` : 'Auto-renewal enabled',
        subscription: sub,
      });
    }
    
    // Cancelled event
    if (sub.cancelled_at) {
      events.push({
        id: `${sub.id}-cancelled`,
        timestamp: sub.cancelled_at,
        type: 'cancelled',
        label: 'E-Mandate Cancelled',
        description: sub.cancellation_reason || 'Auto-renewal disabled',
        subscription: sub,
      });
    }
    
    // Halted event
    if (sub.status === 'halted') {
      events.push({
        id: `${sub.id}-halted`,
        timestamp: sub.updated_at,
        type: 'halted',
        label: 'Subscription Halted',
        description: 'Payment retry failed',
        subscription: sub,
      });
    }
    
    // Replaced event
    if (sub.status === 'replaced') {
      events.push({
        id: `${sub.id}-replaced`,
        timestamp: sub.updated_at,
        type: 'replaced',
        label: 'Subscription Replaced',
        description: 'New subscription created',
        subscription: sub,
      });
    }
    
    // Expired/Completed event
    if (sub.status === 'expired' || sub.status === 'completed') {
      events.push({
        id: `${sub.id}-expired`,
        timestamp: sub.end_date,
        type: 'expired',
        label: 'Subscription Expired',
        description: 'Plan period ended',
        subscription: sub,
      });
    }
  });
  
  // Sort by timestamp descending
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function AdminSubscriptionsTab() {
  const { isAdmin, loading: adminLoading, users, fetchUsers, upgradeUserPlan, downgradeUserPlan } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const refreshTimerRef = useRef<number | null>(null);
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [selectedUserSummary, setSelectedUserSummary] = useState<UserSubscriptionSummary | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    plan_type: 'monthly' as 'monthly' | 'annually',
    status: 'active' as string,
    amount: 299, // Default monthly price
    payment_status: 'admin',
    mandate_created: false,
    auto_renew: false,
  });
  const [saving, setSaving] = useState(false);

  const fetchSubscriptions = async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return;
    }

    // Batch fetch user info
    const userIds = [...new Set((data || []).map(sub => sub.user_id))];
    const [profilesRes, cardsRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email, phone').in('user_id', userIds),
      supabase.from('cards').select('user_id, full_name, phone').eq('is_default', true).in('user_id', userIds),
    ]);

    const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
    const cardMap = new Map((cardsRes.data || []).map(c => [c.user_id, c]));

    const enriched = (data || []).map(sub => {
      const profile = profileMap.get(sub.user_id);
      const card = cardMap.get(sub.user_id);
      return {
        ...sub,
        user_name: profile?.full_name || card?.full_name || 'Unknown',
        user_email: profile?.email || 'Unknown',
        user_phone: profile?.phone || card?.phone || null,
      };
    });

    setSubscriptions(enriched as Subscription[]);
  };

  // Group subscriptions by user for the main table
  const userSummaries = useMemo(() => {
    const map = new Map<string, UserSubscriptionSummary>();
    
    subscriptions.forEach(sub => {
      const existing = map.get(sub.user_id);
      if (existing) {
        existing.history.push(sub);
        if (sub.payment_status === 'paid' || sub.payment_status === 'admin') {
          existing.totalPaid += Number(sub.amount);
        }
        // Keep the most recent as latest (already sorted by created_at desc)
      } else {
        map.set(sub.user_id, {
          user_id: sub.user_id,
          user_name: sub.user_name || 'Unknown',
          user_email: sub.user_email || 'Unknown',
          latest: sub,
          history: [sub],
          totalPaid: (sub.payment_status === 'paid' || sub.payment_status === 'admin') ? Number(sub.amount) : 0,
        });
      }
    });
    
    return Array.from(map.values());
  }, [subscriptions]);

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
    fetchUsers();

    const channel = supabase
      .channel('admin-subscriptions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [adminLoading, isAdmin, fetchUsers]);

  // Filter subscriptions based on active tab and search
  const filteredSummaries = userSummaries.filter(summary => {
    const matchesSearch = 
      summary.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.user_email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const sub = summary.latest;
    switch (activeTab) {
      case 'payment_pending':
        return sub.payment_status === 'pending';
      case 'payment_failed':
        return sub.payment_status === 'failed';
      case 'payment_paid':
        return sub.payment_status === 'paid';
      case 'active':
        return sub.status === 'active';
      case 'halted':
        return sub.status === 'halted';
      case 'expired':
        return sub.status === 'expired' || sub.status === 'completed';
      case 'cancelled':
        return sub.status === 'cancelled';
      case 'monthly':
        return sub.plan_type === 'monthly';
      case 'annually':
        return sub.plan_type === 'annually';
      default:
        return true;
    }
  });

  const getTabCount = (tab: string) => {
    return userSummaries.filter(summary => {
      const sub = summary.latest;
      switch (tab) {
        case 'payment_pending':
          return sub.payment_status === 'pending';
        case 'payment_failed':
          return sub.payment_status === 'failed';
        case 'payment_paid':
          return sub.payment_status === 'paid';
        case 'active':
          return sub.status === 'active';
        case 'halted':
          return sub.status === 'halted';
        case 'expired':
          return sub.status === 'expired' || sub.status === 'completed';
        case 'cancelled':
          return sub.status === 'cancelled';
        case 'monthly':
          return sub.plan_type === 'monthly';
        case 'annually':
          return sub.plan_type === 'annually';
        default:
          return true;
      }
    }).length;
  };

  const handleCreate = async () => {
    if (!formData.user_id) {
      toast.error('Please select a user');
      return;
    }

    setSaving(true);
    const startDate = new Date();
    const endDate = formData.plan_type === 'monthly' 
      ? addMonths(startDate, 1) 
      : addYears(startDate, 1);

    const { error } = await supabase.from('subscriptions').insert({
      user_id: formData.user_id,
      plan_type: formData.plan_type,
      status: formData.status,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      current_period_start: startDate.toISOString(),
      current_period_end: endDate.toISOString(),
      amount: formData.amount,
      payment_status: formData.payment_status,
      mandate_created: formData.mandate_created,
      auto_renew: formData.auto_renew,
    });

    if (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription');
      setSaving(false);
      return;
    }

    if (formData.status === 'active' && (formData.payment_status === 'paid' || formData.payment_status === 'admin')) {
      await upgradeUserPlan(formData.user_id, 'Orange');
    }

    toast.success('Subscription created successfully');
    setIsCreateOpen(false);
    setSaving(false);
    fetchSubscriptions();
    
    setFormData({
      user_id: '',
      plan_type: 'monthly',
      status: 'active',
      amount: 299,
      payment_status: 'admin',
      mandate_created: false,
      auto_renew: false,
    });
  };

  const handleEdit = async () => {
    if (!editingSubscription) return;

    setSaving(true);
    
    const updateData: any = {
      status: formData.status,
      amount: formData.amount,
      payment_status: formData.payment_status,
      mandate_created: formData.mandate_created,
      auto_renew: formData.auto_renew,
      updated_at: new Date().toISOString(),
    };
    
    if (formData.status === 'cancelled' && editingSubscription.status !== 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', editingSubscription.id);

    if (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
      setSaving(false);
      return;
    }

    if (formData.status === 'active' && (formData.payment_status === 'paid' || formData.payment_status === 'admin') && 
        (editingSubscription.status !== 'active' || (editingSubscription.payment_status !== 'paid' && editingSubscription.payment_status !== 'admin'))) {
      await upgradeUserPlan(editingSubscription.user_id, 'Orange');
    } 
    else if (formData.status === 'expired' && editingSubscription.status !== 'expired') {
      const endDate = new Date(editingSubscription.end_date);
      if (endDate <= new Date()) {
        await downgradeUserPlan(editingSubscription.user_id);
      }
    }

    toast.success('Subscription updated successfully');
    setIsEditOpen(false);
    setEditingSubscription(null);
    setSaving(false);
    fetchSubscriptions();
  };

  const openEditDialog = (sub: Subscription) => {
    setEditingSubscription(sub);
    setFormData({
      user_id: sub.user_id,
      plan_type: sub.plan_type,
      status: sub.status,
      amount: sub.amount,
      payment_status: sub.payment_status,
      mandate_created: sub.mandate_created,
      auto_renew: sub.auto_renew,
    });
    setIsEditOpen(true);
  };

  const openHistoryDialog = (summary: UserSubscriptionSummary) => {
    setSelectedUserSummary(summary);
    setIsHistoryOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'halted':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Halted</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'expired':
      case 'completed':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'replaced':
        return <Badge variant="outline"><RefreshCw className="w-3 h-3 mr-1" />Replaced</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 text-white"><CreditCard className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'admin':
        return <Badge className="bg-purple-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'refunded':
        return <Badge variant="outline"><FileText className="w-3 h-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return <Plus className="w-3 h-3" />;
      case 'paid':
        return <CreditCard className="w-3 h-3" />;
      case 'activated':
        return <CheckCircle className="w-3 h-3" />;
      case 'cancelled':
        return <Ban className="w-3 h-3" />;
      case 'halted':
        return <AlertTriangle className="w-3 h-3" />;
      case 'resumed':
        return <Play className="w-3 h-3" />;
      case 'expired':
        return <Clock className="w-3 h-3" />;
      case 'renewed':
        return <RefreshCw className="w-3 h-3" />;
      case 'replaced':
        return <RefreshCw className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'paid':
      case 'activated':
      case 'resumed':
        return 'bg-green-500 text-white';
      case 'cancelled':
      case 'halted':
        return 'bg-destructive text-destructive-foreground';
      case 'expired':
      case 'replaced':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-primary text-primary-foreground';
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-orange-500" />
          <Badge className="bg-orange-500 text-white">{userSummaries.length} Users</Badge>
          <Badge variant="outline">{subscriptions.length} Total Subscriptions</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-48"
            />
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="all" className="text-xs">
            All ({getTabCount('all')})
          </TabsTrigger>
          <TabsTrigger value="payment_pending" className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3" />
            Pending ({getTabCount('payment_pending')})
          </TabsTrigger>
          <TabsTrigger value="payment_failed" className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="w-3 h-3" />
            Failed ({getTabCount('payment_failed')})
          </TabsTrigger>
          <TabsTrigger value="payment_paid" className="flex items-center gap-1 text-xs text-green-600">
            <CreditCard className="w-3 h-3" />
            Paid ({getTabCount('payment_paid')})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" />
            Active ({getTabCount('active')})
          </TabsTrigger>
          <TabsTrigger value="halted" className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="w-3 h-3" />
            Halted ({getTabCount('halted')})
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center gap-1 text-xs">
            Expired ({getTabCount('expired')})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-1 text-xs">
            Cancelled ({getTabCount('cancelled')})
          </TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs">
            Monthly ({getTabCount('monthly')})
          </TabsTrigger>
          <TabsTrigger value="annually" className="text-xs">
            Annual ({getTabCount('annually')})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Auto Renewal</TableHead>
                  <TableHead>E-Mandate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSummaries.map((summary) => {
                    const sub = summary.latest;
                    return (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{summary.user_name}</p>
                            <p className="text-xs text-muted-foreground">{summary.user_email}</p>
                            {summary.history.length > 1 && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {summary.history.length} subs
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sub.plan_type === 'monthly' ? 'secondary' : 'default'}>
                            {sub.plan_type === 'monthly' ? 'Monthly' : 'Annual'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell>{getPaymentBadge(sub.payment_status)}</TableCell>
                        <TableCell className="text-sm">
                          {formatIndianDate(sub.end_date)}
                        </TableCell>
                        <TableCell>
                          ₹{Number(sub.amount).toLocaleString()}
                          <span className="text-xs text-muted-foreground">
                            /{sub.plan_type === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={sub.auto_renew ? 'default' : 'outline'} className={sub.auto_renew ? 'bg-green-500' : ''}>
                              {sub.auto_renew ? 'Yes' : 'No'}
                            </Badge>
                            {!sub.auto_renew && sub.cancelled_at && (
                              <p className="text-xs text-muted-foreground">
                                {formatIndianDate(sub.cancelled_at)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sub.mandate_created ? 'default' : 'outline'}>
                            {sub.mandate_created ? 'Created' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditDialog(sub)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openHistoryDialog(summary)} title="View All">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[85dvh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              Subscription History
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedUserSummary && (
                <span className="break-words">
                  {selectedUserSummary.user_name} ({selectedUserSummary.user_email}) - 
                  Total Paid: ₹{selectedUserSummary.totalPaid.toLocaleString()}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 sm:-mx-6 sm:px-6">
            {selectedUserSummary && (
              <div className="space-y-4 sm:space-y-6 pb-4">
                {/* Latest Subscription Highlight */}
                {(() => {
                  const latest = selectedUserSummary.latest;
                  const isSuccess = latest.payment_status === 'paid' || latest.payment_status === 'admin';
                  
                  return (
                    <div className={`border-2 rounded-lg p-3 sm:p-4 ${isSuccess ? 'border-primary bg-primary/5' : 'border-muted bg-muted/30'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <Badge variant="default" className={isSuccess ? 'bg-primary' : ''}>
                            {isSuccess ? '✓ Latest Active' : 'Latest'}
                          </Badge>
                          <Badge variant={latest.plan_type === 'monthly' ? 'secondary' : 'default'}>
                            {latest.plan_type === 'monthly' ? 'Monthly' : 'Annual'}
                          </Badge>
                          {getStatusBadge(latest.status)}
                          {getPaymentBadge(latest.payment_status)}
                        </div>
                        <p className="font-bold text-lg sm:text-xl text-primary">₹{latest.amount.toLocaleString()}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div>
                          <Label className="text-muted-foreground text-xs">Start Date</Label>
                          <p className="font-medium">{formatIndianDate(latest.start_date)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">End Date</Label>
                          <p className="font-medium">{formatIndianDate(latest.end_date)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Auto Renewal</Label>
                          <p className="font-medium">{latest.auto_renew ? 'Yes' : 'No'}</p>
                          {!latest.auto_renew && latest.cancelled_at && (
                            <p className="text-xs text-muted-foreground">
                              Cancelled: {formatIndianDate(latest.cancelled_at, true)}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">E-Mandate</Label>
                          <p className="font-medium">{latest.mandate_created ? 'Created' : 'No'}</p>
                        </div>
                        {latest.razorpay_subscription_id && (
                          <div className="col-span-2">
                            <Label className="text-muted-foreground text-xs">Razorpay Sub ID</Label>
                            <p className="font-mono text-xs break-all">{latest.razorpay_subscription_id}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Timeline Events */}
                <div className="flex items-center gap-2">
                  <Separator className="flex-1" />
                  <span className="text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap">
                    Activity Timeline
                  </span>
                  <Separator className="flex-1" />
                </div>

                <div className="space-y-2">
                  {deriveTimelineEvents(selectedUserSummary.history).map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={`rounded-full p-1.5 ${getEventColor(event.type)}`}>
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <p className="font-medium text-sm">{event.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatIndianDate(event.timestamp, true)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subscription</DialogTitle>
            <DialogDescription>
              Create a new Orange subscription for a user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={formData.user_id} onValueChange={(v) => setFormData(prev => ({ ...prev, user_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent className="max-h-60 z-[2100]">
                  {users.map(user => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <span className="truncate">
                        {user.full_name || 'Unknown'} <span className="text-muted-foreground text-xs">({user.email})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan Type</Label>
                <Select 
                  value={formData.plan_type} 
                  onValueChange={(v: 'monthly' | 'annually') => setFormData(prev => ({ 
                    ...prev, 
                    plan_type: v,
                    amount: v === 'monthly' ? 299 : 1999 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[2100]">
                    <SelectItem value="monthly">Monthly (₹299)</SelectItem>
                    <SelectItem value="annually">Annually (₹1999)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input 
                  type="number" 
                  value={formData.amount} 
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v: 'active' | 'cancelled' | 'expired' | 'pending' | 'halted') => setFormData(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[2100]">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="halted">Halted</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select 
                  value={formData.payment_status} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, payment_status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[2100]">
                    <SelectItem value="admin">Admin (Manual)</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.auto_renew}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_renew: checked }))}
                />
                <Label>Auto Renew</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.mandate_created}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mandate_created: checked }))}
                />
                <Label>E-Mandate Created</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription for {editingSubscription?.user_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingSubscription && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p><strong>Plan:</strong> {editingSubscription.plan_type === 'monthly' ? 'Monthly' : 'Annual'}</p>
                <p><strong>Start:</strong> {format(new Date(editingSubscription.start_date), 'PPP')}</p>
                <p><strong>End:</strong> {format(new Date(editingSubscription.end_date), 'PPP')}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v: 'active' | 'cancelled' | 'expired' | 'pending' | 'halted') => setFormData(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[2100]">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="halted">Halted</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select 
                  value={formData.payment_status} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, payment_status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                <SelectContent className="z-[2100]">
                    <SelectItem value="admin">Admin (Manual)</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                value={formData.amount} 
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.auto_renew}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_renew: checked }))}
                />
                <Label>Auto Renew</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.mandate_created}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mandate_created: checked }))}
                />
                <Label>E-Mandate</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
