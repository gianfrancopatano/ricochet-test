const db = require("../database");

// Get all users
const getUsers = () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT id, username, status FROM users", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Get a single user by username
const getUserByUsername = (username) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Add a new user
const addUser = (username, password) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, password],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
};

module.exports = { getUsers, getUserByUsername, addUser };
