import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalUsers: number;
  freeUsers: number;
  orangeUsers: number;
  totalOrders: number;
  pvcOrders: number;
  metalOrders: number;
  totalRevenue: number;
}

interface UserWithPlan {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  created_at: string;
  role: string;
}

interface Order {
  id: string;
  user_id: string;
  order_number: string | null;
  product_type: string;
  quantity: number;
  amount: number;
  status: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithPlan[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    freeUsers: 0,
    orangeUsers: 0,
    totalOrders: 0,
    pvcOrders: 0,
    metalOrders: 0,
    totalRevenue: 0,
  });

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!data && !error);
      setLoading(false);
    };

    checkAdmin();
  }, [user]);

  // Fetch all users with their plans
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email, phone, plan, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    // Get roles and card names for each user
    const usersWithRoles = await Promise.all(
      (profiles || []).map(async (profile) => {
        const [roleRes, cardRes] = await Promise.all([
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id)
            .limit(1)
            .maybeSingle(),
          // If profile name is empty, get from default card
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

    setUsers(usersWithRoles);
  }, [isAdmin]);

  // Fetch all orders
  const fetchOrders = useCallback(async () => {
    if (!isAdmin) return;

    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }

    // Get user info for each order
    const ordersWithUsers = await Promise.all(
      (ordersData || []).map(async (order) => {
        const [profileRes, cardRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('user_id', order.user_id)
            .maybeSingle(),
          supabase
            .from('cards')
            .select('full_name, phone')
            .eq('user_id', order.user_id)
            .eq('is_default', true)
            .maybeSingle(),
        ]);

        const profile = profileRes.data;
        const card = cardRes.data;

        return {
          ...order,
          user_name: profile?.full_name || card?.full_name || 'Unknown',
          user_email: profile?.email || 'Unknown',
          user_phone: profile?.phone || card?.phone || null,
        };
      })
    );

    setOrders(ordersWithUsers);
  }, [isAdmin]);

  // Calculate stats - only count paid orders for revenue
  const fetchStats = useCallback(
    async (startDate?: Date, endDate?: Date) => {
      if (!isAdmin) return;

      let profilesQuery = supabase.from('profiles').select('plan, created_at');
      let ordersQuery = supabase.from('orders').select('product_type, amount, status, created_at');

      if (startDate) {
        profilesQuery = profilesQuery.gte('created_at', startDate.toISOString());
        ordersQuery = ordersQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        profilesQuery = profilesQuery.lte('created_at', endDate.toISOString());
        ordersQuery = ordersQuery.lte('created_at', endDate.toISOString());
      }

      const [profilesRes, ordersRes] = await Promise.all([profilesQuery, ordersQuery]);

      const profiles = profilesRes.data || [];
      const ordersData = ordersRes.data || [];

      // Only count paid orders for revenue
      const paidOrders = ordersData.filter(
        (o) => o.status === 'payment_success' || o.status === 'placed' || o.status === 'dispatched' || o.status === 'delivered'
      );

      setStats({
        totalUsers: profiles.length,
        freeUsers: profiles.filter((p) => p.plan === 'Free').length,
        orangeUsers: profiles.filter((p) => p.plan === 'Orange').length,
        totalOrders: paidOrders.length,
        pvcOrders: paidOrders.filter((o) => o.product_type === 'pvc').length,
        metalOrders: paidOrders.filter((o) => o.product_type === 'metal').length,
        totalRevenue: paidOrders.reduce((sum, o) => sum + Number(o.amount), 0),
      });
    },
    [isAdmin]
  );

  // Upgrade user plan
  const upgradeUserPlan = useCallback(
    async (userId: string, newPlan: string) => {
      const { error } = await supabase.rpc('upgrade_user_plan', {
        _user_id: userId,
        _new_plan: newPlan,
      });

      if (error) {
        console.error('Error upgrading user:', error);
        throw error;
      }

      // Refresh users list
      await fetchUsers();
    },
    [fetchUsers]
  );

  // Downgrade user plan
  const downgradeUserPlan = useCallback(
    async (userId: string) => {
      // Update profile plan to Free
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ plan: 'Free', updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error downgrading user:', profileError);
        throw profileError;
      }

      // Update role from orange to free
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'free' })
        .eq('user_id', userId)
        .eq('role', 'orange');

      if (roleError) {
        console.error('Error updating role:', roleError);
        // Don't throw, role update is secondary
      }

      // Log plan change
      const { error: historyError } = await supabase.from('plan_history').insert({
        user_id: userId,
        old_plan: 'Orange',
        new_plan: 'Free',
        changed_by: user?.id,
      });

      if (historyError) {
        console.error('Error logging plan change:', historyError);
      }

      // Refresh users list
      await fetchUsers();
    },
    [fetchUsers, user?.id]
  );

  // Update order status
  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: string) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order:', error);
        throw error;
      }

      await fetchOrders();
    },
    [fetchOrders]
  );

  return {
    isAdmin,
    loading,
    users,
    orders,
    stats,
    fetchUsers,
    fetchOrders,
    fetchStats,
    upgradeUserPlan,
    downgradeUserPlan,
    updateOrderStatus,
  };
}
