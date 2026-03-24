# Prompt pour Google Stitch - Application Houeyiho

## Project Overview

**Project Name**: Houeyiho (Nouvelle Pharmacie Houeyiho)  
**Type**: Pharmacy E-commerce Web Application  
**Target Market**: Benin, West Africa (French-speaking)  
**Purpose**: Enable users to search, compare, and purchase medications online with mobile money payments

---

## Core Features

### 1. Medication Search
- Search bar with autocomplete
- Filter by supplier (Laborex, Ubipharm)
- Display: medication name, price, availability, delivery time
- Results displayed as cards with supplier badges

### 2. Parapharmacy Store
- Separate section for parapharmaceutical products (wellness, beauty, baby care, medical devices, supplements)
- Category navigation (Beauté, Bébé, Hygiène, Compléments alimentaires, Appareils médicaux)
- Product cards with images, descriptions, prices
- Add to cart functionality
- Featured products carousel

### 3. Shopping Cart
- Unified cart for medications AND parapharmacy products
- Add/remove items
- Quantity adjustment (+/- buttons)
- Real-time total calculation
- Cart icon with item count badge
- Separate sections for prescription meds and parapharmacy items

### 4. Customer Support Chat
- Floating chat widget (bottom-right corner)
- Chat bubble with icon
- Message history display
- Quick reply buttons for common questions
- Support for product inquiries, order tracking, general questions
- Typing indicator and timestamps

### 5. User Authentication
- Login/register forms
- Phone number verification for mobile money
- User profile management

### 6. Checkout & Payment
- Order summary review
- Mobile money operator selection (MTN Benin, Moov Benin)
- Phone number input for payment
- Payment processing via SycaPay API
- Success/failure confirmation screens

### 7. Order Management
- Order history list
- Order status tracking (PENDING, PAID, COMPLETED, CANCELLED)
- Order details view


### 8. Admin Panel (Future)
- Supplier credentials management
- Parapharmacy product management
- Order management dashboard
- Payment transaction monitoring

---

## UI/UX Requirements

### Design Aesthetic
- **Style**: Modern, clean, healthcare-focused
- **Mood**: Trustworthy, professional, accessible
- **Inspiration**: Medical/pharmacy apps like Walgreens, CVS, or local African health platforms

### Color Palette
- **Primary**: Teal/Green (#22c55e) - represents health, medicine, trust
- **Secondary**: Warm yellow/gold accents
- **Background**: Clean white (#ffffff) with subtle gray sections
- **Text**: Dark gray (#1a1a1a) for readability
- **Success**: Green (#22c55e)
- **Error**: Red (#ef4444)
- **Warning**: Amber (#f59e0b)

### Typography
- **Font Family**: Inter (sans-serif), JetBrains Mono (monospace for prices/codes)
- **Headings**: Bold, clear hierarchy
- **Body**: Readable 16px base size

### Layout
- **Header**: Logo, navigation, search bar, cart icon, user menu
- **Hero**: Welcoming banner with search focus
- **Content**: Card-based grids for medications
- **Footer**: Contact info, links, copyright

### Components Needed

#### Pages/Screens:
1. **Homepage** - Hero with search, featured medications, parapharmacy highlights, benefits section
2. **Medication Search Results** - Grid of medication cards with supplier filters
3. **Medication Detail** - Full medication info, add to cart
4. **Parapharmacy Store** - Category navigation, featured products, product listings
5. **Parapharmacy Product Detail** - Product images, description, add to cart
6. **Cart** - Unified cart with separate sections for medications and parapharmacy, quantity controls, checkout button
7. **Checkout** - Order summary, payment method selection, phone input
8. **Payment Processing** - Loading state, payment instructions
9. **Payment Success/Failure** - Confirmation screens
10. **Order History** - List of past orders with status
11. **Login/Register** - Authentication forms
12. **Chat Support** - Full chat interface (also as floating widget)
13. **Admin Dashboard** - Credentials config, product management, order management

#### Reusable Components:
- Search bar with icon and autocomplete
- Medication card (image, name, price, supplier badge, availability)
- Parapharmacy product card (image, name, category badge, price)
- Category navigation card/tab
- Cart item row (with type indicator: medication vs parapharmacy)
- Floating chat widget (bottom-right, expandable)
- Chat message bubble (user and support agent)
- Quick reply buttons
- Button variants (primary, secondary, outline, ghost)
- Input fields (text, phone, password)
- Modal/Dialog for forms
- Toast notifications
- Loading spinners
- Badge/Chip for status and categories
- Tabs for navigation
- Sidebar for admin
- Carousel for featured products

### Responsive Breakpoints
- Mobile: < 640px (single column)
- Tablet: 640px - 1024px (2 columns)
- Desktop: > 1024px (3-4 columns)

---

## Technical Context

### Current Implementation
- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State Management**: Zustand (cart store)
- **Database**: PostgreSQL with Prisma ORM
- **Payment**: SycaPay API (mobile money)

### Key API Endpoints
- `GET /api/search-medication` - Search medications
- `POST /api/configure-credentials` - Configure supplier credentials
- `POST /api/sycapay/auth/login` - SycaPay authentication
- `POST /api/sycapay/payment/process` - Initiate payment
- `POST /api/sycapay/payment/status` - Check payment status

---

## Mobile Money Context (Benin)

Since this is for Benin, the payment flow should be mobile money focused:
- **Operators**: MTN Benin, Moov Benin
- **Currency**: XOF (West African CFA franc)
- **Flow**: Customer enters phone number → receives USSD prompt → confirms payment
- **Display**: Show operator logos, phone number format hints (+229)

---

## Deliverable Requirements

Generate high-fidelity mockups that include:
1. **Color-coded design system** with specified palette
2. **Responsive layouts** for mobile, tablet, and desktop
3. **Component states** (default, hover, active, disabled, loading)
4. **Empty states** (empty cart, no search results, no parapharmacy products)
5. **Error states** (payment failed, out of stock)
6. **Mobile money payment flow** screens
7. **Chat widget** states (collapsed, expanded, message history, quick replies)
8. **Parapharmacy store** with category navigation and product grids

### Style Preferences
- Clean, professional healthcare aesthetic
- Generous whitespace
- Clear visual hierarchy
- Accessible contrast ratios
- Subtle shadows and rounded corners (radius: 0.75rem)
