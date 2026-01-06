export interface Deal {
  id: string;
  title: string;
  description: string;
  image_url: string;
  original_price: number;
  deal_price: number;
  stock_quantity: number;
  sold_quantity: number;
  expires_at: string;
  is_active: boolean;
  category_id: string;
  created_at: string;
  categories?: Category;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface CartItem {
  id: string;
  user_id: string;
  deal_id: string;
  quantity: number;
  created_at: string;
  deals?: Deal;
}

export interface Order {
  id: string;
  user_id: string;
  deal_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  shipping_address: any;
  created_at: string;
  deals?: Deal;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone_number: string | null;
  shipping_address: any | null;
  created_at: string;
}

export interface LoyaltyAccount {
  id: string;
  user_id: string;
  points_balance: number;
  lifetime_points_earned: number;
  lifetime_points_spent: number;
  tier_level: string;
}
