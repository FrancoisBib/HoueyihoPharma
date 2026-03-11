'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Pill, 
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Clock,
  History,
  Shield,
  Building2,
  CreditCard,
  Package,
  Phone,
  Mail,
  UserCircle,
  Smartphone,
  Check,
  MapPin,
  Truck,
  Store,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore, CartItem } from '@/store/cart-store';
import { useHistoryStore, SearchHistoryItem } from '@/store/history-store';

// Types
interface MedicationResult {
  success: boolean;
  medicationName: string;
  supplier: string;
  available: boolean;
  price: number | null;
  currency: string | null;
  deliveryTime: string | null;
  productUrl: string | null;
  error?: string;
  timestamp: string;
}

interface SearchResponse {
  success: boolean;
  query: string;
  results: MedicationResult[];
  timestamp: string;
}

// Supplier credentials form
function CredentialsForm({ onConfigured }: { onConfigured: () => void }) {
  const [supplier, setSupplier] = useState<'laborex' | 'ubipharm'>('laborex');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/configure-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier, username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Credentials configured for ${supplier}` });
        onConfigured();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to configure credentials' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to connect to server' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Shield className="h-4 w-4 text-amber-600" />
        Supplier Credentials
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={supplier === 'laborex' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSupplier('laborex')}
            className="flex-1 text-xs"
          >
            Laborex
          </Button>
          <Button
            type="button"
            variant={supplier === 'ubipharm' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSupplier('ubipharm')}
            className="flex-1 text-xs"
          >
            Ubipharm
          </Button>
        </div>

        <Input
          type="text"
          placeholder="Username / Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="h-9"
        />
        
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-9"
        />

        {message && (
          <p className={`text-xs ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}

        <Button type="submit" disabled={loading} size="sm" className="w-full">
          {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Save Credentials
        </Button>
      </form>
    </div>
  );
}

// Cart item component for drawer
function CartDrawerItem({ 
  item, 
  onRemove,
  onUpdateQuantity 
}: { 
  item: CartItem; 
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
}) {
  const supplierNames: Record<string, string> = {
    laborex: 'Laborex',
    ubipharm: 'Ubipharm',
  };

  const totalPrice = item.price * item.quantity;

  return (
    <div className="flex gap-4 border-b pb-4">
      <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Pill className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium truncate">{item.medicationName}</h4>
          <Button 
            className="h-6 w-6 shrink-0" 
            size="icon" 
            variant="ghost"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{supplierNames[item.supplier] || item.supplier}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <span className="text-sm font-semibold">
            {totalPrice.toLocaleString('fr-FR')} {item.currency}
          </span>
        </div>
      </div>
    </div>
  );
}

// Hook to track if component is mounted (for hydration safety)
function useMounted() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // This is a standard pattern for hydration safety - setting mounted state
    // after initial render to avoid hydration mismatch with localStorage-persisted stores
    // This is intentional and necessary for client-side only rendering of persisted state
    /* eslint-disable react-hooks/set-state-in-effect */
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  
  return mounted;
}

// Cart drawer component
function CartDrawer({ 
  open, 
  onOpenChange, 
  onCheckout 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
}) {
  const { items, getTotalItems, getTotalPrice, removeItem, updateQuantity, clearCart } = useCartStore();
  const mounted = useMounted();
  
  const total = getTotalItems();
  const price = getTotalPrice();

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {mounted && total > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
              {total}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
          </DrawerTitle>
          <DrawerDescription>
            {mounted ? total : 0} item{total !== 1 ? 's' : ''} in your cart
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Your cart is empty</p>
              <p className="text-sm mt-1">Add medications to start shopping</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {items.map((item) => (
                  <CartDrawerItem 
                    key={item.id} 
                    item={item} 
                    onRemove={() => removeItem(item.id)}
                    onUpdateQuantity={(quantity) => updateQuantity(item.id, quantity)}
                  />
                ))}
              </div>
              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{price.amount.toLocaleString('fr-FR')} {price.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Total</span>
                  <span>{price.amount.toLocaleString('fr-FR')} {price.currency}</span>
                </div>
              </div>
            </>
          )}
        </div>
        {items.length > 0 && (
          <DrawerFooter>
            <DrawerClose asChild>
              <Button className="gap-2" onClick={onCheckout}>
                <CreditCard className="h-4 w-4" />
                Checkout
              </Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button variant="outline">Continue Shopping</Button>
            </DrawerClose>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground"
              onClick={clearCart}
            >
              Clear Cart
            </Button>
          </DrawerFooter>
        )}
        {items.length === 0 && (
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Continue Shopping</Button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}

// Payment method type
type PaymentMethod = 'mtn' | 'celtis' | 'moov';
type DeliveryMethod = 'delivery' | 'pickup';

// Pharmacy data
const pharmacies: { id: string; name: string; address: string; hours: string }[] = [
  { id: 'new-houeyiho', name: 'NEW HOUEYIHO PHARMACY', address: 'Houeyiho, Cotonou', hours: '8h - 21h' },
];

// Payment drawer component
function PaymentDrawer({ 
  open, 
  onOpenChange,
  onPaymentSuccess 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess: () => void;
}) {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mtn');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [selectedPharmacy, setSelectedPharmacy] = useState('new-houeyiho');
  const [pharmacyDialogOpen, setPharmacyDialogOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');

  const price = getTotalPrice();

  const selectedPharmacyData = pharmacies.find(p => p.id === selectedPharmacy);

  const paymentMethods: { id: PaymentMethod; name: string; icon: React.ReactNode; color: string }[] = [
    { id: 'mtn', name: 'MTN Mobile Money', icon: <span className="font-bold text-yellow-600">M</span>, color: 'bg-yellow-100 border-yellow-300' },
    { id: 'celtis', name: 'Celtis Cash', icon: <span className="font-bold text-blue-600">C</span>, color: 'bg-blue-100 border-blue-300' },
    { id: 'moov', name: 'Moov Money', icon: <span className="font-bold text-red-600">M</span>, color: 'bg-red-100 border-red-300' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !firstName || !lastName || !phone) {
      return;
    }

    setStep('processing');

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2500));

    setStep('success');

    // Auto close after success
    setTimeout(() => {
      clearCart();
      onPaymentSuccess();
      onOpenChange(false);
      setStep('form');
      setEmail('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setDeliveryAddress('');
    }, 2000);
  };

  const resetForm = () => {
    setStep('form');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent>
        {step === 'form' && (
          <>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </DrawerTitle>
              <DrawerDescription>
                Complete your order with Mobile Money
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Order Summary */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">Order Summary</p>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.medicationName} x{item.quantity}</span>
                        <span>{(item.price * item.quantity).toLocaleString('fr-FR')} {item.currency}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t text-sm">
                    <span>Total</span>
                    <span className="text-primary">{price.amount.toLocaleString('fr-FR')} {price.currency}</span>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Personal Information
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-xs">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Jean"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="h-10"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Dupont"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="h-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Method */}
                <div className="space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Delivery Method
                  </p>
                  <RadioGroup value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as DeliveryMethod)}>
                    <div className="space-y-2">
                      {/* Home Delivery */}
                      <Label
                        htmlFor="delivery"
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          deliveryMethod === 'delivery' 
                            ? 'bg-green-50 border-green-300 dark:bg-green-950/20' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <RadioGroupItem value="delivery" id="delivery" />
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Truck className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium">Home Delivery</span>
                          <p className="text-xs text-muted-foreground">Delivered to your address</p>
                        </div>
                      </Label>

                      {/* Pharmacy Pickup */}
                      <Label
                        htmlFor="pickup"
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          deliveryMethod === 'pickup' 
                            ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/20' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <RadioGroupItem value="pickup" id="pickup" />
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Store className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium">Pharmacy Pickup</span>
                          <p className="text-xs text-muted-foreground">Pick up at a pharmacy</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Delivery Address - for Home Delivery */}
                {deliveryMethod === 'delivery' && (
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs">Delivery Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <textarea
                        id="address"
                        placeholder="Enter your full delivery address..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Include landmarks or specific directions if needed
                    </p>
                  </div>
                )}

                {/* Pharmacy Selection - for Pickup */}
                {deliveryMethod === 'pickup' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Select a Pharmacy</Label>
                    <Dialog open={pharmacyDialogOpen} onOpenChange={setPharmacyDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-auto py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Store className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium">{selectedPharmacyData?.name}</p>
                              <p className="text-xs text-muted-foreground">{selectedPharmacyData?.address}</p>
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Store className="h-5 w-5" />
                            Select a Pharmacy
                          </DialogTitle>
                          <DialogDescription>
                            Choose a pharmacy for pickup
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 mt-2">
                          {pharmacies.map((pharmacy) => (
                            <button
                              key={pharmacy.id}
                              onClick={() => {
                                setSelectedPharmacy(pharmacy.id);
                                setPharmacyDialogOpen(false);
                              }}
                              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                selectedPharmacy === pharmacy.id 
                                  ? 'bg-primary/5 border-primary' 
                                  : 'hover:bg-muted/50 border-transparent'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                  <Store className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">{pharmacy.name}</p>
                                    {selectedPharmacy === pharmacy.id && (
                                      <Check className="h-4 w-4 text-primary" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">{pharmacy.address}</p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3" />
                                    {pharmacy.hours}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {/* Payment Method */}
                <div className="space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Payment Method
                  </p>
                  <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    <div className="space-y-2">
                      {paymentMethods.map((method) => (
                        <Label
                          key={method.id}
                          htmlFor={method.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            paymentMethod === method.id 
                              ? `${method.color} border-primary` 
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <RadioGroupItem value={method.id} id={method.id} />
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                            {method.icon}
                          </div>
                          <span className="text-sm font-medium">{method.name}</span>
                        </Label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+229 90 00 00 00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9 h-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You will receive a payment prompt on this number
                  </p>
                </div>
              </form>
            </div>
            <div className="border-t p-4 space-y-3">
              <Button 
                className="w-full h-11" 
                onClick={handleSubmit}
                disabled={!email || !firstName || !lastName || !phone || (deliveryMethod === 'delivery' && !deliveryAddress.trim())}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay {price.amount.toLocaleString('fr-FR')} {price.currency}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full" onClick={resetForm}>
                  Cancel
                </Button>
              </DrawerClose>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Smartphone className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary" />
            </div>
            <h3 className="mt-6 text-lg font-semibold">Processing Payment</h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Please check your phone and enter your PIN to confirm the payment
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Amount: <span className="font-semibold">{price.amount.toLocaleString('fr-FR')} {price.currency}</span>
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
            >
              <Check className="h-10 w-10 text-green-600" />
            </motion.div>
            <h3 className="mt-6 text-lg font-semibold text-green-600">Payment Successful!</h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Your order has been confirmed. You will receive a confirmation SMS shortly.
            </p>
            
            {/* Delivery Info */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 w-full max-w-xs">
              {deliveryMethod === 'delivery' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Truck className="h-4 w-4 text-green-600" />
                    <span>Home Delivery</span>
                  </div>
                  {deliveryAddress && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {deliveryAddress}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Store className="h-4 w-4 text-blue-600" />
                    <span>Pharmacy Pickup</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pharmacies.find(p => p.id === selectedPharmacy)?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pharmacies.find(p => p.id === selectedPharmacy)?.address}
                  </p>
                </div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              Total paid: <span className="font-semibold">{price.amount.toLocaleString('fr-FR')} {price.currency}</span>
            </p>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

// Profile drawer component
function ProfileDrawer({ 
  credentialsConfigured,
  onConfigured 
}: { 
  credentialsConfigured: boolean;
  onConfigured: () => void;
}) {
  const { items: historyItems, clearHistory } = useHistoryStore();

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button className="relative" size="icon" variant="ghost">
          <User className="h-5 w-5" />
          {credentialsConfigured && (
            <Badge className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center p-0 bg-green-500" />
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </DrawerTitle>
          <DrawerDescription>
            Manage your settings and view search history
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y">
            {/* Credentials Configuration */}
            <div className="p-4 hover:bg-muted/30">
              <CredentialsForm onConfigured={onConfigured} />
            </div>

            {/* Search History Section */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <History className="h-4 w-4" />
                  Search History
                </div>
                {historyItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="text-xs text-muted-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {historyItems.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <History className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No search history yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyItems.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full ${item.foundAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize truncate">{item.query}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {item.resultsCount}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* About Section */}
            <div className="p-4 hover:bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="mt-2 h-2 w-2 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">Our Suppliers</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Laborex Benin</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Ubipharm Benin</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t p-4">
          <DrawerClose asChild>
            <Button className="w-full" variant="outline">
              Close
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Result card component
function ResultCard({ 
  result, 
  index,
  onAddToCart,
  onBuyNow
}: { 
  result: MedicationResult; 
  index: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
}) {
  const supplierNames: Record<string, string> = {
    laborex: 'Laborex Benin',
    ubipharm: 'Ubipharm Benin',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`overflow-hidden ${
        result.success && result.available 
          ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800' 
          : result.success && !result.available
          ? 'border-gray-200 bg-gray-50 dark:bg-gray-950/20 dark:border-gray-800'
          : 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{supplierNames[result.supplier] || result.supplier}</CardTitle>
            </div>
            {result.success ? (
              result.available ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Available
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Out of Stock
                </Badge>
              )
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Product</p>
            <p className="font-medium">{result.medicationName}</p>
          </div>

          {result.price !== null && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xl">
                {result.price.toLocaleString('fr-FR')} {result.currency || 'FCFA'}
              </span>
            </div>
          )}

          {result.deliveryTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Delivery: {result.deliveryTime}</span>
            </div>
          )}

          {result.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Error: {result.error}
            </p>
          )}

          {/* Action Buttons */}
          {result.success && result.available && result.price !== null && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={onAddToCart}
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
              <Button 
                className="gap-2"
                onClick={onBuyNow}
              >
                <CreditCard className="h-4 w-4" />
                Buy Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Main application
export default function MedicationSearchApp() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  
  const { addItem } = useCartStore();
  const { items: historyItems, addSearch } = useHistoryStore();
  const mounted = useMounted();

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/search-medication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationName: query.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
        
        // Add to search history
        addSearch(
          query.trim(),
          data.results.filter((r: MedicationResult) => r.available).length,
          data.results.some((r: MedicationResult) => r.available)
        );
      } else {
        setError(data.error || 'Failed to search for medication');
      }
    } catch {
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query, addSearch]);

  const handleAddToCart = useCallback((result: MedicationResult) => {
    if (result.price === null) return;
    
    addItem({
      medicationName: result.medicationName,
      supplier: result.supplier,
      price: result.price,
      currency: result.currency || 'FCFA',
    });
  }, [addItem]);

  const handleBuyNow = useCallback((result: MedicationResult) => {
    if (result.price === null) return;
    
    addItem({
      medicationName: result.medicationName,
      supplier: result.supplier,
      price: result.price,
      currency: result.currency || 'FCFA',
    });
    
    // Open the cart drawer
    setCartOpen(true);
  }, [addItem]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-950 dark:to-gray-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/houeyiho.png" 
              alt="Houeyiho" 
              className="h-10 w-auto" 
            />
          </div>
          <div className="flex items-center gap-1">
            <CartDrawer 
              open={cartOpen} 
              onOpenChange={setCartOpen}
              onCheckout={() => setPaymentOpen(true)} 
            />
            <ProfileDrawer 
              credentialsConfigured={credentialsConfigured}
              onConfigured={() => setCredentialsConfigured(true)}
            />
          </div>
        </div>
      </header>

      {/* Payment Drawer */}
      <PaymentDrawer 
        open={paymentOpen} 
        onOpenChange={setPaymentOpen}
        onPaymentSuccess={() => setPaymentOpen(false)}
      />

      <main className="container mx-auto px-4 py-6 max-w-2xl flex-1">
        {/* Search Section */}
        <Card className="mb-4 shadow-lg border-0">
          <CardContent className="pt-5 pb-4">
            <div className="text-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">Find Your Medication</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Search across verified pharmaceutical suppliers in Bénin
              </p>
            </div>
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter medication name (e.g., Doliprane, Efferalgan)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 h-11 text-base"
                  disabled={loading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base" 
                disabled={loading || !query.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Search Medication
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="mb-4 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm">{error}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold">Results for &quot;{results.query}&quot;</h3>
                <Badge variant="outline" className="text-xs">
                  {results.results.filter(r => r.available).length} available
                </Badge>
              </div>

              {results.results.filter(r => r.available).length > 0 ? (
                <div className="space-y-3">
                  {results.results
                    .filter(r => r.available)
                    .map((result, index) => (
                      <ResultCard 
                        key={`${result.supplier}-${index}`} 
                        result={result} 
                        index={index}
                        onAddToCart={() => handleAddToCart(result)}
                        onBuyNow={() => handleBuyNow(result)}
                      />
                    ))}
                </div>
              ) : (
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
                  <CardContent className="py-8 text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3">
                      <XCircle className="h-7 w-7 text-orange-500" />
                    </div>
                    <h4 className="font-semibold text-base mb-1">Not Available</h4>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      This medication is currently not available at any of our suppliers.
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Try searching for an alternative or check back later.
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Initial State */}
        {!results && !error && !loading && (
          <>
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Pill className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-base mb-1">Start Your Search</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Enter a medication name to check availability across Laborex Benin and Ubipharm Benin
                </p>
              </CardContent>
            </Card>

            {/* Recent Searches */}
            {mounted && historyItems.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recent Searches
                  </h3>
                </div>
                <div className="space-y-2">
                  {historyItems.slice(0, 10).map((item) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => {
                        setQuery(item.query);
                      }}
                      className="w-full text-left p-3 rounded-lg bg-white dark:bg-gray-900 border hover:border-primary hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${item.foundAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="text-sm font-medium capitalize">{item.query}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.timestamp).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {item.resultsCount} result{item.resultsCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white/50 dark:bg-gray-950/50">
        <div className="container mx-auto px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Houeyiho Bénin - Real-time medication availability checker
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Data verified directly from supplier platforms
          </p>
        </div>
      </footer>
    </div>
  );
}
