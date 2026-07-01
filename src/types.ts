export type QRType = 'text' | 'url' | 'phone' | 'wifi' | 'email' | 'sms' | 'image';

export interface WiFiData {
  ssid: string;
  password?: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface EmailData {
  address: string;
  subject?: string;
  body?: string;
}

export interface SMSData {
  phone: string;
  message?: string;
}

export interface DecodedResult {
  rawText: string;
  type: QRType;
  parsedData: {
    title: string;
    value: string;
    displayValue: string;
    actionLabel?: string;
    actionUrl?: string;
    wifiDetails?: WiFiData;
    emailDetails?: EmailData;
    smsDetails?: SMSData;
    phoneDetails?: string;
  };
  timestamp: number;
}
