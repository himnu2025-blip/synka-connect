 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 
 // Cache admin status in localStorage for instant check
 const ADMIN_CACHE_KEY = 'synka_admin_status';
 
 function getCachedAdminStatus(): boolean | null {
   try {
     const cached = localStorage.getItem(ADMIN_CACHE_KEY);
     if (!cached) return null;
     const { isAdmin, expiry } = JSON.parse(cached);
     if (Date.now() > expiry) {
       localStorage.removeItem(ADMIN_CACHE_KEY);
       return null;
     }
     return isAdmin;
   } catch {
     return null;
   }
 }
 
 function setCachedAdminStatus(isAdmin: boolean): void {
   try {
     localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({
       isAdmin,
       expiry: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
     }));
   } catch {
     // Ignore storage errors
   }
 }
 
 export interface UserWithPlan {
   id: string;
   user_id: string;
   full_name: string | null;
   email: string | null;
   phone: string | null;
   plan: string;
   created_at: string;
   role: string;
 }
 
 export interface AdminStats {
   totalUsers: number;
   freeUsers: number;
   orangeUsers: number;
   totalOrders: number;
   pvcOrders: number;
   metalOrders: number;
   totalRevenue: number;
 }
 
 // Check if user is admin - with localStorage cache for instant check
 export function useAdminStatus() {
   const { user } = useAuth();
   const cachedStatus = getCachedAdminStatus();
 
   const query = useQuery({
     queryKey: ['admin-status', user?.id],
     queryFn: async () => {
       if (!user) return false;
       
       const { data, error } = await supabase
         .from('user_roles')
         .select('role')
         .eq('user_id', user.id)
         .eq('role', 'admin')
         .maybeSingle();
 
       const isAdmin = !!data && !error;
       setCachedAdminStatus(isAdmin);
       return isAdmin;
     },
     enabled: !!user,
     staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
     gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
     placeholderData: cachedStatus ?? undefined,
   });
 
   return {
     isAdmin: query.data ?? cachedStatus ?? false,
     loading: query.isLoading && cachedStatus === null,
   };
 }
 
 // Fetch users with caching
 export function useAdminUsers() {
   const { isAdmin } = useAdminStatus();
 
   return useQuery({
     queryKey: ['admin-users'],
     queryFn: async (): Promise<UserWithPlan[]> => {
       const { data: profiles, error } = await supabase
         .from('profiles')
         .select('id, user_id, full_name, email, phone, plan, created_at')
         .order('created_at', { ascending: false });
 
       if (error) throw error;
 
       // Batch fetch roles and card names
       const usersWithRoles = await Promise.all(
         (profiles || []).map(async (profile) => {
           const [roleRes, cardRes] = await Promise.all([
             supabase
               .from('user_roles')
               .select('role')
               .eq('user_id', profile.user_id)
               .limit(1)
               .maybeSingle(),
             !profile.full_name
               ? supabase
                   .from('cards')
                   .select('full_name')
                   .eq('user_id', profile.user_id)
                   .eq('is_default', true)
                   .limit(1)
                   .maybeSingle()
               : Promise.resolve({ data: null }),
           ]);
 
           return {
             ...profile,
             full_name: profile.full_name || cardRes.data?.full_name || null,
             role: roleRes.data?.role || 'free',
           };
         })
       );
 
       return usersWithRoles;
     },
     enabled: isAdmin,
     staleTime: 30 * 1000, // Fresh for 30 seconds
     gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
   });
 }
 
 // Fetch payments with caching
 export function useAdminPayments() {
   const { isAdmin } = useAdminStatus();
 
   return useQuery({
     queryKey: ['admin-payments'],
     queryFn: async () => {
       const { data: paymentsData, error } = await supabase
         .from('payments')
         .select('*')
         .order('created_at', { ascending: false });
 
       if (error) throw error;
 
       const userIds = [...new Set(paymentsData?.map((p) => p.user_id) || [])];
       const { data: profiles } = await supabase
         .from('profiles')
         .select('user_id, full_name, email, phone')
         .in('user_id', userIds);
 
       const profileMap = new Map(
         profiles?.map((p) => [
           p.user_id,
           { name: p.full_name, email: p.email, phone: p.phone },
         ])
       );
 
       return paymentsData?.map((payment) => ({
         ...payment,
         user_name: profileMap.get(payment.user_id)?.name || 'Unknown',
         user_email: profileMap.get(payment.user_id)?.email || '',
         user_phone: profileMap.get(payment.user_id)?.phone || '',
       })) || [];
     },
     enabled: isAdmin,
     staleTime: 30 * 1000,
     gcTime: 10 * 60 * 1000,
   });
 }
 
 // Fetch subscriptions with caching
 export function useAdminSubscriptions() {
   const { isAdmin } = useAdminStatus();
 
   return useQuery({
     queryKey: ['admin-subscriptions'],
     queryFn: async () => {
       const { data: subscriptionsData, error } = await supabase
         .from('subscriptions')
         .select('*')
         .order('created_at', { ascending: false });
 
       if (error) throw error;
 
       const userIds = [...new Set(subscriptionsData?.map((s) => s.user_id) || [])];
       const { data: profiles } = await supabase
         .from('profiles')
         .select('user_id, full_name, email, phone')
         .in('user_id', userIds);
 
       const profileMap = new Map(
         profiles?.map((p) => [
           p.user_id,
           { name: p.full_name, email: p.email, phone: p.phone },
         ])
       );
 
       return subscriptionsData?.map((sub) => ({
         ...sub,
         user_name: profileMap.get(sub.user_id)?.name || 'Unknown',
         user_email: profileMap.get(sub.user_id)?.email || '',
         user_phone: profileMap.get(sub.user_id)?.phone || '',
       })) || [];
     },
     enabled: isAdmin,
     staleTime: 30 * 1000,
     gcTime: 10 * 60 * 1000,
   });
 }
 
 // Fetch orders with caching
 export function useAdminOrders() {
   const { isAdmin } = useAdminStatus();
 
   return useQuery({
     queryKey: ['admin-orders'],
     queryFn: async () => {
       const { data: ordersData, error } = await supabase
         .from('orders')
         .select('*')
         .order('created_at', { ascending: false });
 
       if (error) throw error;
 
       const userIds = [...new Set(ordersData?.map((o) => o.user_id) || [])];
       const [profilesRes, cardsRes] = await Promise.all([
         supabase
           .from('profiles')
           .select('user_id, full_name, email, phone')
           .in('user_id', userIds),
         supabase
           .from('cards')
           .select('user_id, full_name, phone')
           .in('user_id', userIds)
           .eq('is_default', true),
       ]);
 
       const profileMap = new Map(
         profilesRes.data?.map((p) => [
           p.user_id,
           { name: p.full_name, email: p.email, phone: p.phone },
         ])
       );
 
       const cardMap = new Map(
         cardsRes.data?.map((c) => [
           c.user_id,
           { name: c.full_name, phone: c.phone },
         ])
       );
 
       return ordersData?.map((order) => {
         const profile = profileMap.get(order.user_id);
         const card = cardMap.get(order.user_id);
         return {
           ...order,
           user_name: profile?.name || card?.name || 'Unknown',
           user_email: profile?.email || 'Unknown',
           user_phone: profile?.phone || card?.phone || null,
         };
       }) || [];
     },
     enabled: isAdmin,
     staleTime: 30 * 1000,
     gcTime: 10 * 60 * 1000,
   });
 }