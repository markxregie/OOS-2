import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Badge, Nav } from 'react-bootstrap';
import { FaChevronDown, FaBell, FaSignOutAlt, FaUndo, FaEye, FaTrashAlt, FaTag, FaEnvelope, FaUser, FaClock, FaCommentDots, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa"; // Added new icons for modal content
import Swal from 'sweetalert2';
import './concerns.css'; // Assuming this file contains the necessary styles for header, etc.
import adminImage from "../../assets/administrator.png";
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

  const [concernsData, setConcernsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchConcerns();
  }, []);

  const fetchConcerns = async () => {
    try {
      const response = await fetch('http://127.0.0.1:7007/concerns');
      if (response.ok) {
        const data = await response.json();
        setConcernsData(data.map(concern => {
          let formatted = new Date(concern.submitted_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
          formatted = formatted.replace('AM', 'am').replace('PM', 'pm');
          return {
            ...concern,
            dateSubmitted: formatted
          };
        }));
      } else {
        console.error('Failed to fetch concerns');
      }
    } catch (error) {
      console.error('Error fetching concerns:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentConcerns = filteredConcerns.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredConcerns.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleFirstPage = () => {
    setCurrentPage(1);
  };

  const handleLastPage = () => {
    setCurrentPage(totalPages);
  };

  const handleView = async (id) => {
    const concern = concernsData.find(c => c.id === id);
    if (!concern) return;

    // Determine the color for the badge
    let statusColor = '#007bff'; // Default for In Progress
    if (concern.status === 'Pending') {
        statusColor = '#ffc107'; // Yellow for Pending
    } else if (concern.status === 'Resolved') {
        statusColor = '#28a745'; // Green for Resolved
    }

    let fileDisplay = '';
    if (concern.file_path) {
      const filename = concern.file_path.split(/[/\\]/).pop();
      const fileUrl = `http://127.0.0.1:7007/uploads/${filename}`;
      const fileExtension = filename.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        fileDisplay = `<div style="margin-top: 15px;"><strong style="color: #121616ff; display: inline-flex; align-items: center;"><FaTag style="margin-right: 8px; color: #121616ff;"/>Attached Image:</strong><br><img src="${fileUrl}" alt="Attached image" style="max-width: 100%; max-height: 300px; border: 1px solid #ccc; border-radius: 4px; margin-top: 5px;"></div>`;
      } else {
        fileDisplay = `<div style="margin-top: 15px;"><strong style="color: #121616ff; display: inline-flex; align-items: center;"><FaTag style="margin-right: 8px; color: #121616ff;"/>Attached File:</strong><br><a href="${fileUrl}" target="_blank" style="color: #4a9ba5; text-decoration: none;">View/Download File</a></div>`;
      }
    }

    const result = await Swal.fire({
      title: `Concern Details`,
      // Custom HTML structure for a cleaner look with icons and clear labels
      html: `
        <div style="text-align: left; padding: 15px; border: 1px solid #eee; border-radius: 8px; background-color: #f9f9f9; font-size: 14px; color: #333;">
            <p style="margin-bottom: 10px;"><strong style="color: #121616ff; display: inline-flex; align-items: center;"><FaUser style="margin-right: 8px; color: #121616ff;"/>Name:</strong> ${concern.name}</p>
            <p style="margin-bottom: 10px;"><strong style="color: #121616ff; display: inline-flex; align-items: center;"><FaEnvelope style="margin-right: 8px; color: #121616ff;"/>Email:</strong> ${concern.email}</p>
            <p style="margin-bottom: 10px;"><strong style="color: #121616ff; display: inline-flex; align-items: center;"><FaTag style="margin-right: 8px; color: #121616ff;"/>Subject:</strong> ${concern.subject}</p>
            <div style="border-top: 1px solid #eee; margin: 15px 0;"></div>
            <p style="margin-bottom: 10px;"><strong style="color: #121616ff; display: inline-flex; align-items: flex-start;"><FaCommentDots style="margin-right: 8px; color: #121616ff; margin-top: 3px;"/>Message:</strong> <span style="display: block; padding: 10px; background-color: white; border: 1px solid #ccc; border-radius: 4px; margin-top: 5px;">${concern.message}</span></p>
            ${fileDisplay}
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
    });

    if (result.isConfirmed && concern.status !== 'Resolved') {
      try {
        const response = await fetch(`http://127.0.0.1:7007/concerns/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'Resolved' }),
        });
        if (response.ok) {
          setConcernsData(prev => prev.map(c => c.id === id ? { ...c, status: 'Resolved' } : c));
          Swal.fire({
            title: 'Resolved!',
            text: 'The concern has been marked as resolved.',
            icon: 'success',
            confirmButtonColor: '#4a9ba5'
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: 'Failed to update status.',
            icon: 'error',
          });
        }
      } catch (error) {
        console.error('Error updating status:', error);
        Swal.fire({
          title: 'Error!',
          text: 'An error occurred while updating status.',
          icon: 'error',
        });
      }
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`http://127.0.0.1:7007/concerns/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setConcernsData(prev => prev.filter(c => c.id !== id));
          Swal.fire(
            'Deleted!',
            `Concern ID: ${id} has been deleted.`,
            'success'
          );
        } else {
          Swal.fire(
            'Error!',
            'Failed to delete the concern.',
            'error'
          );
        }
      } catch (error) {
        console.error('Error deleting concern:', error);
        Swal.fire(
          'Error!',
          'An error occurred while deleting the concern.',
          'error'
        );
      }
    }
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
                          <img src={adminImage} alt="Admin" className="profile-pic" />
              
              <div className="profile-info">
                <div className="profile-role">Hi! I'm {userRole}</div>
                <div className="profile-name">Admin OOS</div>
              </div>
              <div className="dropdown-icon" onClick={() => setDropdownOpen(!dropdownOpen)}><FaChevronDown /></div>
              
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
                      onClick={() => { localStorage.removeItem("access_token"); localStorage.removeItem("authToken"); localStorage.removeItem("expires_at"); localStorage.removeItem("userData"); window.location.replace("http://localhost:4002/"); }}
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
              {currentConcerns.map((concern) => (
                <tr key={concern.id}>
          
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
                    <button
                      className="btn btn-sm btn-outline-primary"
                      title="View Details"
                      onClick={() => handleView(concern.id)}
                      style={{ border: 'none' }}
                    >
                      <FaEye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {/* Pagination Controls */}
          {filteredConcerns.length > itemsPerPage && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div>
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredConcerns.length)} of {filteredConcerns.length} entries
              </div>
              <div className="d-flex align-items-center">
                <button
                  className="pagination-btn"
                  onClick={handleFirstPage}
                  disabled={currentPage === 1}
                >
                  <FaAngleDoubleLeft />
                </button>
                <button
                  className="pagination-btn"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <FaAngleLeft />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                  <button
                    key={number}
                    className={`pagination-btn ${currentPage === number ? 'active' : ''}`}
                    onClick={() => paginate(number)}
                  >
                    {number}
                  </button>
                ))}

                <button
                  className="pagination-btn"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  <FaAngleRight />
                </button>
                <button
                  className="pagination-btn"
                  onClick={handleLastPage}
                  disabled={currentPage === totalPages}
                >
                  <FaAngleDoubleRight />
                </button>
              </div>
            </div>
          )}
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