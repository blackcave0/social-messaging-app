# Social Messaging App

A real-time social messaging application built with React Native Expo, Express, Socket.io, and MongoDB.

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