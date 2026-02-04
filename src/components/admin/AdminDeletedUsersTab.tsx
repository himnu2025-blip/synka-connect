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
  UserX,
  Eye,
  Loader2,
  RefreshCw,
  Mail,
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface DeletedUser {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  created_at: string | null;
  deleted_at: string;
  // Additional context
  total_cards?: number;
  total_contacts?: number;
  total_orders?: number;
  total_subscriptions?: number;
}

export function AdminDeletedUsersTab() {
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Details dialog
  const [selectedUser, setSelectedUser] = useState<DeletedUser | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    fetchDeletedUsers();

    // Real-time subscription
    const channel = supabase
      .channel("admin-deleted-users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deleted_users" },
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
      fetchDeletedUsers();
    }, 300);
  };

  const fetchDeletedUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deleted_users")
        .select("*")
        .order("deleted_at", { ascending: false });

      if (error) throw error;

      // Enrich with additional context
      const enrichedUsers = await Promise.all(
        (data || []).map(async (user) => {
          // Get counts of related data
          const [cardsRes, contactsRes, ordersRes, subscriptionsRes] =
            await Promise.all([
              supabase
                .from("cards")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.user_id),
              supabase
                .from("contacts")
                .select("id", { count: "exact", head: true })
                .eq("owner_id", user.user_id),
              supabase
                .from("orders")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.user_id),
              supabase
                .from("subscriptions")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.user_id),
            ]);

          return {
            ...user,
            total_cards: cardsRes.count || 0,
            total_contacts: contactsRes.count || 0,
            total_orders: ordersRes.count || 0,
            total_subscriptions: subscriptionsRes.count || 0,
          };
        })
      );

      setDeletedUsers(enrichedUsers);
    } catch (error) {
      console.error("Error fetching deleted users:", error);
      toast.error("Failed to fetch deleted users");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true);
    try {
      // Fetch all related data
      const [cards, contacts, orders, subscriptions, payments] =
        await Promise.all([
          supabase
            .from("cards")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
          supabase
            .from("contacts")
            .select("*")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("orders")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
          supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
          supabase
            .from("payments")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

      setUserDetails({
        cards: cards.data || [],
        contacts: contacts.data || [],
        orders: orders.data || [],
        subscriptions: subscriptions.data || [],
        payments: payments.data || [],
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to fetch user details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const showDetails = async (user: DeletedUser) => {
    setSelectedUser(user);
    setUserDetails(null);
    setIsDetailsOpen(true);
    await fetchUserDetails(user.user_id);
  };

  const filteredUsers = deletedUsers.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_id?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const getAccountAge = (createdAt: string | null, deletedAt: string) => {
    if (!createdAt) return "Unknown";
    const days = Math.floor(
      (new Date(deletedAt).getTime() - new Date(createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return `${days} days`;
  };

  if (loading && deletedUsers.length === 0) {
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
          <UserX className="w-5 h-5" />
          Deleted Users ({filteredUsers.length})
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchDeletedUsers()}
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or user ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">User</TableHead>
                <TableHead>Account Age</TableHead>
                <TableHead>Data Summary</TableHead>
                <TableHead>Signup Date</TableHead>
                <TableHead>Deleted Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {user.name || "Unknown"}
                      </p>
                      {user.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">
                        {getAccountAge(user.created_at, user.deleted_at)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <p>
                        <span className="font-medium">{user.total_cards}</span>{" "}
                        cards
                      </p>
                      <p>
                        <span className="font-medium">{user.total_contacts}</span>{" "}
                        contacts
                      </p>
                      <p>
                        <span className="font-medium">{user.total_orders}</span>{" "}
                        orders
                      </p>
                      <p>
                        <span className="font-medium">
                          {user.total_subscriptions}
                        </span>{" "}
                        subscriptions
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {user.created_at 
                          ? format(new Date(user.created_at), "dd MMM yyyy")
                          : "N/A"
                        }
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{format(new Date(user.deleted_at), "dd MMM yyyy")}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(user.deleted_at), "HH:mm:ss")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => showDetails(user)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No deleted users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deleted User Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedUser?.name || "Unknown User"}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Account Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedUser.name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedUser.email || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="font-medium">
                      {selectedUser.created_at 
                        ? format(new Date(selectedUser.created_at), "dd MMM yyyy HH:mm")
                        : "N/A"
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Deleted</Label>
                    <p className="font-medium text-destructive">
                      {format(new Date(selectedUser.deleted_at), "dd MMM yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">User ID</Label>
                    <p className="font-mono text-xs bg-muted p-2 rounded mt-1">
                      {selectedUser.user_id}
                    </p>
                  </div>
                </div>
              </div>

              {/* User Data Summary */}
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : userDetails ? (
                <>
                  {/* Cards */}
                  {userDetails.cards.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-sm">
                        Cards ({userDetails.cards.length})
                      </h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {userDetails.cards.map((card: any) => (
                          <div
                            key={card.id}
                            className="text-xs bg-muted p-2 rounded"
                          >
                            <p className="font-medium">{card.full_name || card.name || "Unnamed"}</p>
                            <p className="text-muted-foreground">
                              {card.designation || "No designation"} at{" "}
                              {card.company || "No company"}
                            </p>
                            <p className="text-muted-foreground">
                              Created: {format(new Date(card.created_at), "dd MMM yyyy")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Orders */}
                  {userDetails.orders.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-sm">
                        Orders ({userDetails.orders.length})
                      </h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {userDetails.orders.map((order: any) => (
                          <div
                            key={order.id}
                            className="text-xs bg-muted p-2 rounded"
                          >
                            <p className="font-medium font-mono">
                              {order.order_number || order.id.slice(0, 8)}
                            </p>
                            <p className="text-muted-foreground">
                              {order.product_type} - ₹{order.amount} - {order.status}
                            </p>
                            <p className="text-muted-foreground">
                              {format(new Date(order.created_at), "dd MMM yyyy")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subscriptions */}
                  {userDetails.subscriptions.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-sm">
                        Subscriptions ({userDetails.subscriptions.length})
                      </h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {userDetails.subscriptions.map((sub: any) => (
                          <div
                            key={sub.id}
                            className="text-xs bg-muted p-2 rounded"
                          >
                            <p className="font-medium capitalize">
                              {sub.plan_type} Plan - {sub.status}
                            </p>
                            <p className="text-muted-foreground">
                              ₹{sub.amount} - {sub.payment_status || "N/A"}
                            </p>
                            <p className="text-muted-foreground">
                              {format(new Date(sub.start_date), "dd MMM yyyy")} to{" "}
                              {format(new Date(sub.end_date), "dd MMM yyyy")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payments */}
                  {userDetails.payments.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-sm">
                        Recent Payments ({userDetails.payments.length})
                      </h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {userDetails.payments.map((payment: any) => (
                          <div
                            key={payment.id}
                            className="text-xs bg-muted p-2 rounded"
                          >
                            <p className="font-medium">
                              ₹{payment.amount} - {payment.status}
                            </p>
                            <p className="text-muted-foreground font-mono">
                              {payment.razorpay_payment_id || "N/A"}
                            </p>
                            <p className="text-muted-foreground">
                              {format(new Date(payment.created_at), "dd MMM yyyy")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contacts Summary */}
                  <div>
                    <h3 className="font-semibold mb-3 text-sm">
                      Contacts Summary
                    </h3>
                    <div className="text-sm">
                      <p className="text-muted-foreground">
                        Total contacts: <span className="font-medium">{selectedUser.total_contacts}</span>
                      </p>
                    </div>
                  </div>

                  {/* No data message */}
                  {userDetails.cards.length === 0 && 
                   userDetails.orders.length === 0 && 
                   userDetails.subscriptions.length === 0 && 
                   userDetails.payments.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No associated data found for this user.</p>
                    </div>
                  )}
                </>
              ) : null}
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
