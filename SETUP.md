# Offer Builder - Setup Instructions

Αυτές είναι οι οδηγίες για να ρυθμίσεις το Offer Builder web app.

## Προαπαιτούμενα

- Node.js 18+ και npm
- Firebase account

## Βήμα 1: Δημιουργία Firebase Project

1. Πήγαινε στο [Firebase Console](https://console.firebase.google.com/)
2. Κάνε κλικ στο "Add project" ή "Create a project"
3. Εισήγαγε όνομα project (π.χ. "offer-builder")
4. Ακολούθησε τα βήματα για να ολοκληρώσεις τη δημιουργία

## Βήμα 2: Ενεργοποίηση Email/Password Authentication

1. Στο Firebase Console, πήγαινε στο **Authentication**
2. Κάνε κλικ στο **Get started** αν είναι η πρώτη φορά
3. Επίλεξε την καρτέλα **Sign-in method**
4. Ενεργοποίησε το **Email/Password** provider
5. Κάνε κλικ **Save**

## Βήμα 3: Δημιουργία Firestore Database

1. Στο Firebase Console, πήγαινε στο **Firestore Database**
2. Κάνε κλικ στο **Create database**
3. Επίλεξε **Start in test mode** (για MVP - θα προσθέσουμε security rules αργότερα)
4. Επίλεξε location για τη βάση δεδομένων
5. Κάνε κλικ **Enable**

### Security Rules (Προαιρετικό - για production)

Μετά τη δημιουργία, μπορείς να ενημερώσεις τα security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /offers/{offerId} {
      allow read, write: if request.auth != null;
      // Για per-user access (uncomment για να ενεργοποιήσεις):
      // allow read, write: if request.auth != null && request.auth.uid == resource.data.createdBy.uid;
    }
  }
}
```

## Βήμα 4: Λήψη Firebase Configuration

### Client SDK Configuration

1. Στο Firebase Console, πήγαινε στο **Project Settings** (γρανάζι)
2. Κάνε scroll down στο **Your apps** section
3. Κάνε κλικ στο **Web** icon (`</>`) για να δημιουργήσεις web app
4. Εισήγαγε όνομα app (π.χ. "Offer Builder")
5. Κάνε κλικ **Register app**
6. Αντιγράψε τα configuration values (apiKey, authDomain, projectId, κτλ.)

### Admin SDK Configuration (Service Account)

1. Στο Firebase Console, πήγαινε στο **Project Settings**
2. Κάνε κλικ στην καρτέλα **Service accounts**
3. Κάνε κλικ στο **Generate new private key**
4. Κάνε κλικ **Generate key** (θα κατεβάσει ένα JSON file)
5. Αποθήκευσε το αρχείο ως `service-account.json` στον root φάκελο του project

**ΣΗΜΑΝΤΙΚΟ**: Προσθέσε το `service-account.json` στο `.gitignore` για να μην ανέβει στο git!

## Βήμα 5: Environment Variables

Δημιούργησε ένα `.env` αρχείο στον root φάκελο του project:

```env
# Firebase Client Configuration
PUBLIC_FIREBASE_API_KEY=your_api_key_here
PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your_project_id
PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin Configuration
# Option 1: Use service account JSON file path
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json

# Option 2: Use individual environment variables (alternative)
# FIREBASE_PROJECT_ID=your_project_id
# FIREBASE_CLIENT_EMAIL=your_service_account_email
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Αντέγραψε τις τιμές από το Firebase Console στα αντίστοιχα πεδία.

## Βήμα 6: Εγκατάσταση Dependencies

Οι dependencies έχουν ήδη εγκατασταθεί, αλλά αν χρειάζεται:

```bash
npm install
```

## Βήμα 7: Εκκίνηση Development Server

```bash
npm run dev
```

Το app θα είναι διαθέσιμο στο `http://localhost:4321`

## Βήμα 8: Δημιουργία Χρήστη

1. Πήγαινε στο `/login`
2. Κάνε κλικ στο **Sign up** link (ή χρησιμοποίησε το Firebase Console)
3. Εναλλακτικά, δημιούργησε χρήστη από το Firebase Console:
   - Πήγαινε στο **Authentication** > **Users**
   - Κάνε κλικ **Add user**
   - Εισήγαγε email και password

## Troubleshooting

### "Firebase Admin configuration missing"
- Βεβαιώσου ότι έχεις ορίσει είτε `FIREBASE_SERVICE_ACCOUNT_PATH` είτε τα `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, και `FIREBASE_PRIVATE_KEY`
- Αν χρησιμοποιείς service account file, βεβαιώσου ότι το path είναι σωστό

### "Session verification failed"
- Βεβαιώσου ότι έχεις ενεργοποιήσει το Email/Password authentication
- Ελέγξε ότι τα client configuration values είναι σωστά

### PDF generation fails
- Βεβαιώσου ότι το Playwright Chromium έχει εγκατασταθεί: `npx playwright install chromium`
- Ελέγξε ότι έχεις write permissions στον temp directory

### Firestore errors
- Βεβαιώσου ότι έχεις δημιουργήσει τη Firestore database
- Ελέγξε τα security rules

## Production Deployment

Για production:

1. Ρύθμισε τα Firestore security rules (βλέπε παραπάνω)
2. Χρησιμοποίησε environment variables από το hosting platform σου
3. Build το app: `npm run build`
4. Preview: `npm run preview`

## Project Structure

```
src/
  components/        # React components (islands)
  data/             # Catalog JSON
  layouts/          # Astro layouts
  lib/              # Utilities (Firebase, auth, money, PDF)
  pages/            # Routes
    api/            # API endpoints
    offers/         # Offer pages
  templates/        # PDF template
```

## Next Steps

- Προσθήκη περισσότερων services στο catalog
- Customize το PDF template με το branding σου
- Προσθήκη email notifications
- Προσθήκη offer editing
- Προσθήκη user management
