import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  createdAt: Date;
  avatar?: string;
}

export interface Music {
  _id?: ObjectId;
  title: string;
  artist: string; // Primary artist name (for backward compatibility)
  artistId?: ObjectId; // Primary artist ID (for backward compatibility)
  artists: {
    id: ObjectId;
    name: string;
    role: 'primary' | 'featured' | 'producer' | 'writer';
  }[]; // Multiple artists with roles
  album: string;
  albumId?: ObjectId; // Reference to Album document
  songType: 'album' | 'single'; // Whether it's part of an album or a standalone single
  genre: string | string[]; // Support both single genre (backward compatibility) and multiple genres
  duration: number; // in seconds
  thumbnailUrl: string;
  fileUrl: string;
  uploadedBy: ObjectId;
  createdAt: Date;
  likes?: number;
}

export interface Artist {
  _id?: ObjectId;
  name: string;
  bio?: string;
  imageUrl?: string;
  genre: string[];
  albumIds: ObjectId[]; // References to Album documents where this artist is the primary artist
  songIds: {
    songId: ObjectId;
    role: 'primary' | 'featured' | 'producer' | 'writer';
    songType: 'album' | 'single';
    albumId?: ObjectId; // Only for album tracks
  }[]; // References to Music documents with role information
  createdAt: Date;
  updatedAt: Date;
}

export interface Album {
  _id?: ObjectId;
  title: string;
  artistId: ObjectId; // Reference to Artist document
  artistName: string; // Denormalized for quick access
  description?: string;
  coverUrl?: string;
  releaseDate?: Date;
  genre: string[];
  songIds: ObjectId[]; // References to Music documents
  duration: number; // Total duration in seconds
  createdAt: Date;
  updatedAt: Date;
}

export interface Playlist {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  songs: ObjectId[];
  createdAt: Date;
  description?: string;
  isPublic?: boolean;
}

export interface UserFavorites {
  _id?: ObjectId;
  userId: ObjectId;
  musicIds: ObjectId[];
  updatedAt: Date;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: Omit<User, 'passwordHash'>;
  token?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
