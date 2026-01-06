# Kokaa Vendor Portal - Complete Guide

## Overview

The Vendor Portal is a separate, dedicated platform for businesses to manage their deals, track performance, and gain insights into customer demand. It's completely isolated from the Admin Panel and provides vendors with everything they need to succeed on Kokaa.

## Key Features

### 1. Vendor Application System
- Simple registration process
- Admin approval workflow
- Business verification
- Status tracking

### 2. Vendor Dashboard
- Total deals created
- Total sales (units sold)
- Total revenue earned (€)
- Total views and clicks
- Conversion rate metrics
- Deal performance table

### 3. Deal Management
- Create new deals with form
- Edit existing deals
- Activate/deactivate deals
- Track stock levels
- Monitor sales per deal
- View deal-specific metrics

### 4. Search Insights
- See what customers are searching for in your category
- Search frequency counts
- Price expectations from customers
- Location-based demand
- High-demand opportunity alerts

### 5. Pricing Recommendations
- Data-driven pricing suggestions
- Customer budget ranges
- Optimal discount percentages
- Category-specific recommendations
- Market demand indicators

## How It Works

### Vendor Registration Flow

```
1. User visits Kokaa → Signs up with email/password
2. User sees "Become a Vendor" application form
3. User fills out:
   - Business name
   - Business description
   - Contact email
   - Phone number (optional)
   - Website (optional)
   - Why they want to join
4. Application submitted → Status: "Pending"
5. Admin reviews application in Admin Panel
6. Admin approves → Vendor gets access
7. Vendor profile created with is_verified = true
8. Vendor can now log in and access portal
```

### Access Control

**Admin Panel** (for platform operators):
- URL: Main app with admin role
- Access: Only users with role = 'admin'
- Features: ALL deals, ALL analytics, vendor applications

**Vendor Portal** (for business owners):
- URL: Main app with vendor role
- Access: Only users with role = 'vendor'
- Features: ONLY their deals, ONLY their analytics

**Customer View** (for buyers):
- URL: Main app (default)
- Access: Users with role = 'customer' or not logged in
- Features: Browse deals, purchase, reviews

## Database Schema

### vendor_profiles
```sql
- id: UUID
- user_id: References auth.users (UNIQUE)
- business_name: Text (required)
- business_description: Text
- business_logo_url: Text
- business_address: Text
- business_phone: Text
- business_email: Text
- business_website: Text
- tax_id: Text
- is_verified: Boolean (default false)
- verification_date: Timestamp
- total_deals_created: Integer (auto-updated)
- total_sales: Integer (auto-updated)
- total_revenue: Decimal (auto-updated)
- average_rating: Decimal
```

### vendor_applications
```sql
- id: UUID
- user_id: References auth.users
- business_name: Text (required)
- business_description: Text (required)
- business_email: Text (required)
- business_phone: Text
- business_website: Text
- why_join: Text (required)
- status: Enum (pending, approved, rejected)
- reviewed_by: UUID (admin who reviewed)
- review_notes: Text
- reviewed_at: Timestamp
```

### deals (updated)
```sql
- ... existing columns ...
- vendor_id: UUID (references auth.users)
  - Links deal to vendor who created it
  - NULL for admin-created deals
  - Required for vendor-created deals
```

### user_profiles (updated)
```sql
- ... existing columns ...
- role: Text (admin, vendor, customer)
  - Determines which interface user sees
  - Default: 'customer'
  - Set to 'vendor' when application approved
```

## Security & Permissions

### Row Level Security (RLS)

**Deals Table**:
- Vendors can only CREATE deals for themselves
- Vendors can only UPDATE/DELETE their own deals
- Admins can manage ALL deals
- Public can view active deals

**Vendor Profiles**:
- Vendors can view/update their own profile
- Admins can view all profiles
- Customers cannot see vendor profiles

**Deal Metrics**:
- Vendors can only see metrics for their deals
- Admins can see all metrics
- Calculated via JOIN on vendor_id

### Automatic Stats Updates

```sql
-- Trigger updates vendor_profiles when deals change
CREATE TRIGGER trigger_update_vendor_stats
  AFTER INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_profile_stats();
```

This automatically keeps:
- total_deals_created
- total_sales
- total_revenue

...up to date in real-time!

## Admin Workflow

### Approving Vendor Applications

**In Admin Panel**:
1. Navigate to "Vendor Applications" section (TODO: add this tab)
2. Review pending applications
3. Check business details, description, motivation
4. Click "Approve" or "Reject"
5. Add optional review notes

**What Happens on Approval**:
```sql
CALL approve_vendor_application(application_id);
```

This function:
1. Updates application status to 'approved'
2. Sets user_profiles.role = 'vendor'
3. Creates vendor_profile with is_verified = true
4. Records admin who approved and timestamp

**What Vendor Sees**:
- Next login → Automatically redirected to Vendor Portal
- Can now create deals
- Has access to analytics

## Vendor User Experience

### First Login (Not Approved)

```
┌─────────────────────────────────┐
│   Become a Kokaa Vendor         │
│                                 │
│   [Application Form]            │
│                                 │
│   Business Name: ________       │
│   Description: _________        │
│   Email: _______________        │
│   ...                           │
│                                 │
│   [Submit Application]          │
└─────────────────────────────────┘
```

### After Submission

```
┌─────────────────────────────────┐
│   Application Under Review      │
│                                 │
│   ⏳ Pending                    │
│                                 │
│   We'll review your application │
│   within 2-3 business days      │
│                                 │
│   [Sign Out]                    │
└─────────────────────────────────┘
```

### After Approval

```
┌────────────────────────────────────────┐
│  Kokaa Vendor                          │
│  [Dashboard] [Deals] [Insights] [Pricing] │
├────────────────────────────────────────┤
│                                        │
│  Vendor Dashboard                      │
│  Track your performance and insights   │
│                                        │
│  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │  📦 3  │ │  🛒 45 │ │ €2,150 │   │
│  │ Deals  │ │ Sales  │ │Revenue │   │
│  └────────┘ └────────┘ └────────┘   │
│                                        │
│  Deal Performance:                     │
│  ┌──────────────────────────────────┐ │
│  │ Title  │ Sold │ Views │ Conv %  │ │
│  ├──────────────────────────────────┤ │
│  │ Spa Day│  15  │  450  │  3.3%   │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

## Vendor Dashboard Features

### Overview Stats Cards

1. **Total Deals**
   - Count of all deals (active + inactive)
   - Shows "Active listings"

2. **Total Sales**
   - Sum of sold_quantity across all deals
   - Shows "Units sold"

3. **Total Revenue**
   - Sum of (sold_quantity × deal_price)
   - Shows "€X,XXX.XX All-time earnings"

4. **Total Views**
   - Sum of view_count from deal_metrics
   - Shows "Deal page views"

5. **Total Clicks**
   - Sum of click_count from deal_metrics
   - Shows "Buy button clicks"

6. **Conversion Rate**
   - (total_sales / total_views × 100)
   - Shows "Views to sales"
   - Color coded:
     - Green: >5%
     - Yellow: 2-5%
     - Red: <2%

### Deal Performance Table

Columns:
- Deal title
- Units sold
- Stock remaining
- Price per unit
- Total revenue
- View count
- Click count
- Conversion % (color coded)

Allows vendors to:
- See which deals perform best
- Identify low performers
- Compare pricing strategies
- Optimize inventory

## Search Insights

### What Vendors See

```
Search Insights
What customers are searching for in your category

┌────────────────────────────────────────────┐
│ 1. "spa day for couples in Limassol"      │
│    🔍 12 searches                          │
│    🏷️ spa_wellness                         │
│    📍 Limassol                             │
│    💰 ~€100 avg. budget                    │
│    [HIGH demand]                           │
│                                            │
│    💡 Opportunity: High demand for this    │
│    search term. Consider creating a deal   │
│    that matches this customer need.        │
├────────────────────────────────────────────┤
│ 2. "massage packages paphos"              │
│    🔍 8 searches                           │
│    ...                                     │
└────────────────────────────────────────────┘
```

### How It Works

1. Customers use AI chatbot to search
2. Searches are categorized by AI
3. Stored in `unmet_requests` if no match found
4. Aggregated in `vendor_search_insights` by category
5. Vendors see searches relevant to their business

### Vendor Value

- Know exactly what customers want
- See price expectations
- Identify high-demand opportunities
- Target specific locations
- Create deals that will sell

## Pricing Recommendations

### What Vendors See

```
Pricing Recommendations
Data-driven pricing insights based on customer demand

┌────────────────────────────────────────────┐
│  Spa & Wellness  [HIGH Demand - 24 searches]│
├────────────────────────────────────────────┤
│  Min Price    Recommended    Max Price      │
│    €40            €56           €150        │
│                   ↑                         │
│            30% off market average          │
│                                            │
│  💡 Pricing Strategy Insights:             │
│  • Customers search for €40 - €150        │
│  • Average budget: €80                     │
│  • Sweet spot: €56 (30% discount)         │
│  • Price below €67 to maximize volume     │
│                                            │
│  ⚠️ Market Opportunity                     │
│  24 customers actively searching. Price    │
│  competitively to capture this demand.     │
└────────────────────────────────────────────┘
```

### Calculation Logic

```javascript
// Based on market_demand table
const recommendedPrice = avgPriceMentioned × 0.70; // 30% off

// Price ranges from customer searches
minPrice = min(prices_mentioned_in_searches)
maxPrice = max(prices_mentioned_in_searches)
avgPrice = avg(prices_mentioned_in_searches)
```

### Vendor Value

- Remove guesswork from pricing
- Maximize conversion rates
- Stay competitive
- Based on real customer data
- Category-specific insights

## Deal Creation Form

### Fields

**Required**:
- Title: "Luxury Spa Day Package"
- Short Description: "One line summary"
- Full Description: "Detailed description..."
- Original Price: €100.00
- Deal Price: €70.00 (auto-calculates 30% discount)
- Stock Quantity: 50
- Category: Dropdown (Hotels, Spa, Experiences, Dining, Retail)

**Optional**:
- Image URL: (defaults to placeholder)
- Start Time: (defaults to now)
- End Time: (defaults to 7 days from now)

**Auto-Calculated**:
- discount_percentage: ((original - deal) / original × 100)
- sold_quantity: 0
- vendor_id: current user
- is_active: true

### Validation

- Deal price must be < Original price
- Stock quantity must be > 0
- Vendor must be verified
- All required fields must be filled

### On Submit

```sql
INSERT INTO deals (
  vendor_id,
  title,
  description,
  -- ... other fields
) VALUES (
  current_user_id,
  -- ... values
);
```

Automatically triggers:
- `update_vendor_profile_stats()` function
- Updates vendor's total_deals_created
- Deal appears in vendor dashboard
- Deal visible to customers (if active)

## Managing Deals

### Activate/Deactivate

- Toggle button on each deal card
- Updates `is_active` field
- Active deals shown to customers
- Inactive deals hidden from marketplace
- Useful for seasonal offers

### Edit Deal

- Click edit icon
- Opens form with current values
- Can update all fields except vendor_id
- Recalculates discount_percentage
- Updates immediately

### Delete Deal

- Click delete icon
- Confirmation dialog
- Permanently removes deal
- Updates vendor stats
- Cannot be undone

### View Performance

- Click eye icon
- Shows detailed metrics:
  - Daily views
  - Click-through rate
  - Revenue breakdown
  - Customer reviews
  - Purchase history

## Integration with Main Platform

### How Customers See Vendor Deals

1. Customer browses main Kokaa marketplace
2. Sees ALL deals (admin + vendor created)
3. No distinction visible to customer
4. Same purchase flow
5. Same quality standards

### Quality Control

Admins can:
- Review vendor deals before activation
- Deactivate problematic deals
- Contact vendors about issues
- Reject future deals from bad actors
- Revoke vendor status if needed

### Revenue Model

**Commission Structure** (TODO: implement):
- Platform takes X% of each sale
- Tracked via `orders` table
- vendor_id links to vendor_profiles
- Calculate: order.total_price × commission_rate
- Pay vendors: total_revenue - commission

## Analytics Deep Dive

### Conversion Funnel

```
View Deal → Click Buy → Complete Purchase

Example:
1000 views → 100 clicks (10% CTR) → 30 purchases (30% of clicks, 3% overall)
```

### Key Metrics

**Good Performance**:
- View Rate: Views / Impressions > 20%
- Click Rate: Clicks / Views > 10%
- Purchase Rate: Purchases / Clicks > 20%
- Overall Conversion: Purchases / Views > 3%

**Poor Performance**:
- Overall Conversion < 1%
- High views but low clicks = Bad title/image
- High clicks but low purchases = Bad price/description

### Vendor Insights

Vendors can see:
- Which deals convert best
- Optimal price points
- Best categories for their business
- Seasonal trends
- Customer preferences

## Best Practices for Vendors

### 1. Pricing Strategy

✅ **Do**:
- Follow recommended pricing
- Offer at least 30% discount
- Test different price points
- Bundle products for value

❌ **Don't**:
- Price too high (kills conversion)
- Price too low (erodes margin)
- Ignore customer budget data
- Copy competitor prices blindly

### 2. Deal Creation

✅ **Do**:
- Use clear, compelling titles
- Write detailed descriptions
- Use high-quality images
- Set realistic stock levels
- Create urgency with limited stock

❌ **Don't**:
- Be vague about what's included
- Use misleading images
- Overpromise and underdeliver
- Create fake scarcity

### 3. Using Insights

✅ **Do**:
- Check search insights weekly
- Create deals matching high-demand searches
- Target specific locations
- Respond to customer needs

❌ **Don't**:
- Ignore customer search data
- Create random deals
- Dismiss low-demand categories
- Forget to update pricing

### 4. Customer Service

✅ **Do**:
- Honor all deal purchases
- Provide excellent service
- Respond to reviews
- Build reputation

❌ **Don't**:
- Cancel confirmed orders
- Treat deal customers differently
- Ignore negative feedback
- Add hidden fees

## Admin Tools Needed (Phase 3)

### Vendor Application Review

Add to Admin Panel:
```
┌─────────────────────────────────────┐
│ Vendor Applications                 │
├─────────────────────────────────────┤
│ Pending (5)                         │
│                                     │
│ 1. Luxury Spa Cyprus                │
│    Applied: 2 days ago              │
│    [View Details] [Approve] [Reject]│
│                                     │
│ 2. Restaurant Ammos                 │
│    Applied: 1 day ago               │
│    [View Details] [Approve] [Reject]│
└─────────────────────────────────────┘
```

### Vendor Management

```
┌─────────────────────────────────────┐
│ Active Vendors (12)                 │
├─────────────────────────────────────┤
│ Search: ________                    │
│                                     │
│ Luxury Spa Cyprus                   │
│ • 5 deals • €12,450 revenue         │
│ • Rating: 4.8/5                     │
│ [View Profile] [Deactivate]         │
│                                     │
│ Restaurant Ammos                    │
│ • 3 deals • €8,200 revenue          │
│ • Rating: 4.9/5                     │
│ [View Profile] [Deactivate]         │
└─────────────────────────────────────┘
```

## FAQ

**Q: Can vendors see other vendors' data?**
A: No. Vendors only see their own deals, metrics, and analytics.

**Q: Can vendors edit deals after customers purchase?**
A: Vendors can edit description/images, but not price/quantity once sales begin.

**Q: How do vendors get paid?**
A: TODO: Implement payout system in Phase 3.

**Q: Can a vendor become an admin?**
A: No. These are separate roles. Contact platform operator.

**Q: Can vendors respond to customer reviews?**
A: TODO: Add in Phase 3 - vendor review responses.

**Q: What if vendor runs out of stock?**
A: Deal automatically deactivates when stock_quantity = 0.

**Q: Can vendors offer coupons/discounts?**
A: TODO: Implement vendor coupon system in Phase 3.

**Q: Do vendors pay to list deals?**
A: No listing fees. Platform takes commission on sales only.

##Summary

The Vendor Portal provides businesses with:
✅ Separate, dedicated interface
✅ Full deal management
✅ Real-time performance analytics
✅ Customer search insights
✅ Data-driven pricing recommendations
✅ Easy onboarding and approval workflow
✅ Secure, role-based access control

Platform operators get:
✅ Vendor application workflow
✅ Quality control over deals
✅ Commission tracking (TODO)
✅ Vendor performance monitoring
✅ Scalable marketplace platform

Next steps:
1. ✅ Database schema created
2. ✅ Vendor Portal UI built
3. ✅ Analytics integrated
4. ✅ Search insights connected
5. ✅ Pricing recommendations working
6. ⏳ Add vendor application review to Admin Panel
7. ⏳ Implement commission/payout system
8. ⏳ Add vendor review responses
9. ⏳ Create vendor onboarding email sequence
10. ⏳ Build vendor success metrics dashboard

Your Kokaa platform now has a complete vendor marketplace system!
