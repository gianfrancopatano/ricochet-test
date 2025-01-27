'use client';

import { useEffect, useState } from 'react';
import { Device } from '@twilio/voice-sdk';
import UserCard from '../User/UserCard';
import axios from 'axios';
import io from 'socket.io-client';
import './Style.css';

const socket = io('http://localhost:3001');

const CallsPage = ({ user, setUser }) => {
  const [device, setDevice] = useState(null);
  const [call, setCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [phoneNumberOrUsername, setPhoneNumberOrUsername] = useState('');
  const [log, setLog] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isDeviceInitialized, setIsDeviceInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);  

  useEffect(() => {
    socket.on('onlineUsers', (users) => {
      if (Array.isArray(users)) {
        const filteredUsers = users.filter((u) => u.id !== user.id);
        setOnlineUsers(filteredUsers);
      } else {
        console.error('Invalid online users data:', users);
      }
    });

    socket.emit('join', user.id, user.username);

    return () => {
      socket.off('onlineUsers');
      socket.emit('logout', user.id);
    };
  }, [user]);

  const logMessage = (message) => {
    setLog((prev) => [...prev, message]);
  };

  const fetchTwilioToken = async () => {
    try {
      logMessage('Fetching Twilio token...');
      const response = await axios.post('http://localhost:3001/token', { username: user.username });
      return response.data.token;
    } catch (error) {
      logMessage('Error fetching Twilio token: ' + (error.response?.data?.error || error.message));
      return null;
    }
  };

  const initializeDevice = async () => {
    if (isDeviceInitialized) {
      logMessage('Device already initialized.');
      return;
    }

    const twilioToken = await fetchTwilioToken();
    if (!twilioToken) {
      logMessage('Failed to retrieve Twilio token.');
      return;
    }

    logMessage('Initializing Twilio Device...');
    const device = new Device(twilioToken, { codecPreferences: ['opus', 'pcmu'] });

    device.on('registered', () => logMessage('Device registered with Twilio.'));
    device.on('unregistered', () => logMessage('Device unregistered.'));
    device.on('ready', () => logMessage('Twilio Device ready.'));
    device.on('error', (error) => logMessage(`Device Error: ${error.message}`));
    device.on('offline', () => logMessage('Device went offline.'));
    device.on('incoming', handleIncomingCall);

    device.register();

    setDevice(device);
    setIsDeviceInitialized(true);
  };

  const makeOutgoingCall = async () => {
    if (!phoneNumberOrUsername) {
      logMessage('No phone number or username provided.');
      return;
    }

    const params = {
      To: phoneNumberOrUsername,
      From: user.username,
    };
    console.log('Making outgoing call with params:', params);
    if (device) {
      logMessage(`Attempting to call ${params.To} ...`);

      try {
        const response = await axios.post('http://localhost:3001/voice', params);
        const twimlUrl = response.data.twimlUrl;

        const newCall = await device.connect({ TwiMLUrl: twimlUrl });
        console.log('Returned call object:', newCall);

        if (newCall && newCall.on) {
          newCall.on('accept', () => logMessage('Call connected.'));
          newCall.on('disconnect', () => logMessage('Call disconnected.'));
          setCall(newCall);
        } else {
          logMessage('Failed to initiate call. No valid call object returned.');
        }
      } catch (error) {
        logMessage('Error initiating call: ' + error.message);
      }
    } else {
      logMessage('Twilio device is not initialized.');
    }
  };

  const hangupCall = () => {
    if (call) {
      call.disconnect();
      setCall(null);
    }
  };

  const handleIncomingCall = (incoming) => {
    logMessage(`Incoming call from ${incoming.parameters.From}`);
    setIncomingCall(incoming);
  };

  const acceptIncomingCall = () => {
    if (incomingCall) {
      logMessage('Accepted incoming call.');
      incomingCall.accept();
      setCall(incomingCall);
      setIncomingCall(null);
    }
  };

  const rejectIncomingCall = () => {
    if (incomingCall) {
      logMessage('Rejected incoming call.');
      incomingCall.reject();
      setIncomingCall(null);
    }
  };

  const handleMuteToggle = () => {
    if (call) {
      if (isMuted) {
        call.unmute(); 
        logMessage('Call unmuted');
      } else {
        call.mute(); 
        logMessage('Call muted');
      }
      setIsMuted(!isMuted);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    if (!user) {
      window.location.href = "/login";
      return;
    }
  };

  return (
    <div className="sidebar">
      <h1>Calls Page</h1>
      <button onClick={initializeDevice} disabled={isDeviceInitialized} className="initialize-button">
        {isDeviceInitialized ? 'Device Initialized' : 'Initialize Device'}
      </button>
      <div className="call-input">
        <input
          type="text"
          placeholder="Enter phone number or username"
          value={phoneNumberOrUsername}
          onChange={(e) => setPhoneNumberOrUsername(e.target.value)}
        />
        <button onClick={makeOutgoingCall} disabled={!device}>Call</button>
        <button onClick={hangupCall} disabled={!call}>Hang Up</button>
      </div>
      <div className="user-list">
        <h3>Online Users:</h3>
        <ul>
          {onlineUsers.map((onlineUser) => (
            <li key={onlineUser.id} onClick={() => setPhoneNumberOrUsername(onlineUser.username)}>
              <UserCard name={onlineUser.username || `User ${onlineUser.id}`} status="Online" />
            </li>
          ))}
        </ul>
      </div>
      {incomingCall && (
        <div className="call-popup">
          <p>Incoming call from {incomingCall.parameters.From}</p>
          <button onClick={acceptIncomingCall}>Accept</button>
          <button onClick={rejectIncomingCall}>Reject</button>
        </div>
      )}
      {call && (
        <div className="call-controls">
          <button onClick={handleMuteToggle} className="mute-button">
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      )}
      <div className="logs-box">
        <h3>Logs:</h3>
        {log.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </div>
      <button onClick={handleLogout} className="logout-button">Logout</button>
    </div>
  );
};

export default CallsPage;
