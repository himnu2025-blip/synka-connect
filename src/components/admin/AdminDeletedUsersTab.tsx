import { useEffect, useRef, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserX } from 'lucide-react';
import { format } from 'date-fns';

interface DeletedUser {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  created_at: string | null;
  deleted_at: string;
}

export function AdminDeletedUsersTab() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        fetchDeletedUsers();
      }, 300);
    };

    fetchDeletedUsers();

    // Subscribe to realtime changes on deleted_users table (debounced)
    const channel = supabase
      .channel('admin-deleted-users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deleted_users' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminLoading, isAdmin]);

  const fetchDeletedUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deleted_users')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) {
        console.error('Error fetching deleted users:', error);
      } else {
        setDeletedUsers(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX className="h-5 w-5" />
          Deleted Users ({deletedUsers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deletedUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No deleted users found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Signup Date</TableHead>
                <TableHead>Deleted Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deletedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                  <TableCell>{user.email || 'N/A'}</TableCell>
                  <TableCell>
                    {user.created_at
                      ? format(new Date(user.created_at), 'MMM d, yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.deleted_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
