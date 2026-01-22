import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Search, CreditCard, CheckCircle, XCircle, Clock } from "lucide-react";

interface Payment {
  id: string;
  user_id: string;
  order_id: string | null;
  subscription_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  error_code: string | null;
  error_description: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export default function AdminPaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchPayments();
    
    // Real-time subscription
    const channel = supabase
      .channel("admin-payments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => fetchPayments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, { name: p.full_name, email: p.email }])
      );

      const enrichedPayments = paymentsData?.map((payment) => ({
        ...payment,
        user_name: profileMap.get(payment.user_id)?.name || "Unknown",
        user_email: profileMap.get(payment.user_id)?.email || "",
      })) || [];

      setPayments(enrichedPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "captured":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Captured
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "created":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Created
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.razorpay_payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.razorpay_order_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payments ({filteredPayments.length})
        </h2>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="captured">Captured</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="created">Created</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Payment ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{payment.user_name}</p>
                    <p className="text-xs text-muted-foreground">{payment.user_email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-mono text-xs">{payment.razorpay_payment_id || "-"}</p>
                    <p className="text-xs text-muted-foreground">{payment.razorpay_order_id}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">₹{payment.amount}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {payment.method || "N/A"}
                  </Badge>
                </TableCell>
                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                <TableCell>
                  <span className="text-sm">
                    {format(new Date(payment.created_at), "dd MMM yyyy")}
                  </span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(payment.created_at), "HH:mm")}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No payments found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}