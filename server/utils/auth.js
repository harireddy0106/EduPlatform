// utils/auth.js

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User, Admin } from '../models/index.js'; // Import Mongoose User Model
import dotenv from 'dotenv';
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;


const security = (req, res, next) => {
  // Simple check for Authorization header
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    return res.status(401).json({ detail: "Not authenticated: Missing token" });
  }
  next();
};

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

export const verifyPassword = (plainPassword, hashedPassword) => {
  return bcrypt.compareSync(plainPassword, hashedPassword);
};

export const createToken = (userId, role) => {
  const payload = {
    user_id: userId,
    role: role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days expiration
  };
  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256" });
};

export const getAuthUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });

    // Mongoose finds user by id (which maps to _id by default, but we used 'id' field)
    let user = await User.findOne({ id: payload.user_id }).lean();

    if (!user) {
      // Try finding in Admin table
      user = await Admin.findOne({ id: payload.user_id }).lean();
    }

    if (!user) {
      return res.status(401).json({ detail: "User not found" });
    }

    // Attach user data to the request object
    delete user.password_hash;
    req.currentUser = user;
    // Set req.user for compatibility with security middleware
    req.user = req.currentUser;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: "Token expired" });
    }
    return res.status(401).json({ detail: "Invalid token" });
  }
};