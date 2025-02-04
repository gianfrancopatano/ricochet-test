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
        console.log('Received online users:', filteredUsers);
        setOnlineUsers(filteredUsers);
      }
    });

    socket.on('incomingCall', ({ from }) => {
      console.log('Received incoming call from:', from);
      logMessage(`Incoming call from ${from}`);
      setIncomingCall({ from });
    });

    socket.on('callStatus', ({ accepted, error }) => {
      console.log('Received call status:', { accepted, error });
      if (error) {
        logMessage(`Call failed: ${error}`);
        return;
      }
      
      if (accepted) {
        logMessage('Call was accepted, connecting...');
        if (device && phoneNumberOrUsername) {
          try {
            const params = {
              To: phoneNumberOrUsername,
              From: user.username,
              Direction: 'outbound',
              CallerId: user.username
            };
            
            logMessage(`Attempting to call ${params.To} ...`);
            device.connect({ params })
              .then(newCall => {
                newCall.on('accept', () => {
                  logMessage('Call in progress...');
                  setCall(newCall);
                });

                newCall.on('disconnect', () => {
                  logMessage('Call disconnected.');
                  setCall(null);
                });

                newCall.on('cancel', () => {
                  logMessage('Call cancelled.');
                  setCall(null);
                });
              })
              .catch(error => {
                logMessage('Error making call: ' + error.message);
              });
          } catch (error) {
            logMessage('Error initiating call: ' + error.message);
          }
        }
      } else {
        logMessage('Call was rejected');
      }
    });

    console.log('Emitting join event for user:', user);
    socket.emit('join', user.id, user.username);

    // Store event handler functions
    const handleIncoming = (incomingTwilioCall) => {
      logMessage(`Incoming Twilio call from ${incomingTwilioCall.parameters.From}`);
      setCall(incomingTwilioCall);
    };

    const handleError = (error) => {
      logMessage('Device Error: ' + error.message);
    };

    const handleReady = () => {
      logMessage('Twilio Device ready.');
    };

    // Set up device event listeners
    if (device) {
      device.on('incoming', handleIncoming);
      device.on('error', handleError);
      device.on('ready', handleReady);
    }

    // Cleanup function
    return () => {
      socket.off('onlineUsers');
      socket.off('callStatus');
      socket.off('incomingCall');
      
      if (device) {
        device.off('incoming', handleIncoming);
        device.off('error', handleError);
        device.off('ready', handleReady);
      }
      
      console.log('Emitting logout event for user:', user.id);
      socket.emit('logout', user.id);
    };
  }, [user, device, phoneNumberOrUsername]);

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

    socket.emit('callUser', {
      from: user.username,
      to: phoneNumberOrUsername
    });

    logMessage(`Calling ${phoneNumberOrUsername}...`);
  };

  const handleIncomingCall = (incomingCall) => {
    logMessage(`Incoming call from ${incomingCall.parameters.From}`);
    setIncomingCall(incomingCall);
  };

  const acceptIncomingCall = () => {
    if (incomingCall) {
      logMessage('Accepting call...');
      
      socket.emit('callResponse', {
        from: user.username,
        to: incomingCall.from,
        accepted: true
      });

      if (device) {
        const params = {
          To: incomingCall.from,
          From: user.username,
          Direction: 'inbound',
          CallerId: incomingCall.from
        };

        device.connect({ params })
          .then(newCall => {
            setCall(newCall);
            newCall.on('accept', () => logMessage('Call connected'));
            newCall.on('disconnect', () => {
              logMessage('Call disconnected');
              setCall(null);
            });
          })
          .catch(error => logMessage('Error connecting: ' + error.message));
      }

      setIncomingCall(null);
    }
  };

  const rejectIncomingCall = () => {
    if (incomingCall) {
      logMessage('Rejecting call...');
      
      socket.emit('callResponse', {
        from: user.username,
        to: incomingCall.from,
        accepted: false
      });

      setIncomingCall(null);
    }
  };

  const hangupCall = () => {
    if (call) {
      call.disconnect();
      logMessage('Call disconnected.');
      setCall(null);
    }
  };

  const handleMuteToggle = () => {
    if (call) {
      if (isMuted) {
        call.mute(false);
        setIsMuted(false);
        logMessage('Unmuted call');
      } else {
        call.mute(true);
        setIsMuted(true);
        logMessage('Muted call');
      }
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
        {!call ? (
          <button onClick={makeOutgoingCall} disabled={!device}>Call</button>
        ) : (
          <div className="call-buttons">
            <button onClick={hangupCall}>Hang Up</button>
            <button onClick={handleMuteToggle} className="mute-button">
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          </div>
        )}
      </div>
      <div className="user-list">
        <h3>Online Users:</h3>
        <ul>
          {onlineUsers.map((onlineUser) => (
            <li 
              key={onlineUser.id} 
              onClick={() => {
                console.log('Setting phone number to:', onlineUser.username);
                setPhoneNumberOrUsername(onlineUser.username);
              }}
            >
              <UserCard 
                name={onlineUser.username || `User ${onlineUser.id}`} 
                status="Online" 
              />
            </li>
          ))}
        </ul>
      </div>
      {incomingCall && (
        <div className="call-popup">
          <p>Incoming call from {incomingCall.from}</p>
          <div className="call-popup-buttons">
            <button onClick={acceptIncomingCall}>Accept</button>
            <button onClick={rejectIncomingCall}>Reject</button>
          </div>
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
