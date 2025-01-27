const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
//const twilio = require("twilio");
const VoiceResponse = require("twilio").twiml.VoiceResponse;
const AccessToken = require("twilio").jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const config = require("./config");
require("dotenv").config();

//const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:3000", "https://ef13-47-199-12-99.ngrok-free.app"], // Frontend URL (React app)
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true, // Allow cookies if needed
    }
});

// Middleware for parsing JSON
app.use(express.json());

// CORS middleware
app.use(cors({
    origin: ["http://localhost:3000", "https://ef13-47-199-12-99.ngrok-free.app"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));

// SQLite database
const db = new sqlite3.Database("./database.db"); // SQLite database

// User login route
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    console.log("Login attempt for:", username);  

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!user) return res.status(401).json({ error: "User not found" });

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).json({ error: "Error comparing passwords" });
            if (!isMatch) return res.status(401).json({ error: "Invalid password" });

            // Generate JWT token
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });

            console.log("Generated token:", token);
            console.log("Returning user object:", { id: user.id, username: user.username });  

            // Respond with token and full user object
            return res.json({ 
                token, 
                user: { id: user.id, username: user.username }  
            });
        });
    });
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
      return res.status(400).json({ error: "All fields are required" });
  }

  // Check if username already exists
  const checkUsernameQuery = "SELECT COUNT(*) AS count FROM users WHERE username = ?";
  db.get(checkUsernameQuery, [username], (err, row) => {
      if (err) {
          console.error("Error checking username:", err);
          return res.status(500).json({ error: "Database error" });
      }

      if (row.count > 0) {
          return res.status(400).json({ error: "Username already taken" });
      }

      // Hash the password and insert the new user if username is available
      bcrypt.hash(password, 10, (err, hashedPassword) => {
          if (err) {
              console.error("Error hashing password:", err);
              return res.status(500).json({ error: "Error hashing password" });
          }

          const query = "INSERT INTO users (username, password) VALUES (?, ?)";
          db.run(query, [username, hashedPassword], function (err) {
              if (err) {
                  console.error("Error inserting user:", err);
                  return res.status(500).json({ error: "Database error" });
              }
              return res.status(201).json({ message: "User created successfully" });
          });
      });
  });
});


app.post("/token", (req, res) => {
    const { username } = req.body;
  
    if (!username) {
      return res.status(400).json({ error: "Missing username" });
    }
  
    const accessToken = new AccessToken(
      config.accountSid,
      config.apiKey,
      config.apiSecret,
      { identity: username }
    );
  
    const grant = new VoiceGrant({
      outgoingApplicationSid: config.twimlAppSid,
      incomingAllow: true, 
    });
  
    accessToken.addGrant(grant);
  
    res.json({
      identity: username,
      token: accessToken.toJwt(),
    });
});


// app.post("/voice", async (req, res) => {
//   console.log("Received /voice request:");
//   console.log("Request body:", req.body); // Log the entire request body for debugging

//   const toNumberOrClientName = req.body.To;
//   const fromUser = req.body.From;
  
//   const callerId = config.callerId;
//   let twiml = new VoiceResponse();

//   // Log the values being used for decision making
//   console.log("toNumberOrClientName:", toNumberOrClientName);
//   console.log("fromUser:", fromUser);
//   console.log("callerId:", callerId);

//   // Make sure we handle calls properly
//   let dial;
//   if (toNumberOrClientName === callerId) {
//       console.log("Dialing client:", fromUser);
//       dial = twiml.dial();
//       dial.client(fromUser);
//   } else if (toNumberOrClientName) {
//       console.log("Dialing number or client:", toNumberOrClientName);
//       dial = twiml.dial({ callerId });

//       const attr = isAValidPhoneNumber(toNumberOrClientName)
//           ? "number"
//           : "client";
//       console.log(`Using attribute ${attr} to dial ${toNumberOrClientName}`);
//       dial[attr]({}, toNumberOrClientName);
//   } else {
//       console.log("No valid 'To' field found. Saying 'Thanks for calling!'");
//       twiml.say("Thanks for calling!");
//   }

//   // Log TwiML response
//   console.log("Generated TwiML response:", twiml.toString());

//   // Insert call data into the database
//   try {
//       const timestamp = new Date().toISOString();
//       const callSid = req.body.CallSid || "unknown";
//       const status = req.body.CallStatus || "initiated"; 
//       const duration = 0; 
//       const from = fromUser;
//       const to = toNumberOrClientName;

      
//       db.run(
//           "INSERT INTO reports (timestamp, call_sid, status, duration, from_user, to_user) VALUES (?, ?, ?, ?, ?, ?)",
//           [timestamp, callSid, status, duration, from, to],
//           function (err) {
//               if (err) {
//                   console.error("Error saving call:", err);
//                   return res.status(500).json({ error: "Error saving call" });
//               }
//               console.log("Call data inserted successfully.");
//           }
//       );
//   } catch (error) {
//       console.error("Error inserting call data into database:", error);
//   }

//   // Send TwiML response
//   res.type("text/xml");
//   res.send(twiml.toString());
// });

app.post("/voice", (req, res) => {
  console.log("Received /voice request:");
  console.log("Request body:", req.body); // Log the entire request body for debugging

  const toNumberOrClientName = req.body.To;
  
  const callerId = config.callerId;
  let twiml = new VoiceResponse();

  // Log the values being used for decision making
  console.log("toNumberOrClientName:", toNumberOrClientName);
  console.log("callerId:", callerId);

  if (toNumberOrClientName === callerId) {
      console.log("Dialing client:", req.body.From);
      let dial = twiml.dial();
      dial.client(req.body.From); 
  } else if (req.body.To) {
      console.log("Dialing number or client:", toNumberOrClientName);
      let dial = twiml.dial({ callerId });

      const attr = isAValidPhoneNumber(toNumberOrClientName)
          ? "number"
          : "client";
      console.log(`Using attribute ${attr} to dial ${toNumberOrClientName}`);
      dial[attr]({}, toNumberOrClientName);
  } else {
      console.log("No valid 'To' field found. Saying 'Thanks for calling!'");
      twiml.say("Thanks for calling!");
  }

  console.log("Generated TwiML response:", twiml.toString());

  res.type("text/xml");
  res.send(twiml.toString());
});

// Helper function
function isAValidPhoneNumber(number) {
  return /^[\d+\-() ]+$/.test(number);
}
  
// app.post("/call", async (req, res) => {
//     const { to, from } = req.body;

//     if (!to || !from) {
//       return res.status(400).json({ error: "Missing 'to' or 'from' phone number" });
//     }

//     // Make the call using Twilio
//     try {
//       const call = await twilioClient.calls.create({
//         to: to,
//         from: from,
//         url: `${process.env.BASE_URL}/voice`,
//         statusCallback: `${process.env.BASE_URL}/call-status`,
//         statusCallbackMethod: "POST",
//         statusCallbackEvent: ["initiated", "ringing", "answered", "completed"]
//       });

//       const timestamp = call.dateCreated || new Date().toISOString();
//       const duration = call.duration ? parseInt(call.duration, 10) : 0;

//       db.run(
//         "INSERT INTO calls (timestamp, call_sid, status, duration, from_user, to_user) VALUES (?, ?, ?, ?, ?, ?)",
//         [timestamp, call.sid, call.status, duration, from, to],
//         function (err) {
//           if (err) {
//             console.error("Error saving call:", err);
//             return res.status(500).json({ error: "Error saving call" });
//           }
//           res.status(200).json({ message: "Call started", callSid: call.sid });
//         }
//       );
//     } catch (error) {
//       console.error("Twilio Error:", error);
//       res.status(500).json({ error: error.message });
//     }
// });


// app.post("/call-status", (req, res) => {
//   const { CallSid, CallStatus, Duration, To } = req.body;
  
//   if (!CallSid) {
//     return res.status(400).json({ error: "Missing CallSid" });
//   }
  
//   if (CallStatus === 'completed') {
//     // When the call ends, set both users to 'Online' again
//     db.get("SELECT from_user, to_user FROM calls WHERE call_sid = ?", [CallSid], (err, row) => {
//     if (err) return res.status(500).json({ error: err.message });
  
//     const { from_user, to_user } = row;
  
//     db.run("UPDATE users SET status = 'Online' WHERE email IN (?, ?)", [from_user, to_user], function(err) {
//       if (err) return res.status(500).json({ error: err.message });
//     });
//     });
//   }
  
//   db.run(
//     "UPDATE calls SET status = ?, duration = ? WHERE call_sid = ?",
//     [CallStatus, Duration || 0, CallSid],
//     function (err) {
//     if (err) {
//       console.error("Error updating call:", err);
//       return res.status(500).json({ error: "Error updating call" });
//     }
//     res.status(200).json({ message: "Call status updated" });
//     }
//   );
// });



// app.post("/voice", (req, res) => {
//   const { From, To } = req.body;

//   if (!To) {
//       return res.status(400).send("Missing 'To' user.");
//   }

//   // Create TwiML response to dial the recipient
//   const twiml = new twilio.twiml.VoiceResponse();
//   const dial = twiml.dial();
//   dial.client(To);  // Connects User A to User B inside the app

//   res.type("text/xml");
//   res.send(twiml.toString());
// });


app.get("/reports", (req, res) => {
    const { page = 1, limit = 10, sortBy = "timestamp", order = "DESC" } = req.query;
    const offset = (page - 1) * limit;
  
    const query = `SELECT * FROM reports ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`;
  
    db.all(query, [limit, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      console.log("Fetched reports:", rows);
      res.status(200).json(rows);
    });
});

// In-memory storage for online users
let onlineUsers = {};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // When a user joins, store their online status
    socket.on("join", (userId, username) => {
        if (!userId || !username) {
            console.error(`Missing userId or username in join event. Received: userId=${userId}, username=${username}`);
            return;
        }
    
        onlineUsers[userId] = { id: userId, username: username, socketId: socket.id };
        console.log(`User ${username} joined with ID: ${userId}`);
    
        io.emit("onlineUsers", Object.values(onlineUsers));
    });
    

    // Handle incoming calls
    socket.on("callUser", ({ from, to }) => {
        console.log(`Call from ${from} to ${to}`);
        if (onlineUsers[to]) {
            io.to(onlineUsers[to].socketId).emit("incomingCall", { from });
        } else {
            console.warn(`User ${to} is not online.`);
        }
    });

    // Handle call responses
    socket.on("callResponse", ({ from, accepted }) => {
        console.log(`Call response from ${from}: ${accepted ? "Accepted" : "Rejected"}`);
        if (onlineUsers[from]) {
            io.to(onlineUsers[from].socketId).emit("callStatus", { accepted });
        }
    });

    // When the user logs out (from frontend)
    socket.on("logout", (userId) => {
        console.log(`User with ID ${userId} logged out`);

        // Find and remove the user from onlineUsers
        if (onlineUsers[userId]) {
            delete onlineUsers[userId];
            console.log(`Removed user ${userId} from online users`);
            
            // Emit updated online users list
            io.emit("onlineUsers", Object.values(onlineUsers));
        }
    });



    // Handle disconnection and remove the user from the online list
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        let disconnectedUser = null;

        // Find the user by socket id and remove them from onlineUsers
        for (const userId in onlineUsers) {
            if (onlineUsers[userId].socketId === socket.id) {
                disconnectedUser = onlineUsers[userId];
                delete onlineUsers[userId];
                break;
            }
        }

        if (disconnectedUser) {
            console.log(`User ${disconnectedUser.username} (ID: ${disconnectedUser.id}) disconnected`);
            // Emit updated list of online users
            io.emit("onlineUsers", Object.values(onlineUsers));
            console.log("Emitting updated online users:", Object.values(onlineUsers));
        }
    });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
