import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Joi from "joi";

// Validation Schemas using Joi
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// @desc    Register a new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    // 1. Validate incoming data
    const { error } = registerSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { name, email, password } = req.body;

    // 2. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists)
      return res
        .status(400)
        .json({ message: "User already registered with this email." });

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Save user to database
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      status: "success",
      message: "Registration successful! You can now log in.",
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error during registration.",
      error: err.message,
    });
  }
};

// @desc    Login user & set HttpOnly cookie token
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    // 1. Validate incoming data
    const { error } = loginSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { email, password } = req.body;

    // 2. Find user by email
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password." });

    // 3. Verify password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password." });

    // 4. Generate JWT Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d", // Token expires in 7 days
    });

    // 5. Send token and user info directly inside the JSON response body
    res.status(200).json({
      status: "success",
      message: "Logged in successfully.",
      token, // 🚀 The React app can now read this string directly from the response!
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Server error during login.", error: err.message });
  }
};

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
export const logoutUser = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res
    .status(200)
    .json({ status: "success", message: "Logged out successfully." });
};

// @desc    Check auth status (For React Frontend Dashboard guard)
// @route   GET /api/auth/status
export const checkAuthStatus = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token)
      return res
        .status(401)
        .json({ authenticated: false, message: "No token found." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password"); // exclude password

    if (!user)
      return res
        .status(401)
        .json({ authenticated: false, message: "User no longer exists." });

    res.status(200).json({ authenticated: true, user });
  } catch (err) {
    res.status(401).json({ authenticated: false, message: "Invalid token." });
  }
};

// Validation Schema for profile updates
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
});

// Validation Schema for password changes
const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

// @desc    Get current user profile details
// @route   GET /api/users/profile
export const getUserProfile = async (req, res) => {
  // req.user is already populated by our protect middleware
  res.status(200).json({
    status: "success",
    user: req.user,
  });
};

// @desc    Update user profile (Name/Email)
// @route   PUT /api/users/profile
export const updateUserProfile = async (req, res) => {
  try {
    const { error } = updateProfileSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details.message });

    const { name, email } = req.body;
    const user = await User.findById(req.user._id);

    // Check if email is being changed and if new email is already taken
    if (email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          message: "This email is already in use by another account.",
        });
      }
    }

    user.name = name;
    user.email = email;
    const updatedUser = await user.save();

    res.status(200).json({
      status: "success",
      message: "Profile details updated successfully.",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// @desc    Update user account password
// @route   PUT /api/users/password
export const updateUserPassword = async (req, res) => {
  try {
    const { error } = updatePasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details.message });

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Verify old password matches database record
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Incorrect current password field values." });
    }

    // Hash the fresh password configuration
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Password changed successfully!",
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
