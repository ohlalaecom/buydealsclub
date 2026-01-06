import { authenticator } from 'otplib';
import { supabase } from '../lib/supabase';

authenticator.options = {
  window: 1,
  step: 30
};

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  verifiedAt: string | null;
}

function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

export async function setupTwoFactor(userId: string, email: string): Promise<TwoFactorSetup> {
  const secret = authenticator.generateSecret();
  const backupCodes = generateBackupCodes();

  const otpauthUrl = authenticator.keyuri(
    email,
    'Kokaa Admin',
    secret
  );

  const { error } = await supabase
    .from('user_2fa_secrets')
    .upsert({
      user_id: userId,
      secret: secret,
      backup_codes: backupCodes,
      is_enabled: false
    });

  if (error) {
    throw new Error('Failed to setup 2FA: ' + error.message);
  }

  return {
    secret,
    qrCodeUrl: otpauthUrl,
    backupCodes
  };
}

export async function verifyAndEnable2FA(userId: string, token: string): Promise<boolean> {
  const { data: secretData, error } = await supabase
    .from('user_2fa_secrets')
    .select('secret')
    .eq('user_id', userId)
    .single();

  if (error || !secretData) {
    throw new Error('2FA not set up');
  }

  const isValid = authenticator.verify({
    token,
    secret: secretData.secret
  });

  if (isValid) {
    await supabase
      .from('user_2fa_secrets')
      .update({
        is_enabled: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    await supabase.rpc('log_2fa_action', {
      p_user_id: userId,
      p_action: 'enabled',
      p_success: true
    });
  }

  return isValid;
}

export async function verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
  const { data: secretData } = await supabase
    .from('user_2fa_secrets')
    .select('secret, is_enabled')
    .eq('user_id', userId)
    .single();

  if (!secretData || !secretData.is_enabled) {
    return false;
  }

  const isValid = authenticator.verify({
    token,
    secret: secretData.secret
  });

  await supabase.rpc('log_2fa_action', {
    p_user_id: userId,
    p_action: 'verified',
    p_success: isValid
  });

  return isValid;
}

export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const { data: secretData } = await supabase
    .from('user_2fa_secrets')
    .select('backup_codes, is_enabled')
    .eq('user_id', userId)
    .single();

  if (!secretData || !secretData.is_enabled) {
    return false;
  }

  const codeIndex = secretData.backup_codes.indexOf(code.toUpperCase());

  if (codeIndex === -1) {
    return false;
  }

  const updatedCodes = [...secretData.backup_codes];
  updatedCodes.splice(codeIndex, 1);

  await supabase
    .from('user_2fa_secrets')
    .update({
      backup_codes: updatedCodes,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  await supabase.rpc('log_2fa_action', {
    p_user_id: userId,
    p_action: 'backup_used',
    p_success: true
  });

  return true;
}

export async function disable2FA(userId: string, token: string): Promise<boolean> {
  const isValid = await verifyTwoFactorToken(userId, token);

  if (!isValid) {
    return false;
  }

  await supabase
    .from('user_2fa_secrets')
    .update({
      is_enabled: false,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  await supabase.rpc('log_2fa_action', {
    p_user_id: userId,
    p_action: 'disabled',
    p_success: true
  });

  return true;
}

export async function get2FAStatus(userId: string): Promise<TwoFactorStatus | null> {
  const { data } = await supabase
    .from('user_2fa_secrets')
    .select('is_enabled, verified_at')
    .eq('user_id', userId)
    .single();

  if (!data) {
    return null;
  }

  return {
    isEnabled: data.is_enabled,
    verifiedAt: data.verified_at
  };
}

export async function getBackupCodesCount(userId: string): Promise<number> {
  const { data } = await supabase
    .from('user_2fa_secrets')
    .select('backup_codes')
    .eq('user_id', userId)
    .single();

  return data?.backup_codes?.length || 0;
}
