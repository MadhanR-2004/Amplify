'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CacheManagement from './components/CacheManagement';
import GradientBackground from '@/components/GradientBackground';
import { useMusicStats } from '@/hooks/useMusicStats';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
}

interface Genre {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
}

interface Music {
  _id: string;
  title: string;
  artist: string;
  artists: {
    id: string;
    name: string;
    role: 'primary' | 'featured' | 'producer' | 'writer';
  }[];
  album: string;
  songType: 'album' | 'single';
  genre: string; // Changed back to string for backward compatibility
  duration: number;
  thumbnailUrl: string;
  fileUrl: string;
  createdAt: string;
  artistId?: string;
  albumId?: string;
}

interface Artist {
  _id: string;
  name: string;
  bio: string;
  imageUrl: string;
  genre: string[]; // Already array
  albumIds: string[];
  songIds: string[];
  createdAt: string;
}

interface Album {
  _id: string;
  title: string;
  artistId: string;
  artistName: string;
  description: string;
  coverUrl: string;
  releaseDate: string;
  genre: string[]; // Already array
  songIds: string[];
  duration: number;
  createdAt: string;
}

const LoadingSpinner = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`}></div>
  );
};

export default function AdminPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [music, setMusic] = useState<Music[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('music');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showArtistForm, setShowArtistForm] = useState(false);
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [showGenreForm, setShowGenreForm] = useState(false);
  const [editingMusic, setEditingMusic] = useState<Music | null>(null);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumSongs, setAlbumSongs] = useState<Music[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [genresLoading, setGenresLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  const { refetch: refetchStats } = useMusicStats();

  // Helper function to reset upload form
  const resetUploadForm = () => ({
    title: '',
    artist: '',
    album: '',
    songType: 'single' as 'album' | 'single',
    genre: [''] as string[], // Changed to array for multiple genres
    duration: '',
    thumbnailUrl: '',
    fileUrl: '',
    tags: '',
    artistId: '',
    albumId: '',
    artists: [] as { id: string; name: string; role: 'primary' | 'featured' | 'producer' | 'writer' }[],
  });

  const [uploadForm, setUploadForm] = useState(resetUploadForm());

  const [artistForm, setArtistForm] = useState({
    name: '',
    bio: '',
    imageUrl: '',
    genre: [''] as string[], // Start with one empty genre
  });

  const [albumForm, setAlbumForm] = useState({
    title: '',
    artistId: '',
    description: '',
    coverUrl: '',
    releaseDate: '',
    genre: [''] as string[], // Start with one empty genre
  });

  const [genreForm, setGenreForm] = useState({
    name: '',
    description: '',
    color: '#6366f1', // Default purple color
  });

  const [uploadStatus, setUploadStatus] = useState({
    audioFile: null as File | null,
    audioUploading: false,
    audioUploaded: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      if (activeTab === 'music') {
        fetchMusic();
        // Load genres for dropdown if not already loaded
        if (genres.length === 0) {
          fetchGenres();
        }
      } else if (activeTab === 'users') {
        fetchUsers();
      } else if (activeTab === 'artists') {
        fetchArtists();
        // Load genres for dropdown if not already loaded
        if (genres.length === 0) {
          fetchGenres();
        }
      } else if (activeTab === 'albums') {
        fetchAlbums();
        // Load artists and genres for dropdowns
        if (artists.length === 0) {
          fetchArtists();
        }
        if (genres.length === 0) {
          fetchGenres();
        }
      } else if (activeTab === 'genres') {
        fetchGenres();
      }
    }
  }, [user, activeTab]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.user.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        setUser(data.user);
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchMusic = async () => {
    try {
      const response = await fetch('/api/admin/music');
      if (response.ok) {
        const data = await response.json();
        setMusic(data.music || []);
      }
    } catch (error) {
      console.error('Error fetching music:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchArtists = async (force = false) => {
    if (artists.length > 0 && !force) return; // Don't refetch unless forced
    
    setArtistsLoading(true);
    try {
      const response = await fetch('/api/admin/artists');
      if (response.ok) {
        const data = await response.json();
        setArtists(data.artists || []);
      }
    } catch (error) {
      console.error('Error fetching artists:', error);
    } finally {
      setArtistsLoading(false);
    }
  };

  const fetchAlbums = async (force = false) => {
    if (albums.length > 0 && !force) return; // Don't refetch unless forced
    
    setAlbumsLoading(true);
    try {
      const response = await fetch('/api/admin/albums');
      if (response.ok) {
        const data = await response.json();
        setAlbums(data.albums || []);
      }
    } catch (error) {
      console.error('Error fetching albums:', error);
    } finally {
      setAlbumsLoading(false);
    }
  };

  const fetchGenres = async (force = false) => {
    if (genres.length > 0 && !force) return; // Don't refetch unless forced
    
    setGenresLoading(true);
    try {
      const response = await fetch('/api/admin/genres');
      if (response.ok) {
        const data = await response.json();
        setGenres(data.genres || []);
      }
    } catch (error) {
      console.error('Error fetching genres:', error);
    } finally {
      setGenresLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!uploadStatus.audioUploaded && !editingMusic) {
      alert('Please upload an audio file');
      return;
    }
    
    // Validate that at least one genre is selected
    if (!uploadForm.genre || uploadForm.genre.length === 0 || 
        (uploadForm.genre.length === 1 && uploadForm.genre[0] === '')) {
      alert('Please select at least one genre');
      return;
    }
    
    try {
      const tagsArray = uploadForm.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Filter out empty genres
      const validGenres = uploadForm.genre.filter(g => g.trim() !== '');
      
      const formData = {
        ...uploadForm,
        genre: validGenres,
        duration: parseInt(uploadForm.duration),
        tags: tagsArray,
      };
      
      console.log('Sending music data:', formData);
      
      const url = editingMusic ? `/api/admin/music/${editingMusic._id}` : '/api/admin/music';
      const method = editingMusic ? 'PUT' : 'POST';
        
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        setShowUploadForm(false);
        setEditingMusic(null);
        setUploadForm(resetUploadForm());
        setUploadStatus({
          audioFile: null,
          audioUploading: false,
          audioUploaded: false,
        });
        fetchMusic();
        refetchStats(); // Refresh stats after music upload/update
        alert(editingMusic ? 'Song updated successfully!' : 'Song uploaded successfully!');
      } else {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        alert(`${editingMusic ? 'Update' : 'Upload'} failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error uploading music:', error);
      alert('Network error occurred while uploading');
    }
  };

  const handleAudioFileUpload = async (file: File) => {
    setUploadStatus(prev => ({ ...prev, audioUploading: true }));
    
    try {
      const formData = new FormData();
      formData.append('audioFile', file);
      
      // Upload directly to MongoDB using GridFS
      const response = await fetch('/api/admin/music/upload-to-mongodb', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('Audio upload to MongoDB successful, fileUrl:', result.fileUrl);
        setUploadForm(prev => ({ 
          ...prev, 
          fileUrl: result.fileUrl,
          duration: result.duration ? result.duration.toString() : ''
        }));
        setUploadStatus(prev => ({ 
          ...prev, 
          audioUploading: false, 
          audioUploaded: true,
          audioFile: file 
        }));
      } else {
        alert(result.message || 'Audio upload to MongoDB failed');
        setUploadStatus(prev => ({ ...prev, audioUploading: false }));
      }
    } catch (error) {
      console.error('Audio upload to MongoDB error:', error);
      alert('Audio upload to MongoDB failed');
      setUploadStatus(prev => ({ ...prev, audioUploading: false }));
    }
  };

  const handleArtistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (actionLoading) return; // Prevent double submission
    
    setActionLoading(true);
    
    try {
      const formData = {
        ...artistForm,
        // genre is already an array, no need to split
      };
      
      const url = editingArtist ? `/api/admin/artists/${editingArtist._id}` : '/api/admin/artists';
      const method = editingArtist ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        setShowArtistForm(false);
        setEditingArtist(null);
        setArtistForm({
          name: '',
          bio: '',
          imageUrl: '',
          genre: [],
        });
        // Force refresh artists list
        setArtists([]);
        await fetchArtists(true);
        refetchStats(); // Refresh stats after artist creation/update
        alert(editingArtist ? 'Artist updated successfully!' : 'Artist created successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to ${editingArtist ? 'update' : 'create'} artist: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating artist:', error);
      alert('Network error occurred while creating artist');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (actionLoading) return; // Prevent double submission
    
    setActionLoading(true);
    
    try {
      const formData = {
        ...albumForm,
        // genre is already an array, no need to split
      };
      
      const url = editingAlbum ? `/api/admin/albums/${editingAlbum._id}` : '/api/admin/albums';
      const method = editingAlbum ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        setShowAlbumForm(false);
        setEditingAlbum(null);
        setAlbumForm({
          title: '',
          artistId: '',
          description: '',
          coverUrl: '',
          releaseDate: '',
          genre: [],
        });
        // Force refresh albums list
        setAlbums([]);
        await fetchAlbums(true);
        refetchStats(); // Refresh stats after album creation/update
        alert(editingAlbum ? 'Album updated successfully!' : 'Album created successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to ${editingAlbum ? 'update' : 'create'} album: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating album:', error);
      alert('Network error occurred while creating album');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAlbum = async (album: Album) => {
    setSelectedAlbum(album);
    setAlbumSongs([]); // Start with empty, load in background if needed
    // Album modal opens instantly, song loading is handled separately if implemented
  };

  const handleCloseAlbum = () => {
    setSelectedAlbum(null);
    setAlbumSongs([]);
  };

  const handleEditMusic = (song: Music) => {
    setEditingMusic(song);
    setUploadForm({
      title: song.title,
      artist: song.artist,
      album: song.album,
      songType: song.songType || 'single',
      genre: typeof song.genre === 'string' ? [song.genre] : song.genre || [''],
      duration: song.duration.toString(),
      thumbnailUrl: song.thumbnailUrl,
      fileUrl: song.fileUrl,
      tags: '',
      artistId: song.artistId || '',
      albumId: song.albumId || '',
      artists: song.artists || [],
    });
    setShowUploadForm(true);
    // Force load artists and albums for the dropdowns
    if (artists.length === 0) {
      fetchArtists(true);
    }
    if (albums.length === 0) {
      fetchAlbums(true);
    }
  };

  const handleEditArtist = (artist: Artist) => {
    setEditingArtist(artist);
    setArtistForm({
      name: artist.name,
      bio: artist.bio,
      imageUrl: artist.imageUrl,
      genre: artist.genre, // Already an array
    });
    setShowArtistForm(true);
  };

  const handleEditAlbum = (album: Album) => {
    setEditingAlbum(album);
    setAlbumForm({
      title: album.title,
      artistId: album.artistId,
      description: album.description,
      coverUrl: album.coverUrl,
      releaseDate: album.releaseDate,
      genre: album.genre, // Already an array
    });
    setShowAlbumForm(true);
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (confirm('Are you sure you want to delete this album? This will not delete the songs.')) {
      try {
        const response = await fetch(`/api/admin/albums/${albumId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchAlbums();
          refetchStats(); // Refresh stats after album deletion
          // Close album modal if the deleted album was open
          if (selectedAlbum && selectedAlbum._id === albumId) {
            handleCloseAlbum();
          }
          alert('Album deleted successfully');
        } else {
          const error = await response.json();
          alert(`Failed to delete album: ${error.message}`);
        }
      } catch (error) {
        console.error('Error deleting album:', error);
        alert('Network error occurred while deleting album');
      }
    }
  };

  const handleRemoveSongFromAlbum = async (songId: string) => {
    if (!selectedAlbum) return;
    
    if (confirm('Remove this song from the album? The song will not be deleted.')) {
      try {
        const response = await fetch(`/api/admin/albums/${selectedAlbum._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'removeSong',
            songId: songId,
          }),
        });
        
        if (response.ok) {
          // Refresh the album songs list
          handleOpenAlbum(selectedAlbum);
          alert('Song removed from album successfully');
        } else {
          const error = await response.json();
          alert(`Failed to remove song: ${error.message}`);
        }
      } catch (error) {
        console.error('Error removing song from album:', error);
        alert('Network error occurred while removing song');
      }
    }
  };

  const handleDeleteMusic = async (id: string) => {
    if (confirm('Are you sure you want to delete this song?')) {
      try {
        const response = await fetch(`/api/admin/music/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchMusic();
          refetchStats(); // Refresh stats after music deletion
        }
      } catch (error) {
        console.error('Error deleting music:', error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  // Genre handlers
  const handleGenreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const url = editingGenre ? `/api/admin/genres/${editingGenre._id}` : '/api/admin/genres';
      const method = editingGenre ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(genreForm),
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('Genre response data:', responseData); // Debug log
        
        setShowGenreForm(false);
        setEditingGenre(null);
        setGenreForm({
          name: '',
          description: '',
          color: '#6366f1'
        });
        
        // Update the genres state immediately instead of refetching
        if (editingGenre) {
          // Update existing genre
          console.log('Updating existing genre:', editingGenre._id, 'with:', responseData.genre);
          setGenres(prevGenres => prevGenres.map(g => g._id === editingGenre._id ? responseData.genre : g));
        } else {
          // Add new genre
          console.log('Adding new genre:', responseData.genre);
          setGenres(prevGenres => [...prevGenres, responseData.genre]);
        }
        
        refetchStats(); // Refresh stats after genre creation/update (though genres don't affect main counts, good for consistency)
        alert(editingGenre ? 'Genre updated successfully!' : 'Genre created successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to save genre');
      }
    } catch (error) {
      console.error('Error saving genre:', error);
      alert('Network error occurred while saving genre');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditGenre = (genre: Genre) => {
    setEditingGenre(genre);
    setGenreForm({
      name: genre.name,
      description: genre.description || '',
      color: genre.color || '#6366f1'
    });
    setShowGenreForm(true);
  };

  const handleDeleteGenre = async (genreId: string) => {
    if (confirm('Are you sure you want to delete this genre? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/admin/genres/${genreId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          // Remove the deleted genre from state immediately
          console.log('Deleting genre:', genreId);
          setGenres(prevGenres => prevGenres.filter(g => g._id !== genreId));
          refetchStats(); // Refresh stats after genre deletion (for consistency)
          alert('Genre deleted successfully!');
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Failed to delete genre');
        }
      } catch (error) {
        console.error('Error deleting genre:', error);
        alert('Network error occurred while deleting genre');
      }
    }
  };

  return (
    <GradientBackground>
      <div className="min-h-screen text-white">
        {/* Header */}
        <header className="bg-gray-800/90 backdrop-blur-sm shadow-lg">
          <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <h1 className="text-2xl font-bold text-purple-400"></h1>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-md">
                <span className="text-sm sm:text-base">
                  Welcome, {user?.username || user?.email || 'Admin'}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm sm:text-base"
                >
                  User Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm sm:text-base"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-8">
          <button
            onClick={() => setActiveTab('music')}
            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base ${
              activeTab === 'music'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Music Management
          </button>
          <button
            onClick={() => setActiveTab('artists')}
            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base ${
              activeTab === 'artists'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Artist Management
          </button>
          <button
            onClick={() => setActiveTab('albums')}
            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base ${
              activeTab === 'albums'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Album Management
          </button>
          <button
            onClick={() => setActiveTab('genres')}
            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base ${
              activeTab === 'genres'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Genre Management
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('cache')}
            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base ${
              activeTab === 'cache'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Cache Management
          </button>
        </div>

        {/* Music Management Tab */}
        {activeTab === 'music' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold">Music Library</h2>
              <button
                onClick={async () => {
                  // Clear any existing editing state
                  setEditingMusic(null);
                  setUploadForm(resetUploadForm());
                  setUploadStatus({
                    audioFile: null,
                    audioUploading: false,
                    audioUploaded: false,
                  });
                  setShowUploadForm(true);
                  // Load artists and albums asynchronously after opening the form
                  if (artists.length === 0) {
                    fetchArtists(true);
                  }
                  if (albums.length === 0) {
                    fetchAlbums(true);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base"
              >
                Add New Song
              </button>
            </div>

            {/* Upload Form Modal */}
            {showUploadForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg p-4 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                  <h3 className="text-lg sm:text-xl font-bold mb-4">
                    {editingMusic ? 'Edit Song' : 'Upload New Song to MongoDB'}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    {editingMusic 
                      ? 'Update song information below' 
                      : 'Upload audio files directly to MongoDB and use online image URLs for thumbnails'
                    }
                  </p>
                  <form onSubmit={handleUploadSubmit} className="space-y-4">
                    {/* Audio File Upload to MongoDB */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Audio File {editingMusic ? '(Upload new file or keep current)' : '(Upload to MongoDB) *'}
                      </label>
                      {editingMusic && !uploadStatus.audioUploaded ? (
                        <div className="bg-blue-900 p-3 rounded-lg mb-3">
                          <p className="text-blue-400">📁 Current file: {editingMusic.fileUrl}</p>
                          <p className="text-xs text-gray-400 mt-1">Upload a new file below to replace it, or leave as is to keep current file</p>
                        </div>
                      ) : null}
                      {!uploadStatus.audioUploaded ? (
                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-4">
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAudioFileUpload(file);
                            }}
                            className="w-full"
                            disabled={uploadStatus.audioUploading}
                          />
                          <p className="text-xs text-gray-400 mt-2">
                            Supported formats: MP3, WAV, M4A, OGG (Max: 50MB)
                          </p>
                          {uploadStatus.audioUploading && (
                            <p className="text-blue-400 mt-2">Uploading to MongoDB...</p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-green-900 p-3 rounded-lg">
                          <p className="text-green-400">✅ Audio uploaded to MongoDB: {uploadStatus.audioFile?.name}</p>
                          <button
                            type="button"
                            onClick={() => setUploadStatus({ ...uploadStatus, audioUploaded: false, audioFile: null })}
                            className="text-red-400 text-sm mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail URL Input */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Thumbnail Image URL</label>
                      <input
                        type="url"
                        placeholder="Enter thumbnail image URL (e.g., https://example.com/image.jpg)"
                        value={uploadForm.thumbnailUrl}
                        onChange={(e) => setUploadForm({ ...uploadForm, thumbnailUrl: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Leave empty to use default thumbnail
                      </p>
                    </div>

                    <input
                      type="text"
                      placeholder="Song Title *"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                      required
                    />
                    
                    {/* Artist Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Artist</label>
                      <select
                        value={uploadForm.artistId || ''}
                        onChange={(e) => setUploadForm({ ...uploadForm, artistId: e.target.value, artist: artists.find(a => a._id === e.target.value)?.name || '' })}
                        className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                        disabled={artistsLoading}
                      >
                        <option value="">
                          {artistsLoading ? 'Loading artists...' : 'Select Artist (or type manually below)'}
                        </option>
                        {artists.map((artist) => (
                          <option key={artist._id} value={artist._id}>
                            {artist.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Or type artist name manually *"
                        value={uploadForm.artist}
                        onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value, artistId: '' })}
                        className="w-full px-4 py-2 bg-gray-700 rounded-lg mt-2"
                        required
                      />
                    </div>
                    
                    {/* Song Type Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Song Type *</label>
                      <select
                        value={uploadForm.songType}
                        onChange={(e) => {
                          const newSongType = e.target.value as 'album' | 'single';
                          setUploadForm({ 
                            ...uploadForm, 
                            songType: newSongType,
                            // Clear album data when switching to single
                            album: newSongType === 'single' ? '' : uploadForm.album,
                            albumId: newSongType === 'single' ? '' : uploadForm.albumId
                          });
                        }}
                        className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                        required
                      >
                        <option value="single">Single</option>
                        <option value="album">Album Track</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">
                        {uploadForm.songType === 'album' 
                          ? 'This song is part of an album' 
                          : 'This song is a standalone single'
                        }
                      </p>
                    </div>

                    {/* Album Selection - Only show for album tracks */}
                    {uploadForm.songType === 'album' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Album *</label>
                        <select
                          value={uploadForm.albumId || ''}
                          onChange={(e) => setUploadForm({ ...uploadForm, albumId: e.target.value, album: albums.find(a => a._id === e.target.value)?.title || '' })}
                          className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                          disabled={albumsLoading}
                        >
                          <option value="">
                            {albumsLoading ? 'Loading albums...' : 'Select Album (or type manually below)'}
                          </option>
                          {albums.filter(album => !uploadForm.artistId || album.artistId === uploadForm.artistId).map((album) => (
                            <option key={album._id} value={album._id}>
                              {album.title}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Or type album name manually *"
                          value={uploadForm.album}
                          onChange={(e) => setUploadForm({ ...uploadForm, album: e.target.value, albumId: '' })}
                          className="w-full px-4 py-2 bg-gray-700 rounded-lg mt-2"
                          required
                        />
                      </div>
                    )}

                    {/* Multiple Artists Management */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Additional Artists (Collaborations, Features, etc.)
                      </label>
                      <div className="space-y-2">
                        {uploadForm.artists.map((artist, index) => (
                          <div key={index} className="flex gap-2 items-center bg-gray-700/50 p-2 rounded">
                            <div className="flex-1">
                              <select
                                value={artist.id}
                                onChange={(e) => {
                                  const selectedArtist = artists.find(a => a._id === e.target.value);
                                  const newArtists = [...uploadForm.artists];
                                  newArtists[index].id = e.target.value;
                                  newArtists[index].name = selectedArtist?.name || '';
                                  setUploadForm({ ...uploadForm, artists: newArtists });
                                }}
                                className="w-full px-2 py-1 bg-gray-600 rounded text-sm mb-1"
                                disabled={artistsLoading}
                              >
                                <option value="">
                                  {artistsLoading ? 'Loading artists...' : 'Select Artist'}
                                </option>
                                {artists.map((a) => (
                                  <option key={a._id} value={a._id}>
                                    {a.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Or type artist name manually"
                                value={artist.name}
                                onChange={(e) => {
                                  const newArtists = [...uploadForm.artists];
                                  newArtists[index].name = e.target.value;
                                  newArtists[index].id = ''; // Clear ID when typing manually
                                  setUploadForm({ ...uploadForm, artists: newArtists });
                                }}
                                className="w-full px-2 py-1 bg-gray-600 rounded text-sm"
                              />
                            </div>
                            <select
                              value={artist.role}
                              onChange={(e) => {
                                const newArtists = [...uploadForm.artists];
                                newArtists[index].role = e.target.value as any;
                                setUploadForm({ ...uploadForm, artists: newArtists });
                              }}
                              className="px-2 py-1 bg-gray-600 rounded text-sm"
                            >
                              <option value="featured">Featured</option>
                              <option value="producer">Producer</option>
                              <option value="writer">Writer</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const newArtists = uploadForm.artists.filter((_, i) => i !== index);
                                setUploadForm({ ...uploadForm, artists: newArtists });
                              }}
                              className="text-red-400 hover:text-red-300 text-sm px-2"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setUploadForm({
                              ...uploadForm,
                              artists: [...uploadForm.artists, { id: '', name: '', role: 'featured' }]
                            });
                          }}
                          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                        >
                          + Add Artist
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Add featured artists, collaborators, producers, etc. The main artist is set above.
                      </p>
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Genres *
                      </label>
                      <div className="space-y-2">
                        {(uploadForm.genre.length > 0 ? uploadForm.genre : ['']).map((genreName, index) => (
                          <div key={index} className="flex items-center gap-2 bg-gray-600 rounded-lg p-2">
                            <select
                              value={genreName}
                              onChange={(e) => {
                                const newGenres = [...(uploadForm.genre.length > 0 ? uploadForm.genre : [''])];
                                newGenres[index] = e.target.value;
                                setUploadForm({ ...uploadForm, genre: newGenres });
                              }}
                              className="flex-1 bg-gray-700 rounded px-2 py-1 text-white"
                              required={index === 0}
                            >
                              <option value="">Select a genre</option>
                              {genres.map((genre) => (
                                <option key={genre._id} value={genre.name}>
                                  {genre.name}
                                </option>
                              ))}
                            </select>
                            {uploadForm.genre.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newGenres = uploadForm.genre.filter((_, i) => i !== index);
                                  setUploadForm({ ...uploadForm, genre: newGenres });
                                }}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const currentGenres = uploadForm.genre.length > 0 ? uploadForm.genre : [''];
                            setUploadForm({
                              ...uploadForm,
                              genre: [...currentGenres, '']
                            });
                          }}
                          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                        >
                          + Add Genre
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Add multiple genres that describe this song's style.
                      </p>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Duration (seconds) *"
                        value={uploadForm.duration}
                        onChange={(e) => setUploadForm({ ...uploadForm, duration: e.target.value })}
                        className={`w-full px-4 py-2 bg-gray-700 rounded-lg ${
                          uploadForm.duration && uploadStatus.audioUploaded 
                            ? 'bg-green-900/30 border border-green-500/50' 
                            : ''
                        }`}
                        readOnly={!!(uploadForm.duration && uploadStatus.audioUploaded)}
                        required
                      />
                      {uploadForm.duration && uploadStatus.audioUploaded && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <span className="text-green-400 text-xs">Auto-detected</span>
                        </div>
                      )}
                      {!uploadForm.duration && uploadStatus.audioUploaded && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <span className="text-yellow-400 text-xs">Manual entry required</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Tags (comma-separated)"
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                    />
                    
                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg"
                      >
                        {editingMusic ? 'Update Song' : 'Add Song'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUploadForm(false);
                          setEditingMusic(null);
                          setUploadForm(resetUploadForm());
                          setUploadStatus({
                            audioFile: null,
                            audioUploading: false,
                            audioUploaded: false,
                          });
                        }}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Music List */}
            <div className="grid gap-4">
              {music.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No music uploaded yet. Add some songs to get started!
                </div>
              ) : (
                music.map((song) => (
                  <div key={song._id} className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 shadow-lg">
                    <img
                      src={song.thumbnailUrl}
                      alt={song.title}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{song.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${song.songType === 'album' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                          {song.songType === 'album' ? 'Album' : 'Single'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm truncate">
                        {song.artist}
                        {song.artists && song.artists.length > 0 && (
                          <span className="text-gray-500">
                            {' '} ft. {song.artists.map(a => a.name).join(', ')}
                          </span>
                        )}
                        {' '} - {song.album}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {song.genre} • {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                        {song.artists && song.artists.length > 0 && (
                          <span className="text-gray-600 ml-2">
                            ({song.artists.map(a => `${a.name} (${a.role})`).join(', ')})
                          </span>
                        )}
                      </p>
                      {/* Simple audio preview without heavy caching */}
                      <audio 
                        controls 
                        preload="none" 
                        className="mt-2 w-full max-w-xs"
                      >
                        <source src={song.fileUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                    <div className="flex flex-row sm:flex-col lg:flex-row space-x-2 sm:space-x-0 sm:space-y-2 lg:space-y-0 lg:space-x-2 w-full sm:w-auto">
                      <button 
                        onClick={() => handleEditMusic(song)}
                        className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-2 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMusic(song._id)}
                        className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 px-3 sm:px-4 py-2 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Users Management Tab */}
        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-6">User Management</h2>
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-sm">Username</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-sm">Email</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-sm">Role</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-sm">Verified</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-sm">Joined</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user: any) => (
                      <tr key={user._id} className="border-t border-gray-700">
                        <td className="px-4 sm:px-6 py-4 text-sm">{user.username}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm truncate max-w-[150px]">{user.email}</td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.isVerified ? 'bg-green-600' : 'bg-red-600'
                          }`}>
                            {user.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex space-x-1">
                            <button className="bg-yellow-600 hover:bg-yellow-700 px-2 sm:px-3 py-1 rounded text-xs">
                              Edit
                            </button>
                            <button className="bg-red-600 hover:bg-red-700 px-2 sm:px-3 py-1 rounded text-xs">
                              Ban
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Artists Management Tab */}
        {activeTab === 'artists' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold">Artist Management</h2>
              <button
                onClick={() => {
                  // Clear any existing editing state
                  setEditingArtist(null);
                  setArtistForm({
                    name: '',
                    bio: '',
                    imageUrl: '',
                    genre: [],
                  });
                  setShowArtistForm(true);
                }}
                className="bg-green-600 hover:bg-green-700 px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base"
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Add New Artist'}
              </button>
            </div>

            {/* Artist List */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 shadow-xl">
              {artistsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                  <span className="ml-2 text-gray-400">Loading artists...</span>
                </div>
              ) : (
                <div className="grid gap-4">
                  {artists.map((artist) => (
                  <div key={artist._id} className="bg-gray-700/50 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                      <img
                        src={artist.imageUrl || '/default-thumbnail.svg'}
                        alt={artist.name}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 w-full sm:w-auto">
                        <h3 className="text-lg font-semibold truncate">{artist.name}</h3>
                        <p className="text-gray-300 text-sm line-clamp-2">{artist.bio}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {artist.genre.map((g, index) => (
                            <span key={index} className="px-2 py-1 bg-purple-600 rounded-full text-xs">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 w-full sm:w-auto">
                      <button 
                        onClick={() => handleEditArtist(artist)}
                        className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-2 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 px-3 sm:px-4 py-2 rounded text-sm">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {artists.length === 0 && !artistsLoading && (
                  <p className="text-gray-400 text-center py-8">No artists found</p>
                )}
              </div>
              )}
            </div>
          </div>
        )}

        {/* Albums Management Tab */}
        {activeTab === 'albums' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold">Album Management</h2>
              <button
                onClick={() => {
                  // Clear any existing editing state
                  setEditingAlbum(null);
                  setAlbumForm({
                    title: '',
                    artistId: '',
                    description: '',
                    coverUrl: '',
                    releaseDate: '',
                    genre: [],
                  });
                  setShowAlbumForm(true);
                  // Load artists asynchronously only if needed for the dropdown
                  if (artists.length === 0) {
                    fetchArtists();
                  }
                }}
                className="bg-green-600 hover:bg-green-700 px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base"
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Add New Album'}
              </button>
            </div>

            {/* Album List */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 shadow-xl">
              {albumsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                  <span className="ml-2 text-gray-400">Loading albums...</span>
                </div>
              ) : (
                <div className="grid gap-4">
                  {albums.map((album) => (
                  <div key={album._id} className="bg-gray-700/50 rounded-lg p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
                      <img
                        src={album.coverUrl || '/default-thumbnail.svg'}
                        alt={album.title}
                        className="w-16 h-16 rounded object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 w-full sm:w-auto">
                        <h3 className="text-lg font-semibold truncate">{album.title}</h3>
                        <p className="text-gray-300 text-sm truncate">
                          by {artists.find(a => a._id === album.artistId)?.name || 'Unknown Artist'}
                        </p>
                        <p className="text-gray-400 text-xs line-clamp-2">{album.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {album.genre.map((g, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-600 rounded-full text-xs">
                              {g}
                            </span>
                          ))}
                        </div>
                        <p className="text-gray-400 text-xs mt-1">
                          Released: {new Date(album.releaseDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                      <button 
                        onClick={() => handleOpenAlbum(album)}
                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 px-3 sm:px-4 py-2 rounded text-sm whitespace-nowrap"
                      >
                        View Songs
                      </button>
                      <button 
                        onClick={() => handleEditAlbum(album)}
                        className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-2 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteAlbum(album._id)}
                        className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 px-3 sm:px-4 py-2 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {albums.length === 0 && !albumsLoading && (
                  <p className="text-gray-400 text-center py-8">No albums found</p>
                )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cache Management Tab */}
        {activeTab === 'cache' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-6">Performance & Cache Management</h2>
            <CacheManagement />
          </div>
        )}
      </div>

      {/* Global Modals - Outside of tab sections */}
      {/* Artist Form Modal */}
      {showArtistForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/90 backdrop-blur-md rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg sm:text-xl font-bold mb-4">
              {editingArtist ? 'Edit Artist' : 'Add New Artist'}
            </h3>
            <form onSubmit={handleArtistSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Artist Name *"
                value={artistForm.name}
                onChange={(e) => setArtistForm({ ...artistForm, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                required
              />
              <textarea
                placeholder="Biography"
                value={artistForm.bio}
                onChange={(e) => setArtistForm({ ...artistForm, bio: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg h-20"
              />
              <input
                type="url"
                placeholder="Image URL"
                value={artistForm.imageUrl}
                onChange={(e) => setArtistForm({ ...artistForm, imageUrl: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
              />
              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Genres *
                </label>
                <div className="space-y-2">
                  {(artistForm.genre.length > 0 ? artistForm.genre : ['']).map((genreName, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-600 rounded-lg p-2">
                      <select
                        value={genreName}
                        onChange={(e) => {
                          const newGenres = [...(artistForm.genre.length > 0 ? artistForm.genre : [''])];
                          newGenres[index] = e.target.value;
                          setArtistForm({ ...artistForm, genre: newGenres });
                        }}
                        className="flex-1 bg-gray-700 rounded px-2 py-1 text-white"
                        required={index === 0}
                      >
                        <option value="">Select a genre</option>
                        {genres.map((genre) => (
                          <option key={genre._id} value={genre.name}>
                            {genre.name}
                          </option>
                        ))}
                      </select>
                      {artistForm.genre.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newGenres = artistForm.genre.filter((_, i) => i !== index);
                            setArtistForm({ ...artistForm, genre: newGenres });
                          }}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const currentGenres = artistForm.genre.length > 0 ? artistForm.genre : [''];
                      setArtistForm({
                        ...artistForm,
                        genre: [...currentGenres, '']
                      });
                    }}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                  >
                    + Add Genre
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Add multiple genres that describe this artist's music style.
                </p>
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg disabled:bg-gray-500"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : editingArtist ? 'Update Artist' : 'Create Artist'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowArtistForm(false);
                    setEditingArtist(null);
                    setArtistForm({
                      name: '',
                      bio: '',
                      imageUrl: '',
                      genre: [''],
                    });
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Album Form Modal */}
      {showAlbumForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/90 backdrop-blur-md rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg sm:text-xl font-bold mb-4">
              {editingAlbum ? 'Edit Album' : 'Add New Album'}
            </h3>
            <form onSubmit={handleAlbumSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Album Title *"
                value={albumForm.title}
                onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                required
              />
              <select
                value={albumForm.artistId}
                onChange={(e) => setAlbumForm({ ...albumForm, artistId: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                required
                disabled={artistsLoading}
              >
                <option value="">
                  {artistsLoading ? 'Loading artists...' : 'Select Artist *'}
                </option>
                {artists.map((artist) => (
                  <option key={artist._id} value={artist._id}>
                    {artist.name}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Description"
                value={albumForm.description}
                onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg h-20"
              />
              <input
                type="url"
                placeholder="Cover Image URL"
                value={albumForm.coverUrl}
                onChange={(e) => setAlbumForm({ ...albumForm, coverUrl: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
              />
              <input
                type="date"
                placeholder="Release Date *"
                value={albumForm.releaseDate}
                onChange={(e) => setAlbumForm({ ...albumForm, releaseDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                required
              />
              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Genres *
                </label>
                <div className="space-y-2">
                  {(albumForm.genre.length > 0 ? albumForm.genre : ['']).map((genreName, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-600 rounded-lg p-2">
                      <select
                        value={genreName}
                        onChange={(e) => {
                          const newGenres = [...(albumForm.genre.length > 0 ? albumForm.genre : [''])];
                          newGenres[index] = e.target.value;
                          setAlbumForm({ ...albumForm, genre: newGenres });
                        }}
                        className="flex-1 bg-gray-700 rounded px-2 py-1 text-white"
                        required={index === 0}
                      >
                        <option value="">Select a genre</option>
                        {genres.map((genre) => (
                          <option key={genre._id} value={genre.name}>
                            {genre.name}
                          </option>
                        ))}
                      </select>
                      {albumForm.genre.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newGenres = albumForm.genre.filter((_, i) => i !== index);
                            setAlbumForm({ ...albumForm, genre: newGenres });
                          }}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const currentGenres = albumForm.genre.length > 0 ? albumForm.genre : [''];
                      setAlbumForm({
                        ...albumForm,
                        genre: [...currentGenres, '']
                      });
                    }}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                  >
                    + Add Genre
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Add multiple genres that describe this album's music style.
                </p>
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg disabled:bg-gray-500"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : editingAlbum ? 'Update Album' : 'Create Album'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAlbumForm(false);
                    setEditingAlbum(null);
                    setAlbumForm({
                      title: '',
                      artistId: '',
                      description: '',
                      coverUrl: '',
                      releaseDate: '',
                      genre: [''],
                    });
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Album Details Modal */}
      {selectedAlbum && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/95 backdrop-blur-md rounded-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <img
                  src={selectedAlbum.coverUrl || '/default-thumbnail.svg'}
                  alt={selectedAlbum.title}
                  className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                />
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedAlbum.title}</h3>
                  <p className="text-gray-300 text-lg">
                    by {artists.find(a => a._id === selectedAlbum.artistId)?.name || 'Unknown Artist'}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">{selectedAlbum.description}</p>
                  <div className="flex space-x-2 mt-2">
                    {selectedAlbum.genre.map((g, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-600 rounded-full text-xs">
                        {g}
                      </span>
                    ))}
                  </div>
                  <p className="text-gray-400 text-xs mt-2">
                    Released: {new Date(selectedAlbum.releaseDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseAlbum}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="border-t border-gray-600 pt-6">
              <h4 className="text-xl font-semibold mb-4">Songs in this Album</h4>
              
              <div className="text-center py-8 text-gray-400">
                <p>Song listing feature will be added in the next update.</p>
                <p className="text-sm mt-2">For now, you can manage songs through the Music Management tab.</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-600 flex justify-end">
              <button
                onClick={handleCloseAlbum}
                className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Genres Management Tab */}
        {activeTab === 'genres' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold">Genre Management</h2>
              <button
                onClick={() => {
                  setEditingGenre(null);
                  setGenreForm({
                    name: '',
                    description: '',
                    color: '#6366f1'
                  });
                  setShowGenreForm(true);
                }}
                className="bg-green-600 hover:bg-green-700 px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base"
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Add New Genre'}
              </button>
            </div>

            {/* Genre List */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 shadow-xl">
              {genresLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                  <span className="ml-2 text-gray-400">Loading genres...</span>
                </div>
              ) : (
                <div className="grid gap-4">
                  {genres.map((genre) => (
                    <div key={genre._id} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-6 h-6 rounded-full" 
                          style={{ backgroundColor: genre.color }}
                        ></div>
                        <div>
                          <h3 className="text-lg font-semibold">{genre.name}</h3>
                          {genre.description && (
                            <p className="text-gray-300 text-sm">{genre.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditGenre(genre)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteGenre(genre._id)}
                          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {genres.length === 0 && !genresLoading && (
                    <p className="text-gray-400 text-center py-8">No genres found</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Genre Form Modal */}
        {showGenreForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">
                {editingGenre ? 'Edit Genre' : 'Add New Genre'}
              </h3>
              <form onSubmit={handleGenreSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Genre Name *"
                  value={genreForm.name}
                  onChange={(e) => setGenreForm({ ...genreForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                  required
                />
                <textarea
                  placeholder="Description (optional)"
                  value={genreForm.description}
                  onChange={(e) => setGenreForm({ ...genreForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg h-20 resize-none"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={genreForm.color}
                    onChange={(e) => setGenreForm({ ...genreForm, color: e.target.value })}
                    className="w-full h-10 rounded-lg bg-gray-700"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg disabled:bg-gray-500"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : editingGenre ? 'Update Genre' : 'Create Genre'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGenreForm(false);
                      setEditingGenre(null);
                      setGenreForm({
                        name: '',
                        description: '',
                        color: '#6366f1'
                      });
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </GradientBackground>
  );
}
