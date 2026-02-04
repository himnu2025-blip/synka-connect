import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Search, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Eye,
  Calendar,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

interface Payment {
  id: string;
  user_id: string;
  order_id: string | null;
  subscription_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  razorpay_signature: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  error_code: string | null;
  error_description: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'monthly' | 'annually';
  status: string;
  payment_status: string | null;
  start_date: string;
  end_date: string;
  current_period_end: string | null;
  amount: number;
  auto_renew: boolean | null;
  mandate_created: boolean | null;
  mandate_id: string | null;
  razorpay_subscription_id: string | null;
  razorpay_payment_id: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
}

export function AdminTransactionsTab() {
  const [activeTab, setActiveTab] = useState("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  
  // Details dialog
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    fetchData();
    
    // Real-time subscription
    const paymentsChannel = supabase
      .channel("admin-payments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => scheduleRefresh()
      )
      .subscribe();

    const subscriptionsChannel = supabase
      .channel("admin-subscriptions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions" },
        () => scheduleRefresh()
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(subscriptionsChannel);
    };
  }, []);

  const scheduleRefresh = () => {
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      fetchData();
    }, 300);
  };

  const fetchData = async () => {
    await Promise.all([fetchPayments(), fetchSubscriptions()]);
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data: paymentsData, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with user data
      const userIds = [...new Set(paymentsData?.map((p) => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .in("user_id", userIds);

      const profileMap = new Map(
        profiles?.map((p) => [
          p.user_id,
          { name: p.full_name, email: p.email, phone: p.phone },
        ])
      );

      const enrichedPayments =
        paymentsData?.map((payment) => ({
          ...payment,
          user_name: profileMap.get(payment.user_id)?.name || "Unknown",
          user_email: profileMap.get(payment.user_id)?.email || "",
          user_phone: profileMap.get(payment.user_id)?.phone || "",
        })) || [];

      setPayments(enrichedPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data: subscriptionsData, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with user data
      const userIds = [...new Set(subscriptionsData?.map((s) => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .in("user_id", userIds);

      const profileMap = new Map(
        profiles?.map((p) => [
          p.user_id,
          { name: p.full_name, email: p.email, phone: p.phone },
        ])
      );

      const enrichedSubscriptions =
        subscriptionsData?.map((sub) => ({
          ...sub,
          user_name: profileMap.get(sub.user_id)?.name || "Unknown",
          user_email: profileMap.get(sub.user_id)?.email || "",
          user_phone: profileMap.get(sub.user_id)?.phone || "",
        })) || [];

      setSubscriptions(enrichedSubscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Failed to fetch subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; icon: any; label: string }> = {
      captured: {
        variant: "default",
        icon: CheckCircle,
        label: "Captured",
      },
      failed: {
        variant: "destructive",
        icon: XCircle,
        label: "Failed",
      },
      created: {
        variant: "secondary",
        icon: Clock,
        label: "Created",
      },
      active: {
        variant: "default",
        icon: CheckCircle,
        label: "Active",
      },
      cancelled: {
        variant: "secondary",
        icon: XCircle,
        label: "Cancelled",
      },
      expired: {
        variant: "outline",
        icon: XCircle,
        label: "Expired",
      },
      pending: {
        variant: "secondary",
        icon: Clock,
        label: "Pending",
      },
      halted: {
        variant: "destructive",
        icon: AlertTriangle,
        label: "Halted",
      },
      completed: {
        variant: "outline",
        icon: CheckCircle,
        label: "Completed",
      },
      admin: {
        variant: "secondary",
        icon: CheckCircle,
        label: "Admin",
      },
    };

    const config = statusMap[status?.toLowerCase()] || {
      variant: "outline",
      icon: Clock,
      label: status || "Unknown",
    };

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPlanBadge = (planType: string) => {
    return (
      <Badge variant={planType === "annually" ? "default" : "secondary"}>
        {planType === "annually" ? "Annual" : "Monthly"}
      </Badge>
    );
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_phone?.includes(searchTerm) ||
      payment.razorpay_payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.razorpay_order_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user_phone?.includes(searchTerm) ||
      sub.razorpay_subscription_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchesPlan = planFilter === "all" || sub.plan_type === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const showDetails = (item: any, type: "payment" | "subscription") => {
    setSelectedItem({ ...item, type });
    setIsDetailsOpen(true);
  };

  if (loading && payments.length === 0 && subscriptions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Transactions
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="payments">
            Payments ({filteredPayments.length})
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            Subscriptions ({filteredSubscriptions.length})
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col sm:flex-row gap-2 my-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, email, phone, or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="captured">Captured</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="halted">Halted</SelectItem>
            </SelectContent>
          </Select>
          {activeTab === "subscriptions" && (
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Plan Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annually">Annual</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="payments" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">User</TableHead>
                    <TableHead className="min-w-[200px]">Razorpay Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{payment.user_name}</p>
                          <p className="text-xs text-muted-foreground">{payment.user_email}</p>
                          {payment.user_phone && (
                            <p className="text-xs text-muted-foreground">{payment.user_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 font-mono text-xs">
                          {payment.razorpay_payment_id && (
                            <div>
                              <span className="text-muted-foreground">Payment:</span>{" "}
                              <span className="text-foreground">{payment.razorpay_payment_id}</span>
                            </div>
                          )}
                          {payment.razorpay_order_id && (
                            <div>
                              <span className="text-muted-foreground">Order:</span>{" "}
                              <span className="text-foreground">{payment.razorpay_order_id}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">₹{payment.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground uppercase">{payment.currency || "INR"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payment.method || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">{format(new Date(payment.created_at), "dd MMM yyyy")}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.created_at), "HH:mm:ss")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => showDetails(payment, "payment")}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="min-w-[150px]">Dates</TableHead>
                    <TableHead>Auto-Renew</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{sub.user_name}</p>
                          <p className="text-xs text-muted-foreground">{sub.user_email}</p>
                          {sub.user_phone && (
                            <p className="text-xs text-muted-foreground">{sub.user_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(sub.plan_type)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">₹{sub.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">/{sub.plan_type === "monthly" ? "mo" : "yr"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>{getStatusBadge(sub.payment_status || "pending")}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            <span className="text-muted-foreground">Start:</span> {format(new Date(sub.start_date), "dd MMM yyyy")}
                          </div>
                          <div>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            <span className="text-muted-foreground">End:</span> {format(new Date(sub.end_date), "dd MMM yyyy")}
                          </div>
                          {sub.cancelled_at && (
                            <div className="text-destructive">
                              <XCircle className="w-3 h-3 inline mr-1" />
                              Cancelled: {format(new Date(sub.cancelled_at), "dd MMM yyyy")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {sub.auto_renew ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              No
                            </Badge>
                          )}
                          {sub.mandate_created && (
                            <p className="text-xs text-muted-foreground">E-mandate active</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => showDetails(sub, "subscription")}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSubscriptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No subscriptions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.type === "payment" ? "Payment Details" : "Subscription Details"}
            </DialogTitle>
            <DialogDescription>
              Complete transaction information
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              {/* User Information */}
              <div>
                <h3 className="font-semibold mb-3 text-sm">User Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedItem.user_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedItem.user_email}</p>
                  </div>
                  {selectedItem.user_phone && (
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedItem.user_phone}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">User ID</Label>
                    <p className="font-mono text-xs">{selectedItem.user_id}</p>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div>
                <h3 className="font-semibold mb-3 text-sm">Transaction Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-semibold text-lg">₹{selectedItem.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Currency</Label>
                    <p className="font-medium uppercase">{selectedItem.currency || "INR"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedItem.status)}</div>
                  </div>
                  {selectedItem.type === "payment" && selectedItem.method && (
                    <div>
                      <Label className="text-muted-foreground">Payment Method</Label>
                      <p className="font-medium capitalize">{selectedItem.method}</p>
                    </div>
                  )}
                  {selectedItem.type === "subscription" && (
                    <>
                      <div>
                        <Label className="text-muted-foreground">Plan Type</Label>
                        <div className="mt-1">{getPlanBadge(selectedItem.plan_type)}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Payment Status</Label>
                        <div className="mt-1">{getStatusBadge(selectedItem.payment_status || "pending")}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Razorpay IDs */}
              <div>
                <h3 className="font-semibold mb-3 text-sm">Razorpay Information</h3>
                <div className="space-y-2 text-sm">
                  {selectedItem.razorpay_payment_id && (
                    <div>
                      <Label className="text-muted-foreground">Payment ID</Label>
                      <p className="font-mono text-xs bg-muted p-2 rounded mt-1">
                        {selectedItem.razorpay_payment_id}
                      </p>
                    </div>
                  )}
                  {selectedItem.razorpay_order_id && (
                    <div>
                      <Label className="text-muted-foreground">Order ID</Label>
                      <p className="font-mono text-xs bg-muted p-2 rounded mt-1">
                        {selectedItem.razorpay_order_id}
                      </p>
                    </div>
                  )}
                  {selectedItem.razorpay_subscription_id && (
                    <div>
                      <Label className="text-muted-foreground">Subscription ID</Label>
                      <p className="font-mono text-xs bg-muted p-2 rounded mt-1">
                        {selectedItem.razorpay_subscription_id}
                      </p>
                    </div>
                  )}
                  {selectedItem.razorpay_signature && (
                    <div>
                      <Label className="text-muted-foreground">Signature</Label>
                      <p className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">
                        {selectedItem.razorpay_signature}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription Specific */}
              {selectedItem.type === "subscription" && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm">Subscription Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Start Date</Label>
                      <p className="font-medium">{format(new Date(selectedItem.start_date), "dd MMM yyyy")}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">End Date</Label>
                      <p className="font-medium">{format(new Date(selectedItem.end_date), "dd MMM yyyy")}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Auto-Renew</Label>
                      <p className="font-medium">{selectedItem.auto_renew ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">E-Mandate</Label>
                      <p className="font-medium">{selectedItem.mandate_created ? "Active" : "Not Set"}</p>
                    </div>
                    {selectedItem.cancelled_at && (
                      <>
                        <div>
                          <Label className="text-muted-foreground">Cancelled At</Label>
                          <p className="font-medium text-destructive">
                            {format(new Date(selectedItem.cancelled_at), "dd MMM yyyy HH:mm")}
                          </p>
                        </div>
                        {selectedItem.cancellation_reason && (
                          <div className="col-span-2">
                            <Label className="text-muted-foreground">Cancellation Reason</Label>
                            <p className="font-medium">{selectedItem.cancellation_reason}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Error Details */}
              {selectedItem.error_code && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-destructive">Error Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Error Code</Label>
                      <p className="font-mono text-xs bg-destructive/10 p-2 rounded mt-1">
                        {selectedItem.error_code}
                      </p>
                    </div>
                    {selectedItem.error_description && (
                      <div>
                        <Label className="text-muted-foreground">Description</Label>
                        <p className="text-xs bg-destructive/10 p-2 rounded mt-1">
                          {selectedItem.error_description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div>
                <h3 className="font-semibold mb-3 text-sm">Timestamps</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Created At</Label>
                    <p className="font-medium">
                      {format(new Date(selectedItem.created_at), "dd MMM yyyy HH:mm:ss")}
                    </p>
                  </div>
                  {selectedItem.updated_at && (
                    <div>
                      <Label className="text-muted-foreground">Updated At</Label>
                      <p className="font-medium">
                        {format(new Date(selectedItem.updated_at), "dd MMM yyyy HH:mm:ss")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Internal IDs */}
              <div>
                <h3 className="font-semibold mb-3 text-sm">Internal References</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <Label className="text-muted-foreground">
                      {selectedItem.type === "payment" ? "Payment" : "Subscription"} ID
                    </Label>
                    <p className="font-mono text-xs bg-muted p-2 rounded mt-1">{selectedItem.id}</p>
                  </div>
                  {selectedItem.order_id && (
                    <div>
                      <Label className="text-muted-foreground">Order ID</Label>
                      <p className="font-mono text-xs bg-muted p-2 rounded mt-1">{selectedItem.order_id}</p>
                    </div>
                  )}
                  {selectedItem.subscription_id && selectedItem.type === "payment" && (
                    <div>
                      <Label className="text-muted-foreground">Subscription ID</Label>
                      <p className="font-mono text-xs bg-muted p-2 rounded mt-1">{selectedItem.subscription_id}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
