# CCR Compliance Review System - React Version

A modern, production-ready React application for managing property compliance reviews with photo uploads, authentication, and admin portal.

## 📋 Features

- ✅ Secure authentication (email/password + Google Sign-In)
- ✅ Comprehensive property inspection checklist
- ✅ Photo upload with drag & drop (up to 10 images per submission)
- ✅ Real-time image previews
- ✅ Firebase integration (Firestore, Storage, Auth)
- ✅ Email notifications via EmailJS
- ✅ Admin portal with advanced filtering
- ✅ Full-screen image lightbox
- ✅ Mobile responsive design
- ✅ Protected routes
- ✅ Modern React patterns (hooks, context)

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ and npm
- Firebase account
- (Optional) EmailJS account for email notifications

### 1. Installation

```bash
# Extract and navigate to project
tar -xzf ccr-compliance-react.tar.gz
cd ccr-compliance-react

# Install dependencies
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Enable the following services:
   - **Authentication** (Email/Password and Google Sign-In)
   - **Firestore Database**
   - **Storage**

4. Get your configuration:
   - Click gear icon → Project settings
   - Scroll to "Your apps" → Select web app
   - Copy the firebaseConfig object

5. Configure Firestore Rules:
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

6. Configure Storage Rules:
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

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your Firebase configuration
nano .env  # or use your preferred editor
```

Add your Firebase config to `.env`:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 4. Create Admin Users

In Firebase Console → Authentication → Users:
- Click "Add user"
- Enter email and password for each reviewer/admin

### 5. Run the Application

```bash
# Development mode
npm start

# Runs on http://localhost:3000
```

### 6. Build for Production

```bash
# Create optimized production build
npm run build

# Output will be in /build directory
```

## 📧 Email Notifications Setup (Optional)

To receive email notifications when compliance reviews are submitted:

### Option 1: EmailJS (Recommended for start)

1. Sign up at [EmailJS.com](https://www.emailjs.com/)
2. Create an email service (Gmail, Outlook, etc.)
3. Create an email template (see template example below)
4. Get your Public Key, Service ID, and Template ID
5. Add to `.env`:

```env
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
REACT_APP_EMAILJS_SERVICE_ID=your_service_id
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
```

### EmailJS Template Example

**Subject:**
```
New Compliance Review - {{property_address}}
```

**Body (HTML):**
```html
<h2>New CCR Compliance Review Submitted</h2>
<h3>Property Information</h3>
<ul>
    <li><strong>Address:</strong> {{property_address}}</li>
    <li><strong>Review Date:</strong> {{review_date}}</li>
    <li><strong>Team:</strong> {{review_team}}</li>
    <li><strong>Submitted By:</strong> {{submitted_by}}</li>
</ul>
<h3>Summary</h3>
<ul>
    <li><strong>Photos:</strong> {{image_count}}</li>
    <li><strong>Status:</strong> {{compliance_status}}</li>
    <li><strong>Violations:</strong> {{has_violations}}</li>
</ul>
<h3>Comments</h3>
<p>{{comments}}</p>
<p><a href="{{admin_link}}">View Full Submission</a></p>
```

## 🌐 Deployment

### Firebase Hosting (Recommended)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting
firebase init hosting
# - Select your project
# - Use 'build' as public directory
# - Configure as single-page app: Yes
# - Don't overwrite build/index.html

# Build and deploy
npm run build
firebase deploy
```

### Netlify

1. Push code to GitHub
2. Connect repository in Netlify
3. Set build command: `npm run build`
4. Set publish directory: `build`
5. Add environment variables in Netlify dashboard

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

## 📂 Project Structure

```
ccr-compliance-react/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Login.jsx              # Login page with auth
│   │   ├── ComplianceForm.jsx     # Full compliance form
│   │   └── AdminViewer.jsx        # Admin portal with filters
│   ├── contexts/
│   │   └── AuthContext.js         # Authentication state management
│   ├── styles/
│   │   ├── App.css
│   │   ├── Login.css
│   │   ├── ComplianceForm.css
│   │   └── AdminViewer.css
│   ├── App.js                     # Main app with routing
│   ├── index.js                   # Entry point
│   ├── index.css                  # Global styles
│   └── firebase.js                # Firebase configuration
├── .env.example                   # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🔑 Routes

- `/` - Redirects to login
- `/login` - Sign in page
- `/form` - Compliance form (protected)
- `/admin` - Admin viewer (protected)

## 🎨 Customization

### Change Colors

Edit the CSS files in `src/styles/`:
- Purple gradient: `#667eea`, `#764ba2`
- Main purple: `#673ab7`
- Search and replace to change throughout

### Change Organization Name

Search for "Sunrise Territory Village" and replace with your organization name.

### Add More Inspection Items

1. Add field to state in `ComplianceForm.jsx`
2. Add `<RadioGroup>` component in the JSX
3. Add field to modal display in `AdminViewer.jsx`

## 🛠️ Development

```bash
# Start development server with hot reload
npm start

# Run tests
npm test

# Build for production
npm run build

# Analyze bundle size
npm run build -- --stats
```

## 📊 Available Scripts

- `npm start` - Run development server
- `npm run build` - Create production build
- `npm test` - Run test suite
- `npm run eject` - Eject from Create React App (not recommended)

## ⚠️ Troubleshooting

### "Firebase configuration error"
- Check that all environment variables are set correctly in `.env`
- Ensure `.env` file is in the project root directory

### "Unauthorized domain"
- Add your domain in Firebase Console → Authentication → Settings → Authorized domains

### Google Sign-In not working
- Enable Google provider in Firebase Authentication
- Add authorized domains for your hosting

### Images not uploading
- Check Firebase Storage rules
- Verify image size is under 10MB
- Check browser console for errors

### Can't see submissions in admin portal
- Verify Firestore rules allow read access for authenticated users
- Check that documents are being created in the `complianceReviews` collection

## 🔒 Security

- All routes except `/login` are protected
- Firebase handles authentication securely
- Environment variables keep credentials safe
- Never commit `.env` file to version control

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

This is a private project for Sunrise Territory Village. For modifications:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit for review

## 📞 Support

For issues or questions:
- Check this README
- Review Firebase documentation: https://firebase.google.com/docs
- Review React documentation: https://react.dev

## 📄 License

Private - All Rights Reserved
Sunrise Territory Village HOA

---

**Version:** 1.0.0  
**Last Updated:** October 2024  
**Built with:** React 18.2, Firebase 10.7, EmailJS 3.11
