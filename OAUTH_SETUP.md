# OAuth Setup Guide

## Google Sign-In Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000`
   - Copy the **Client ID**

4. **Add to Frontend**
   - Create `.env` file in `frontend/` directory:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id-here
   ```
   - Restart the frontend server

5. **Add to Backend (Optional - for production)**
   - Create `.env` file in `backend/` directory:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id-here
   ```
   - This enables token verification on the backend

## Facebook Login Setup

1. **Go to Facebook Developers**
   - Visit: https://developers.facebook.com/
   - Click "My Apps" > "Create App"

2. **Create App**
   - Choose "Consumer" or "Business" type
   - Fill in app details

3. **Add Facebook Login**
   - In your app dashboard, click "Add Product"
   - Find "Facebook Login" and click "Set Up"

4. **Configure Settings**
   - Go to "Settings" > "Basic"
   - Add "Site URL": `http://localhost:3000`
   - Copy the **App ID**

5. **Add to Frontend**
   - Add to `.env` file in `frontend/` directory:
   ```
   REACT_APP_FACEBOOK_APP_ID=your-facebook-app-id-here
   ```
   - Restart the frontend server

## Quick Start (Without Setup)

For testing without OAuth setup:
- The app will still work with email/password login
- OAuth buttons will show but won't function until credentials are added
- You can test with the demo account: `customer@test.com` / `password123`

## Production Notes

- Always verify OAuth tokens on the backend in production
- Use HTTPS in production
- Update authorized origins/redirects for your production domain
- Store credentials securely (environment variables, not in code)



