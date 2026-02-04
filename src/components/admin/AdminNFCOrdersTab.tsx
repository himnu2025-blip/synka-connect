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
import { Label } from "@/components/ui/label";
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

export function AdminNFCOrdersTab() {
  const [orders, setOrders] = useState<NFCOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Details/Edit dialog
  const [selectedOrder, setSelectedOrder] = useState<NFCOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    fetchOrders();

    // Real-time subscription
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

      // Enrich with user data
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
    const statusMap: Record<
      string,
      { variant: any; icon: any; label: string }
    > = {
      pending: {
        variant: "secondary",
        icon: Clock,
        label: "Pending",
      },
      paid: {
        variant: "default",
        icon: CheckCircle,
        label: "Paid",
      },
      processing: {
        variant: "secondary",
        icon: Loader2,
        label: "Processing",
      },
      shipped: {
        variant: "default",
        icon: Truck,
        label: "Shipped",
      },
      delivered: {
        variant: "default",
        icon: CheckCircle,
        label: "Delivered",
      },
      cancelled: {
        variant: "destructive",
        icon: XCircle,
        label: "Cancelled",
      },
      payment_failed: {
        variant: "destructive",
        icon: AlertTriangle,
        label: "Payment Failed",
      },
      failed: {
        variant: "destructive",
        icon: XCircle,
        label: "Failed",
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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_phone?.includes(searchTerm) ||
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.razorpay_order_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    const matchesType =
      typeFilter === "all" || order.product_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const showDetails = (order: NFCOrder) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
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
          NFC Card Orders ({filteredOrders.length})
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
                <TableHead className="min-w-[120px]">Order #</TableHead>
                <TableHead className="min-w-[150px]">User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-mono text-sm font-medium">
                        {order.order_number || "-"}
                      </p>
                      {order.razorpay_order_id && (
                        <p className="font-mono text-xs text-muted-foreground">
                          {order.razorpay_order_id.slice(0, 20)}...
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{order.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.user_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(order.product_type)}</TableCell>
                  <TableCell>
                    {order.card_variant ? (
                      <Badge variant="outline" className="capitalize">
                        {order.card_variant}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{order.quantity}</span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-semibold">₹{order.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground uppercase">
                        {order.currency || "INR"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm">
                        {format(new Date(order.created_at), "dd MMM yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "HH:mm")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => showDetails(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => showEditStatus(order)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No orders found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Complete order information for {selectedOrder?.order_number || "N/A"}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div>
                <h3 className="font-semibold mb-3 text-sm">Order Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Order Number</Label>
                    <p className="font-mono font-medium">
                      {selectedOrder.order_number || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Product Type</Label>
                    <div className="mt-1">{getTypeBadge(selectedOrder.product_type)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Variant</Label>
                    <p className="font-medium capitalize">
                      {selectedOrder.card_variant || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Quantity</Label>
                    <p className="font-semibold text-lg">{selectedOrder.quantity}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-semibold text-lg">
                      ₹{selectedOrder.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div>
                <h3 className="font-semibold mb-3 text-sm">Customer Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedOrder.user_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedOrder.user_email}</p>
                  </div>
                  {selectedOrder.user_phone && (
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedOrder.user_phone}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">User ID</Label>
                    <p className="font-mono text-xs">{selectedOrder.user_id}</p>
                  </div>
                </div>
              </div>

              {/* Razorpay Details */}
              {selectedOrder.razorpay_order_id && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm">
                    Payment Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Razorpay Order ID</Label>
                      <p className="font-mono text-xs bg-muted p-2 rounded mt-1">
                        {selectedOrder.razorpay_order_id}
                      </p>
                    </div>
                    {selectedOrder.razorpay_payment_id && (
                      <div>
                        <Label className="text-muted-foreground">
                          Razorpay Payment ID
                        </Label>
                        <p className="font-mono text-xs bg-muted p-2 rounded mt-1">
                          {selectedOrder.razorpay_payment_id}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && Object.keys(selectedOrder.notes).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm">Notes</h3>
                  <div className="bg-muted p-3 rounded text-sm">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedOrder.notes, null, 2)}
                    </pre>
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
                      {format(
                        new Date(selectedOrder.created_at),
                        "dd MMM yyyy HH:mm:ss"
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Updated At</Label>
                    <p className="font-medium">
                      {format(
                        new Date(selectedOrder.updated_at),
                        "dd MMM yyyy HH:mm:ss"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Internal ID */}
              <div>
                <h3 className="font-semibold mb-3 text-sm">Internal Reference</h3>
                <div>
                  <Label className="text-muted-foreground">Order ID</Label>
                  <p className="font-mono text-xs bg-muted p-2 rounded mt-1">
                    {selectedOrder.id}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailsOpen(false)}
            >
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
