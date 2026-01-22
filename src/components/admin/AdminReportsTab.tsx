import { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Loader2,
  Users,
  CreditCard,
  Package,
  IndianRupee,
  CalendarIcon,
  Download,
  Calendar as CalendarCheckIcon,
  CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

// Format date in Indian timezone
const formatIndianDate = (date: Date | string, formatStr: string = 'dd/MM/yyyy hh:mm a') => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

interface SubscriptionStats {
  monthlyActive: number;
  monthlyRevenue: number;
  annualActive: number;
  annualRevenue: number;
  totalSubscriptions: number;
}

export function AdminReportsTab() {
  const { isAdmin, loading: adminLoading, stats, fetchStats, users, orders } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats>({
    monthlyActive: 0,
    monthlyRevenue: 0,
    annualActive: 0,
    annualRevenue: 0,
    totalSubscriptions: 0,
  });

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      await fetchStats(dateRange?.from, dateRange?.to);
      
      // Fetch subscription stats - only count paid subscriptions for revenue
      let query = supabase.from('subscriptions').select('*');
      
      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }
      
      const { data: subscriptions } = await query;
      
      if (subscriptions) {
        // Only count paid subscriptions for revenue
        const paidSubscriptions = subscriptions.filter(s => s.payment_status === 'paid');
        const monthly = paidSubscriptions.filter(s => s.plan_type === 'monthly');
        const annual = paidSubscriptions.filter(s => s.plan_type === 'annually');
        
        setSubscriptionStats({
          monthlyActive: monthly.filter(s => s.status === 'active').length,
          monthlyRevenue: monthly.reduce((sum, s) => sum + Number(s.amount), 0),
          annualActive: annual.filter(s => s.status === 'active').length,
          annualRevenue: annual.reduce((sum, s) => sum + Number(s.amount), 0),
          totalSubscriptions: paidSubscriptions.length,
        });
      }
      
      setLoading(false);
    };

    load();
  }, [adminLoading, isAdmin, fetchStats, dateRange]);

  const handleExportCSV = () => {
    const usersCSV = [
      ['Name', 'Email', 'Mobile', 'Plan', 'Signup Date (IST)'],
      ...users.map((u) => [
        u.full_name || '',
        u.email || '',
        u.phone || '',
        u.plan,
        formatIndianDate(u.created_at),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([usersCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synka-users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate orange stats from orders - only payment success orders
  const paidOrders = orders.filter(o => o.status === 'payment_success' || o.status === 'placed' || o.status === 'dispatched' || o.status === 'delivered');
  const orangeMonthlyOrders = paidOrders.filter(o => 
    o.product_type === 'orange_monthly' || 
    (o.product_type === 'orange_upgrade' && (o as any).billing_cycle === 'monthly')
  );
  const orangeAnnualOrders = paidOrders.filter(o => 
    o.product_type === 'orange_annually' || 
    o.product_type === 'orange_annual' ||
    (o.product_type === 'orange_upgrade' && (o as any).billing_cycle !== 'monthly')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>All time</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <Button onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* User Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-3">User Statistics</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Free Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.freeUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orange Users</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats.orangeUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Orange Subscription Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Orange Subscription Statistics</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Active</CardTitle>
              <CalendarDays className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{subscriptionStats.monthlyActive}</div>
              <p className="text-xs text-muted-foreground">
                {orangeMonthlyOrders.length} paid orders
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                ₹{subscriptionStats.monthlyRevenue.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-muted-foreground">recurring/month</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annual Active</CardTitle>
              <CalendarCheckIcon className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{subscriptionStats.annualActive}</div>
              <p className="text-xs text-muted-foreground">
                {orangeAnnualOrders.length} paid orders
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annual Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                ₹{subscriptionStats.annualRevenue.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-muted-foreground">recurring/year</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Card Order Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Card Order Statistics (Paid Only)</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid Card Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pvcOrders + stats.metalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PVC Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pvcOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Metal Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.metalOrders}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
