import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb, 
  Check, 
  X, 
  Pencil, 
  Loader2, 
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Clock,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface LearningSignal {
  id: string;
  query_text: string;
  response_text: string | null;
  signal_type: string;
  frequency_count: number | null;
  similarity_score: number | null;
  status: string;
  suggested_answer: string | null;
  admin_notes: string | null;
  created_at: string;
  approved_at: string | null;
  session_id: string | null;
  matched_knowledge_id: string | null;
}

export function AdminControlledLearningTab() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedSignal, setSelectedSignal] = useState<LearningSignal | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [suggestedAnswer, setSuggestedAnswer] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState<'new' | 'reviewed' | 'approved' | 'rejected'>('new');

  // Fetch learning signals
  const { data: signals, isLoading } = useQuery({
    queryKey: ['learning-signals', statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_learning_signals')
        .select('*')
        .eq('status', statusFilter)
        .order('frequency_count', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LearningSignal[];
    }
  });

  // Get stats for each status
  const { data: stats } = useQuery({
    queryKey: ['learning-signals-stats'],
    queryFn: async () => {
      const [newResult, reviewedResult, approvedResult, rejectedResult] = await Promise.all([
        supabase.from('chat_learning_signals').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('chat_learning_signals').select('id', { count: 'exact', head: true }).eq('status', 'reviewed'),
        supabase.from('chat_learning_signals').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('chat_learning_signals').select('id', { count: 'exact', head: true }).eq('status', 'rejected')
      ]);
      return {
        new: newResult.count || 0,
        reviewed: reviewedResult.count || 0,
        approved: approvedResult.count || 0,
        rejected: rejectedResult.count || 0
      };
    }
  });

  // Update signal status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (notes) updateData.admin_notes = notes;
      
      const { error } = await supabase
        .from('chat_learning_signals')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-signals'] });
      queryClient.invalidateQueries({ queryKey: ['learning-signals-stats'] });
    }
  });

  // Approve and create knowledge entry mutation
  const approveMutation = useMutation({
    mutationFn: async ({ 
      signal, 
      title, 
      content, 
      category 
    }: { 
      signal: LearningSignal; 
      title: string; 
      content: string; 
      category: string;
    }) => {
      // Create knowledge base entry
      const { data: knowledgeEntry, error: kbError } = await supabase
        .from('knowledge_base')
        .insert({
          title,
          content,
          category: category || null,
          is_active: true
        })
        .select()
        .single();
      
      if (kbError) throw kbError;

      // Update signal as approved with link to created entry
      const { error: signalError } = await supabase
        .from('chat_learning_signals')
        .update({
          status: 'approved',
          suggested_answer: content,
          admin_notes: adminNotes || null,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          created_knowledge_id: knowledgeEntry.id
        })
        .eq('id', signal.id);
      
      if (signalError) throw signalError;

      // Trigger embedding generation for the new entry
      await supabase.functions.invoke('generate-embeddings', {
        body: { record_id: knowledgeEntry.id }
      });

      return knowledgeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-signals'] });
      queryClient.invalidateQueries({ queryKey: ['learning-signals-stats'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success('Learning signal approved and added to knowledge base');
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    }
  });

  // Reject signal mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from('chat_learning_signals')
        .update({
          status: 'rejected',
          admin_notes: notes || null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-signals'] });
      queryClient.invalidateQueries({ queryKey: ['learning-signals-stats'] });
      toast.success('Learning signal rejected');
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    }
  });

  const openReviewDialog = (signal: LearningSignal) => {
    setSelectedSignal(signal);
    setSuggestedAnswer(signal.suggested_answer || signal.response_text || '');
    setAdminNotes(signal.admin_notes || '');
    setNewTitle(signal.query_text.slice(0, 100));
    setNewCategory('faq');
    setEditMode(false);
  };

  const closeDialog = () => {
    setSelectedSignal(null);
    setSuggestedAnswer('');
    setAdminNotes('');
    setNewTitle('');
    setNewCategory('');
    setEditMode(false);
  };

  const handleApprove = () => {
    if (!selectedSignal || !newTitle.trim() || !suggestedAnswer.trim()) {
      toast.error('Title and answer are required');
      return;
    }
    approveMutation.mutate({
      signal: selectedSignal,
      title: newTitle.trim(),
      content: suggestedAnswer.trim(),
      category: newCategory.trim()
    });
  };

  const handleReject = () => {
    if (!selectedSignal) return;
    rejectMutation.mutate({ id: selectedSignal.id, notes: adminNotes });
  };

  const handleMarkReviewed = () => {
    if (!selectedSignal) return;
    updateStatusMutation.mutate({ 
      id: selectedSignal.id, 
      status: 'reviewed',
      notes: adminNotes 
    });
    closeDialog();
    toast.success('Marked as reviewed');
  };

  const getSignalTypeBadge = (type: string) => {
    switch (type) {
      case 'no_match':
        return <Badge variant="destructive">No Match</Badge>;
      case 'low_confidence':
        return <Badge variant="secondary">Low Confidence</Badge>;
      case 'repeated_query':
        return <Badge variant="outline">Repeated</Badge>;
      case 'user_feedback':
        return <Badge variant="default">Feedback</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Safety Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Controlled Learning (Admin Approved)
          </CardTitle>
          <CardDescription>
            Review user questions and optionally approve them as new knowledge entries. 
            <strong className="text-foreground"> Bot answers remain unchanged until you approve.</strong>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === 'new' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('new')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              New Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.new || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === 'reviewed' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('reviewed')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Reviewed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.reviewed || 0}</div>
            <p className="text-xs text-muted-foreground">Pending decision</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === 'approved' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('approved')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approved || 0}</div>
            <p className="text-xs text-muted-foreground">Added to knowledge</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === 'rejected' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('rejected')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.rejected || 0}</div>
            <p className="text-xs text-muted-foreground">Dismissed</p>
          </CardContent>
        </Card>
      </div>

      {/* Signals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Learning Signals - {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
          </CardTitle>
          <CardDescription>
            {statusFilter === 'new' && 'Questions that need your review. Click to review and approve/reject.'}
            {statusFilter === 'reviewed' && 'Signals you\'ve reviewed but not yet decided on.'}
            {statusFilter === 'approved' && 'Approved signals that have been added to knowledge base.'}
            {statusFilter === 'rejected' && 'Rejected signals that won\'t be added.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : signals?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {statusFilter} signals found
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Question</TableHead>
                    <TableHead>Current Answer</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-center">
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      Freq
                    </TableHead>
                    <TableHead className="text-center">Confidence</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals?.map((signal) => (
                    <TableRow key={signal.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openReviewDialog(signal)}>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="truncate" title={signal.query_text}>
                          {signal.query_text}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[250px] text-muted-foreground">
                        <div className="truncate" title={signal.response_text || ''}>
                          {signal.response_text || <span className="italic">No response</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getSignalTypeBadge(signal.signal_type)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{signal.frequency_count || 1}×</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {signal.similarity_score ? (
                          <span className={signal.similarity_score < 0.5 ? 'text-destructive' : 'text-muted-foreground'}>
                            {(signal.similarity_score * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(signal.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openReviewDialog(signal); }}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedSignal} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Review Learning Signal
            </DialogTitle>
            <DialogDescription>
              Review this user question and decide whether to add it to the knowledge base.
            </DialogDescription>
          </DialogHeader>

          {selectedSignal && (
            <div className="space-y-4 py-4">
              {/* Original Question */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  User Question
                </label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {selectedSignal.query_text}
                </div>
              </div>

              {/* Signal Info */}
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>{' '}
                  {getSignalTypeBadge(selectedSignal.signal_type)}
                </div>
                <div>
                  <span className="text-muted-foreground">Asked:</span>{' '}
                  <Badge variant="outline">{selectedSignal.frequency_count || 1}× times</Badge>
                </div>
                {selectedSignal.similarity_score && (
                  <div>
                    <span className="text-muted-foreground">Match:</span>{' '}
                    <span className={selectedSignal.similarity_score < 0.5 ? 'text-destructive' : ''}>
                      {(selectedSignal.similarity_score * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Current Bot Response */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Bot Response</label>
                <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground max-h-32 overflow-y-auto">
                  {selectedSignal.response_text || 'No response recorded'}
                </div>
              </div>

              {/* Editable Section - Only for new/reviewed signals */}
              {(selectedSignal.status === 'new' || selectedSignal.status === 'reviewed') && (
                <>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Create Knowledge Entry</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(!editMode)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        {editMode ? 'Preview' : 'Edit'}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Knowledge Title</label>
                        <Input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Brief title for this knowledge entry"
                          disabled={!editMode}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Answer / Content</label>
                        <Textarea
                          value={suggestedAnswer}
                          onChange={(e) => setSuggestedAnswer(e.target.value)}
                          placeholder="The answer that will be added to knowledge base..."
                          rows={4}
                          disabled={!editMode}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Category</label>
                        <Input
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="e.g., faq, pricing, feature"
                          disabled={!editMode}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Admin Notes (internal)</label>
                        <Textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Optional notes about this decision..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Safety Warning */}
                  <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <strong>Approval creates a new knowledge entry.</strong> The bot will use this
                      answer for similar questions after embedding generation completes.
                    </div>
                  </div>
                </>
              )}

              {/* Approved/Rejected Info */}
              {selectedSignal.status === 'approved' && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    <span className="font-medium">Approved</span>
                    {selectedSignal.approved_at && (
                      <span className="text-sm text-muted-foreground">
                        on {formatDate(selectedSignal.approved_at)}
                      </span>
                    )}
                  </div>
                  {selectedSignal.admin_notes && (
                    <p className="text-sm mt-2 text-muted-foreground">{selectedSignal.admin_notes}</p>
                  )}
                </div>
              )}

              {selectedSignal.status === 'rejected' && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="flex items-center gap-2 text-destructive">
                    <X className="h-4 w-4" />
                    <span className="font-medium">Rejected</span>
                  </div>
                  {selectedSignal.admin_notes && (
                    <p className="text-sm mt-2 text-muted-foreground">{selectedSignal.admin_notes}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedSignal?.status === 'new' && (
              <Button
                variant="outline"
                onClick={handleMarkReviewed}
                disabled={updateStatusMutation.isPending}
              >
                Mark as Reviewed
              </Button>
            )}
            
            {(selectedSignal?.status === 'new' || selectedSignal?.status === 'reviewed') && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending || !newTitle.trim() || !suggestedAnswer.trim()}
                >
                  {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Check className="h-4 w-4 mr-1" />
                  Approve & Add to Knowledge
                </Button>
              </>
            )}

            {(selectedSignal?.status === 'approved' || selectedSignal?.status === 'rejected') && (
              <Button variant="outline" onClick={closeDialog}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
