# Admin User Setup

## Πώς να ορίσεις έναν χρήστη ως Admin

### Μέθοδος 1: Από Firebase Console (Manual)

1. Πήγαινε στο Firebase Console → Firestore Database
2. Βρες ή δημιούργησε το collection `users`
3. Δημιούργησε ένα document με ID = user's UID (από Authentication → Users)
4. Set τα fields:
   ```json
   {
     "email": "admin@example.com",
     "role": "admin",
     "createdAt": [timestamp]
   }
   ```

### Μέθοδος 2: Από API (μετά το login ως admin)

Αν έχεις ήδη έναν admin user, μπορείς να χρησιμοποιήσεις το API:

```bash
# Get user's UID από Firebase Console → Authentication → Users
# Μετά κάνε POST request:
curl -X POST http://localhost:4321/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{
    "uid": "USER_UID_HERE",
    "email": "user@example.com",
    "role": "admin"
  }'
```

### Μέθοδος 3: Direct Firestore Update (Development)

Για development, μπορείς να χρησιμοποιήσεις το Firebase Console για να αλλάξεις το role:

1. Firebase Console → Firestore Database
2. Collection: `users`
3. Document ID: [user's UID]
4. Edit field `role` → Change από `user` σε `admin`

## Default Role

Όλοι οι νέοι χρήστες παίρνουν αυτόματα role `user` όταν κάνουν login για πρώτη φορά.

## Role Permissions

- **user**: Μπορεί να δημιουργεί offers, να τα βλέπει, και να κατεβάζει PDFs
- **admin**: Όλα τα permissions του user + μπορεί να διαχειρίζεται users (API `/api/users`)
