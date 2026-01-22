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
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Calendar, Search, CheckCircle, XCircle, Clock, CreditCard, AlertTriangle, FileText } from 'lucide-react';
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
  status: 'active' | 'cancelled' | 'expired' | 'pending' | 'halted' | 'completed';
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
  user_name?: string;
  user_email?: string;
  user_phone?: string;
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
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    plan_type: 'monthly' as 'monthly' | 'annually',
    status: 'active' as 'active' | 'cancelled' | 'expired' | 'pending' | 'halted' | 'completed',
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

    setSubscriptions(enriched as Subscription[]);
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
    // Fetch users for the create dialog
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
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user_email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

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
    return subscriptions.filter(sub => {
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

    // If status is active and payment is paid or admin, upgrade user plan
    if (formData.status === 'active' && (formData.payment_status === 'paid' || formData.payment_status === 'admin')) {
      await upgradeUserPlan(formData.user_id, 'Orange');
    }

    toast.success('Subscription created successfully');
    setIsCreateOpen(false);
    setSaving(false);
    fetchSubscriptions();
    
    // Reset form
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

    // Handle plan upgrade/downgrade based on status change
    // Upgrade if status is active with paid/admin payment
    if (formData.status === 'active' && (formData.payment_status === 'paid' || formData.payment_status === 'admin') && 
        (editingSubscription.status !== 'active' || (editingSubscription.payment_status !== 'paid' && editingSubscription.payment_status !== 'admin'))) {
      await upgradeUserPlan(editingSubscription.user_id, 'Orange');
    } 
    // Only downgrade if status is expired AND end_date has passed
    // For cancelled/halted, user keeps access until end_date
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
          <Badge className="bg-orange-500 text-white">{subscriptions.length} Subscriptions</Badge>
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Auto Renew</TableHead>
                  <TableHead>E-Mandate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.user_name}</p>
                          <p className="text-xs text-muted-foreground">{sub.user_email}</p>
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
                        {formatIndianDate(sub.start_date)}
                      </TableCell>
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
                        <Badge variant={sub.auto_renew ? 'default' : 'outline'}>
                          {sub.auto_renew ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.mandate_created ? 'default' : 'outline'}>
                          {sub.mandate_created ? 'Created' : 'No'}
                        </Badge>
                        {sub.mandate_id && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono truncate max-w-20">
                            {sub.mandate_id}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(sub)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

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
                <SelectContent className="max-h-60">
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
                  <SelectContent>
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
                  <SelectContent>
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
                  <SelectContent>
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
                  <SelectContent>
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
                <SelectContent>
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