import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Nfc, Radio, AlertTriangle, CheckCircle2, Search, Loader2, User } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { checkNfcAvailability, writeNfcWithVCard, generateVCard } from '@/lib/nativeNfc';
import { supabase } from '@/integrations/supabase/client';

interface UserResult {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  designation: string | null;
  slug: string | null;
}

export function AdminNfcWriterTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  // Form fields - all blank by default
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const nfcAvailability = checkNfcAvailability();

  const resetForm = () => {
    setSlug('');
    setName('');
    setCompany('');
    setDesignation('');
    setPhone('');
    setEmail('');
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const openDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query || query.length < 2) {
      toast.error('Please enter at least 2 characters to search');
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      // Search by name or email (case-insensitive)
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, company, designation, slug')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
      
      if (!data || data.length === 0) {
        toast.info('No users found matching your search');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Failed to search users');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectUser = (user: UserResult) => {
    setSlug(user.slug || '');
    setName(user.full_name || '');
    setCompany(user.company || '');
    setDesignation(user.designation || '');
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setShowResults(false);
    setSearchQuery('');
    toast.success(`Selected: ${user.full_name || user.email}`);
  };

  const handleWriteNfc = async () => {
    if (!slug.trim()) {
      toast.error('Please enter a slug/link');
      return;
    }

    setIsWriting(true);
    
    try {
      // Build the full URL from slug
      const cleanSlug = slug.trim().replace(/^\/+/, '').replace(/^u\//, '');
      const publicUrl = `https://synka.in/u/${cleanSlug}`;
      
      // Generate vCard with provided details
      const vCard = generateVCard({
        name: name.trim() || undefined,
        company: company.trim() || undefined,
        designation: designation.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        url: publicUrl,
      });

      toast.info('Hold NFC tag near your device...');
      
      const result = await writeNfcWithVCard(publicUrl, vCard);
      
      if (result.success) {
        toast.success('NFC tag written successfully!');
        setIsDialogOpen(false);
        resetForm();
      } else {
        toast.error(result.error || 'Failed to write NFC tag');
      }
    } catch (error: any) {
      console.error('NFC write error:', error);
      toast.error(error?.message || 'Failed to write NFC tag');
    } finally {
      setIsWriting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Nfc className="h-5 w-5" />
            Admin NFC Writer
          </CardTitle>
          <CardDescription>
            Write any custom slug and contact details to NFC cards. This allows you to program NFC cards for any user.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!nfcAvailability.isSupported && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400">NFC Not Available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {Capacitor.isNativePlatform() 
                    ? 'NFC writing requires Chrome browser on Android. Please open synka.in in Chrome to write NFC tags.'
                    : 'NFC is not supported on this device/browser. Please use Chrome on Android with NFC enabled.'}
                </p>
              </div>
            </div>
          )}

          {nfcAvailability.isSupported && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">NFC Available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your device supports NFC writing. Click the button below to program an NFC card.
                </p>
              </div>
            </div>
          )}

          <Button 
            onClick={openDialog} 
            className="w-full sm:w-auto"
            disabled={!nfcAvailability.isSupported}
          >
            <Radio className="h-4 w-4 mr-2" />
            Write NFC Card
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Nfc className="h-5 w-5" />
              Write Custom NFC Card
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* User Lookup Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Search className="h-4 w-4" />
                Search User
              </Label>
              <div className="flex gap-2">
                <Input 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Search by name or email..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Find a user to auto-fill their details
              </p>

              {/* Search Results */}
              {showResults && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <button
                        key={user.user_id}
                        onClick={() => selectUser(user)}
                        className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{user.full_name || 'No name'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email || 'No email'}</p>
                          {user.slug && (
                            <p className="text-xs text-primary truncate">/{user.slug}</p>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or enter manually</span>
              </div>
            </div>

            {/* Slug/Link - Required */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Slug / Link <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">synka.in/u/</span>
                <Input 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value)} 
                  placeholder="john-doe"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the user's profile slug (e.g., john-doe)
              </p>
            </div>

            {/* Optional offline contact details */}
            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Optional Offline Details (vCard)</p>
              
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input 
                    value={company} 
                    onChange={(e) => setCompany(e.target.value)} 
                    placeholder="Acme Inc"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input 
                    value={designation} 
                    onChange={(e) => setDesignation(e.target.value)} 
                    placeholder="CEO"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setIsDialogOpen(false)} 
                disabled={isWriting}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={handleWriteNfc}
                disabled={isWriting || !slug.trim()}
              >
                {isWriting ? 'Waiting for tag...' : 'Write to NFC'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
