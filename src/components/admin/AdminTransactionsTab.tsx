import { useEffect, useState, useRef, useMemo } from "react";
import { useAdminPayments, useAdminSubscriptions, useAdminStatus } from "@/hooks/useAdminData";
import { useCallback } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  RefreshCw,
  History
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

interface UserPaymentSummary {
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  latest: Payment;
  history: Payment[];
  totalAmount: number;
  paymentCount: number;
}

interface UserSubscriptionSummary {
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  latest: Subscription;
  history: Subscription[];
  totalAmount: number;
  subscriptionCount: number;
}

export function AdminTransactionsTab() {
  const { isAdmin } = useAdminStatus();
  const { data: paymentsData = [], isLoading: paymentsLoading, isFetching: paymentsFetching, refetch: refetchPayments } = useAdminPayments();
  const { data: subscriptionsData = [], isLoading: subsLoading, isFetching: subsFetching, refetch: refetchSubs } = useAdminSubscriptions();
  
  const [activeTab, setActiveTab] = useState("payments");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  
  // History dialog
  const [selectedUserPayments, setSelectedUserPayments] = useState<UserPaymentSummary | null>(null);
  const [selectedUserSubscriptions, setSelectedUserSubscriptions] = useState<UserSubscriptionSummary | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const refreshTimerRef = useRef<number | null>(null);
  
  // Use data from React Query
  const payments = paymentsData as Payment[];
  const subscriptions = subscriptionsData as Subscription[];
  const loading = paymentsLoading || subsLoading;
  const isFetching = paymentsFetching || subsFetching;

  const fetchData = useCallback(() => {
    refetchPayments();
    refetchSubs();
  }, [refetchPayments, refetchSubs]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      fetchData();
    }, 300);
  }, [fetchData]);

  useEffect(() => {
    if (!isAdmin) return;

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
  }, [isAdmin, scheduleRefresh]);

  // Group payments by user
  const userPaymentSummaries = useMemo(() => {
    const grouped = new Map<string, Payment[]>();
    
    payments.forEach((payment) => {
      const existing = grouped.get(payment.user_id) || [];
      grouped.set(payment.user_id, [...existing, payment]);
    });

    const summaries: UserPaymentSummary[] = [];
    grouped.forEach((userPayments, userId) => {
      const sorted = userPayments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latest = sorted[0];
      summaries.push({
        user_id: userId,
        user_name: latest.user_name || "Unknown",
        user_email: latest.user_email || "",
        user_phone: latest.user_phone || "",
        latest,
        history: sorted,
        totalAmount: userPayments.reduce((sum, p) => sum + (p.status === "captured" ? p.amount : 0), 0),
        paymentCount: userPayments.length,
      });
    });

    return summaries.sort((a, b) => 
      new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
    );
  }, [payments]);

  // Group subscriptions by user
  const userSubscriptionSummaries = useMemo(() => {
    const grouped = new Map<string, Subscription[]>();
    
    subscriptions.forEach((sub) => {
      const existing = grouped.get(sub.user_id) || [];
      grouped.set(sub.user_id, [...existing, sub]);
    });

    const summaries: UserSubscriptionSummary[] = [];
    grouped.forEach((userSubs, userId) => {
      const sorted = userSubs.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latest = sorted[0];
      summaries.push({
        user_id: userId,
        user_name: latest.user_name || "Unknown",
        user_email: latest.user_email || "",
        user_phone: latest.user_phone || "",
        latest,
        history: sorted,
        totalAmount: userSubs.reduce((sum, s) => sum + s.amount, 0),
        subscriptionCount: userSubs.length,
      });
    });

    return summaries.sort((a, b) => 
      new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
    );
  }, [subscriptions]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; icon: any; label: string }> = {
      captured: { variant: "default", icon: CheckCircle, label: "Captured" },
      failed: { variant: "destructive", icon: XCircle, label: "Failed" },
      created: { variant: "secondary", icon: Clock, label: "Created" },
      active: { variant: "default", icon: CheckCircle, label: "Active" },
      cancelled: { variant: "secondary", icon: XCircle, label: "Cancelled" },
      expired: { variant: "outline", icon: XCircle, label: "Expired" },
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      halted: { variant: "destructive", icon: AlertTriangle, label: "Halted" },
      completed: { variant: "outline", icon: CheckCircle, label: "Completed" },
      admin: { variant: "secondary", icon: CheckCircle, label: "Admin" },
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

  // Filter payment summaries
  const filteredPaymentSummaries = userPaymentSummaries.filter((summary) => {
    const matchesSearch =
      summary.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.user_phone?.includes(searchTerm) ||
      summary.latest.razorpay_payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.latest.razorpay_order_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || summary.latest.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter subscription summaries
  const filteredSubscriptionSummaries = userSubscriptionSummaries.filter((summary) => {
    const matchesSearch =
      summary.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.user_phone?.includes(searchTerm) ||
      summary.latest.razorpay_subscription_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || summary.latest.status === statusFilter;
    const matchesPlan = planFilter === "all" || summary.latest.plan_type === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const showPaymentHistory = (summary: UserPaymentSummary) => {
    setSelectedUserPayments(summary);
    setSelectedUserSubscriptions(null);
    setIsHistoryOpen(true);
  };

  const showSubscriptionHistory = (summary: UserSubscriptionSummary) => {
    setSelectedUserSubscriptions(summary);
    setSelectedUserPayments(null);
    setIsHistoryOpen(true);
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
          disabled={isFetching}
        >
          {isFetching ? (
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
            Payments ({filteredPaymentSummaries.length} users)
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            Subscriptions ({filteredSubscriptionSummaries.length} users)
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
                    <TableHead>Latest Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Paid</TableHead>
                    <TableHead>History</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPaymentSummaries.map((summary) => (
                    <TableRow key={summary.user_id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{summary.user_name}</p>
                          <p className="text-xs text-muted-foreground">{summary.user_email}</p>
                          {summary.user_phone && (
                            <p className="text-xs text-muted-foreground">{summary.user_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">{format(new Date(summary.latest.created_at), "dd MMM yyyy")}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(summary.latest.created_at), "HH:mm:ss")}
                          </p>
                          {summary.latest.razorpay_payment_id && (
                            <p className="font-mono text-xs text-muted-foreground">
                              {summary.latest.razorpay_payment_id.slice(0, 15)}...
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">₹{summary.latest.amount.toFixed(2)}</p>
                          <Badge variant="outline" className="capitalize text-xs">
                            {summary.latest.method || "N/A"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(summary.latest.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold text-primary">₹{summary.totalAmount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{summary.paymentCount} payment(s)</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <History className="w-3 h-3" />
                          {summary.paymentCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => showPaymentHistory(summary)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View All
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPaymentSummaries.length === 0 && (
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
                    <TableHead>Current Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Auto-Renew</TableHead>
                    <TableHead>History</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptionSummaries.map((summary) => (
                    <TableRow key={summary.user_id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{summary.user_name}</p>
                          <p className="text-xs text-muted-foreground">{summary.user_email}</p>
                          {summary.user_phone && (
                            <p className="text-xs text-muted-foreground">{summary.user_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getPlanBadge(summary.latest.plan_type)}
                          <p className="font-semibold">₹{summary.latest.amount.toFixed(2)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(summary.latest.status)}
                          {getStatusBadge(summary.latest.payment_status || "pending")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            <span className="text-muted-foreground">Start:</span> {format(new Date(summary.latest.start_date), "dd MMM yyyy")}
                          </div>
                          <div>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            <span className="text-muted-foreground">End:</span> {format(new Date(summary.latest.end_date), "dd MMM yyyy")}
                          </div>
                          {summary.latest.cancelled_at && (
                            <div className="text-destructive">
                              <XCircle className="w-3 h-3 inline mr-1" />
                              Cancelled: {format(new Date(summary.latest.cancelled_at), "dd MMM")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {summary.latest.auto_renew ? (
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
                          {summary.latest.mandate_created && (
                            <p className="text-xs text-muted-foreground">E-mandate</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <History className="w-3 h-3" />
                          {summary.subscriptionCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => showSubscriptionHistory(summary)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View All
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSubscriptionSummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[85dvh] sm:max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              {selectedUserPayments ? "Payment History" : "Subscription History"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedUserPayments && (
                <span className="break-words">
                  {selectedUserPayments.user_name} ({selectedUserPayments.user_email}) - 
                  {selectedUserPayments.paymentCount} payments, Total: ₹{selectedUserPayments.totalAmount.toFixed(2)}
                </span>
              )}
              {selectedUserSubscriptions && (
                <span className="break-words">
                  {selectedUserSubscriptions.user_name} ({selectedUserSubscriptions.user_email}) - 
                  {selectedUserSubscriptions.subscriptionCount} subscriptions
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 sm:-mx-6 sm:px-6">
            {/* Payment History */}
            {selectedUserPayments && (
              <div className="space-y-4 sm:space-y-6 pb-4">
                {/* Latest Successful Payment at Top */}
                {(() => {
                  const successfulPayment = selectedUserPayments.history.find(
                    (p) => p.status === "captured"
                  );
                  const latestPayment = selectedUserPayments.latest;
                  const highlightPayment = successfulPayment || latestPayment;
                  
                  return highlightPayment && (
                    <div className="border-2 border-primary rounded-lg p-3 sm:p-4 bg-primary/5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <Badge variant="default" className="bg-primary text-xs">
                            {successfulPayment ? "✓ Latest Successful" : "Latest"}
                          </Badge>
                          {getStatusBadge(highlightPayment.status)}
                          <Badge variant="outline" className="capitalize text-xs">
                            {highlightPayment.method || "N/A"}
                          </Badge>
                        </div>
                        <p className="font-bold text-lg sm:text-xl text-primary">₹{highlightPayment.amount.toFixed(2)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div>
                          <Label className="text-muted-foreground text-xs">Date & Time</Label>
                          <p className="font-medium text-xs sm:text-sm">
                            {format(new Date(highlightPayment.created_at), "dd MMM yyyy HH:mm")}
                          </p>
                        </div>
                        {highlightPayment.razorpay_payment_id && (
                          <div className="col-span-2 sm:col-span-1">
                            <Label className="text-muted-foreground text-xs">Payment ID</Label>
                            <p className="font-mono text-xs break-all">{highlightPayment.razorpay_payment_id}</p>
                          </div>
                        )}
                        {highlightPayment.razorpay_order_id && (
                          <div className="col-span-2 sm:col-span-1">
                            <Label className="text-muted-foreground text-xs">Order ID</Label>
                            <p className="font-mono text-xs break-all">{highlightPayment.razorpay_order_id}</p>
                          </div>
                        )}
                        {highlightPayment.error_code && (
                          <div className="col-span-2">
                            <Label className="text-destructive text-xs">Error</Label>
                            <p className="text-xs bg-destructive/10 p-2 rounded break-words">
                              {highlightPayment.error_code}: {highlightPayment.error_description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* All Transactions History */}
                {selectedUserPayments.history.length > 1 && (
                  <>
                    <div className="flex items-center gap-2">
                      <Separator className="flex-1" />
                      <span className="text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap">
                        All Transactions ({selectedUserPayments.history.length})
                      </span>
                      <Separator className="flex-1" />
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                      {selectedUserPayments.history.map((payment, index) => (
                        <div key={payment.id} className="border rounded-lg p-2.5 sm:p-3 bg-muted/30">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                #{selectedUserPayments.history.length - index}
                              </Badge>
                              {getStatusBadge(payment.status)}
                              <Badge variant="outline" className="capitalize text-xs">
                                {payment.method || "N/A"}
                              </Badge>
                            </div>
                            <p className="font-semibold text-sm">₹{payment.amount.toFixed(2)}</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Date:</span>{" "}
                              <span className="font-medium">
                                {format(new Date(payment.created_at), "dd MMM yyyy HH:mm")}
                              </span>
                            </div>
                            {payment.razorpay_payment_id && (
                              <div>
                                <span className="text-muted-foreground">Pay ID:</span>{" "}
                                <span className="font-mono text-xs break-all">{payment.razorpay_payment_id}</span>
                              </div>
                            )}
                            {payment.razorpay_order_id && (
                              <div>
                                <span className="text-muted-foreground">Order:</span>{" "}
                                <span className="font-mono text-xs break-all">{payment.razorpay_order_id}</span>
                              </div>
                            )}
                            {payment.error_code && (
                              <div className="col-span-full text-destructive break-words">
                                <span className="font-medium">Error:</span> {payment.error_code} - {payment.error_description}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Subscription History */}
            {selectedUserSubscriptions && (
              <div className="space-y-4 sm:space-y-6 pb-4">
                {/* Latest Active/Successful Subscription at Top */}
                {(() => {
                  const activeSubscription = selectedUserSubscriptions.history.find(
                    (s) => s.status === "active" && s.payment_status === "captured"
                  );
                  const latestSubscription = selectedUserSubscriptions.latest;
                  const highlightSub = activeSubscription || latestSubscription;
                  
                  return highlightSub && (
                    <div className="border-2 border-primary rounded-lg p-3 sm:p-4 bg-primary/5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <Badge variant="default" className="bg-primary text-xs">
                            {activeSubscription ? "✓ Active Subscription" : "Current"}
                          </Badge>
                          {getPlanBadge(highlightSub.plan_type)}
                          {getStatusBadge(highlightSub.status)}
                        </div>
                        <p className="font-bold text-lg sm:text-xl text-primary">₹{highlightSub.amount.toFixed(2)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div>
                          <Label className="text-muted-foreground text-xs">Start Date</Label>
                          <p className="font-medium text-xs sm:text-sm">
                            {format(new Date(highlightSub.start_date), "dd MMM yyyy")}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">End Date</Label>
                          <p className="font-medium text-xs sm:text-sm">
                            {format(new Date(highlightSub.end_date), "dd MMM yyyy")}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Payment Status</Label>
                          {getStatusBadge(highlightSub.payment_status || "pending")}
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Auto-Renew</Label>
                          <p className="font-medium">{highlightSub.auto_renew ? "Yes" : "No"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">E-Mandate</Label>
                          <p className="font-medium">{highlightSub.mandate_created ? "Active" : "Not Set"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Created</Label>
                          <p className="font-medium text-xs">
                            {format(new Date(highlightSub.created_at), "dd MMM yyyy HH:mm")}
                          </p>
                        </div>
                        {highlightSub.razorpay_subscription_id && (
                          <div className="col-span-2">
                            <Label className="text-muted-foreground text-xs">Razorpay Sub ID</Label>
                            <p className="font-mono text-xs bg-muted p-2 rounded break-all">
                              {highlightSub.razorpay_subscription_id}
                            </p>
                          </div>
                        )}
                        {highlightSub.cancelled_at && (
                          <div className="col-span-2">
                            <Label className="text-destructive text-xs">Cancelled</Label>
                            <p className="text-xs bg-destructive/10 p-2 rounded break-words">
                              {format(new Date(highlightSub.cancelled_at), "dd MMM yyyy HH:mm")}
                              {highlightSub.cancellation_reason && ` - ${highlightSub.cancellation_reason}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* All Subscriptions History */}
                {selectedUserSubscriptions.history.length > 1 && (
                  <>
                    <div className="flex items-center gap-2">
                      <Separator className="flex-1" />
                      <span className="text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap">
                        All Subscriptions ({selectedUserSubscriptions.history.length})
                      </span>
                      <Separator className="flex-1" />
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                      {selectedUserSubscriptions.history.map((sub, index) => (
                        <div key={sub.id} className="border rounded-lg p-2.5 sm:p-3 bg-muted/30">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                #{selectedUserSubscriptions.history.length - index}
                              </Badge>
                              {getPlanBadge(sub.plan_type)}
                              {getStatusBadge(sub.status)}
                            </div>
                            <p className="font-semibold text-sm">₹{sub.amount.toFixed(2)}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Start:</span>{" "}
                              <span className="font-medium">
                                {format(new Date(sub.start_date), "dd MMM yyyy")}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">End:</span>{" "}
                              <span className="font-medium">
                                {format(new Date(sub.end_date), "dd MMM yyyy")}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status:</span>{" "}
                              {getStatusBadge(sub.payment_status || "pending")}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Created:</span>{" "}
                              <span className="font-medium">
                                {format(new Date(sub.created_at), "dd MMM yyyy HH:mm")}
                              </span>
                            </div>
                            {sub.cancelled_at && (
                              <div className="col-span-2 text-destructive break-words">
                                <span className="font-medium">Cancelled:</span> {format(new Date(sub.cancelled_at), "dd MMM yyyy")}
                                {sub.cancellation_reason && ` - ${sub.cancellation_reason}`}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
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
    </div>
  );
}
