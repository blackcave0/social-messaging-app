# Social Messaging App with Image Upload

This project is a social messaging app with image upload capabilities.

## Features

- User authentication (register, login)
- Profile management (update profile, bio, profile picture)
- Friend requests
- Posts with images and descriptions
- Comments and likes
- Real-time chat
- Stories (images and videos that expire after 24 hours)
- Real-time notifications

## Tech Stack

### Frontend

- React Native / Expo
- Redux Toolkit for state management
- React Navigation
- Socket.io Client
- TypeScript

### Backend

- Node.js / Express
- MongoDB with Mongoose
- Socket.io
- TypeScript
- JWT Authentication
- Cloudinary (for image/video storage)

## Project Structure

```
social-messaging-app/
├── backend/         # Express server, API, and database code
├── frontend/        # React Native Expo client
└── README.md        # Project documentation
```

## Setup Instructions

### Prerequisites

- Node.js
- MongoDB
- Expo CLI

### Backend Setup

1. Navigate to the backend directory
   ```
   cd social-messaging-app/backend
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file with the following variables
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/social-messaging-app
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. Start the development server
   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory
   ```
   cd social-messaging-app/frontend
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the Expo development server
   ```
   npm start
   ```

4. Run on iOS/Android simulator or scan the QR code with the Expo Go app

## License

This project is licensed under the MIT License.

## Image Upload Implementation

### Backend

The backend uses:
- **Multer**: For handling multipart/form-data and file uploads
- **Cloudinary**: For storing images in the cloud
- **MongoDB**: For storing post data with image URLs

#### Key Files:
- `backend/src/config/cloudinary.ts`: Cloudinary configuration
- `backend/src/middleware/upload.ts`: Multer configuration for file uploads
- `backend/src/controllers/postController.ts`: Handles post creation with image upload
- `backend/src/routes/postRoutes.ts`: API routes for post operations

### Frontend

The frontend uses:
- **Expo Image Picker**: For selecting images from the device
- **Axios**: For making API requests with multipart/form-data
- **FormData API**: For creating multipart requests

#### Key Files:
- `frontend/src/api/posts.ts`: API service for post operations
- `frontend/src/screens/CreatePostScreen.tsx`: UI for creating posts with images

## How to Use

1. Create a post with text
2. Add an image using the photo button
3. Select a mood (optional)
4. Click Share to upload the post with images

## Environment Setup

Make sure to set up your `.env` file with Cloudinary credentials:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Running the App

### Backend
```
cd backend
npm install
npm run dev
```

### Frontend
```
cd frontend
npm install
npm start
```

Then run on Android with `a` or iOS with `i`. 