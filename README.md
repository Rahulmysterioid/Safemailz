# Safemailz

Safemailz is a comprehensive email and employee management platform. It allows organizations to manage their employees and enables employees to seamlessly send emails via their linked Google Workspace (Gmail) or Microsoft Office 365 accounts, or fallback to an integrated cloud mail system.

## 🛠 Technologies Used

### Frontend
- **HTML5 & CSS3**: Core structure and styling with modern flexbox/grid layouts.
- **Vanilla JavaScript**: Client-side logic, DOM manipulation, and asynchronous API calls (`fetch`).
- **Quill.js**: Rich text editor for composing emails.

### Backend
- **Node.js**: JavaScript runtime environment for the server.
- **Express.js**: Web framework for building RESTful APIs and routing.
- **Bcrypt**: Password hashing and secure authentication.
- **Nodemailer**: Email sending library for fallback SMTP delivery.

### Database
- **SQLite3 / @libsql/sqlite3**: Lightweight SQL database used for local development.
- **Turso (LibSQL)**: Cloud-hosted edge database for persistent production data.

### Third-Party APIs
- **Google OAuth 2.0 & Gmail API**: For syncing Google accounts and sending emails via Gmail.
- **Microsoft Graph API & OAuth**: For syncing Outlook/Microsoft accounts.

---

## 🚀 Deployment Guide (Render)

This project is configured to be seamlessly deployed on [Render's](https://render.com/) Free Tier using the Turso cloud database for persistent storage.

### Step 1: Push Code to GitHub
1. Make sure your latest code is committed and pushed to a public or private GitHub repository.

### Step 2: Create a Turso Cloud Database
*Render's free tier wipes local files (like SQLite databases) on every restart. Turso solves this by keeping your database safely in the cloud.*
1. Go to [turso.tech](https://turso.tech/) and sign up.
2. Create a new database (e.g., `safemailz`).
3. Copy your **Database URL** (starts with `libsql://`).
4. Generate and copy your **Auth Token**.

### Step 3: Setup Render Web Service
1. Go to your [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`

### Step 4: Configure Environment Variables
In your Render Web Service settings, go to the **Environment** tab and add the following keys. *(Do not upload your `.env` file directly).*

| Key | Value Description |
| :--- | :--- |
| `SESSION_SECRET` | A random long string for session security (e.g., `my_super_secret_key_123`) |
| `GOOGLE_CLIENT_ID` | Your Google Cloud Console Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google Cloud Console Client Secret |
| `GOOGLE_REDIRECT_URI` | `https://your-app-name.onrender.com/api/sync/callback/google` |
| `MS_CLIENT_ID` | Your Microsoft Azure Client ID |
| `MS_CLIENT_SECRET` | Your Microsoft Azure Client Secret |
| `MS_REDIRECT_URI` | `https://your-app-name.onrender.com/api/sync/callback/microsoft` |
| `TURSO_DATABASE_URL` | Your Turso DB URL (from Step 2) |
| `TURSO_AUTH_TOKEN` | Your Turso Auth Token (from Step 2) |

### Step 5: Deploy
1. Click **Save Changes** and then **Manual Deploy** > **Deploy latest commit**.
2. Once the deploy succeeds (Green Checkmark ✅), your application will be live and ready to use!

---

## 💡 Important Notes for Production
- **Redirect URIs**: Whenever your domain changes (e.g., from `localhost` to `safemailz.onrender.com`), you **must** update the Authorized Redirect URIs in both the Google Cloud Console and Microsoft Azure Portal, otherwise OAuth logins will fail.
- **Port 465**: Render blocks outbound connections on port 465 (common for SMTP). The application is optimized to bypass this by exclusively using the native Gmail/Microsoft Graph APIs for reliable email delivery.
