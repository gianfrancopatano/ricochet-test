const express = require("express");
const router = express.Router();
const { getUsers, getUserByUsername, addUser } = require("../models/userModel");

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await getUsers(); // Use await to get the users
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a user by username
router.get("/:username", async (req, res) => {
  try {
    const user = await getUserByUsername(req.params.username); // Use await to get the user
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new user
router.post("/", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  try {
    const result = await addUser(username, password); // Use await to add the user
    res.status(201).json({ message: "User created", userId: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
