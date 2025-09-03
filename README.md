# 🎵 Music Streaming App

A full-stack music streaming application built with Next.js 14, MongoDB Atlas, TailwindCSS, and Nodemailer.

## 🚀 Features

### Authentication System
- ✅ User Registration with email verification
- ✅ JWT-based login/logout
- ✅ Password reset functionality
- ✅ Role-based access (User/Admin)

### User Features
- 🎵 Browse music library with search & filters
- ▶️ Play music with built-in audio player
- 🎶 Create and manage personal playlists
- ❤️ Like/favorite songs
- 📱 Responsive design for all devices

### Admin Features
- 🎛️ Admin panel for music management
- ➕ Upload new songs with metadata
- ✏️ Edit/Delete songs
- 👥 User management dashboard
- 📊 Analytics and insights

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: MongoDB Atlas
- **Authentication**: JWT with bcrypt
- **Email**: Nodemailer (SMTP)
- **Styling**: TailwindCSS
- **Icons**: React Icons
- **TypeScript**: Full type safety

## 📁 Project Structure

```
music-streaming-app/
├── app/
│   ├── admin/              # Admin panel pages
│   ├── api/                # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── music/          # Music CRUD operations
│   │   ├── playlists/      # Playlist management
│   │   └── admin/          # Admin-only endpoints
│   ├── auth/               # Authentication pages
│   ├── dashboard/          # User dashboard
│   ├── verify/             # Email verification page
│   └── globals.css         # Global styles
├── lib/                    # Utility functions
│   ├── mongodb.ts          # Database connection
│   ├── jwt.ts              # JWT utilities
│   ├── auth.ts             # Password hashing
│   ├── email.ts            # Email service
│   └── middleware.ts       # Auth middleware
├── types/                  # TypeScript definitions
└── public/                 # Static assets
```

## 🔧 Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd music-streaming-app
npm install
```

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/music-app?retryWrites=true&w=majority
DB_NAME=music-streaming-app

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (Gmail SMTP example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# App URL (for email verification links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# File Upload
UPLOAD_DIR=./public/uploads
```

### 3. MongoDB Atlas Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address
5. Get the connection string and update `MONGODB_URI`

### 4. Email Configuration

#### For Gmail:
1. Enable 2-Factor Authentication
2. Generate an App Password
3. Use the App Password in `EMAIL_PASSWORD`

#### For other providers:
Update the SMTP settings in `.env.local`

### 5. Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` to see the application.

## 🎯 Usage Guide

### For Users

1. **Registration**: Sign up with email, username, and password
2. **Email Verification**: Check your email and click the verification link
3. **Login**: Sign in with your verified account
4. **Browse Music**: Search and filter the music library
5. **Play Music**: Click play button to stream songs
6. **Create Playlists**: Organize your favorite songs
7. **Manage Profile**: Update your account settings

### For Admins

1. **Access Admin Panel**: Available in the header after login (admin accounts only)
2. **Upload Music**: Add new songs with metadata and file URLs
3. **Manage Library**: Edit or delete existing songs
4. **User Management**: View and manage user accounts
5. **Content Moderation**: Monitor and moderate user content

## 🔐 Database Schema

### Users Collection
```javascript
{
  "_id": "ObjectId",
  "username": "string",
  "email": "string",
  "passwordHash": "string",
  "role": "user | admin",
  "isVerified": "boolean",
  "createdAt": "date"
}
```

### Music Collection
```javascript
{
  "_id": "ObjectId",
  "title": "string",
  "artist": "string",
  "album": "string",
  "genre": "string",
  "duration": "number",
  "thumbnailUrl": "string",
  "fileUrl": "string",
  "uploadedBy": "ObjectId",
  "createdAt": "date"
}
```

### Playlists Collection
```javascript
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "name": "string",
  "songs": ["ObjectId"],
  "description": "string",
  "isPublic": "boolean",
  "createdAt": "date"
}
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

The app can be deployed on any Node.js hosting platform:
- Railway
- Render
- DigitalOcean App Platform
- Heroku

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify` - Email verification
- `GET /api/auth/me` - Get current user

### Music
- `GET /api/music` - Get all music (authenticated)
- `GET /api/admin/music` - Get all music (admin)
- `POST /api/admin/music` - Upload new music (admin)
- `DELETE /api/admin/music/[id]` - Delete music (admin)

### Playlists
- `GET /api/playlists` - Get user playlists
- `POST /api/playlists` - Create new playlist

### Admin
- `GET /api/admin/users` - Get all users (admin)

## 🎨 Customization

### Styling
- Edit `tailwind.config.js` for theme customization
- Modify `app/globals.css` for global styles
- Update color schemes in components

### Features
- Add social features (following, sharing)
- Implement real-time features with WebSockets
- Add payment integration for premium features
- Integrate with external music APIs

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

If you have any questions or need help setting up the application, please:

1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information

---

**Built with ❤️ using Next.js and MongoDB**
