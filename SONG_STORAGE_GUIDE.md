# Song Storage in MongoDB Atlas - Setup Guide

## Overview
Your music streaming app now has a complete song storage system integrated with MongoDB Atlas. Here's how it works:

## Database Schema

### Music Collection Structure
```javascript
{
  _id: ObjectId,
  title: String,           // Song title
  artist: String,          // Artist name
  album: String,           // Album name
  genre: String,           // Genre (Rock, Pop, etc.)
  duration: Number,        // Duration in seconds
  thumbnailUrl: String,    // URL to album art/thumbnail
  fileUrl: String,         // URL to audio file
  tags: Array,            // Array of tags for categorization
  uploadedBy: ObjectId,    // Reference to admin who uploaded
  createdAt: Date,         // Upload timestamp
  updatedAt: Date,         // Last update timestamp
  likes: Number,           // Number of likes (default: 0)
  plays: Number,           // Play count (default: 0)
  isActive: Boolean        // Whether song is active (default: true)
}
```

## File Upload System

### Audio Files
- **Endpoint**: `/api/upload/audio`
- **Method**: POST
- **Accepts**: MP3, WAV, OGG files (max 50MB)
- **Storage**: `public/uploads/audio/` directory
- **URL Format**: `/uploads/audio/filename`

### Thumbnails
- **Endpoint**: `/api/upload/thumbnail`
- **Method**: POST
- **Accepts**: JPEG, PNG, WebP images (max 5MB)
- **Storage**: `public/uploads/thumbnails/` directory
- **URL Format**: `/uploads/thumbnails/filename`

## API Endpoints

### Admin Music Management
- `GET /api/admin/music` - List all songs (admin only)
- `POST /api/admin/music` - Upload new song (admin only)
- `DELETE /api/admin/music/[id]` - Delete song (admin only)

### User Music Access
- `GET /api/music` - List songs for authenticated users
- `GET /api/music/[id]` - Get specific song details

## How to Upload Songs

### Method 1: Using the Admin Panel
1. Login as an admin user
2. Go to the Admin Panel (`/admin`)
3. Click "Add New Song"
4. Upload audio file and thumbnail (optional)
5. Fill in song details (title, artist, album, genre, duration)
6. Add tags for better categorization
7. Click "Upload"

### Method 2: Using API Directly
```javascript
// 1. First upload the audio file
const audioFormData = new FormData();
audioFormData.append('audioFile', audioFile);

const audioResponse = await fetch('/api/upload/audio', {
  method: 'POST',
  body: audioFormData
});

const audioResult = await audioResponse.json();

// 2. Then create the song record
const songData = {
  title: "Song Title",
  artist: "Artist Name",
  album: "Album Name",
  genre: "Pop",
  duration: 180, // seconds
  thumbnailUrl: "/default-thumbnail.svg", // or uploaded thumbnail URL
  fileUrl: audioResult.fileUrl,
  tags: ["pop", "2024", "trending"]
};

const response = await fetch('/api/admin/music', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(songData)
});
```

## MongoDB Atlas Configuration

Your connection is already configured in `.env.local`:
```bash
MONGODB_URI=mongodb+srv://madhan2004offcl:madhan12345@cluster0.skri6ar.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=music-streaming-app
```

### Collections Created Automatically:
- `music` - Stores all song information
- `users` - User accounts and authentication
- `playlists` - User-created playlists

## Features

### ✅ Completed Features:
- File upload validation (file type, size)
- Duplicate song detection (same title + artist)
- Secure admin-only upload access
- Automatic thumbnail generation fallback
- Tag-based categorization
- Play count and likes tracking
- File organization in directories

### 🔄 Available Operations:
- Upload songs with metadata
- List all songs with pagination
- Search and filter songs
- Delete songs (admin only)
- Update song information
- Track plays and likes

## Security Features

1. **Authentication Required**: Only authenticated users can access songs
2. **Admin-Only Uploads**: Only admin users can upload new songs
3. **File Validation**: Strict file type and size validation
4. **Duplicate Prevention**: Prevents duplicate songs by title/artist
5. **Input Sanitization**: All inputs are sanitized and validated

## File Storage Best Practices

1. **Local Development**: Files stored in `public/uploads/`
2. **Production**: Consider using cloud storage (AWS S3, Google Cloud Storage)
3. **Backup**: Regular backup of uploaded files
4. **CDN**: Use CDN for better performance in production

## Usage Examples

### Search Songs by Genre:
```javascript
const songs = await db.collection('music').find({ 
  genre: "Rock", 
  isActive: true 
}).toArray();
```

### Get Popular Songs:
```javascript
const popular = await db.collection('music').find({ 
  isActive: true 
}).sort({ plays: -1 }).limit(10).toArray();
```

### Search by Tags:
```javascript
const tagged = await db.collection('music').find({ 
  tags: { $in: ["trending", "2024"] },
  isActive: true 
}).toArray();
```

## Troubleshooting

### Common Issues:
1. **File Upload Fails**: Check file size and type
2. **Permission Denied**: Ensure user has admin role
3. **Duplicate Song**: Song with same title/artist exists
4. **Database Connection**: Verify MongoDB Atlas connection string

### File Size Limits:
- Audio files: 50MB maximum
- Thumbnail images: 5MB maximum

## Next Steps

1. **Test the Upload**: Try uploading a song through the admin panel
2. **Monitor Storage**: Keep track of file storage usage
3. **Optimize Performance**: Consider implementing caching
4. **Add Features**: Implement playlist functionality, song recommendations

Your song storage system is now fully functional and ready to use! 🎵
