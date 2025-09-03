const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'music-streaming-app';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // Check if admin user already exists
    const existingAdmin = await usersCollection.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }
    
    // Create admin user
    const adminEmail = 'admin@musicapp.com';
    const adminPassword = 'admin123456'; // Change this!
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const adminUser = {
      username: 'admin',
      email: adminEmail,
      passwordHash: hashedPassword,
      role: 'admin',
      isVerified: true,
      createdAt: new Date(),
    };
    
    const result = await usersCollection.insertOne(adminUser);
    
    console.log('Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('User ID:', result.insertedId);
    console.log('\nIMPORTANT: Please change the admin password after first login!');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await client.close();
  }
}

// Run the script
if (require.main === module) {
  createAdminUser().catch(console.error);
}

module.exports = { createAdminUser };
