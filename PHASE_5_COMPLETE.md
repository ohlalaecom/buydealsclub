# Phase 5: Customer Deal Requests & Marketplace Features - Complete

## Overview

Phase 5 introduces a powerful "Ask for a Deal" system that allows customers to request specific products or services they're looking for. Other customers can vote on these requests, and vendors can submit competitive offers. This creates a demand-driven marketplace where vendors know exactly what customers want.

## ✅ What's Been Built

### 1. Customer Deal Request System

**Customer Features**:
- **Request a Deal**: Submit detailed requests for products/services
- **View All Requests**: Browse requests from other customers
- **Vote System**: Vote on requests you also want
- **Track Status**: See pending/in-progress/fulfilled status
- **Budget Range**: Specify expected price range
- **Location Preference**: Request deals in specific areas
- **Urgency Levels**: Low, Normal, High, Urgent priorities
- **Flexible Dates**: Indicate if timing is flexible

**Request Form Fields**:
```typescript
- Title: "What are you looking for?"
- Description: Detailed explanation
- Category: Hotels, Spa, Experiences, Dining, Retail
- Budget Range: Min - Max (€)
- Preferred Location: City/area
- Quantity Needed: How many units
- Urgency: Low / Normal / High / Urgent
- Flexible Dates: Yes/No checkbox
```

**How It Works**:
1. Customer logs in
2. Clicks "Request Deal" button in header (gradient blue/purple)
3. Fills out detailed form
4. Submits request
5. Request appears publicly for others to see and vote on
6. Vendors see the request and can submit offers
7. Customer gets notified when offers arrive

### 2. Deal Request Browser

**Features**:
- **Filter Options**:
  - Most Popular (by votes)
  - Recent (newest first)
  - Urgent (urgent requests only)
  - All Requests

- **Request Cards Show**:
  - Title and description
  - Category badge
  - Urgency level (color-coded)
  - Vote count with thumbs up icon
  - Budget range
  - Preferred location
  - Quantity needed
  - Number of vendor offers
  - User's vote status

- **Voting System**:
  - Click to vote/unvote
  - Real-time vote count updates
  - Vote tracked per user
  - Can't vote twice on same request

- **Status Indicators**:
  - Pending: No offers yet
  - In Progress: Has vendor offers
  - Offers badge: Shows number of vendor bids

### 3. Vendor Request Insights

**New Tab in Vendor Portal**: "Requests"

**Features for Vendors**:
- **See Customer Demands**:
  - All active customer requests
  - Sorted by popularity (vote count)
  - Shows budget expectations
  - Location preferences
  - Quantity needs

- **Submit Competitive Offers**:
  - Offer price
  - Available quantity
  - Detailed description
  - Validity period (3/7/14/30 days)

- **Track Offers**:
  - See which requests you've bid on
  - "Offer Submitted" badge on submitted requests
  - Can't submit duplicate offers

- **Smart Insights**:
  - High-vote requests highlighted
  - Urgent requests visible
  - Budget range shown upfront
  - Location targeting

**Offer Submission Form**:
```typescript
- Your Price (€): What you'll charge
- Quantity Available: How many you can provide
- Offer Valid For: 3/7/14/30 days
- Offer Description: Detailed explanation of what's included
```

### 4. Database Architecture

#### `customer_deal_requests` Table
```sql
- id: UUID (primary key)
- user_id: References auth.users
- title: Text (required)
- description: Text (required)
- category_id: UUID (references categories)
- budget_min: Decimal (optional)
- budget_max: Decimal (optional)
- preferred_location: Text (optional)
- urgency: Enum (low, normal, high, urgent)
- quantity_needed: Integer (default 1)
- flexible_dates: Boolean (default true)
- status: Enum (pending, in_progress, fulfilled, expired)
- vote_count: Integer (auto-updated via trigger)
- view_count: Integer
- offer_count: Integer (auto-updated via trigger)
- fulfilled_by_deal_id: UUID (references deals)
- expires_at: Timestamp (default 30 days)
- created_at: Timestamp
- updated_at: Timestamp
```

#### `deal_request_votes` Table
```sql
- id: UUID (primary key)
- request_id: UUID (references customer_deal_requests)
- user_id: UUID (references auth.users)
- created_at: Timestamp
- UNIQUE constraint on (request_id, user_id)
```

#### `deal_request_offers` Table
```sql
- id: UUID (primary key)
- request_id: UUID (references customer_deal_requests)
- vendor_id: UUID (references auth.users)
- deal_id: UUID (optional - if vendor creates actual deal)
- offer_price: Decimal (required)
- offer_description: Text (required)
- available_quantity: Integer (required)
- valid_until: Timestamp (required)
- status: Enum (pending, accepted, rejected, expired)
- created_at: Timestamp
- updated_at: Timestamp
```

### 5. Automated Triggers

**Vote Count Trigger**:
```sql
CREATE TRIGGER trigger_update_request_vote_count
  AFTER INSERT OR DELETE ON deal_request_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_request_vote_count();
```
- Automatically increments/decrements vote_count
- Real-time updates
- No manual counting needed

**Offer Count Trigger**:
```sql
CREATE TRIGGER trigger_update_request_offer_count
  AFTER INSERT ON deal_request_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_request_offer_count();
```
- Tracks number of vendor offers
- Updates status from 'pending' → 'in_progress' when first offer arrives
- Real-time offer counting

**Request Expiration Function**:
```sql
CREATE FUNCTION expire_old_requests()
  RETURNS void
  AS $$
  UPDATE customer_deal_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
$$;
```
- Can be called via cron job
- Automatically expires 30+ day old requests

### 6. Security (Row Level Security)

**customer_deal_requests**:
- ✅ Anyone can view active requests (not expired)
- ✅ Authenticated users can create requests
- ✅ Users can update their own requests
- ✅ Admins can manage all requests

**deal_request_votes**:
- ✅ Anyone can view votes
- ✅ Authenticated users can vote
- ✅ Users can remove their own votes (unvote)
- ✅ Cannot vote twice on same request (unique constraint)

**deal_request_offers**:
- ✅ Public can view all offers
- ✅ Only verified vendors can create offers
- ✅ Vendors can update their own offers
- ✅ Linked to vendor_profiles for verification

## User Flows

### Customer Requests a Deal

```
1. Customer browsing deals, doesn't find what they want
2. Clicks "Request Deal" button in header
3. Fills out form:
   - Title: "Couples Massage Package in Limassol"
   - Description: "Looking for 90-minute couples massage..."
   - Category: Spa & Wellness
   - Budget: €80 - €120
   - Location: Limassol
   - Urgency: Normal
   - Quantity: 2
4. Submits request
5. Alert: "Your request has been submitted! Vendors will be notified."
6. Request appears in Deal Requests browser
7. Other customers can vote
8. Vendors see request and can make offers
```

### Customer Votes on Request

```
1. Customer clicks "Deal Requests" or sees modal
2. Browses requests
3. Sees: "Luxury Hotel Weekend Package - 15 votes"
4. Thinks: "I want that too!"
5. Clicks thumbs up button
6. Button changes to blue "Voted" state
7. Vote count increases to 16
8. Request priority increases for vendors
```

### Vendor Sees Request & Makes Offer

```
1. Vendor logs in → Opens Vendor Portal
2. Clicks "Requests" tab
3. Sees list of customer requests sorted by votes
4. Notices: "Couples Massage Package - 23 votes"
5. Reads details:
   - Budget: €80-€120
   - Location: Limassol
   - Quantity: 2
   - Urgent
6. Thinks: "I can do this!"
7. Clicks "Submit Offer"
8. Fills form:
   - Price: €95
   - Quantity: 10 available
   - Valid for: 14 days
   - Description: "90-minute Swedish couples massage with aromatherapy..."
9. Submits offer
10. Alert: "Offer submitted successfully! The customer will be notified."
11. Request shows "Offer Submitted" badge
12. Customer gets notification (future feature)
```

## Benefits

### For Customers

✅ **Get What You Want**: Request specific deals you're looking for
✅ **Community Power**: Vote for requests others have made
✅ **Price Transparency**: Specify budget upfront
✅ **Multiple Options**: Vendors compete with offers
✅ **Location-Specific**: Find deals in your area
✅ **Urgency Control**: Set priority level
✅ **No Commitment**: Request doesn't obligate you to buy

### For Vendors

✅ **Know Demand**: See exactly what customers want
✅ **Reduce Risk**: Only create deals with proven demand
✅ **Competitive Advantage**: Be first to submit offers
✅ **Targeted Marketing**: See budgets and locations upfront
✅ **High-Intent Customers**: Voters have shown clear interest
✅ **Multiple Opportunities**: One request can get many responses
✅ **Data-Driven**: Vote counts show market demand

### For Platform

✅ **Increased Engagement**: Customers actively participate
✅ **Better Matching**: Connects supply with demand
✅ **More Deals Created**: Vendors respond to requests
✅ **Community Building**: Voting creates social proof
✅ **Marketplace Liquidity**: Always something happening
✅ **Reduced Search Friction**: Customers don't have to keep checking
✅ **Vendor Activation**: Gives vendors clear action items

## UI/UX Design

### Header Button

**"Request Deal" Button**:
- Gradient blue to purple background
- White text with Send icon
- Prominent placement next to discussion/cart icons
- Always visible to logged-in users
- Responsive: shows icon only on mobile

### Request Form

**Design Principles**:
- Clean, spacious layout
- Clear section headers
- Helper text for each field
- Visual hierarchy
- "How it Works" info box at top
- Required fields marked with *
- Gradient submit button

### Request Cards

**Visual Elements**:
- White background with shadow
- Rounded corners
- Category badge (colored)
- Urgency badge (color-coded)
- Vote count with icon
- Offer count indicator
- Clean typography
- Hover effect (shadow increase)

**Color Coding**:
- Low Priority: Gray
- Normal: Blue
- High Priority: Orange
- Urgent: Red

### Vendor Offer Form

**Inline Design**:
- Appears in blue box within request card
- Grid layout for form fields
- Clear labels
- Dropdown for validity period
- Large submit button
- Cancel option

## Statistics & Metrics

### Track Performance

**Customer Metrics**:
- Total requests submitted
- Average votes per request
- Fulfillment rate (requests → deals)
- Time to first offer
- Popular categories

**Vendor Metrics**:
- Offers submitted
- Offer acceptance rate
- Average response time
- Converted offers (offer → deal)
- Revenue from request-based deals

**Platform Metrics**:
- Active requests
- Total votes
- Vendor participation rate
- Request-to-deal conversion
- Average time to fulfillment

## Future Enhancements (Phase 6)

### Notifications

**Customer Notifications**:
- Email when vendor makes offer
- Push notification for new offers
- Weekly digest of popular requests
- Alert when request fulfilled

**Vendor Notifications**:
- New high-vote requests in their category
- When customer accepts their offer
- Request expiring soon
- Daily/weekly request digest

### Request Matching Algorithm

```typescript
function matchRequestsToVendors(request) {
  // Find vendors in matching category
  // Consider location proximity
  // Check vendor's past deal types
  // Score based on vendor performance
  // Notify top 3-5 matches
}
```

### Offer Acceptance Flow

1. Customer receives multiple offers
2. Can compare offers side-by-side
3. Accepts one offer
4. Vendor automatically creates deal
5. Customer gets direct link to purchase
6. Other offers marked as rejected

### Request Analytics Dashboard

**For Customers**:
- Your active requests
- Offers received
- Popular requests you've voted on
- Request history

**For Vendors**:
- Trending requests
- Requests matching your business
- Your offer performance
- Win rate on accepted offers

### Social Features

- Comment on requests
- Share requests
- Follow requests (get notified of offers)
- Request collections (curated lists)

### Advanced Filters

- Price range filter
- Location radius search
- Urgency filter
- Category multi-select
- Date range
- Sort by votes/offers/recency

## Integration Points

### With AI Chatbot

```javascript
// Chatbot can suggest creating request
if (noMatchingDeals && userSearched) {
  bot.suggest("Couldn't find what you're looking for? Request a custom deal!");
  bot.showRequestForm();
}
```

### With Email Service

```javascript
// Send emails when:
- New offer on your request
- Your offer was accepted
- Request you voted on was fulfilled
- Weekly request digest for vendors
```

### With Analytics

```javascript
// Track:
trackEvent('request_created', { category, budget, urgency });
trackEvent('request_voted', { request_id, vote_count });
trackEvent('offer_submitted', { vendor_id, request_id, price });
trackEvent('offer_accepted', { request_id, vendor_id });
```

## Testing Scenarios

### Happy Path

1. ✅ Customer creates request successfully
2. ✅ Request appears in browser
3. ✅ Other users can vote
4. ✅ Vote count updates correctly
5. ✅ Vendor sees request
6. ✅ Vendor submits offer
7. ✅ Offer appears on request
8. ✅ Request status changes to "in progress"

### Edge Cases

1. ✅ Duplicate vote prevented (unique constraint)
2. ✅ Non-logged-in user can't vote
3. ✅ Non-vendor can't submit offers
4. ✅ Vendor can't submit duplicate offer
5. ✅ Request expires after 30 days
6. ✅ Budget min < max validation
7. ✅ Quantity >= 1 validation

### Error Handling

1. ✅ Form validation for required fields
2. ✅ Error message on failed submission
3. ✅ Loading states during API calls
4. ✅ Graceful handling of missing data
5. ✅ User feedback on all actions

## Performance Optimizations

### Database Indexes

```sql
- idx_deal_requests_status (for filtering active)
- idx_deal_requests_votes (for sorting by popularity)
- idx_deal_requests_category (for category filtering)
- idx_deal_request_votes_user (for checking user votes)
- idx_deal_request_offers_vendor (for vendor's offers)
```

### Query Optimization

- Use `.select()` to limit returned columns
- Implement pagination for large request lists
- Cache popular requests
- Use `.maybeSingle()` for single record queries

### Real-Time Updates

- Trigger functions update counts instantly
- No need for manual recalculation
- Efficient database-level operations

## Summary

Phase 5 adds a powerful demand-driven marketplace feature:

✅ Customers can request custom deals
✅ Community voting system
✅ Vendor competitive bidding
✅ Complete database architecture
✅ Secure RLS policies
✅ Automated triggers for counts
✅ Beautiful UI/UX
✅ Mobile responsive
✅ Integrated into main app and vendor portal

### Key Statistics

- **3 New Database Tables**
- **2 Automated Triggers**
- **8 RLS Policies**
- **3 New UI Components**
- **1 New Header Button**
- **1 New Vendor Tab**

### Impact

This feature transforms Kokaa from a traditional deal site into an interactive marketplace where:
- **Customers drive demand** through requests
- **Community validates interest** through voting
- **Vendors respond efficiently** with targeted offers
- **Platform facilitates matching** between all parties

Your Kokaa platform now has a complete request-offer-fulfillment system that creates a vibrant, demand-driven marketplace! 🚀
