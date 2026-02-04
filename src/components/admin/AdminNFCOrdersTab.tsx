import { useEffect, useState, useRef, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search,
  Package,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  AlertTriangle,
  RefreshCw,
  Edit,
  History
} from "lucide-react";

interface NFCOrder {
  id: string;
  user_id: string;
  order_number: string | null;
  product_type: string;
  card_variant: string | null;
  quantity: number;
  amount: number;
  currency: string | null;
  status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  notes: any;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
}

interface UserOrderSummary {
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  latest: NFCOrder;
  history: NFCOrder[];
  totalAmount: number;
  orderCount: number;
  totalQuantity: number;
}

export function AdminNFCOrdersTab() {
  const [orders, setOrders] = useState<NFCOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // History dialog
  const [selectedUserOrders, setSelectedUserOrders] = useState<UserOrderSummary | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Edit dialog
  const [selectedOrder, setSelectedOrder] = useState<NFCOrder | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("admin-nfc-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => scheduleRefresh()
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  const scheduleRefresh = () => {
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      fetchOrders();
    }, 300);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .in("product_type", ["pvc", "metal"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(ordersData?.map((o) => o.user_id) || [])];
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

      const enrichedOrders =
        ordersData?.map((order) => ({
          ...order,
          user_name: profileMap.get(order.user_id)?.name || "Unknown",
          user_email: profileMap.get(order.user_id)?.email || "",
          user_phone: profileMap.get(order.user_id)?.phone || "",
        })) || [];

      setOrders(enrichedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  // Group orders by user
  const userOrderSummaries = useMemo(() => {
    const grouped = new Map<string, NFCOrder[]>();
    
    orders.forEach((order) => {
      const existing = grouped.get(order.user_id) || [];
      grouped.set(order.user_id, [...existing, order]);
    });

    const summaries: UserOrderSummary[] = [];
    grouped.forEach((userOrders, userId) => {
      const sorted = userOrders.sort((a, b) => 
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
        totalAmount: userOrders.reduce((sum, o) => sum + o.amount, 0),
        orderCount: userOrders.length,
        totalQuantity: userOrders.reduce((sum, o) => sum + o.quantity, 0),
      });
    });

    return summaries.sort((a, b) => 
      new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
    );
  }, [orders]);

  const updateOrderStatus = async () => {
    if (!selectedOrder) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: editStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      toast.success("Order status updated successfully");
      setIsEditOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      paid: { variant: "default", icon: CheckCircle, label: "Paid" },
      processing: { variant: "secondary", icon: Loader2, label: "Processing" },
      shipped: { variant: "default", icon: Truck, label: "Shipped" },
      delivered: { variant: "default", icon: CheckCircle, label: "Delivered" },
      cancelled: { variant: "destructive", icon: XCircle, label: "Cancelled" },
      payment_failed: { variant: "destructive", icon: AlertTriangle, label: "Payment Failed" },
      failed: { variant: "destructive", icon: XCircle, label: "Failed" },
    };

    const config = statusMap[status?.toLowerCase()] || {
      variant: "outline",
      icon: Clock,
      label: status || "Unknown",
    };

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} />
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant={type === "metal" ? "default" : "secondary"}>
        {type === "metal" ? "Metal" : "PVC"}
      </Badge>
    );
  };

  // Filter order summaries
  const filteredOrderSummaries = userOrderSummaries.filter((summary) => {
    const matchesSearch =
      summary.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.user_phone?.includes(searchTerm) ||
      summary.latest.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.latest.razorpay_order_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || summary.latest.status === statusFilter;
    const matchesType = typeFilter === "all" || summary.latest.product_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const showOrderHistory = (summary: UserOrderSummary) => {
    setSelectedUserOrders(summary);
    setIsHistoryOpen(true);
  };

  const showEditStatus = (order: NFCOrder) => {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setIsEditOpen(true);
  };

  if (loading && orders.length === 0) {
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
          <Package className="w-5 h-5" />
          NFC Card Orders ({filteredOrderSummaries.length} users)
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrders()}
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

      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, order number, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pvc">PVC</SelectItem>
            <SelectItem value="metal">Metal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="payment_failed">Payment Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">User</TableHead>
                <TableHead>Latest Order</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrderSummaries.map((summary) => (
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
                      <p className="font-mono text-sm font-medium">
                        {summary.latest.order_number || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(summary.latest.created_at), "dd MMM yyyy HH:mm")}
                      </p>
                      {summary.latest.card_variant && (
                        <Badge variant="outline" className="capitalize text-xs">
                          {summary.latest.card_variant}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getTypeBadge(summary.latest.product_type)}
                      <p className="text-xs text-muted-foreground">
                        Qty: {summary.latest.quantity}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(summary.latest.status)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="secondary" className="gap-1">
                        <History className="w-3 h-3" />
                        {summary.orderCount} order(s)
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {summary.totalQuantity} cards total
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-primary">₹{summary.totalAmount.toFixed(2)}</p>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => showOrderHistory(summary)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View All
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrderSummaries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Order History
            </DialogTitle>
            <DialogDescription>
              {selectedUserOrders && (
                <span>
                  {selectedUserOrders.user_name} ({selectedUserOrders.user_email}) - 
                  {selectedUserOrders.orderCount} orders, {selectedUserOrders.totalQuantity} cards, 
                  Total: ₹{selectedUserOrders.totalAmount.toFixed(2)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {selectedUserOrders && (
              <div className="space-y-4">
                {selectedUserOrders.history.map((order, index) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={index === 0 ? "default" : "outline"}>
                          {index === 0 ? "Latest" : `#${selectedUserOrders.history.length - index}`}
                        </Badge>
                        {getTypeBadge(order.product_type)}
                        {getStatusBadge(order.status)}
                        {order.card_variant && (
                          <Badge variant="outline" className="capitalize">
                            {order.card_variant}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">₹{order.amount.toFixed(2)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => showEditStatus(order)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <Label className="text-muted-foreground text-xs">Order Number</Label>
                        <p className="font-mono font-medium">{order.order_number || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Date & Time</Label>
                        <p className="font-medium">
                          {format(new Date(order.created_at), "dd MMM yyyy HH:mm:ss")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Quantity</Label>
                        <p className="font-semibold">{order.quantity}</p>
                      </div>
                      {order.razorpay_order_id && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Razorpay Order ID</Label>
                          <p className="font-mono text-xs">{order.razorpay_order_id}</p>
                        </div>
                      )}
                      {order.razorpay_payment_id && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Razorpay Payment ID</Label>
                          <p className="font-mono text-xs">{order.razorpay_payment_id}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-muted-foreground text-xs">Updated</Label>
                        <p className="text-xs">
                          {format(new Date(order.updated_at), "dd MMM yyyy HH:mm")}
                        </p>
                      </div>
                      {order.notes && Object.keys(order.notes).length > 0 && (
                        <div className="col-span-full">
                          <Label className="text-muted-foreground text-xs">Notes</Label>
                          <div className="bg-muted p-2 rounded text-xs mt-1">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(order.notes, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                    {index < selectedUserOrders.history.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order {selectedOrder?.order_number || "N/A"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Current Status</Label>
              <div className="mt-2">{selectedOrder && getStatusBadge(selectedOrder.status)}</div>
            </div>

            <div>
              <Label>New Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="payment_failed">Payment Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={updateOrderStatus}
              disabled={updating || editStatus === selectedOrder?.status}
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
