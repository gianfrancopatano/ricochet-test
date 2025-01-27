import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Style.css"; 

const CallsReportPage = () => {
  const [calls, setCalls] = useState([]);
  const [filteredCalls, setFilteredCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [callsPerPage] = useState(10);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const response = await axios.get("http://localhost:3001/reports");
        if (Array.isArray(response.data)) {
          setCalls(response.data);
          setFilteredCalls(response.data);
        } else {
          console.error("Unexpected API response:", response.data);
          setCalls([]);
          setFilteredCalls([]);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching call data:", err);
        setError("Error fetching call data");
        setCalls([]);
        setFilteredCalls([]);
        setLoading(false);
      }
    };

    fetchCalls();
  }, []);

  // Filtering calls based on status
  useEffect(() => {
    let updatedCalls = calls;
    if (filterStatus) {
      updatedCalls = calls.filter(call => call.status.toLowerCase() === filterStatus.toLowerCase());
    }
    setFilteredCalls(updatedCalls);
    setCurrentPage(1);
  }, [filterStatus, calls]);

  // Sorting function
  const handleSort = (field) => {
    const order = sortField === field && sortOrder === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortOrder(order);

    const sortedCalls = [...filteredCalls].sort((a, b) => {
      if (!a[field]) return 1;
      if (!b[field]) return -1;
      if (order === "asc") return a[field] > b[field] ? 1 : -1;
      return a[field] < b[field] ? 1 : -1;
    });

    setFilteredCalls(sortedCalls);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  // Pagination
  const indexOfLastCall = currentPage * callsPerPage;
  const indexOfFirstCall = indexOfLastCall - callsPerPage;
  const currentCalls = filteredCalls.slice(indexOfFirstCall, indexOfLastCall);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="call-reports">
      <h1>Calls Report</h1>

      {/* Filter & Sort Controls */}
      <div className="filters">
        <label>Filter by Status:</label>
        <select onChange={(e) => setFilterStatus(e.target.value)} value={filterStatus}>
          <option value="">All</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="ongoing">Ongoing</option>
        </select>
      </div>

      <table className="call-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("id")}>Id {sortField === "id" ? (sortOrder === "asc" ? "▲" : "▼") : ""}</th>
            <th onClick={() => handleSort("timestamp")}>Timestamp {sortField === "timestamp" ? (sortOrder === "asc" ? "▲" : "▼") : ""}</th>
            <th>CallSid</th>
            <th onClick={() => handleSort("status")}>Status {sortField === "status" ? (sortOrder === "asc" ? "▲" : "▼") : ""}</th>
            <th onClick={() => handleSort("duration")}>Duration {sortField === "duration" ? (sortOrder === "asc" ? "▲" : "▼") : ""}</th>
            <th>From</th>
            <th>To</th>
          </tr>
        </thead>
        <tbody>
          {currentCalls.length > 0 ? (
            currentCalls.map((call) => (
              <tr key={call.id}>
                <td>{call.id}</td>
                <td>{call.timestamp || "No timestamp"}</td>
                <td>{call.call_sid || "No CallSid"}</td>
                <td>{call.status || "No Status"}</td>
                <td>{call.duration || "No Duration"}</td>
                <td>{call.from_user || "No From"}</td>
                <td>{call.to_user || "No To"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7">No call records available.</td>
            </tr>
          )}
        </tbody>
      </table>

      
      <div className="pagination">
        {Array.from({ length: Math.ceil(filteredCalls.length / callsPerPage) }, (_, index) => (
          <button
            key={index + 1}
            onClick={() => paginate(index + 1)}
            className={`page-btn ${currentPage === index + 1 ? "active" : ""}`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CallsReportPage;
