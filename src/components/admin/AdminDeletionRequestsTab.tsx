import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Search, Check, X, Trash2, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface DeletionRequest {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  reference_number: string;
  reason: string | null;
  status: string;
  requested_at: string;
  scheduled_deletion_at: string;
  completed_at: string | null;
}

export function AdminDeletionRequestsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-deletion-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deletion_requests")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return data as DeletionRequest[];
    },
  });

  const filteredRequests = requests?.filter((req) => {
    const searchLower = search.toLowerCase();
    return (
      req.user_name?.toLowerCase().includes(searchLower) ||
      req.user_email?.toLowerCase().includes(searchLower) ||
      req.reference_number.toLowerCase().includes(searchLower)
    );
  });

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      // Call edge function to delete user
      const { error: fnError } = await supabase.functions.invoke("process-deletions", {
        body: { 
          action: "delete_single",
          user_id: selectedRequest.user_id,
          request_id: selectedRequest.id
        },
      });

      if (fnError) throw fnError;

      toast.success("Account deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-deletion-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      console.error("Error approving deletion:", error);
      toast.error(error.message || "Failed to delete account");
    } finally {
      setIsProcessing(false);
      setSelectedRequest(null);
      setActionType(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("deletion_requests")
        .update({ 
          status: "rejected",
          completed_at: new Date().toISOString()
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success("Deletion request rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-deletion-requests"] });
    } catch (error: any) {
      console.error("Error rejecting deletion:", error);
      toast.error(error.message || "Failed to reject request");
    } finally {
      setIsProcessing(false);
      setSelectedRequest(null);
      setActionType(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = requests?.filter(r => r.status === "pending").length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{requests?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className={pendingCount > 0 ? "border-yellow-500/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(requests?.length || 0) - pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No deletion requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.user_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {request.user_email || "—"}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {request.reference_number}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(request.requested_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {request.reason || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600/30 hover:bg-green-500/10"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType("approve");
                              }}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600/30 hover:bg-red-500/10"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType("reject");
                              }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {request.status !== "pending" && (
                          <span className="text-xs text-muted-foreground">
                            {request.completed_at 
                              ? format(new Date(request.completed_at), "dd MMM yyyy")
                              : "—"
                            }
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={actionType === "approve"} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Confirm Account Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to permanently delete the account for:
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">{selectedRequest?.user_name || "Unknown"}</p>
                <p className="text-sm">{selectedRequest?.user_email}</p>
                <p className="text-xs text-muted-foreground">Ref: {selectedRequest?.reference_number}</p>
              </div>
              <div className="flex items-start gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm">This action cannot be undone. All user data will be permanently deleted.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={actionType === "reject"} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Deletion Request</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to reject the deletion request for:
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">{selectedRequest?.user_name || "Unknown"}</p>
                <p className="text-sm">{selectedRequest?.user_email}</p>
                <p className="text-xs text-muted-foreground">Ref: {selectedRequest?.reference_number}</p>
              </div>
              <p className="text-sm">
                The user's account will remain active and they will be notified that their request was not processed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Reject Request"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
