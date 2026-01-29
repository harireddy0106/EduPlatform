# 🎓 EduPlatform - Modern Learning Management System

A full-featured, robust Learning Management System (LMS) built with the MERN stack (MongoDB, Express, React, Node.js). EduPlatform connects students, instructors, and administrators in a seamless, interactive learning environment.

## ✨ Features

### 👨‍🎓 Student Portal
*   **Course Discovery**: Browse and search a wide range of courses.
*   **Interactive Learning**: Video lectures, assignments, and progress tracking.
*   **Dashboard**: Personalized view of enrolled courses, upcoming deadlines, and achievements.
*   **Certification**: Auto-generated PDF certificates upon course completion.
*   **Profile Management**: Update personal info, secure password management, and resume uploads.

### 👨‍🏫 Instructor Studio
*   **Course Creation**: Comprehensive tools to build courses with modules and lessons.
*   **Content Management**: Upload video lectures, create assignments, and manage resources.
*   **Student Analytics**: Track student enrollment and progress.
*   **Profile**: Manage instructor credentials and public profile.

### 🛡️ Admin Dashboard
*   **User Management**: Oversee students and instructors.
*   **Course Oversight**: Approve or reject published courses.
*   **Platform Analytics**: High-level view of platform activity and health.

## 🛠️ Tech Stack

### Frontend (Client)
*   **Framework**: [React 18](https://reactjs.org/) with [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) with `tailwindcss-animate`
*   **State Management**: React Context API
*   **Routing**: React Router DOM v6
*   **UI Components**: Radix UI primitives, Lucide React icons
*   **Utilities**: Axios (API), Sonner (Toasts), React Player, jsPDF

### Backend (Server)
*   **Runtime**: [Node.js](https://nodejs.org/)
*   **Framework**: [Express.js](https://expressjs.com/)
*   **Database**: [MongoDB](https://www.mongodb.com/) with Mongoose ODM
*   **Authentication**: JWT (JSON Web Tokens) & Bcrypt
*   **Security**: Helmet, Rate Limiting, Mongo Sanitize, HPP, CORS
*   **File Storage**: Cloudinary (Media), Local (temporary uploads)
*   **Email**: Nodemailer

## 🚀 Getting Started

### Prerequisites
*   **Node.js** (v18+ recommended)
*   **MongoDB** (Local instance or Atlas URI)
*   **Cloudinary Account** (For image/video storage)
*   **SMTP Service** (Optional, for email notifications)

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/eduplatform.git
    cd eduplatform
    ```

2.  **Install Backend Dependencies**
    ```bash
    cd server
    npm install
    ```

3.  **Install Frontend Dependencies**
    ```bash
    cd ../client
    npm install
    ```

### Configuration

Create a `.env` file in the **server** directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
MONGO_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=30d

# Cloudinary (File Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Optional)
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@eduplatform.com
```

Create a `.env` file in the **client** directory (optional, Vite uses defaults):

```env
VITE_API_URL=http://localhost:5000/api
```

## 🏃‍♂️ Running the Application

You need to run both the client and server concurrently.

**1. Start the Server**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

**2. Start the Client**
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

## 📂 Project Structure

```
EdPlotform/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Global state (Auth, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Application views/routes
│   │   └── lib/            # Utilities
│   └── public/             # Static assets
├── server/                 # Express Backend
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route definitions
│   ├── controllers/        # Request logic (in routes or separate)
│   ├── middleware/         # Auth, Upload, Error handling
│   └── utils/              # Helper functions
└── README.md               # Project Documentation
```

## 📚 API Documentation

Once the server is running, you can access the basic API documentation endpoint:
*   `GET http://localhost:5000/api/docs`

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📄 License

This project is licensed under the MIT License.
