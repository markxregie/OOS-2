import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Badge, Nav } from 'react-bootstrap';
import { FaChevronDown, FaBell, FaSignOutAlt, FaUndo, FaEye, FaTrashAlt, FaTag, FaEnvelope, FaUser, FaClock, FaCommentDots } from "react-icons/fa"; // Added new icons for modal content
import Swal from 'sweetalert2';
import './concerns.css'; // Assuming this file contains the necessary styles for header, etc.

const Concerns = () => {
  const userRole = "Admin";
  const userName = "Lim Alcovendas";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    // Timer to update the current date every minute
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const currentDateFormatted = currentDate.toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  // Updated Placeholder data for concerns with new columns
  const [concernsData, setConcernsData] = useState([
    { id: 1, name: 'John Doe', email: 'john.doe@example.com', subject: 'Service Feedback', message: 'Service was slow and my order was wrong. I waited for 30 minutes just for a glass of water, and when the food finally came, the chicken was undercooked. This is highly disappointing for a place of your reputation.', status: 'Pending', dateSubmitted: '2023-10-01 14:30' },
    { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com', subject: 'Product Inquiry', message: 'Is the new dish gluten-free? I couldn\'t find the ingredients listed anywhere on the menu or your website. I have a severe allergy, so this information is critical before I can order it.', status: 'Resolved', dateSubmitted: '2023-10-02 09:15' },
    { id: 3, name: 'Alex Johnson', email: 'alex.j@example.com', subject: 'Billing Issue', message: 'I was double-charged on my last visit. The receipt shows two transactions for the same amount. Please check your system and process a refund immediately.', status: 'In Progress', dateSubmitted: '2023-10-03 11:00' },
    { id: 4, name: 'Maria Garcia', email: 'maria.g@example.com', subject: 'General Compliment', message: 'I loved the atmosphere and the coffee was excellent! Your barista, Sarah, was incredibly kind and made a beautiful latte. Keep up the fantastic work!', status: 'Resolved', dateSubmitted: '2023-10-03 16:45' },
    // Add more as needed
  ]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'pending';
      case 'Resolved':
        return 'completed';
      case 'In Progress':
        return 'pending';
      default:
        return 'secondary';
    }
  };

  const filteredConcerns = concernsData.filter(concern => {
    if (activeTab === 'pending') return concern.status === 'Pending' || concern.status === 'In Progress';
    if (activeTab === 'resolved') return concern.status === 'Resolved';
    return true;
  });

  const handleView = (id) => {
    const concern = concernsData.find(c => c.id === id);
    if (!concern) return;

    // Determine the color for the badge
    let statusColor = '#007bff'; // Default for In Progress
    if (concern.status === 'Pending') {
        statusColor = '#ffc107'; // Yellow for Pending
    } else if (concern.status === 'Resolved') {
        statusColor = '#28a745'; // Green for Resolved
    }

    Swal.fire({
      title: `Concern ${id} Details`,
      // Custom HTML structure for a cleaner look with icons and clear labels
      html: `
        <div style="text-align: left; padding: 15px; border: 1px solid #eee; border-radius: 8px; background-color: #f9f9f9; font-size: 14px; color: #333;">
            <p style="margin-bottom: 10px;"><strong style="color: #121616ff; display: inline-flex; align-items: center;"><FaUser style="margin-right: 8px; color: #121616ff;"/>Name:</strong> ${concern.name}</p>
            <p style="margin-bottom: 10px;"><strong style="color: #121616ff; display: inline-flex; align-items: center;"><FaEnvelope style="margin-right: 8px; color: #121616ff;"/>Email:</strong> ${concern.email}</p>
            <p style="margin-bottom: 10px;"><strong style="color: #121616ff; display: inline-flex; align-items: center;"><FaTag style="margin-right: 8px; color: #121616ff;"/>Subject:</strong> ${concern.subject}</p>
            <div style="border-top: 1px solid #eee; margin: 15px 0;"></div>
            <p style="margin-bottom: 10px;"><strong style="color: #121616ff; display: inline-flex; align-items: flex-start;"><FaCommentDots style="margin-right: 8px; color: #121616ff; margin-top: 3px;"/>Message:</strong> <span style="display: block; padding: 10px; background-color: white; border: 1px solid #ccc; border-radius: 4px; margin-top: 5px;">${concern.message}</span></p>
            <div style="border-top: 1px solid #eee; margin: 15px 0;"></div>
            <p style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <strong style="color: #121616ff; display: inline-flex; align-items: center;"><FaClock style="margin-right: 8px; color: #121616ff;"/>Date Submitted:</strong> ${concern.dateSubmitted}
            </p>
             <p style="margin-bottom: 0;"><strong style="color: #121616ff; display: inline-flex; align-items: center;"><FaTag style="margin-right: 8px; color: #121616ff;"/>Status:</strong> <span style="background-color: ${statusColor}; color: white; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 0.9em;">${concern.status}</span></p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: concern.status !== 'Resolved' ? 'Mark as Resolved' : 'Status: Resolved (Close)', // Change text if already resolved
      cancelButtonText: 'Close',
      // Apply custom styling for a professional look
      customClass: {
          container: 'sweet-alert-container', // Custom class for external styling
          popup: 'sweet-alert-popup', // Custom class for external styling
          title: 'sweet-alert-title',
          htmlContainer: 'sweet-alert-html-container',
          confirmButton: concern.status !== 'Resolved' ? 'sweet-alert-confirm-button' : 'sweet-alert-resolved-button',
          cancelButton: 'sweet-alert-cancel-button',
      },
      confirmButtonColor: concern.status !== 'Resolved' ? '#4a9ba5' : '#6c757d', // Different color if already resolved
      cancelButtonColor: '#6c757d',
      focusConfirm: concern.status !== 'Resolved', // Don't focus if already resolved
      didOpen: () => {
        // You can add focus or other DOM manipulations here if needed
      }
    }).then((result) => {
      if (result.isConfirmed && concern.status !== 'Resolved') {
        // Mark as resolved only if it wasn't already
        setConcernsData(prev => prev.map(c => c.id === id ? { ...c, status: 'Resolved' } : c));
        Swal.fire({
            title: 'Resolved!',
            text: 'The concern has been marked as resolved.',
            icon: 'success',
            confirmButtonColor: '#4a9ba5'
        });
      } else if (result.isConfirmed && concern.status === 'Resolved') {
          // If already resolved, just close the modal
          Swal.close();
      }
    });
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        setConcernsData(prev => prev.filter(c => c.id !== id));
        Swal.fire(
          'Deleted!',
          `Concern ID: ${id} has been deleted.`,
          'success'
        );
      }
    });
  };

  return (
    <div className="d-flex" style={{ height: "100vh", backgroundColor: "#edf7f9" }}>
      <Container fluid className="p-4 main-content" style={{ marginLeft: "0px", width: "calc(100% - 0px)" }}>
        <header className="manage-header">
          <div className="header-left">
            <h2 className="page-title">Concerns</h2>
          </div>
          <div className="header-right">
            <div className="header-date">{currentDateFormatted}</div>
            <div className="header-profile">
              <div className="profile-pic"></div>
              <div className="profile-info">
                <div className="profile-role">Hi! I'm {userRole}</div>
                <div className="profile-name">{userName}</div>
              </div>
              <div className="dropdown-icon" onClick={() => setDropdownOpen(!dropdownOpen)}><FaChevronDown /></div>
              <div className="bell-icon"><FaBell className="bell-outline" /></div>
              {dropdownOpen && (
                <div className="profile-dropdown" style={{ position: "absolute", top: "100%", right: 0, backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 1000, width: "150px" }}>
                  <ul style={{ listStyle: "none", margin: 0, padding: "8px 0" }}>
                    <li
                      onClick={() => window.location.reload()}
                      style={{ cursor: "pointer", padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", color: "#4b929d" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <FaUndo /> Refresh
                    </li>
                    <li
                      onClick={() => { localStorage.removeItem("access_token"); window.location.href = "http://localhost:4002/"; }}
                      style={{ cursor: "pointer", padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", color: "#dc3545" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8d7da"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <FaSignOutAlt /> Logout
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>
        {/* Concerns Table Section */}
        <div className="table-container" style={{ marginTop: '30px' }}>
          <div className="table-header d-flex justify-content-between align-items-center">
            <h5 style={{ color: "#4a9ba5", margin: 0 }}>List of Customer Concerns</h5>
            <div></div>
          </div>
          <Nav variant="tabs" activeKey={activeTab} onSelect={(selectedKey) => setActiveTab(selectedKey)} className="mb-3">
            <Nav.Item>
              <Nav.Link eventKey="pending">Pending</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="resolved">Archive</Nav.Link>
            </Nav.Item>
          </Nav>
          <Table responsive className="orders-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Status</th>
                <th>Date Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredConcerns.map((concern) => (
                <tr key={concern.id}>
                  <td>{concern.id}</td>
                  <td>{concern.name}</td>
                  <td>{concern.email}</td>
                  <td>{concern.subject}</td>
                  {/* Truncate message for table view */}
                  <td>{concern.message.substring(0, 50)}{concern.message.length > 50 ? '...' : ''}</td>
                  <td>
                    <span className={`status-${getStatusClass(concern.status)}`}>{concern.status}</span>
                  </td>
                  <td>{concern.dateSubmitted}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        title="View Details"
                        onClick={() => handleView(concern.id)}
                        style={{ border: 'none' }}
                      >
                        <FaEye />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        title="Delete Concern"
                        onClick={() => handleDelete(concern.id)}
                        style={{ border: 'none' }}
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {filteredConcerns.length === 0 && (
            <div className="text-center text-muted p-4 border rounded">
              No concerns found.
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default Concerns;