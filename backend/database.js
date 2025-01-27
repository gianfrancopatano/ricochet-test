const sqlite3 = require("sqlite3").verbose();

// Connect to SQLite database (or create if it doesn't exist)
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

// Create Users Table and Reports Table
db.serialize(() => {
  // Create Users Table
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone_number TEXT UNIQUE NOT NULL,  -- Added phone_number column
      status TEXT DEFAULT 'offline',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`, 
    (err) => {
      if (err) console.error("Error creating users table:", err.message);
      else console.log("Users table is ready.");
    }
  );

  // Create Reports Table 
  db.run(
    `CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      call_sid TEXT NOT NULL,
      status TEXT NOT NULL,
      duration INTEGER DEFAULT 0,
      from_user TEXT NOT NULL,
      to_user TEXT NOT NULL
    );`,  
    (err) => {
      if (err) console.error("Error creating reports table:", err.message);
      else console.log("Reports table is ready.");
    }
  );
});

// Export the database connection
module.exports = db;
