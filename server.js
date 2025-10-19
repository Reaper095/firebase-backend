// server.js - Firebase Backend with Authentication & File Upload
const express = require('express');
const multer = require('multer');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
// Place your serviceAccountKey.json in the root directory
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET // e.g., 'your-project.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Configure Multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

// 1. SIGNUP API
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
    });

    // Store additional user data in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      displayName: displayName || email.split('@')[0],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      uploads: 0
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ 
      error: error.message 
    });
  }
});

// 2. LOGIN API (Generate custom token for client to exchange)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Note: Backend cannot verify password directly
    // In production, use Firebase Client SDK on frontend for actual login
    // For this demo, we'll create a custom token
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();

    res.status(200).json({
      message: 'Login successful',
      customToken: customToken,
      uid: userRecord.uid,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userData?.displayName || userRecord.email,
        uploads: userData?.uploads || 0
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ 
      error: 'Invalid credentials' 
    });
  }
});

// ============================================
// MIDDLEWARE: Verify User (Simplified for Testing)
// ============================================
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // For testing: Accept UID directly
    // In production, you would verify ID tokens from Firebase Client SDK
    try {
      // Check if the token is a valid UID by fetching the user
      const userRecord = await admin.auth().getUser(token);
      req.user = { 
        uid: userRecord.uid,
        email: userRecord.email 
      };
      console.log('✓ User authenticated:', userRecord.email);
      next();
    } catch (error) {
      console.error('Authentication failed:', error.message);
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        details: 'Please login again'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// ============================================
// FILE UPLOAD ENDPOINTS
// ============================================

// 3. FILE UPLOAD API
app.post('/api/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Upload request from user:', req.user.uid);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    console.log('📄 File received:', file.originalname, `(${(file.size / 1024).toFixed(2)} KB)`);
    
    const fileName = `${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(`uploads/${req.user.uid}/${fileName}`);

    // Create a stream and upload the file
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          uploadedBy: req.user.uid,
          originalName: file.originalname,
        },
      },
    });

    stream.on('error', (error) => {
      console.error('❌ Upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    });

    stream.on('finish', async () => {
      console.log('✓ File uploaded to storage');
      
      // Make the file publicly accessible (optional)
      await fileUpload.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;

      // Store file metadata in Firestore
      const fileDoc = await db.collection('files').add({
        userId: req.user.uid,
        fileName: file.originalname,
        storagePath: fileUpload.name,
        fileSize: file.size,
        mimeType: file.mimetype,
        publicUrl,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✓ Metadata saved to Firestore');

      // Update user's upload count
      await db.collection('users').doc(req.user.uid).update({
        uploads: admin.firestore.FieldValue.increment(1)
      });

      console.log('✓ Upload complete!');

      res.status(200).json({
        message: 'File uploaded successfully',
        file: {
          id: fileDoc.id,
          name: file.originalname,
          size: file.size,
          url: publicUrl,
          type: file.mimetype
        },
      });
    });

    stream.end(file.buffer);
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// 4. GET USER'S UPLOADED FILES
app.get('/api/files', verifyToken, async (req, res) => {
  try {
    const filesSnapshot = await db
      .collection('files')
      .where('userId', '==', req.user.uid)
      .orderBy('uploadedAt', 'desc')
      .get();

    const files = [];
    filesSnapshot.forEach((doc) => {
      files.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      count: files.length,
      files,
    });
  } catch (error) {
    console.error('Fetch files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// 5. DELETE FILE
app.delete('/api/files/:fileId', verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    // Get file metadata
    const fileDoc = await db.collection('files').doc(fileId).get();

    if (!fileDoc.exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileData = fileDoc.data();

    // Check if user owns the file
    if (fileData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete from Storage
    await bucket.file(fileData.storagePath).delete();

    // Delete from Firestore
    await db.collection('files').doc(fileId).delete();

    // Update user's upload count
    await db.collection('users').doc(req.user.uid).update({
      uploads: admin.firestore.FieldValue.increment(-1)
    });

    res.status(200).json({
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Firebase Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API Endpoints:`);
  console.log(`   - POST /api/auth/signup`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - POST /api/upload (protected)`);
  console.log(`   - GET  /api/files (protected)`);
  console.log(`   - DELETE /api/files/:fileId (protected)`);
});