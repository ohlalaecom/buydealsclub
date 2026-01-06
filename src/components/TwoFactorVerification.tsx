import { useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { verifyTwoFactorToken, verifyBackupCode } from '../services/twoFactorAuth';

interface TwoFactorVerificationProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TwoFactorVerification({ userId, onSuccess, onCancel }: TwoFactorVerificationProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    setError('');

    try {
      let isValid = false;

      if (useBackupCode) {
        isValid = await verifyBackupCode(userId, code);
        if (!isValid) {
          setError('Invalid backup code. Please try again.');
        }
      } else {
        isValid = await verifyTwoFactorToken(userId, code);
        if (!isValid) {
          setError('Invalid code. Please check your authenticator app and try again.');
        }
      }

      if (isValid) {
        onSuccess();
      }
    } catch (err: any) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
            <p className="text-sm text-gray-600">Enter your verification code</p>
          </div>
        </div>

        <div className="space-y-4">
          {!useBackupCode ? (
            <>
              <p className="text-gray-600">
                Open your authenticator app and enter the 6-digit code:
              </p>

              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </>
          ) : (
            <>
              <p className="text-gray-600">
                Enter one of your backup codes:
              </p>

              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                maxLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-xl font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-900">
                    Backup codes can only be used once. Make sure to keep track of remaining codes.
                  </p>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={loading || code.length < (useBackupCode ? 8 : 6)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          <button
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode('');
              setError('');
            }}
            className="w-full text-sm text-blue-600 hover:text-blue-700"
          >
            {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
          </button>
        </div>
      </div>
    </div>
  );
}
