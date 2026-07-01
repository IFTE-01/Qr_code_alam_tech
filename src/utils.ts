import { DecodedResult, QRType, WiFiData, EmailData, SMSData } from './types';

// Check if a string is a valid URL
export function isValidUrl(text: string): boolean {
  try {
    // If it starts with standard protocols or matches a general URL regex
    if (/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(text)) {
      return true;
    }
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Convert input text/protocols into rich structured data
export function parseQRContent(rawText: string): DecodedResult {
  const trimmed = rawText.trim();
  const timestamp = Date.now();

  // 1. Detect Image Data URL
  if (trimmed.startsWith('data:image/') && trimmed.includes(';base64,')) {
    return {
      rawText,
      type: 'image',
      parsedData: {
        title: 'Compressed Image',
        value: trimmed,
        displayValue: 'Encoded base64 image data found',
        actionLabel: 'View Image',
      },
      timestamp,
    };
  }

  // 2. Detect WiFi Configuration
  // Format: WIFI:S:MySSID;T:WPA;P:MyPassword;H:true;;
  if (trimmed.toUpperCase().startsWith('WIFI:')) {
    const wifiData: WiFiData = {
      ssid: '',
      encryption: 'nopass',
      hidden: false,
    };

    // Extract SSID
    const ssidMatch = trimmed.match(/S:([^;]+)/i);
    if (ssidMatch) wifiData.ssid = ssidMatch[1];

    // Extract Password
    const passMatch = trimmed.match(/P:([^;]+)/i);
    if (passMatch) wifiData.password = passMatch[1];

    // Extract Encryption
    const encMatch = trimmed.match(/T:([^;]+)/i);
    if (encMatch) {
      const enc = encMatch[1].toLowerCase();
      if (enc === 'wpa' || enc === 'wpa2') wifiData.encryption = 'WPA';
      else if (enc === 'wep') wifiData.encryption = 'WEP';
      else wifiData.encryption = 'nopass';
    }

    // Extract Hidden state
    const hidMatch = trimmed.match(/H:([^;]+)/i);
    if (hidMatch) wifiData.hidden = hidMatch[1].toLowerCase() === 'true';

    const displayValue = `Network: ${wifiData.ssid}\nSecurity: ${wifiData.encryption}\nPassword: ${wifiData.password ? '••••••••' : 'None'}`;

    return {
      rawText,
      type: 'wifi',
      parsedData: {
        title: 'WiFi Network Connection',
        value: trimmed,
        displayValue,
        wifiDetails: wifiData,
      },
      timestamp,
    };
  }

  // 3. Detect Email
  // Format: mailto:test@example.com?subject=Hello&body=World
  if (trimmed.toLowerCase().startsWith('mailto:')) {
    const emailData: EmailData = {
      address: '',
    };

    try {
      const url = new URL(trimmed);
      emailData.address = url.pathname;
      const subject = url.searchParams.get('subject');
      if (subject) emailData.subject = subject;
      const body = url.searchParams.get('body');
      if (body) emailData.body = body;
    } catch (_) {
      // Fallback parsing if URL parsing fails
      const addressPart = trimmed.substring(7).split('?')[0];
      emailData.address = addressPart;
      const subjectMatch = trimmed.match(/[?&]subject=([^&]+)/i);
      if (subjectMatch) emailData.subject = decodeURIComponent(subjectMatch[1]);
      const bodyMatch = trimmed.match(/[?&]body=([^&]+)/i);
      if (bodyMatch) emailData.body = decodeURIComponent(bodyMatch[1]);
    }

    let displayValue = `To: ${emailData.address}`;
    if (emailData.subject) displayValue += `\nSubject: ${emailData.subject}`;
    if (emailData.body) displayValue += `\nBody: ${emailData.body}`;

    return {
      rawText,
      type: 'email',
      parsedData: {
        title: 'Email Draft',
        value: emailData.address,
        displayValue,
        actionLabel: 'Send Email',
        actionUrl: trimmed,
        emailDetails: emailData,
      },
      timestamp,
    };
  }

  // 4. Detect SMS
  // Format: SMSTO:+123456789:Message or sms:+123456789?body=Message
  if (trimmed.toLowerCase().startsWith('sms:') || trimmed.toLowerCase().startsWith('smsto:')) {
    const smsData: SMSData = {
      phone: '',
    };

    if (trimmed.toLowerCase().startsWith('smsto:')) {
      const parts = trimmed.substring(6).split(':');
      smsData.phone = parts[0];
      if (parts.length > 1) smsData.message = parts.slice(1).join(':');
    } else {
      // sms:
      const parts = trimmed.substring(4).split('?');
      smsData.phone = parts[0];
      if (parts.length > 1) {
        const bodyMatch = parts[1].match(/body=([^&]+)/i);
        if (bodyMatch) smsData.message = decodeURIComponent(bodyMatch[1]);
      }
    }

    let displayValue = `To: ${smsData.phone}`;
    if (smsData.message) displayValue += `\nMessage: ${smsData.message}`;

    const urlValue = `sms:${smsData.phone}${smsData.message ? `?body=${encodeURIComponent(smsData.message)}` : ''}`;

    return {
      rawText,
      type: 'sms',
      parsedData: {
        title: 'SMS Text Message',
        value: smsData.phone,
        displayValue,
        actionLabel: 'Send SMS',
        actionUrl: urlValue,
        smsDetails: smsData,
      },
      timestamp,
    };
  }

  // 5. Detect Phone Number
  // Format: tel:+123456789
  if (trimmed.toLowerCase().startsWith('tel:')) {
    const phoneNumber = trimmed.substring(4);
    return {
      rawText,
      type: 'phone',
      parsedData: {
        title: 'Phone Number',
        value: phoneNumber,
        displayValue: phoneNumber,
        actionLabel: 'Call Number',
        actionUrl: trimmed,
        phoneDetails: phoneNumber,
      },
      timestamp,
    };
  }

  // General phone number match (e.g. starts with + or just digits, length between 7 and 15)
  if (/^\+?[0-9\s\-()]{7,20}$/.test(trimmed)) {
    return {
      rawText,
      type: 'phone',
      parsedData: {
        title: 'Phone Number',
        value: trimmed,
        displayValue: trimmed,
        actionLabel: 'Call Number',
        actionUrl: `tel:${trimmed.replace(/[\s\-()]/g, '')}`,
        phoneDetails: trimmed,
      },
      timestamp,
    };
  }

  // 6. Detect URL
  if (trimmed.toLowerCase().startsWith('http://') || trimmed.toLowerCase().startsWith('https://') || isValidUrl(trimmed)) {
    let fullUrl = trimmed;
    if (!trimmed.toLowerCase().startsWith('http://') && !trimmed.toLowerCase().startsWith('https://')) {
      fullUrl = 'https://' + trimmed;
    }
    return {
      rawText,
      type: 'url',
      parsedData: {
        title: 'Website Link',
        value: fullUrl,
        displayValue: trimmed,
        actionLabel: 'Open Link',
        actionUrl: fullUrl,
      },
      timestamp,
    };
  }

  // 7. Fallback to Simple Text
  return {
    rawText,
    type: 'text',
    parsedData: {
      title: 'Plain Text',
      value: trimmed,
      displayValue: trimmed,
    },
    timestamp,
  };
}

// Format builders for QR code generators
export function buildWiFiString(data: WiFiData): string {
  const enc = data.encryption === 'nopass' ? 'nopass' : data.encryption;
  return `WIFI:S:${data.ssid};T:${enc};P:${data.password || ''};H:${data.hidden ? 'true' : 'false'};;`;
}

export function buildEmailString(data: EmailData): string {
  const subject = data.subject ? `?subject=${encodeURIComponent(data.subject)}` : '';
  const body = data.body ? `${subject ? '&' : '?' }body=${encodeURIComponent(data.body)}` : '';
  return `mailto:${data.address}${subject}${body}`;
}

export function buildSMSString(data: SMSData): string {
  return `sms:${data.phone}${data.message ? `?body=${encodeURIComponent(data.message)}` : ''}`;
}
