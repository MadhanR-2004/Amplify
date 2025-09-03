import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/middleware';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const db = await getDatabase();
    const genresCollection = db.collection('genres');

    const genres = await genresCollection
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      genres
    });

  } catch (error) {
    console.error('Admin genres fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const body = await request.json();
    const { name, description, color } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Genre name is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const genresCollection = db.collection('genres');

    // Check if genre already exists
    const existingGenre = await genresCollection.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingGenre) {
      return NextResponse.json(
        { success: false, message: 'A genre with this name already exists' },
        { status: 409 }
      );
    }

    const newGenre = {
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#6366f1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await genresCollection.insertOne(newGenre);

    return NextResponse.json({
      success: true,
      message: 'Genre created successfully',
      genre: { _id: result.insertedId, ...newGenre }
    }, { status: 201 });

  } catch (error) {
    console.error('Genre creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
