import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/middleware';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const id = params.id;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid genre ID' },
        { status: 400 }
      );
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

    // Check if another genre with the same name exists
    const existingGenre = await genresCollection.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      _id: { $ne: new ObjectId(id) }
    });

    if (existingGenre) {
      return NextResponse.json(
        { success: false, message: 'A genre with this name already exists' },
        { status: 409 }
      );
    }

    const updateData = {
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#6366f1',
      updatedAt: new Date(),
    };

    const result = await genresCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Genre not found' },
        { status: 404 }
      );
    }

    // Get the updated genre to return it
    const updatedGenre = await genresCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Genre updated successfully',
      genre: updatedGenre
    });

  } catch (error) {
    console.error('Genre update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const id = params.id;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid genre ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const genresCollection = db.collection('genres');

    const result = await genresCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Genre not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Genre deleted successfully'
    });

  } catch (error) {
    console.error('Genre deletion error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
