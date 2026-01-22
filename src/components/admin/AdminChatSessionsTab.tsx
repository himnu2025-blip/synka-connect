import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { MessageCircle, User, UserX, Search, Eye, RefreshCw, CheckCircle, Clock, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ChatSession {
  id: string;
  session_id: string;
  name: string | null;
  email: string | null;
  mobile: string | null;
  is_user: boolean;
  status: string;
  work_status: string;
  message_count: number;
  started_at: string;
  last_message_at: string;
  ended_at: string | null;
  timeout_reason: string | null;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

// Generate brief summary from messages
const generateSummary = (messages: ChatMessage[]): string => {
  if (!messages || messages.length === 0) return 'No messages';
  
  // Get first user message as topic indicator
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (!firstUserMsg) return 'No user messages';
  
  const summary = firstUserMsg.content.slice(0, 60);
  return summary.length < firstUserMsg.content.length ? `${summary}...` : summary;
};

export function AdminChatSessionsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workStatusFilter, setWorkStatusFilter] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messagesDialogOpen, setMessagesDialogOpen] = useState(false);
  const [sessionSummaries, setSessionSummaries] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-chat-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(s => ({
        ...s,
        work_status: s.work_status || 'open'
      })) as ChatSession[];
    },
    refetchInterval: 10000
  });

  // Fetch summaries for all sessions
  useEffect(() => {
    const fetchSummaries = async () => {
      if (sessions.length === 0) return;
      
      const sessionIds = sessions.map(s => s.session_id);
      const { data: allMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });
      
      if (allMessages) {
        const summaries: Record<string, string> = {};
        sessions.forEach(session => {
          const msgs = allMessages.filter(m => m.session_id === session.session_id);
          summaries[session.session_id] = generateSummary(msgs);
        });
        setSessionSummaries(summaries);
      }
    };
    
    fetchSummaries();
  }, [sessions]);

  // Real-time subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-sessions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_sessions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-chat-sessions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['admin-chat-messages', selectedSession?.session_id],
    queryFn: async () => {
      if (!selectedSession) return [];
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', selectedSession.session_id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!selectedSession
  });

  // Mutation to update work status
  const updateWorkStatusMutation = useMutation({
    mutationFn: async ({ sessionId, workStatus }: { sessionId: string; workStatus: string }) => {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ work_status: workStatus })
        .eq('session_id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-sessions'] });
      toast.success('Work status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    }
  });

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      (session.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (session.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (session.mobile?.includes(searchTerm)) ||
      (sessionSummaries[session.session_id]?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesWorkStatus = workStatusFilter === 'all' || session.work_status === workStatusFilter;
    
    return matchesSearch && matchesStatus && matchesWorkStatus;
  });

  // Count active sessions (not ended/timeout)
  const activeSessions = sessions.filter(s => s.status === 'active');
  const endedSessions = sessions.filter(s => s.status === 'timeout' || s.status === 'ended');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500 gap-1"><Clock className="h-3 w-3" />Live</Badge>;
      case 'timeout':
        return <Badge className="bg-yellow-500/20 text-yellow-500">Timeout</Badge>;
      case 'ended':
        return <Badge className="bg-gray-500/20 text-gray-500">Ended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getWorkStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-3 w-3" />;
      case 'assigned':
        return <UserCheck className="h-3 w-3" />;
      case 'done':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const handleViewMessages = (session: ChatSession) => {
    setSelectedSession(session);
    setMessagesDialogOpen(true);
  };

  const handleWorkStatusChange = (sessionId: string, newStatus: string) => {
    updateWorkStatusMutation.mutate({ sessionId, workStatus: newStatus });
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading sessions...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, mobile, or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Live</SelectItem>
            <SelectItem value="timeout">Timeout</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={workStatusFilter} onValueChange={setWorkStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Work Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Work</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-2xl font-bold">{sessions.length}</div>
          <div className="text-sm text-muted-foreground">Total Sessions</div>
        </div>
        <div className="bg-green-500/10 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{activeSessions.length}</div>
          <div className="text-sm text-muted-foreground">Live Now</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-2xl font-bold">{endedSessions.length}</div>
          <div className="text-sm text-muted-foreground">Ended</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-2xl font-bold">{sessions.filter(s => s.work_status === 'open').length}</div>
          <div className="text-sm text-muted-foreground">Open to Work</div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Info</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Chat Status</TableHead>
              <TableHead>Work Status</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No chat sessions found
                </TableCell>
              </TableRow>
            ) : (
              filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {session.is_user ? (
                          <User className="h-4 w-4 text-primary" />
                        ) : (
                          <UserX className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{session.name || 'Anonymous'}</span>
                      </div>
                      {session.email && (
                        <div className="text-xs text-muted-foreground">{session.email}</div>
                      )}
                      {session.mobile && (
                        <div className="text-xs text-muted-foreground">{session.mobile}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {sessionSummaries[session.session_id] || 'Loading...'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {session.is_user ? (
                      <Badge variant="default" className="gap-1">
                        <User className="h-3 w-3" />
                        User
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <UserX className="h-3 w-3" />
                        Guest
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(session.status)}</TableCell>
                  <TableCell>
                    <Select
                      value={session.work_status}
                      onValueChange={(value) => handleWorkStatusChange(session.session_id, value)}
                    >
                      <SelectTrigger className="w-[110px] h-8">
                        <div className="flex items-center gap-1">
                          {getWorkStatusIcon(session.work_status)}
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            Open
                          </div>
                        </SelectItem>
                        <SelectItem value="assigned">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-3 w-3" />
                            Assigned
                          </div>
                        </SelectItem>
                        <SelectItem value="done">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3" />
                            Done
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{session.message_count}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(session.last_message_at), 'MMM d, HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewMessages(session)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Messages Dialog */}
      <Dialog open={messagesDialogOpen} onOpenChange={setMessagesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat with {selectedSession?.name || 'Anonymous'}
              {selectedSession?.is_user && (
                <Badge variant="outline" className="ml-2">
                  <User className="h-3 w-3 mr-1" />
                  User
                </Badge>
              )}
              {selectedSession && getStatusBadge(selectedSession.status)}
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-sm text-muted-foreground mb-4 flex flex-wrap gap-4">
            {selectedSession?.email && <span>📧 {selectedSession.email}</span>}
            {selectedSession?.mobile && <span>📱 {selectedSession.mobile}</span>}
            {selectedSession?.started_at && (
              <span>🕐 Started: {format(new Date(selectedSession.started_at), 'MMM d, HH:mm')}</span>
            )}
          </div>

          {selectedSession && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium">Work Status:</span>
              <Select
                value={selectedSession.work_status}
                onValueChange={(value) => {
                  handleWorkStatusChange(selectedSession.session_id, value);
                  setSelectedSession({ ...selectedSession, work_status: value });
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <div className="flex items-center gap-1">
                    {getWorkStatusIcon(selectedSession.work_status)}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <ScrollArea className="h-[400px] pr-4">
            {messagesLoading ? (
              <div className="text-center text-muted-foreground py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No messages found</div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(new Date(message.created_at), 'HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedSession?.timeout_reason && (
            <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg text-sm">
              <strong>Session ended:</strong> {selectedSession.timeout_reason}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}