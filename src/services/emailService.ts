import { supabase } from '../lib/supabase';

export const emailService = {
  async sendEmail(params: {
    to: string;
    subject: string;
    emailType: string;
    templateData?: Record<string, any>;
    userId?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Email API error:', result);
        return { success: false, error: result.error || 'Failed to send email' };
      }

      return result;
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error: 'Failed to send email' };
    }
  },

  async subscribeToNewsletter(email: string, userId?: string, source: string = 'website') {
    try {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email: email,
          user_id: userId || null,
          subscribed: true,
          source: source,
          subscribed_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (error) {
        if (error.code === '23505') {
          const { error: updateError } = await supabase
            .from('newsletter_subscribers')
            .update({
              subscribed: true,
              unsubscribed_at: null,
            })
            .eq('email', email);

          if (updateError) {
            console.error('Newsletter resubscribe error:', updateError);
            return { success: false, error: 'Failed to resubscribe to newsletter' };
          }

          try {
            await this.sendEmail({
              to: email,
              subject: 'Welcome to Buy Deals Club Newsletter!',
              emailType: 'newsletter_confirmation',
              templateData: {
                email: email,
                unsubscribeUrl: `${window.location.origin}`,
              },
            });
          } catch (emailError) {
            console.error('Email sending exception:', emailError);
          }

          return { success: true, message: 'Successfully resubscribed!' };
        }
        console.error('Newsletter subscription error:', error);
        return { success: false, error: error.message || 'Failed to subscribe to newsletter' };
      }

      try {
        await this.sendEmail({
          to: email,
          subject: 'Welcome to Kokaa Newsletter!',
          emailType: 'newsletter_confirmation',
          templateData: {
            email: email,
            unsubscribeUrl: `${window.location.origin}`,
          },
        });
      } catch (emailError) {
        console.error('Email sending exception:', emailError);
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Newsletter subscription exception:', error);
      return { success: false, error: error.message || 'Failed to subscribe to newsletter' };
    }
  },

  async unsubscribeFromNewsletter(email: string) {
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .update({
          subscribed: false,
          unsubscribed_at: new Date().toISOString(),
        })
        .eq('email', email);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Newsletter unsubscribe error:', error);
      return { success: false, error: 'Failed to unsubscribe from newsletter' };
    }
  },

  async getEmailPreferences(userId: string) {
    try {
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get email preferences error:', error);
      return { success: false, error: 'Failed to get email preferences' };
    }
  },

  async updateEmailPreferences(userId: string, preferences: Partial<{
    marketing_emails: boolean;
    deal_notifications: boolean;
    loyalty_notifications: boolean;
    order_updates: boolean;
    newsletter_subscribed: boolean;
  }>) {
    try {
      const { data, error } = await supabase
        .from('email_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update email preferences error:', error);
      return { success: false, error: 'Failed to update email preferences' };
    }
  },

  async sendVendorApprovalEmail(email: string, businessName: string) {
    return this.sendEmail({
      to: email,
      subject: `🎉 Your Kokaa Vendor Application Has Been Approved!`,
      emailType: 'vendor_approved',
      templateData: {
        businessName,
        loginUrl: `${window.location.origin}`,
      },
    });
  },

  async sendVendorRejectionEmail(email: string, businessName: string, reason: string) {
    return this.sendEmail({
      to: email,
      subject: 'Update on Your Kokaa Vendor Application',
      emailType: 'vendor_rejected',
      templateData: {
        businessName,
        reason,
        supportEmail: 'support@kokaa.cy',
      },
    });
  },

  async sendDealSoldNotification(vendorEmail: string, dealTitle: string, quantity: number, revenue: number) {
    return this.sendEmail({
      to: vendorEmail,
      subject: `🎉 Sale Alert: ${quantity} units of "${dealTitle}" sold!`,
      emailType: 'deal_sold',
      templateData: {
        dealTitle,
        quantity,
        revenue: revenue.toFixed(2),
        dashboardUrl: `${window.location.origin}`,
      },
    });
  },

  async sendLowStockAlert(vendorEmail: string, dealTitle: string, remainingStock: number) {
    return this.sendEmail({
      to: vendorEmail,
      subject: `⚠️ Low Stock Alert: "${dealTitle}"`,
      emailType: 'low_stock',
      templateData: {
        dealTitle,
        remainingStock,
        dashboardUrl: `${window.location.origin}`,
      },
    });
  },

  async sendWeeklyVendorReport(vendorEmail: string, reportData: {
    businessName: string;
    weekSales: number;
    weekRevenue: number;
    topDeal: string;
    conversionRate: number;
  }) {
    return this.sendEmail({
      to: vendorEmail,
      subject: `📊 Your Weekly Kokaa Performance Report`,
      emailType: 'vendor_weekly_report',
      templateData: {
        ...reportData,
        dashboardUrl: `${window.location.origin}`,
      },
    });
  },
};
