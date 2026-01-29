# 🎓 EduPlatform - Modern Learning Management System

![React](https://img.shields.io/badge/React-18-blue)
![Node](https://img.shields.io/badge/Node.js-Express-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)

A full-featured, robust Learning Management System (LMS) built with the MERN stack (MongoDB, Express, React, Node.js). EduPlatform connects students, instructors, and administrators in a seamless, interactive learning environment.

## 🌐 Live Demo

*   **Client**: [https://eduplatform-client.vercel.app](https://eduplatform-client.vercel.app)
*   **Admin**: [https://eduplatform-admin.vercel.app](https://eduplatform-admin.vercel.app)

**Demo Credentials:**
*   **Student**: `student@test.com` / `123456`
*   **Instructor**: `instructor@test.com` / `123456`
*   **Admin**: `admin@test.com` / `123456`

## ✨ Features

## 🏗️ System Architecture
*   **Client (React)** → API Gateway (Express) → MongoDB
*   **Admin (React)** → API Gateway (Express) → MongoDB
*   **Cloudinary** → Media Storage
*   **JWT** → Auth Layer


### 🔐 Role-Based Access Control
*   **Student** → Learning & Certification
*   **Instructor** → Course Studio & Analytics
*   **Admin** → Platform Management

### 👨‍🎓 Student Portal
*   **Course Discovery**: Browse and search a wide range of courses.
*   **Interactive Learning**: Video lectures, assignments, quizzes, and progress tracking.
*   **Dashboard**: Personalized view of enrolled courses, upcoming deadlines, and achievements.
*   **Certification**: Auto-generated PDF certificates upon course completion.
*   **Profile Management**: Update personal info, secure password management, and resume uploads.

### 👨‍🏫 Instructor Studio
*   **Course Creation**: Comprehensive tools to build courses with modules and lessons.
*   **Content Management**: Upload video lectures, create assignments, and manage resources.
*   **Student Analytics**: Track student enrollment and progress.
*   **Profile**: Manage instructor credentials and public profile.

### 🛡️ Admin Dashboard (Dedicated App)
*   **Analytics Hub**: Real-time stats on users, revenue, and platform health.
*   **User Management**: Oversee students and instructors (approve/ban).
*   **Content Oversight**: Review and approve published courses.
*   **Reports**: Generate CSV/PDF reports on system usage.
*   **Settings**: Configure platform-wide settings and notifications.

## 🔒 Security Features
*   **JWT Authentication**: Secure stateless authentication with refresh tokens to keep sessions alive securely.
*   **Password Hashing**: Industry-standard Bcrypt hashing for credential storage.
*   **Rate Limiting**: Protects APIs from brute-force and DDoS attacks.
*   **Input Sanitization**: MongoDB Injection and XSS protection.
*   **HTTP Parameter Pollution Protection**: Prevents parameter pollution attacks.
*   **Secure Headers**: Implemented via Helmet and CORS policies.

## 📸 Screenshots

*(Add screenshots of Student Dashboard, Instructor Studio, Admin Analytics, and Course Player here)*

## 🛠️ Tech Stack

### Frontend (Client & Admin)
*   **Framework**: [React 18](https://reactjs.org/) with [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) with `tailwindcss-animate`
*   **State Management**: React Context API
*   **Routing**: React Router DOM v6
*   **UI Components**: Radix UI primitives, Lucide React icons
*   **Utilities**: Axios (API), Sonner (Toasts), React Player, jsPDF, Recharts

### Backend (Server)
*   **Runtime**: [Node.js](https://nodejs.org/)
*   **Framework**: [Express.js](https://expressjs.com/)
*   **Database**: [MongoDB](https://www.mongodb.com/) with Mongoose ODM
*   **Authentication**: JWT (JSON Web Tokens) & Bcrypt
*   **File Storage**: Cloudinary (Media), Local (temporary uploads)
*   **Email**: Nodemailer

## 🚀 Getting Started

### Prerequisites
*   **Node.js** (v18+ recommended)
*   **MongoDB** (Local instance or Atlas URI)
*   **Cloudinary Account** (For image/video storage)

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/harireddy0106/EduPlatform
    cd EduPlatform
    ```

2.  **Install Dependencies**
    ```bash
    # Install Server Dependencies
    cd server
    npm install

    # Install Client Dependencies
    cd ../client
    npm install

    # Install Admin Dependencies
    cd ../admin
    npm install
    ```

### Configuration

Create a `.env` file in the **server** directory:

```env
# Server Configuration
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5175

# Database
MONGO_URI=mongodb://127.0.0.1:27017/lms-studio

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@eduplatform.com
```

Create `.env` files in **client** and **admin** directories:

```env
VITE_BACKEND_URL=http://localhost:5001
```

## 📜 Scripts

### Server
*   `npm run dev`: Start server in development mode
*   `npm start`: Start server in production mode

### Client / Admin
*   `npm run dev`: Start frontend in development mode
*   `npm run build`: Build for production
*   `npm run preview`: Preview production build

## 🏃‍♂️ Running the Application

Open 3 separate terminals:

**1. Server**
```bash
cd server
npm run dev
```

**2. Client**
```bash
cd client
npm run dev
```

**3. Admin**
```bash
cd admin
npm run dev
```

## 🛣️ Roadmap
- [ ] Live classes (WebRTC)
- [ ] Mobile app (React Native)
- [ ] AI course recommendations
- [ ] Payment integration (Razorpay/Stripe)
- [ ] Multi-language support

## 📂 Project Structure

```
EduPlatform/
├── client/                 # Student & Instructor Portal (React)
├── admin/                  # Admin Dashboard (React)
├── server/                 # Express Backend API
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API endpoints
│   ├── utils/              # Helper functions
│   └── server.js           # Entry point
└── README.md               # Documentation
```

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## 📄 License

This project is licensed under the MIT License.
