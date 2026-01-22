import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Check, Sparkles, Package, Loader2, PartyPopper, Clock, Palette, CheckCircle2, Truck, ShieldCheck, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCards } from '@/hooks/useCards';
import { useProfile } from '@/hooks/useProfile';
import { useRazorpay } from '@/hooks/useRazorpay';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Order {
  id: string;
  order_number: string;
  product_type: string;
  quantity: number;
  amount: number;
  status: string;
  created_at: string;
}

const cardOptions = [
  {
    id: 'pvc',
    name: 'NFC Business Card',
    price: 499,
    priceDisplay: '₹499',
    description: 'Smart. Simple. Everyday use.',
    features: [
      'Tap to share (NFC + QR)',
      'Lightweight PVC card',
      'Matte or Glossy finish',
      'Water resistant',
      'Free replacement*',
    ],
    popular: false,
  },
  {
    id: 'metal',
    name: 'Metal NFC Card',
    price: 1499,
    priceDisplay: '₹1,499',
    description: 'Designed to impress. Built to last.',
    features: [
      'Tap to share (NFC + QR)',
      'Solid metal body',
      'Precision laser engraving',
      'Priority delivery',
      'Lifetime durability',
      'Free replacement*',
    ],
    popular: true,
  },
];

const cardVariants = [
  // Metal variants
  {
    id: 'metal-gold',
    name: 'Metal Gold',
    type: 'metal',
    image: '/images/card/metal-nfc-card-gold.jpeg',
  },
  {
    id: 'metal-rose-gold',
    name: 'Metal Rose Gold',
    type: 'metal',
    image: '/images/card/metal-nfc-card-rose-gold.jpeg',
  },
  {
    id: 'metal-silver',
    name: 'Metal Silver',
    type: 'metal',
    image: '/images/card/metal-nfc-card-silver.jpeg',
  },
  {
    id: 'metal-black',
    name: 'Metal Black',
    type: 'metal',
    image: '/images/card/metal-nfc-card-black.jpeg',
  },
  {
    id: 'metal-unsure',
    name: 'Not Sure - We\'ll Suggest Best',
    type: 'metal',
    image: '/images/card/metal-nfc-business-cards.jpeg',
  },
  // PVC variants - White first
  {
    id: 'nfc-white-gloss',
    name: 'NFC White Gloss',
    type: 'pvc',
    image: '/images/card/pvc-nfc-card-white-gloss.jpeg',
    hint: 'Any color can be printed on white',
  },
  {
    id: 'nfc-black-matt',
    name: 'NFC Black Matt',
    type: 'pvc',
    image: '/images/card/pvc-nfc-card-black-matt.jpeg',
  },
  {
    id: 'nfc-black-gloss',
    name: 'NFC Black Gloss',
    type: 'pvc',
    image: '/images/card/pvc-nfc-card-black-gloss.jpeg',
  },
];

const getStatusInfo = (status: string) => {
  // Payment statuses
  if (status === 'paid') {
    return { label: 'Paid - Processing', color: 'default' as const, icon: '✓' };
  }
  if (status === 'payment_failed') {
    return { label: 'Payment Failed', color: 'destructive' as const, icon: '✗' };
  }
  if (status === 'pending' || status === 'created') {
    return { label: 'Pending Payment', color: 'secondary' as const, icon: '⏳' };
  }
  // Dispatch statuses
  if (status === 'Placed') {
    return { label: 'Order Placed', color: 'default' as const, icon: '📦' };
  }
  if (status === 'Approved') {
    return { label: 'Approved', color: 'default' as const, icon: '✓' };
  }
  if (status === 'Dispatched') {
    return { label: 'Dispatched', color: 'default' as const, icon: '🚚' };
  }
  if (status === 'Done') {
    return { label: 'Delivered', color: 'default' as const, icon: '✅' };
  }
  if (status === 'NA') {
    return { label: 'Cancelled', color: 'destructive' as const, icon: '✗' };
  }
  return { label: status, color: 'outline' as const, icon: '' };
};

export default function OrderNFCCard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeCard, cards, loading: cardsLoading } = useCards();
  const { profile } = useProfile();
  const { initiatePayment, loading: paymentLoading } = useRazorpay();

  const [selectedCard, setSelectedCard] = useState('pvc');
  const [selectedVariant, setSelectedVariant] = useState('nfc-white-gloss');
  const [quantity, setQuantity] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
const [orderSuccess, setOrderSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [failedError, setFailedError] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    phone: '',
    address: '',
    pincode: '',
  });

  // Check if user is new (no cards created yet or no profile data)
  const isNewUser = !cardsLoading && cards.length === 0;

  // Filter variants based on selected card type
  const filteredVariants = cardVariants.filter(v => v.type === selectedCard);

  // Update variant when card type changes
  useEffect(() => {
    const firstVariant = cardVariants.find(v => v.type === selectedCard);
    if (firstVariant) {
      setSelectedVariant(firstVariant.id);
    }
  }, [selectedCard]);

  // Fetch user orders
  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      setOrdersLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, product_type, quantity, amount, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data as Order[]);
      }
      setOrdersLoading(false);
    };

    fetchOrders();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('user-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Pre-fill shipping details from profile/card
  useEffect(() => {
    if (activeCard || profile) {
      setShippingAddress(prev => ({
        ...prev,
        name: activeCard?.full_name || profile?.full_name || prev.name,
        phone: activeCard?.phone || profile?.phone || prev.phone,
      }));
    }
  }, [activeCard, profile]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    // Validate form
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.pincode) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all shipping details.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const selectedOption = cardOptions.find(c => c.id === selectedCard);
    const amount = (selectedOption?.price || 0) * quantity;
    const productType = selectedCard === 'pvc' ? 'pvc' : 'metal';

    // Initiate Razorpay payment
    initiatePayment({
      product_type: productType as "pvc" | "metal",
      amount,
      quantity,
      card_variant: selectedVariant,
      onSuccess: (response) => {
        setSubmitting(false);
        setOrderSuccess(true);
        setPaymentFailed(false);
        setFailedError(null);
      },
      onFailure: (error) => {
        setSubmitting(false);
        setPaymentFailed(true);
        setFailedError(error?.message || 'Could not process payment. Please try again.');
      },
    });
  };

  const handleRetryPayment = () => {
    setPaymentFailed(false);
    setFailedError(null);
  };

  const handleNewOrder = () => {
    setOrderSuccess(false);
    setQuantity(1);
    setSelectedCard('pvc');
    setSelectedVariant('nfc-white-gloss');
  };

  if (authLoading || cardsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Payment Failed Screen
  if (paymentFailed) {
    return (
      <div className="w-full py-4 sm:py-6 px-3 sm:px-4 md:px-6 max-w-2xl mx-auto animate-fade-up">
        <Card className="border-destructive/20 bg-gradient-to-b from-destructive/5 to-transparent">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Payment Failed</h1>
              <p className="text-muted-foreground">
                {failedError || 'Your payment could not be processed. Please try again.'}
              </p>
            </div>

            <div className="bg-muted/50 rounded-xl p-6 text-left space-y-3">
              <h3 className="font-semibold text-foreground">What you can do:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Check your payment details and try again
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Ensure sufficient balance in your account
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Try a different payment method
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="gradient" className="flex-1" onClick={handleRetryPayment}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Order Success Screen
  if (orderSuccess) {
    return (
      <div className="w-full py-4 sm:py-6 px-3 sm:px-4 md:px-6 max-w-2xl mx-auto animate-fade-up">
        <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <PartyPopper className="h-10 w-10 text-primary" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">🎉 Order Received!</h1>
              <p className="text-muted-foreground">Thank you for your order</p>
            </div>

            <div className="bg-muted/50 rounded-xl p-6 text-left space-y-4">
              <h3 className="font-semibold text-foreground">What happens next?</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Our team will contact you within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Palette className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">You'll receive card design options created by AI</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Review & approve design</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">We print & dispatch your card</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  📦 <span className="font-medium">Estimated delivery:</span> 5–7 business days after approval
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="gradient" className="flex-1" onClick={handleNewOrder}>
                Place Another Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full py-4 sm:py-6 px-3 sm:px-4 md:px-6 max-w-4xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Order NFC Card</h1>
          <p className="text-muted-foreground">Get your physical smart business card</p>
        </div>
      </div>

      {/* Your Orders Section */}
      {!ordersLoading && orders.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Your Orders</CardTitle>
            </div>
            <CardDescription>Track your NFC card orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-xl border bg-muted/30"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-sm">{order.order_number}</span>
                        <Badge variant="outline" className="uppercase text-xs">
                          {order.product_type === 'pvc' ? 'PVC Card' : 'Metal Card'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Qty: {order.quantity} • ₹{Number(order.amount).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={statusInfo.color}>
                      {statusInfo.icon} {statusInfo.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {ordersLoading && (
        <div className="flex items-center justify-center py-8 mb-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* New user banner */}
      {isNewUser && (
        <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Welcome to Synka!</p>
            <p className="text-sm text-muted-foreground">
              Order your NFC card and your digital card will be created instantly. You can customize it anytime from the My Card section.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Card Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Select Card Type</h2>
          <RadioGroup value={selectedCard} onValueChange={setSelectedCard} className="grid md:grid-cols-2 gap-4">
            {cardOptions.map((option) => (
              <Label
                key={option.id}
                htmlFor={option.id}
                className={cn(
                  'relative flex flex-col p-6 rounded-2xl border-2 cursor-pointer transition-all',
                  selectedCard === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <RadioGroupItem value={option.id} id={option.id} className="sr-only" />
                
                {option.popular && (
                  <span className="absolute -top-3 left-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    Popular
                  </span>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{option.name}</h3>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{option.priceDisplay}</p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {option.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {selectedCard === option.id && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </Label>
            ))}
          </RadioGroup>
        </div>

        {/* Card Variant Selector */}
        <div className="space-y-2">
          <Label htmlFor="card-variant">Select Card Finish</Label>
          <Select value={selectedVariant} onValueChange={setSelectedVariant}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a card variant">
                {selectedVariant && (
                  <div className="flex items-center gap-3">
                    <img 
                      src={cardVariants.find(v => v.id === selectedVariant)?.image} 
                      alt="" 
                      className="w-10 h-6 object-cover rounded"
                    />
                    <span>{cardVariants.find(v => v.id === selectedVariant)?.name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredVariants.map((variant) => (
                <SelectItem key={variant.id} value={variant.id}>
                  <div className="flex items-center gap-3">
                    <img 
                      src={variant.image} 
                      alt={variant.name} 
                      className="w-12 h-8 object-cover rounded"
                    />
                    <div className="flex flex-col">
                      <span>{variant.name}</span>
                      {'hint' in variant && variant.hint && (
                        <span className="text-xs text-muted-foreground">{variant.hint}</span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            Our team will contact you to collect logo, design preferences & branding details.
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">AI Designs Your Card</span> → Our team checks and recommends → You approve → Final approval → Print → Dispatch
          </p>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              -
            </Button>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="10"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.min(10, quantity + 1))}
            >
              +
            </Button>
          </div>
        </div>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shipping Address</CardTitle>
            <CardDescription>Where should we deliver your card?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={shippingAddress.name}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={shippingAddress.phone}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={shippingAddress.address}
                onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                placeholder="House/Flat No., Street, Locality, City, State"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={shippingAddress.pincode}
                onChange={(e) => setShippingAddress({ ...shippingAddress, pincode: e.target.value })}
                placeholder="6-digit pincode"
                maxLength={6}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {cardOptions.find(c => c.id === selectedCard)?.name} × {quantity}
                </span>
                <span className="font-medium">
                  {cardOptions.find(c => c.id === selectedCard)?.priceDisplay}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Variant: {cardVariants.find(v => v.id === selectedVariant)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-primary">Free</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">
                  ₹{((cardOptions.find(c => c.id === selectedCard)?.price || 0) * quantity).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="space-y-3">
          <Button type="submit" variant="gradient" size="xl" className="w-full" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5 mr-2" />
            )}
            {submitting ? 'Placing Order...' : 'Place Order'}
          </Button>
          
          {/* Helper Text */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-primary" />
              Design approval before printing
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-primary" />
              Free replacement available*
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Secure payment
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
