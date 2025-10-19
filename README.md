# 🔥 Firebase Backend with File Upload

A complete Node.js backend system with Firebase integration featuring user authentication, file uploads to Firebase Cloud Storage, and Firestore database management.

![Node.js](https://img.shields.io/badge/Node.js-v14+-green)
![Firebase](https://img.shields.io/badge/Firebase-Admin%20SDK-orange)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- ✅ **User Authentication** - Signup and Login with Firebase Auth
- ✅ **File Upload** - Upload files to Firebase Cloud Storage
- ✅ **File Management** - List, view, and delete uploaded files
- ✅ **Secure API** - JWT token-based authentication
- ✅ **Database** - Firestore for storing user and file metadata
- ✅ **RESTful API** - Clean and documented API endpoints
- ✅ **Test Client** - HTML test interface included

## 🚀 Quick Start

### Prerequisites

- Node.js v14 or higher
- npm or yarn
- Firebase account (free tier works fine)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/firebase-backend.git
cd firebase-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Firebase**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Email/Password)
   - Create Firestore Database (Test mode)
   - Enable Cloud Storage
   - Generate service account key (Project Settings → Service Accounts)
   - Save the JSON file as `serviceAccountKey.json` in the project root

4. **Configure environment**

Create `.env` file:
```env
PORT=3000
FIREBASE_STORAGE_BUCKET=your-project-id.firebsaestorage.app
```

5. **Run the server**
```bash
npm run dev
```

Server will start at `http://localhost:3000`

## 📁 Project Structure

```
firebase-backend/
├── server.js                  # Main server file
├── serviceAccountKey.json     # Firebase credentials (DO NOT COMMIT!)
├── test.html                  # Test client interface
├── .env                       # Environment variables
├── .gitignore                 # Git ignore file
├── package.json               # Project dependencies
└── README.md                  # This file
```

## 🔌 API Endpoints

### Authentication

#### Signup
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### File Operations (Requires Authentication)

#### Upload File
```http
POST /api/upload
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

file: [binary file data]
```

#### Get User Files
```http
GET /api/files
Authorization: Bearer YOUR_TOKEN
```

#### Delete File
```http
DELETE /api/files/:fileId
Authorization: Bearer YOUR_TOKEN
```

#### Health Check
```http
GET /api/health
```

## 🧪 Testing

### Using the Test Client

1. Open `test.html` in your browser
2. Make sure the server is running
3. Test the signup/login functionality
4. Upload files and view the results

### Using cURL

**Signup:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","displayName":"Test User"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**Upload File:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@path/to/your/file.jpg"
```

### Using Postman

1. Import the included Postman collection (if provided)
2. Set the `baseUrl` variable to `http://localhost:3000`
3. Run the requests in order: Signup → Login → Upload

## 📊 Database Schema

### Firestore Collections

**users/**
```javascript
{
  email: string,
  displayName: string,
  createdAt: timestamp,
  uploads: number
}
```

**files/**
```javascript
{
  userId: string,
  fileName: string,
  storagePath: string,
  fileSize: number,
  mimeType: string,
  publicUrl: string,
  uploadedAt: timestamp
}
```

## 🔐 Security

### Production Security Rules

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /files/{fileId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

**Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

## 🛠️ Built With

- [Node.js](https://nodejs.org/) - Runtime environment
- [Express.js](https://expressjs.com/) - Web framework
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) - Backend services
- [Multer](https://github.com/expressjs/multer) - File upload handling
- [Firestore](https://firebase.google.com/docs/firestore) - NoSQL database
- [Cloud Storage](https://firebase.google.com/docs/storage) - File storage

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "firebase-admin": "^12.0.0",
  "multer": "^1.4.5-lts.1",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1"
}
```

## 🚀 Deployment

### Deploy to Heroku

```bash
heroku create your-app-name
heroku config:set FIREBASE_STORAGE_BUCKET=your-bucket-name
git push heroku main
```

### Deploy to Railway

1. Connect your GitHub repository
2. Add environment variables in Railway dashboard
3. Deploy automatically on push

### Deploy to Render

1. Create new Web Service
2. Connect GitHub repo
3. Add environment variables
4. Deploy

## 🐛 Troubleshooting

### Common Issues

**"ECONNREFUSED" Error**
- Ensure server is running on the correct port
- Check firewall settings

**"Permission Denied" from Firebase**
- Verify Firestore and Storage security rules
- Check service account key is valid

**"Invalid Token" Error**
- Token may be expired, login again
- Verify Authorization header format: `Bearer TOKEN`

**File Upload Fails**
- Check file size (max 5MB by default)
- Verify storage bucket name in .env
- Ensure storage is enabled in Firebase

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `myapp.appspot.com` |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Your Name**
- GitHub: [@Reaper095](https://github.com/Reaper095)
- Email: anunayminj2@gmail.com

## 🙏 Acknowledgments

- Firebase team for excellent documentation
- Express.js community

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## ⭐ Show your support

Give a ⭐️ if this project helped you!

---

**Note:** Remember to never commit your `serviceAccountKey.json` or `.env` files to version control!

Made with ❤️ and Firebase