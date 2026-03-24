// SYCAPAY Payment Integration Utilities

export interface SycapayConfig {
  baseUrl: string;
  merchantId: string;
  apiKey: string;
  country: string;
  environment: 'TEST' | 'PRODUCTION';
}

export interface AuthResponse {
  code: number;
  token?: string;
  desc?: string;
  amount?: string;
}

export interface PaymentResponse {
  code: number;
  message?: string;
  transactionId?: string;
  paiementId?: string | null;
  mobile?: string;
  orderId?: string;
  amount?: string;
  operator?: string;
}

export interface StatusResponse {
  code: number;
  message?: string;
  amount?: string;
  orderId?: string;
  transactionID?: string;
  transactionId?: string;
  paiementId?: string | null;
  mobile?: string;
  date?: string;
  operator?: string;
}

interface StatusCodeInfo {
  status: string;
  description: string;
}

// SYCAPAY Status Codes - using string keys for negative numbers
export const SYCAPAY_STATUS_CODES: Record<string, StatusCodeInfo> = {
  '0': { status: 'SUCCESS', description: 'Succès' },
  '-1': { status: 'FAILED', description: 'Paiement échoué' },
  '-2': { status: 'ERROR', description: 'Impossible de récupérer le marchand' },
  '-3': { status: 'FAILED', description: 'Solde du client insuffisant' },
  '-4': { status: 'UNAVAILABLE', description: 'Service indisponible' },
  '-5': { status: 'FAILED', description: 'Échec code OTP' },
  '-6': { status: 'COMPLETED', description: 'Transaction terminée' },
  '-7': { status: 'FAILED', description: 'Paramètres incorrects' },
  '-8': { status: 'TIMEOUT', description: 'Session dépassée' },
  '-9': { status: 'PENDING', description: 'Statut non encore disponible' },
  '-11': { status: 'ERROR', description: 'Token indéfini' },
  '-12': { status: 'ERROR', description: 'Identifiant du Marchand indéfini' },
  '-13': { status: 'ERROR', description: 'Type montant incorrect' },
  '-14': { status: 'ERROR', description: 'Erreur d\'authentification' },
  '-15': { status: 'TIMEOUT', description: 'Session dépassée' },
  '-16': { status: 'ERROR', description: 'INVALID MERCHAND ID' },
  '-18': { status: 'FAILED', description: 'Format incorrect - Le numéro de téléphone doit comporter 10 chiffres' },
  '-20': { status: 'ERROR', description: 'Type code OTP incorrect' },
  '-22': { status: 'ERROR', description: 'Code OTP indéfini' },
  '-100': { status: 'ERROR', description: 'Paramètres d\'accès incorrect' },
  '-200': { status: 'PENDING', description: 'Erreur HTTP / Statut en attente' },
  '-202': { status: 'NOT_FOUND', description: 'Transaction non trouvée chez l\'opérateur' },
  '-250': { status: 'ERROR', description: 'SMS de paiement non transmis' },
  '-400': { status: 'FAILED', description: 'Transaction échouée' },
  '-402': { status: 'ERROR', description: 'Création de transaction impossible' },
  '-404': { status: 'ERROR', description: 'Numéro de téléphone manquant' },
  '-405': { status: 'ERROR', description: 'Mode d\'accès invalide - risque de hacking' },
  '-406': { status: 'ERROR', description: 'Exception - consulter Sycapay' },
  '-500': { status: 'ERROR', description: 'Erreur interne' },
};

// Get status description from code
export function getStatusFromCode(code: number): StatusCodeInfo {
  return SYCAPAY_STATUS_CODES[code.toString()] || { status: 'UNKNOWN', description: `Code error: ${code}` };
}

// Map SYCAPAY status to our internal status
export function mapSycapayStatus(code: number): string {
  const result = getStatusFromCode(code);
  
  if (result.status === 'SUCCESS') return 'SUCCESS';
  if (result.status === 'PENDING') return 'PENDING';
  if (result.status === 'FAILED') return 'FAILED';
  if (result.status === 'COMPLETED') return 'COMPLETED';
  
  return 'FAILED';
}

// Mobile money operators by country
export const MOBILE_MONEY_OPERATORS: Record<string, string[]> = {
  BJ: ['MtnBJ', 'MoovBJ', 'CeltisBJ'], // Benin
  CI: ['MtnCI', 'MoovCI', 'OrangeCI'], // Ivory Coast
  TG: ['MtnTG', 'MoovTG'], // Togo
  SN: ['OrangeSN', 'FreeSN', 'WaveSN'], // Senegal
};

// Get environment URLs
export function getSycapayUrls(environment: 'TEST' | 'PRODUCTION') {
  return {
    auth: environment === 'TEST' 
      ? 'https://dev.sycapay.net/api/login.php'
      : 'https://dev.sycapay.com/login.php',
    checkout: environment === 'TEST'
      ? 'https://dev.sycapay.net/api/checkoutpay.php'
      : 'https://dev.sycapay.com/checkoutpay.php',
    status: environment === 'TEST'
      ? 'https://dev.sycapay.net/api/GetStatus.php'
      : 'https://dev.sycapay.com/GetStatus.php',
  };
}

// Format phone number for mobile money (remove country code if present)
export function formatPhoneNumber(phone: string, country: string = 'BJ'): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  const countryCodes: Record<string, string> = {
    BJ: '229',
    CI: '225',
    TG: '228',
    SN: '221',
  };
  
  const countryCode = countryCodes[country] || '229';
  
  // If starts with country code, remove it
  if (cleaned.startsWith(countryCode)) {
    cleaned = cleaned.substring(countryCode.length);
  }
  
  // Now we should have either 8 digits (without leading 0) or 9 digits (with leading 0)
  // SYCAPAY expects 10 digits starting with 0 (e.g., 612345678 or 0612345678)
  if (!cleaned.startsWith('0') && cleaned.length === 8) {
    // Add leading zero for 8-digit numbers
    cleaned = '0' + cleaned;
  } else if (!cleaned.startsWith('0') && cleaned.length === 9) {
    // 9-digit number, add leading zero
    cleaned = '0' + cleaned;
  }
  
  // Ensure we have exactly 10 digits
  if (cleaned.length !== 10) {
    console.warn(`[SYCAPAY] Phone number format may be invalid: ${cleaned} (length: ${cleaned.length})`);
  }
  
  return cleaned;
}

// Generate unique order number
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}
