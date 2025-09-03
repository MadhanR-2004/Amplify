'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DatabaseStats {
  collections: string[];
  totalDocuments: number;
  databaseSize: string;
}

export default function MongoDBAdminPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  const fetchDatabaseStats = async () => {
    try {
      const response = await fetch('/api/admin/mongodb/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.message || 'Failed to fetch database stats');
      }
    } catch (err) {
      setError('Failed to connect to database');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading database information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">MongoDB Administration</h1>
          <button
            onClick={() => router.push('/admin')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Admin
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Collections</h3>
              <p className="text-3xl font-bold text-blue-400">{stats.collections.length}</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Total Documents</h3>
              <p className="text-3xl font-bold text-green-400">{stats.totalDocuments}</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Database Size</h3>
              <p className="text-3xl font-bold text-purple-400">{stats.databaseSize}</p>
            </div>
          </div>
        )}

        {stats && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Collections</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {stats.collections.map((collection) => (
                <div
                  key={collection}
                  className="bg-gray-700 rounded-lg p-4 text-center"
                >
                  <span className="text-white font-medium">{collection}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
