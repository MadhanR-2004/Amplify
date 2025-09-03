# Multiple Artists & Song Type Feature Documentation

## Overview

This update enhances the music streaming app to support **multiple artists per song** and **better song type management** (Album tracks vs Singles). This addresses the complex relationships between artists, songs, and albums in modern music.

## Key Features

### 1. Multiple Artists Support
- **Primary Artist**: The main artist of the song
- **Featured Artists**: Artists who are featured on the song (ft.)
- **Producers**: Producers of the song
- **Writers**: Songwriters and composers

### 2. Song Type Management
- **Album Tracks**: Songs that belong to a specific album
- **Singles**: Standalone songs not part of any album

### 3. Artist Perspective Logic
- **Primary artists** see their album tracks as part of their albums
- **Featured/collaborating artists** see the same songs as "singles" in their discography
- This matches how the music industry actually works

## Database Schema Changes

### Music Collection
```typescript
interface Music {
  _id: ObjectId;
  title: string;
  artist: string; // Primary artist name (backward compatibility)
  artists: {
    id: ObjectId;
    name: string;
    role: 'primary' | 'featured' | 'producer' | 'writer';
  }[]; // Multiple artists with roles
  album: string;
  albumId?: ObjectId;
  songType: 'album' | 'single'; // New field
  // ... other fields
}
```

### Artist Collection
```typescript
interface Artist {
  _id: ObjectId;
  name: string;
  songIds: {
    songId: ObjectId;
    role: 'primary' | 'featured' | 'producer' | 'writer';
    songType: 'album' | 'single';
    albumId?: ObjectId; // Only for album tracks
  }[]; // Enhanced relationship tracking
  // ... other fields
}
```

## API Endpoints

### New Endpoints
- `GET /api/artists/[id]/discography` - Get artist's discography with proper album/single separation

### Updated Endpoints
- `POST /api/admin/music` - Now accepts multiple artists and song type
- `GET /api/music` - Returns enhanced music data
- `GET /api/admin/music` - Returns enhanced music data for admin

## Admin Interface Changes

### Song Upload Form
1. **Song Type Selector**: Choose between "Album Track" and "Single"
2. **Multiple Artists Manager**: Add featured artists, producers, writers
3. **Enhanced Display**: Shows song type badges and featured artists

### Features
- Visual indicators for song types (Album/Single badges)
- Multiple artist display with roles
- Better organization of songs by type

## Frontend Components

### New Components
- `ArtistDiscographyDemo` - Demonstrates the new artist perspective logic
- Enhanced music display showing multiple artists and song types

### Updated Components
- Admin upload form with multiple artists support
- Music list display with enhanced artist information

## Usage Examples

### Adding a Song with Multiple Artists
```typescript
const songData = {
  title: "Blinding Lights",
  artist: "The Weeknd", // Primary artist
  artists: [
    { id: "artist2_id", name: "Daft Punk", role: "producer" },
    { id: "artist3_id", name: "Max Martin", role: "writer" }
  ],
  album: "After Hours",
  songType: "album"
};
```

### Artist Perspective
- **The Weeknd**: Sees "Blinding Lights" as part of "After Hours" album
- **Daft Punk**: Sees "Blinding Lights" as a single (since they're the producer, not primary artist)
- **Max Martin**: Sees "Blinding Lights" as a single (since they're the writer, not primary artist)

## Benefits

1. **Accurate Music Industry Modeling**: Reflects how artists actually release and collaborate on music
2. **Better Organization**: Clear separation between albums and singles from each artist's perspective
3. **Enhanced Discovery**: Users can discover music through featured artists and collaborations
4. **Flexible Relationships**: Supports various types of artist involvement (featured, producer, writer)
5. **Backward Compatibility**: Existing songs continue to work with default values

## Future Enhancements

1. **Track Numbers**: Add track ordering within albums
2. **Album Collaborations**: Support for compilation albums with multiple primary artists
3. **Advanced Roles**: Additional roles like "mixer", "engineer", "composer"
4. **Artist Credits**: Detailed credit management for complex collaborations
5. **Release Types**: Support for EPs, mixtapes, live albums

## Demo

Visit `/demo` to see the new features in action, including:
- Songs organized by type (Album Tracks vs Singles)
- Multiple artist display with roles
- Enhanced music browsing experience

This implementation provides a solid foundation for complex music relationships while maintaining simplicity for basic use cases.
