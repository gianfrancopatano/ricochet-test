import React from "react";
import "./User.css";

const statusColors = {
  "Online": "green",
  "On Call": "red",
  "Ringing": "orange",
};

const UserCard = ({ name, status }) => {
  return (
    <div className="user-card">
      <div className="user-info">
        <span className="user-name">{name}</span>
        <span className="user-status">{status}</span>
      </div>
      <div 
        className="status-indicator" 
        style={{ backgroundColor: statusColors[status] || "gray" }} 
      />
    </div>
  );
};

export default UserCard;
