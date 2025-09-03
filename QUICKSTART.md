# 🚀 Quick Start Guide

Follow these steps to get your Music Streaming App up and running:

## 1. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

- **MongoDB Atlas**: Create a cluster and get the connection string
- **Email SMTP**: Configure your email provider (Gmail recommended)
- **JWT Secret**: Generate a strong secret key

## 2. Install Dependencies

```bash
npm install
```

## 3. Create Admin User

After setting up your MongoDB connection, create the first admin user:

```bash
npm run create-admin
```

This will create an admin user with:
- Email: `admin@musicapp.com`
- Password: `admin123456`

**⚠️ Important: Change the admin password after first login!**

## 4. Start the Application

```bash
npm run dev
```

Visit `http://localhost:3000`

## 5. Test the Flow

### User Registration
1. Go to `/auth/register`
2. Sign up with a valid email
3. Check your email for verification link
4. Click the verification link
5. Log in with your credentials

### Admin Access
1. Log in with admin credentials
2. Access the admin panel from the header
3. Upload sample music files
4. Manage users and content

### Demo Mode
- Visit `/demo` to try the app without registration
- Limited functionality with sample songs

## 6. Production Deployment

### Environment Variables for Production:
- Update `NEXT_PUBLIC_APP_URL` to your domain
- Use strong JWT secret
- Configure production email settings
- Ensure MongoDB Atlas is production-ready

### Recommended Platforms:
- **Vercel**: Best for Next.js (automatic deployments)
- **Railway**: Good for full-stack apps
- **Render**: Alternative hosting option

## 🎵 Next Steps

1. **Upload Music**: Use the admin panel to add your music library
2. **Customize**: Modify colors, themes, and branding
3. **Features**: Add more features like social sharing, recommendations
4. **Analytics**: Integrate tracking and analytics
5. **Mobile**: Test and optimize for mobile devices

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Atlas Guide](https://docs.atlas.mongodb.com/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Vercel Deployment Guide](https://vercel.com/docs)

## 🆘 Troubleshooting

### Common Issues:

1. **Email not sending**: Check SMTP credentials and app passwords
2. **Database connection**: Verify MongoDB URI and network access
3. **JWT errors**: Ensure JWT_SECRET is set and consistent
4. **File uploads**: Check upload directory permissions

### Need Help?

- Check the logs in your terminal
- Verify all environment variables are set
- Ensure your MongoDB Atlas cluster allows your IP
- Test email settings with a simple SMTP client

---

Happy coding! 🎵
