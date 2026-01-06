import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Copy, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { setupTwoFactor, verifyAndEnable2FA, get2FAStatus, disable2FA, getBackupCodesCount } from '../services/twoFactorAuth';
import { useAuth } from '../contexts/AuthContext';

export function TwoFactorSetup() {
  const { user } = useAuth();
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'complete'>('status');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [backupCodesCount, setBackupCodesCount] = useState(0);
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [user]);

  const loadStatus = async () => {
    if (!user) return;

    const status = await get2FAStatus(user.id);
    if (status?.isEnabled) {
      setIsEnabled(true);
      const count = await getBackupCodesCount(user.id);
      setBackupCodesCount(count);
    }
  };

  const handleSetup = async () => {
    if (!user?.email) return;

    setLoading(true);
    setError('');

    try {
      const setup = await setupTwoFactor(user.id, user.email);
      setQrCodeUrl(setup.qrCodeUrl);
      setSecret(setup.secret);
      setBackupCodes(setup.backupCodes);
      setStep('setup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const isValid = await verifyAndEnable2FA(user.id, verificationCode);
      if (isValid) {
        setStep('complete');
        setIsEnabled(true);
        setSuccess('Two-factor authentication enabled successfully!');
      } else {
        setError('Invalid code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const success = await disable2FA(user.id, disableCode);
      if (success) {
        setIsEnabled(false);
        setStep('status');
        setDisableCode('');
        setSuccess('Two-factor authentication disabled successfully!');
      } else {
        setError('Invalid code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setSuccess('Secret copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const downloadBackupCodes = () => {
    const blob = new Blob(
      [
        'Kokaa Admin - Two-Factor Authentication Backup Codes\n\n',
        'IMPORTANT: Store these codes securely!\n',
        'Each code can only be used once.\n\n',
        backupCodes.join('\n')
      ],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kokaa-2fa-backup-codes.txt';
    a.click();
  };

  if (step === 'status') {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold">Two-Factor Authentication</h3>
        </div>

        {isEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">2FA is enabled</span>
            </div>

            <p className="text-gray-600">
              Your account is protected with two-factor authentication.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Backup codes remaining:</strong> {backupCodesCount}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Use backup codes if you lose access to your authenticator app
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="Enter 6-digit code to disable"
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleDisable}
                disabled={loading || disableCode.length !== 6}
                className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Add an extra layer of security to your admin account. You'll need your password and a code from your authenticator app to sign in.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-900">
                  <p className="font-semibold mb-1">Recommended for admin accounts</p>
                  <p>Protect against unauthorized access even if your password is compromised.</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSetup}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            {success}
          </div>
        )}
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h3 className="text-xl font-bold mb-4">Setup Authenticator App</h3>

        <div className="space-y-6">
          <div>
            <p className="text-gray-600 mb-4">
              <strong>Step 1:</strong> Install an authenticator app on your phone:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
              <li>Google Authenticator (iOS/Android)</li>
              <li>Microsoft Authenticator (iOS/Android)</li>
              <li>Authy (iOS/Android)</li>
            </ul>
          </div>

          <div>
            <p className="text-gray-600 mb-4">
              <strong>Step 2:</strong> Scan this QR code with your authenticator app:
            </p>
            <div className="flex justify-center bg-white p-4 border rounded-lg">
              <QRCodeSVG value={qrCodeUrl} size={200} level="H" />
            </div>
          </div>

          <div>
            <p className="text-gray-600 mb-2">
              <strong>Or enter this code manually:</strong>
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-4 py-2 rounded-lg font-mono text-sm">
                {secret}
              </code>
              <button
                onClick={copySecret}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Copy secret"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900 font-semibold mb-2">
              Important: Save your backup codes
            </p>
            <p className="text-sm text-yellow-800 mb-3">
              Store these codes in a secure place. You'll need them if you lose access to your authenticator app.
            </p>
            <div className="bg-white rounded p-3 mb-3 font-mono text-sm">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <div key={i}>{code}</div>
                ))}
              </div>
            </div>
            <button
              onClick={downloadBackupCodes}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              <Download className="w-4 h-4" />
              Download Backup Codes
            </button>
          </div>

          <button
            onClick={() => setStep('verify')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Continue to Verification
          </button>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h3 className="text-xl font-bold mb-4">Verify Your Setup</h3>

        <div className="space-y-4">
          <p className="text-gray-600">
            Enter the 6-digit code from your authenticator app to complete setup:
          </p>

          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            maxLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-wider"
            autoFocus
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || verificationCode.length !== 6}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify and Enable'}
          </button>

          <button
            onClick={() => setStep('setup')}
            className="w-full text-gray-600 hover:text-gray-900"
          >
            Back to QR Code
          </button>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <h3 className="text-xl font-bold">Two-Factor Authentication Enabled!</h3>

          <p className="text-gray-600">
            Your account is now protected with 2FA. You'll need to enter a code from your authenticator app each time you sign in.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Don't forget:</strong> Keep your backup codes in a safe place!
            </p>
          </div>

          <button
            onClick={() => {
              setStep('status');
              setSuccess('');
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}
