import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Plus, Pencil, Trash2, Loader2, Database, Sparkles, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string | null;
  is_active: boolean;
  embedding: unknown;
  created_at: string;
  updated_at: string;
}

export function AdminBotSettingsTab() {
  const queryClient = useQueryClient();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<KnowledgeEntry | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', category: '' });

  // Fetch knowledge base entries
  const { data: entries, isLoading } = useQuery({
    queryKey: ['knowledge-base'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('title');
      if (error) throw error;
      return data as KnowledgeEntry[];
    }
  });

  // Add entry mutation
  const addMutation = useMutation({
    mutationFn: async (entry: { title: string; content: string; category: string }) => {
      const { error } = await supabase.from('knowledge_base').insert({
        title: entry.title,
        content: entry.content,
        category: entry.category || null,
        is_active: true
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success('Entry added - embedding will be generated');
      setIsAddOpen(false);
      setNewEntry({ title: '', content: '', category: '' });
    },
    onError: (error) => toast.error(`Failed to add: ${error.message}`)
  });

  // Update entry mutation
  const updateMutation = useMutation({
    mutationFn: async (entry: KnowledgeEntry) => {
      const { error } = await supabase
        .from('knowledge_base')
        .update({
          title: entry.title,
          content: entry.content,
          category: entry.category,
          is_active: entry.is_active
        })
        .eq('id', entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success('Entry updated - embedding will be regenerated');
      setEditEntry(null);
    },
    onError: (error) => toast.error(`Failed to update: ${error.message}`)
  });

  // Delete entry mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('knowledge_base').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success('Entry deleted');
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`)
  });

  // Regenerate all embeddings
  const regenerateEmbeddings = async () => {
    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { regenerate_all: true }
      });
      
      if (error) throw error;
      
      toast.success(`Generated ${data.successCount} embeddings (${data.errorCount} errors)`);
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to regenerate: ${message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Regenerate single embedding
  const regenerateSingleEmbedding = async (id: string) => {
    setRegeneratingId(id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { record_id: id }
      });
      
      if (error) throw error;
      
      if (data.successCount > 0) {
        toast.success('Embedding generated successfully');
      } else {
        toast.error('Failed to generate embedding');
      }
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to regenerate: ${message}`);
    } finally {
      setRegeneratingId(null);
    }
  };

  const entriesWithEmbedding = entries?.filter(e => e.embedding !== null).length || 0;
  const totalEntries = entries?.length || 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Knowledge Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntries}</div>
            <p className="text-xs text-muted-foreground">Total active entries</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Embeddings Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entriesWithEmbedding}/{totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              {entriesWithEmbedding === totalEntries ? 'All up to date' : 'Some need regeneration'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button 
              onClick={regenerateEmbeddings} 
              disabled={isRegenerating}
              variant="outline"
              size="sm"
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate All
            </Button>
            <Button onClick={() => setIsAddOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Base Table */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base</CardTitle>
          <CardDescription>
            Manage bot knowledge. Changes trigger automatic embedding regeneration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Embedding</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries?.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium max-w-[150px] truncate">
                        {entry.title}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {entry.content}
                      </TableCell>
                      <TableCell>
                        {entry.category && (
                          <Badge variant="secondary">{entry.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.embedding ? (
                          <Check className="h-4 w-4 text-green-500 mx-auto" />
                        ) : regeneratingId === entry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                        ) : (
                          <button
                            onClick={() => regenerateSingleEmbedding(entry.id)}
                            className="p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                            title="Click to generate embedding"
                          >
                            <X className="h-4 w-4 text-red-500 mx-auto" />
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={entry.is_active ? "default" : "secondary"}>
                          {entry.is_active ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditEntry(entry)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Delete this entry?')) {
                                deleteMutation.mutate(entry.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Entry Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Knowledge Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newEntry.title}
                onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                placeholder="e.g., Pricing Orange Monthly"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={newEntry.content}
                onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                placeholder="The knowledge content..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category (optional)</label>
              <Input
                value={newEntry.category}
                onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                placeholder="e.g., pricing, faq, feature"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => addMutation.mutate(newEntry)}
              disabled={!newEntry.title || !newEntry.content || addMutation.isPending}
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editEntry} onOpenChange={() => setEditEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Knowledge Entry</DialogTitle>
          </DialogHeader>
          {editEntry && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editEntry.title}
                  onChange={(e) => setEditEntry({ ...editEntry, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={editEntry.content}
                  onChange={(e) => setEditEntry({ ...editEntry, content: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={editEntry.category || ''}
                  onChange={(e) => setEditEntry({ ...editEntry, category: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editEntry.is_active}
                  onChange={(e) => setEditEntry({ ...editEntry, is_active: e.target.checked })}
                />
                <label htmlFor="is_active" className="text-sm">Active</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button 
              onClick={() => editEntry && updateMutation.mutate(editEntry)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
