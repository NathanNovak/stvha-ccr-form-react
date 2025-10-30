# Quick Start Guide - 10 Minutes to Running

Get your CCR Compliance System running in 10 minutes!

## Prerequisites Checklist

- [ ] Node.js installed (v14+)
- [ ] Firebase account (free)
- [ ] Code editor (VS Code, etc.)

## Step 1: Extract & Install (2 minutes)

```bash
# Extract the project
tar -xzf ccr-compliance-react.tar.gz
cd ccr-compliance-react

# Install dependencies
npm install
```

## Step 2: Firebase Setup (5 minutes)

### 2.1 Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Name it (e.g., "ccr-compliance")
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2.2 Enable Authentication

1. Click "Authentication" in left sidebar
2. Click "Get started"
3. Enable "Email/Password"
4. Enable "Google" (click Google → Enable → Save)

### 2.3 Create Firestore Database

1. Click "Firestore Database" in left sidebar
2. Click "Create database"
3. Start in **production mode**
4. Choose closest location
5. Click "Enable"

### 2.4 Update Firestore Rules

1. Click "Rules" tab
2. Replace with:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /complianceReviews/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
3. Click "Publish"

### 2.5 Enable Storage

1. Click "Storage" in left sidebar
2. Click "Get started"
3. Use default rules → "Next"
4. Choose location → "Done"
5. Click "Rules" tab
6. Replace with:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /compliance-photos/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 10 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```
7. Click "Publish"

### 2.6 Get Your Config

1. Click gear icon (⚙️) → "Project settings"
2. Scroll to "Your apps"
3. Click "</>" (Web) icon
4. Name it "CCR Compliance Web"
5. Click "Register app"
6. **COPY the firebaseConfig object** (you'll need this!)

## Step 3: Configure Environment (1 minute)

```bash
# Copy template
cp .env.example .env

# Edit .env file
nano .env
# or
code .env
```

Paste your Firebase config into `.env`:

```env
REACT_APP_FIREBASE_API_KEY=AIza...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456:web:abc123
```

Save and close the file.

## Step 4: Create First User (1 minute)

In Firebase Console:

1. Go to "Authentication"
2. Click "Users" tab
3. Click "Add user"
4. Email: `admin@example.com`
5. Password: `Test123!` (change later!)
6. Click "Add user"

## Step 5: Run It! (1 minute)

```bash
npm start
```

Browser opens to http://localhost:3000

## Step 6: Test It

1. Sign in with:
   - Email: `admin@example.com`
   - Password: `Test123!`

2. Fill out a test compliance form
3. Upload a test photo
4. Submit
5. Click "Admin Portal" link
6. See your submission!

## ✅ Success!

You're now running the CCR Compliance System!

## Next Steps

1. **Add more users** in Firebase Authentication
2. **Authorize your domain** in Firebase Auth settings (for deployment)
3. **Set up email notifications** (see README.md for EmailJS setup)
4. **Customize** colors and organization name
5. **Deploy** to Firebase Hosting, Netlify, or Vercel

## Common Issues

### "Cannot find module" error
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Firebase configuration error"
- Check .env file exists in project root
- Verify all REACT_APP_FIREBASE_* variables are set
- No quotes around values in .env

### Can't sign in
- Check user exists in Firebase Authentication
- Verify email/password are correct
- Check browser console for errors

### localhost not authorized
- Firebase Console → Authentication → Settings
- Add `localhost` to Authorized domains

## Need Help?

- Check README.md for detailed instructions
- Firebase docs: https://firebase.google.com/docs
- React docs: https://react.dev

---

**Total Time:** ~10 minutes  
**You should now have:** A fully functional compliance system!
