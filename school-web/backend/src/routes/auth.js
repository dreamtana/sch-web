const express = require("express");
const router = express.Router();
const AuthService = require("../services/AuthService");
const authService = new AuthService();
const authMiddleware = require('../middleware/auth');

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const userData = await authService.register(email, password, name);

    if (!userData) {
      throw new Error("Failed to create user");
    }

    res.status(201).json({
      success: true,
      data: userData,
      message: "Registration successful",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const token = await authService.login(email, password);
    res.json({
      success: true,
      token,
      message: "Login successful",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, name } = req.body;

    if (!email && !password && !name) {
      return res.status(400).json({ 
        success: false,
        error: 'No data to update' 
      });
    }

    const updateData = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (name) updateData.name = name;

    const updatedUser = await authService.updateUser(id, updateData);

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await authService.deleteUser(id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await authService.getUserById(id);

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await authService.getAllUsers();

    res.json({
      success: true,
      data: users,
      total: users.length
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await authService.getUserById(userId);
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'ไม่สามารถดึงข้อมูลผู้ใช้ได้'
    });
  }
});

module.exports = router;
