import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, User, UserX, RefreshCw, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface ChatSession {
  session_id: string;
  name: string | null;
  email: string | null;
  mobile: string | null;
  is_user: boolean | null;
  status: string;
  work_status: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  messages: ChatMessage[];
}

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved'];

const STATUS_COLORS: Record<string, string> = {
  'open': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'in_progress': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'resolved': 'bg-green-500/10 text-green-500 border-green-500/20',
};

const SESSION_STATUS_COLORS: Record<string, string> = {
  'active': 'text-green-500',
  'ended': 'text-gray-400',
};

export function AdminQueriesTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // Fetch all chat sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch all messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Group messages by session
      const messagesBySession = new Map<string, ChatMessage[]>();
      messagesData?.forEach((msg) => {
        if (!messagesBySession.has(msg.session_id)) {
          messagesBySession.set(msg.session_id, []);
        }
        messagesBySession.get(msg.session_id)!.push(msg);
      });

      // Combine sessions with messages
      const enrichedSessions: ChatSession[] = (sessionsData || []).map((s) => ({
        session_id: s.session_id,
        name: s.name,
        email: s.email,
        mobile: s.mobile,
        is_user: s.is_user,
        status: s.status,
        work_status: s.work_status,
        started_at: s.started_at,
        ended_at: s.ended_at,
        message_count: s.message_count,
        messages: messagesBySession.get(s.session_id) || [],
      }));

      setSessions(enrichedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load chat sessions');
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    fetchSessions();

    // Subscribe to chat_sessions changes
    const sessionsChannel = supabase
      .channel('admin-chat-sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_sessions' },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    // Subscribe to chat_messages changes
    const messagesChannel = supabase
      .channel('admin-chat-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  const updateWorkStatus = async (sessionId: string, newStatus: string) => {
    setUpdatingStatus(sessionId);
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ work_status: newStatus })
        .eq('session_id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.map(s => 
        s.session_id === sessionId ? { ...s, work_status: newStatus } : s
      ));
      
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getFirstUserMessage = (messages: ChatMessage[]): string => {
    const userMsg = messages.find(m => m.role === 'user');
    return userMsg?.content?.slice(0, 60) || '—';
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Chat Sessions</h2>
        <Button variant="outline" size="sm" onClick={fetchSessions}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No chat sessions yet</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[100px]">User</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>First Query</TableHead>
                <TableHead className="w-[140px]">Work Status</TableHead>
                <TableHead className="w-[140px]">Started</TableHead>
                <TableHead className="w-[80px]">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.session_id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Circle 
                        className={`h-2.5 w-2.5 fill-current ${SESSION_STATUS_COLORS[session.status] || 'text-gray-400'}`} 
                      />
                      <span className="text-xs capitalize">{session.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {session.is_user ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        <User className="h-3 w-3 mr-1" />
                        User
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                        <UserX className="h-3 w-3 mr-1" />
                        Guest
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {session.name || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {session.email && <div className="truncate max-w-[150px]">{session.email}</div>}
                      {session.mobile && <div>{session.mobile}</div>}
                      {!session.email && !session.mobile && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                    {getFirstUserMessage(session.messages)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={session.work_status}
                      onValueChange={(value) => updateWorkStatus(session.session_id, value)}
                      disabled={updatingStatus === session.session_id}
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue>
                          <Badge variant="outline" className={STATUS_COLORS[session.work_status] || STATUS_COLORS['open']}>
                            {session.work_status}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            <Badge variant="outline" className={STATUS_COLORS[status]}>
                              {status.replace('_', ' ')}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(session.started_at), 'MMM d, HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSession(session)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Conversation Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Chat with {selectedSession?.name || 'Guest'}</span>
              {selectedSession?.is_user && (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  Synka User
                </Badge>
              )}
              <Badge variant="outline" className={SESSION_STATUS_COLORS[selectedSession?.status || 'ended']}>
                {selectedSession?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-4">
              {/* Contact Info */}
              {(selectedSession.email || selectedSession.mobile) && (
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  {selectedSession.email && <div>Email: {selectedSession.email}</div>}
                  {selectedSession.mobile && <div>Mobile: {selectedSession.mobile}</div>}
                  <div className="mt-1 text-xs">
                    Started: {format(new Date(selectedSession.started_at), 'MMM d, yyyy HH:mm')}
                    {selectedSession.ended_at && (
                      <> · Ended: {format(new Date(selectedSession.ended_at), 'HH:mm')}</>
                    )}
                  </div>
                </div>
              )}
              
              {/* Messages */}
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {selectedSession.messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No messages yet</p>
                  ) : (
                    selectedSession.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted text-foreground rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
