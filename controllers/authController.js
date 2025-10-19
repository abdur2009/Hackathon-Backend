import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

const register = async (req, res) => {
  try {
    const { email, password, fullName, dateOfBirth, bloodGroup, allergies, chronicConditions, emergencyContact } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      fullName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      bloodGroup,
      allergies: allergies || [],
      chronicConditions: chronicConditions || [],
      emergencyContact
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        dateOfBirth: user.dateOfBirth,
        bloodGroup: user.bloodGroup,
        allergies: user.allergies,
        chronicConditions: user.chronicConditions,
        emergencyContact: user.emergencyContact
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        dateOfBirth: user.dateOfBirth,
        bloodGroup: user.bloodGroup,
        allergies: user.allergies,
        chronicConditions: user.chronicConditions,
        emergencyContact: user.emergencyContact,
        geminiApiKey: user.geminiApiKey
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        dateOfBirth: user.dateOfBirth,
        bloodGroup: user.bloodGroup,
        allergies: user.allergies,
        chronicConditions: user.chronicConditions,
        emergencyContact: user.emergencyContact,
        geminiApiKey: user.geminiApiKey
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, dateOfBirth, bloodGroup, allergies, chronicConditions, emergencyContact, geminiApiKey } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (bloodGroup) updateData.bloodGroup = bloodGroup;
    if (allergies) updateData.allergies = allergies;
    if (chronicConditions) updateData.chronicConditions = chronicConditions;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
    if (geminiApiKey !== undefined) updateData.geminiApiKey = geminiApiKey;

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        dateOfBirth: user.dateOfBirth,
        bloodGroup: user.bloodGroup,
        allergies: user.allergies,
        chronicConditions: user.chronicConditions,
        emergencyContact: user.emergencyContact,
        geminiApiKey: user.geminiApiKey
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export {
  register,
  login,
  getProfile,
  updateProfile
};
