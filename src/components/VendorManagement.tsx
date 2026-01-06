import { useState, useEffect } from 'react';
import { Store, CheckCircle, XCircle, Clock, User, Mail, Phone, Globe, FileText, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { emailService } from '../services/emailService';

interface VendorApplication {
  id: string;
  user_id: string;
  business_name: string;
  business_description: string;
  business_email: string;
  business_phone: string | null;
  business_website: string | null;
  why_join: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  users?: {
    email: string;
  };
}

interface VendorProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_email: string;
  is_verified: boolean;
  total_deals_created: number;
  total_sales: number;
  total_revenue: number;
  created_at: string;
  users?: {
    email: string;
  };
}

export function VendorManagement() {
  const [activeTab, setActiveTab] = useState<'applications' | 'active'>('applications');
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<VendorApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadApplications();
    loadVendors();
  }, []);

  const loadApplications = async () => {
    const { data } = await supabase
      .from('vendor_applications')
      .select(`
        *,
        users:user_id (email)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setApplications(data);
    }
  };

  const loadVendors = async () => {
    const { data } = await supabase
      .from('vendor_profiles')
      .select(`
        *,
        users:user_id (email)
      `)
      .eq('is_verified', true)
      .order('created_at', { ascending: false });

    if (data) {
      setVendors(data);
    }
  };

  const handleApprove = async (applicationId: string) => {
    setLoading(true);
    try {
      const app = applications.find(a => a.id === applicationId);
      if (!app) throw new Error('Application not found');

      const { error } = await supabase.rpc('approve_vendor_application', {
        application_id: applicationId
      });

      if (error) throw error;

      await emailService.sendVendorApprovalEmail(
        app.users?.email || app.business_email,
        app.business_name
      );

      await loadApplications();
      await loadVendors();
      setSelectedApplication(null);
      alert('Vendor application approved successfully! Email notification sent.');
    } catch (error: any) {
      alert('Error approving application: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (applicationId: string) => {
    if (!reviewNotes.trim()) {
      alert('Please provide rejection reason');
      return;
    }

    setLoading(true);
    try {
      const app = applications.find(a => a.id === applicationId);
      if (!app) throw new Error('Application not found');

      const { error } = await supabase
        .from('vendor_applications')
        .update({
          status: 'rejected',
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      await emailService.sendVendorRejectionEmail(
        app.users?.email || app.business_email,
        app.business_name,
        reviewNotes
      );

      await loadApplications();
      setSelectedApplication(null);
      setReviewNotes('');
      alert('Application rejected. Email notification sent.');
    } catch (error: any) {
      alert('Error rejecting application: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Management</h2>
        <p className="text-gray-600">Review applications and manage active vendors</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'applications'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Applications {pendingCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'active'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Active Vendors ({vendors.length})
        </button>
      </div>

      {activeTab === 'applications' ? (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No vendor applications yet</p>
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Store className="w-6 h-6 text-blue-600" />
                      <h3 className="text-xl font-bold text-gray-900">
                        {app.business_name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {app.users?.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(app.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Business Email</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Mail className="w-4 h-4" />
                      {app.business_email}
                    </div>
                  </div>
                  {app.business_phone && (
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-1">Phone</div>
                      <div className="flex items-center gap-2 text-gray-900">
                        <Phone className="w-4 h-4" />
                        {app.business_phone}
                      </div>
                    </div>
                  )}
                  {app.business_website && (
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-1">Website</div>
                      <div className="flex items-center gap-2 text-gray-900">
                        <Globe className="w-4 h-4" />
                        <a href={app.business_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {app.business_website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {selectedApplication?.id === app.id ? (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-2">Business Description</div>
                      <p className="text-gray-900 whitespace-pre-wrap">{app.business_description}</p>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-2">Why They Want to Join</div>
                      <p className="text-gray-900 whitespace-pre-wrap">{app.why_join}</p>
                    </div>

                    {app.status === 'pending' && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Review Notes (optional for approval, required for rejection)
                          </label>
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Add notes about this application..."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(app.id)}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                          >
                            <CheckCircle className="w-5 h-5" />
                            {loading ? 'Approving...' : 'Approve Vendor'}
                          </button>
                          <button
                            onClick={() => handleReject(app.id)}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
                          >
                            <XCircle className="w-5 h-5" />
                            {loading ? 'Rejecting...' : 'Reject Application'}
                          </button>
                        </div>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setSelectedApplication(null);
                        setReviewNotes('');
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Close Details
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedApplication(app)}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold"
                  >
                    <Eye className="w-4 h-4" />
                    View Full Details
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {vendors.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No active vendors yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {vendors.map((vendor) => (
                <div key={vendor.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Store className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {vendor.business_name}
                          </h3>
                          <p className="text-sm text-gray-600">{vendor.users?.email}</p>
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {vendor.total_deals_created}
                      </div>
                      <div className="text-xs text-gray-600">Deals</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {vendor.total_sales}
                      </div>
                      <div className="text-xs text-gray-600">Sales</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        €{vendor.total_revenue.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600">Revenue</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    Joined {new Date(vendor.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
