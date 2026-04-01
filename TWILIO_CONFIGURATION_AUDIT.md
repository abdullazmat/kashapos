# Twilio Configuration Audit

## Summary

The KashaPOS application uses **Twilio** for SMS and WhatsApp messaging, with **Africa's Talking** as a fall-back SMS provider. Credentials are loaded from environment variables at application startup.

---

## 1. Main Configuration Files

### [src/lib/twilio.ts](src/lib/twilio.ts)

**Purpose**: Central Twilio service for SMS and WhatsApp messaging

**Environment Variables Loaded**:

```
TWILIO_ACCOUNT_SID      - Twilio Account SID
TWILIO_AUTH_TOKEN       - Twilio Authentication Token
TWILIO_API_KEY          - Twilio API Key (alternative auth)
TWILIO_API_SECRET       - Twilio API Secret (alternative auth)
TWILIO_WHATSAPP_NUMBER  - WhatsApp sender number (default: "whatsapp:+14155238886")
TWILIO_SMS_NUMBER       - SMS sender number (default: "+14155238886")
```

**Key Methods**:

- `sendSMS(to, message, credentials?)` - Sends SMS message
- `sendWhatsApp(to, message, credentials?)` - Sends WhatsApp message
- `getClient(credentials?)` - Returns configured Twilio client

**Authentication Priority**:

1. Account SID + Auth Token (preferred for broad compatibility)
2. API Key + API Secret (with Account SID)

**Export**:

```typescript
export const twilioService = new TwilioService();
```

---

### [src/lib/africastalking.ts](src/lib/africastalking.ts)

**Purpose**: Africa's Talking SMS service (primary SMS provider fallback)

**Environment Variables Loaded**:

```
AT_USERNAME   - Africa's Talking username (default: "sandbox")
AT_API_KEY    - Africa's Talking API Key
AT_SENDER_ID  - Africa's Talking Sender ID
```

**Key Methods**:

- `sendSMS(to, message, credentials?)` - Sends SMS via Africa's Talking
- `getBalance(credentials?)` - Checks SMS balance before sending

**Export**:

```typescript
export const africasTalkingService = new AfricasTalkingService();
```

---

## 2. API Routes Using Twilio/SMS

### [src/app/api/auth/send-otp/route.ts](src/app/api/auth/send-otp/route.ts) ⭐

**Purpose**: OTP delivery for sign-up and password reset

**Flow**:

1. **Email Method**: Sends OTP via email (SMTP)
2. **Phone Method**:
   - Primary: Africa's Talking SMS
   - Fallback: Email (if SMS fails)
   - Pre-check: Validates Africa's Talking balance
3. **WhatsApp Method**:
   - Primary: Twilio WhatsApp
   - Fallback (1): Africa's Talking SMS
   - Fallback (2): Email (if SMS also fails)

**Services Used**:

- `twilioService.sendWhatsApp()`
- `africasTalkingService.sendSMS()`
- `africasTalkingService.getBalance()`

**Endpoint**: `POST /api/auth/send-otp`

---

### [src/app/api/settings/integrations/test/route.ts](src/app/api/settings/integrations/test/route.ts)

**Purpose**: Test integration endpoints for administrators

**Supported Tests**:

- `type: "twilio_sms"` - Test Twilio SMS
- `type: "twilio_whatsapp"` - Test Twilio WhatsApp
- `type: "at_sms"` - Test Africa's Talking SMS
- `type: "at_balance"` - Check Africa's Talking balance

**Endpoint**: `POST /api/settings/integrations/test`

**Accepts**:

```json
{
  "type": "twilio_sms|twilio_whatsapp|at_sms|at_balance",
  "payload": {
    "phoneNumber": "+256...",
    "message": "Test message",
    "twilioAccountSid": "ACxxxx",
    "twilioAuthToken": "token",
    "twilioSmsNumber": "+1...",
    "atUsername": "username",
    "atApiKey": "key",
    "atSenderId": "sender_id"
  }
}
```

---

### [src/app/api/customers/[id]/balance-reminder/route.ts](src/app/api/customers/[id]/balance-reminder/route.ts)

**Purpose**: Send customer balance reminders via email + SMS

**Flow**:

1. Prepares balance reminder email via [prepareBalanceReminderEmail()](src/lib/manual-email-rules.ts)
2. Sends email via `sendTenantEmail()`
3. If customer has phone: Sends SMS via `twilioService.sendSMS()`

**Services Used**:

- `twilioService.sendSMS()`

**Endpoint**: `POST /api/customers/{id}/balance-reminder`

---

## 3. Environment Variables Reference

### Required Variables (at minimum one auth method)

| Variable                 | Source | Required | Default               | Usage                           |
| ------------------------ | ------ | -------- | --------------------- | ------------------------------- |
| `TWILIO_ACCOUNT_SID`     | .env   | Yes\*    | -                     | Twilio Account ID               |
| `TWILIO_AUTH_TOKEN`      | .env   | Yes\*    | -                     | Twilio Auth Token (preferred)   |
| `TWILIO_API_KEY`         | .env   | No       | -                     | Twilio API Key (alternative)    |
| `TWILIO_API_SECRET`      | .env   | No       | -                     | Twilio API Secret (alternative) |
| `TWILIO_SMS_NUMBER`      | .env   | No       | +14155238886          | SMS sender phone number         |
| `TWILIO_WHATSAPP_NUMBER` | .env   | No       | whatsapp:+14155238886 | WhatsApp sender number          |
| `AT_USERNAME`            | .env   | Yes\*    | sandbox               | Africa's Talking username       |
| `AT_API_KEY`             | .env   | Yes\*    | -                     | Africa's Talking API Key        |
| `AT_SENDER_ID`           | .env   | No       | -                     | Africa's Talking Sender ID      |

\*At least one SMS provider (Twilio OR Africa's Talking) must be configured

### Configuration File Locations

- **.env**: Root project directory (not in repo, locally created)
- **.env.local**: Next.js local overrides (not in repo)
- **Load path**: `process.env.*` at runtime

---

## 4. How Credentials Are Loaded

### Initialization (Application Startup)

**Twilio Service**:

```typescript
// src/lib/twilio.ts
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const API_KEY = process.env.TWILIO_API_KEY || "";
const API_SECRET = process.env.TWILIO_API_SECRET || "";
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const WHATSAPP_NUMBER =
  process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
const SMS_NUMBER = process.env.TWILIO_SMS_NUMBER || "+14155238886";

class TwilioService {
  constructor() {
    if (ACCOUNT_SID && AUTH_TOKEN) {
      this.client = twilio(ACCOUNT_SID, AUTH_TOKEN); // Preferred method
    } else if (ACCOUNT_SID && API_KEY && API_SECRET) {
      this.client = twilio(API_KEY, API_SECRET, { accountSid: ACCOUNT_SID });
    }
  }
}
```

**Africa's Talking Service**:

```typescript
// src/lib/africastalking.ts
const AT_USERNAME = process.env.AT_USERNAME || "sandbox";
const AT_API_KEY = process.env.AT_API_KEY || "";
const AT_SENDER_ID = process.env.AT_SENDER_ID || "";

class AfricasTalkingService {
  constructor() {
    if (AT_USERNAME && AT_API_KEY) {
      const africastalking = require("africastalking");
      const at = africastalking({
        apiKey: AT_API_KEY,
        username: AT_USERNAME,
      });
      this.sms = at.SMS;
    }
  }
}
```

### Runtime Credential Override

Both services support runtime credential override via route handlers:

**Via Integration Test Endpoint**:

```typescript
POST /api/settings/integrations/test
{
  "type": "twilio_sms",
  "payload": {
    "twilioAccountSid": "AC...",
    "twilioAuthToken": "token...",
    "twilioSmsNumber": "+1234567890"
  }
}
```

**Credentials passed through**:

- `getClient(credentials?)` method checks credentials first, then falls back to env vars
- Masked credentials (`"********"`) are detected and skipped
- Falls back to environment variables if credentials not provided or masked

---

## 5. Credential Storage Best Practices

### Current Implementation ✅

- Environment variables from `.env` file (not in repository)
- Credentials loaded at service initialization
- Singleton pattern: `twilioService` and `africasTalkingService` exported as instances

### Security Observations

- ✅ Credentials NOT hardcoded in source
- ✅ Singleton instances prevent re-initialization
- ✅ Credentials can be overridden per-request (integration test endpoint)
- ✅ Masked credentials (`"********"`) not processed

### Areas to Consider

- Credentials stored in plain environment variables (standard practice)
- No credential rotation mechanism currently visible
- Test endpoints accept credentials directly in request body (requires `role: "admin"`)

---

## 6. Message Delivery Flow Diagram

```
OTP Request (Phone)
    ↓
[send-otp/route.ts]
    ├─ Check balance (Africa's Talking)
    ├─ PRIMARY: africasTalkingService.sendSMS()
    ├─ FAIL? → Look up user email
    └─ FALLBACK: sendSystemEmail() to email

OTP Request (WhatsApp)
    ↓
[send-otp/route.ts]
    ├─ PRIMARY: twilioService.sendWhatsApp()
    ├─ FAIL? → africasTalkingService.sendSMS() (SMS fallback)
    │   ├─ FAIL? → Send via email fallback
    │   └─ SUCCESS: Return "WhatsApp failed, SMS sent" warning
    └─ SUCCESS: Return confirmation

Balance Reminder
    ↓
[balance-reminder/route.ts]
    ├─ Send email via sendTenantEmail()
    └─ If phone exists: twilioService.sendSMS()

Integration Test
    ↓
[integrations/test/route.ts]
    ├─ Twilio SMS: twilioService.sendSMS(payload)
    ├─ Twilio WhatsApp: twilioService.sendWhatsApp(payload)
    ├─ Africa's Talking SMS: africasTalkingService.sendSMS(payload)
    └─ Africa's Talking Balance: africasTalkingService.getBalance(payload)
```

---

## 7. Key Service Exports

### Twilio Service

**File**: [src/lib/twilio.ts](src/lib/twilio.ts)  
**Export**: `export const twilioService = new TwilioService();`  
**Methods**:

- `sendSMS(to, message, credentials?)` → `{ success, sid }`
- `sendWhatsApp(to, message, credentials?)` → `{ success, sid }`

### Africa's Talking Service

**File**: [src/lib/africastalking.ts](src/lib/africastalking.ts)  
**Export**: `export const africasTalkingService = new AfricasTalkingService();`  
**Methods**:

- `sendSMS(to, message, credentials?)` → `{ success, message, error? }`
- `getBalance(credentials?)` → `string` (balance amount)

---

## 8. Testing Commands

From [package.json](package.json):

```bash
npm run test:twilio-creds      # Test Twilio credentials
npm run test:twilio-sms        # Test SMS sending
npm run test:twilio-whatsapp   # Test WhatsApp sending
npm run send:sms               # Send test SMS
npm run send:whatsapp          # Send test WhatsApp
```

---

## Setup .env Example

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_SMS_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Africa's Talking Configuration
AT_USERNAME=sandbox
AT_API_KEY=...
AT_SENDER_ID=KashaPOS

# Database, Auth, and other configs...
```

---

## Files Referenced

- [src/lib/twilio.ts](src/lib/twilio.ts) - Twilio service
- [src/lib/africastalking.ts](src/lib/africastalking.ts) - Africa's Talking service
- [src/app/api/auth/send-otp/route.ts](src/app/api/auth/send-otp/route.ts) - OTP delivery
- [src/app/api/settings/integrations/test/route.ts](src/app/api/settings/integrations/test/route.ts) - Integration test endpoint
- [src/app/api/customers/[id]/balance-reminder/route.ts](src/app/api/customers/[id]/balance-reminder/route.ts) - Balance reminder
