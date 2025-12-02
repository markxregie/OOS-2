import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Badge, Nav, Card, Button, Modal, Form } from 'react-bootstrap';
import { FaChevronDown, FaBell, FaSignOutAlt, FaUndo, FaEye, FaTrashAlt, FaTag, FaEnvelope, FaUser, FaClock, FaCommentDots, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight, FaPlus, FaImage, FaCalendarAlt, FaTimes, FaEdit } from "react-icons/fa";
import Swal from 'sweetalert2';
import './concerns.css'; // Keeping your existing CSS import
import adminImage from "../../assets/administrator.png";

// API Base URL for Promotion Service
const PROMOTION_API_BASE = 'http://localhost:7010';



// API Functions
const fetchPromotions = async () => {
  try {
    const response = await fetch(`${PROMOTION_API_BASE}/promotions`);
    if (!response.ok) throw new Error('Failed to fetch promotions');
    const data = await response.json();
    return data.promotions || [];
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return [];
  }
};

const fetchInactivePromotions = async () => {
  try {
    const response = await fetch(`${PROMOTION_API_BASE}/promotions/inactive`);
    if (!response.ok) throw new Error('Failed to fetch inactive promotions');
    const data = await response.json();
    return data.promotions || [];
  } catch (error) {
    console.error('Error fetching inactive promotions:', error);
    return [];
  }
};

const uploadPromotion = async (formData) => {
  try {
    const response = await fetch(`${PROMOTION_API_BASE}/upload-promotion`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload promotion');
    return await response.json();
  } catch (error) {
    console.error('Error uploading promotion:', error);
    throw error;
  }
};

const updatePromotion = async (promotionId, formData) => {
  try {
    const response = await fetch(`${PROMOTION_API_BASE}/promotion/${promotionId}`, {
      method: 'PUT',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to update promotion');
    return await response.json();
  } catch (error) {
    console.error('Error updating promotion:', error);
    throw error;
  }
};

const deletePromotion = async (promotionId) => {
  try {
    const response = await fetch(`${PROMOTION_API_BASE}/promotion/${promotionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete promotion');
    return await response.json();
  } catch (error) {
    console.error('Error deleting promotion:', error);
    throw error;
  }
};

const Promotions = () => {
  const userRole = "Admin";
  const userName = "Lim Alcovendas";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // --- PROMOTIONS STATE ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // Track if we are editing

  // New State for Viewing Image in Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewImageSrc, setViewImageSrc] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'inactive'

  const [promotions, setPromotions] = useState([]);
  const [inactivePromotions, setInactivePromotions] = useState([]);
  
  // Form State
  const [newPromoTitle, setNewPromoTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    // Fetch promotions on component mount
    const loadPromotions = async () => {
      const activeData = await fetchPromotions();
      const inactiveData = await fetchInactivePromotions();
      setPromotions(activeData);
      setInactivePromotions(inactiveData);
    };
    loadPromotions();

    // Timer to update the current date every minute
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const currentDateFormatted = currentDate.toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  // --- HANDLERS ---

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePromotion = async () => {
    // Validation
    if (!newPromoTitle.trim()) {
        Swal.fire('Error', 'Please enter a promotion title.', 'error');
        return;
    }

    if (!startDate || !endDate) {
        Swal.fire('Error', 'Please select both start and end dates.', 'error');
        return;
    }

    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        Swal.fire('Error', 'Invalid date format. Please select valid dates.', 'error');
        return;
    }

    if (start >= end) {
        Swal.fire('Error', 'Start date must be before end date.', 'error');
        return;
    }

    // If adding new, require image. If editing, image is optional (keep old one).
    if (!editingId && !selectedFile && !previewUrl) {
        Swal.fire('Error', 'Please upload a banner image.', 'error');
        return;
    }

    try {
        if (editingId) {
            // --- UPDATE EXISTING ---
            const formData = new FormData();
            formData.append('title', newPromoTitle);
            formData.append('start_date', startDate);
            formData.append('end_date', endDate);
            if (selectedFile) {
                formData.append('file', selectedFile);
            }

            await updatePromotion(editingId, formData);

            Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: 'Promotion details have been updated.',
                confirmButtonColor: '#4a9ba5'
            });

        } else {
            // --- CREATE NEW ---
            const formData = new FormData();
            formData.append('title', newPromoTitle);
            formData.append('start_date', startDate);
            formData.append('end_date', endDate);
            formData.append('file', selectedFile);

            await uploadPromotion(formData);

            Swal.fire({
                icon: 'success',
                title: 'Published!',
                text: 'Your new banner is now scheduled.',
                confirmButtonColor: '#4a9ba5'
            });
        }

        // Refresh promotions list
        const updatedActivePromotions = await fetchPromotions();
        const updatedInactivePromotions = await fetchInactivePromotions();
        setPromotions(updatedActivePromotions);
        setInactivePromotions(updatedInactivePromotions);

        setShowAddModal(false);
        resetForm();

    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to save promotion. Please try again.',
            confirmButtonColor: '#4a9ba5'
        });
    }
  };

  const handleEditClick = (promo) => {
      setEditingId(promo.id);
      setNewPromoTitle(promo.title);
      setStartDate(promo.startDate);
      setEndDate(promo.endDate);
      setPreviewUrl(promo.image);
      setSelectedFile(null); // Reset file input, strictly using previewUrl for display
      setShowAddModal(true);
  };

  const handleDeletePromotion = async (id) => {
    Swal.fire({
        title: 'Delete Banner?',
        text: "This will remove the image from the homepage.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await deletePromotion(id);
                // Refresh both active and inactive promotions lists
                const updatedActivePromotions = await fetchPromotions();
                const updatedInactivePromotions = await fetchInactivePromotions();
                setPromotions(updatedActivePromotions);
                setInactivePromotions(updatedInactivePromotions);
                Swal.fire('Deleted!', 'The promotion has been removed.', 'success');
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to delete promotion. Please try again.',
                    confirmButtonColor: '#4a9ba5'
                });
            }
        }
    });
  };

  const handleViewImage = (imgSrc) => {
      setViewImageSrc(imgSrc);
      setShowViewModal(true);
  };

  const resetForm = () => {
      setEditingId(null);
      setNewPromoTitle('');
      setStartDate('');
      setEndDate('');
      setSelectedFile(null);
      setPreviewUrl(null);
  };

  return (
    <div className="d-flex" style={{ height: "100vh", backgroundColor: "#edf7f9" }}>
      <Container fluid className="p-4 main-content" style={{ marginLeft: "0px", width: "calc(100% - 0px)" }}>
        
        {/* --- HEADER --- */}
        <header className="manage-header">
          <div className="header-left">
            <h2 className="page-title">Promotions</h2>
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

        {/* --- PROMOTIONS CONTENT INTERFACE (TABLE VIEW) --- */}
        <div className="promotions-body" style={{ marginTop: '20px' }}>

            {/* Toolbar */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 style={{ color: '#4a9ba5', margin: 0 }}>
                        {activeTab === 'active' ? 'Active Homepage Banners' : 'Archived Banners'}
                    </h5>
                    <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>
                        {activeTab === 'active' ? 'Manage the slides appearing on the customers POV.' : 'View expired or deleted promotions.'}
                    </p>
                </div>
                {activeTab === 'active' && (
                    <Button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        style={{ backgroundColor: '#4a9ba5', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <FaPlus /> Upload New Banner
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <Nav variant="tabs" className="mb-4" activeKey={activeTab} onSelect={(selectedKey) => setActiveTab(selectedKey)}>
                <Nav.Item>
                    <Nav.Link eventKey="active" style={{ color: activeTab === 'active' ? '#4a9ba5' : '#6c757d', fontWeight: '500' }}>
                        Active Promotions
                    </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                    <Nav.Link eventKey="inactive" style={{ color: activeTab === 'inactive' ? '#4a9ba5' : '#6c757d', fontWeight: '500' }}>
                        Archives
                    </Nav.Link>
                </Nav.Item>
            </Nav>

            {/* Banners Table */}
            <div className="table-responsive" style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <Table responsive className="orders-table">
                    <thead>
                        <tr>
                            <th style={{ width: '15%' }}>Preview</th>
                            <th style={{ width: '25%' }}>Promotion Title</th>
                            <th style={{ width: '10%' }}>Status</th>
                            <th style={{ width: '25%' }}>Duration (From - To)</th>
                            <th style={{ width: '25%', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(activeTab === 'active' ? promotions : inactivePromotions).map((promo) => (
                            <tr key={promo.id}>
                                <td>
                                    <div
                                        style={{
                                            width: '120px',
                                            height: '80px',
                                            overflow: 'hidden',
                                            borderRadius: '6px',
                                            border: '1px solid #dee2e6',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => handleViewImage(promo.image)}
                                    >
                                        <img
                                            src={promo.image}
                                            alt={promo.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                </td>
                                <td style={{ fontWeight: '500', color: '#333' }}>{promo.title}</td>
                                <td>
                                    <Badge bg={promo.status === 'Active' ? 'success' : 'secondary'}>
                                        {promo.status}
                                    </Badge>
                                </td>
                                <td className="text-muted">
                                    <div style={{ fontSize: '0.9rem' }}>
                                        <FaCalendarAlt className="me-2" style={{ color: '#4a9ba5' }} />
                                        <strong>Start:</strong> {promo.startDate}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                                        <FaClock className="me-2" style={{ color: '#dc3545' }} />
                                        <strong>End:</strong> &nbsp;&nbsp;{promo.endDate}
                                    </div>
                                </td>
                                <td className="text-center">
                                    <button
                                        className="btn btn-sm btn-outline-primary me-2"
                                        title="View Full Image"
                                        onClick={() => handleViewImage(promo.image)}
                                        style={{ border: 'none' }}
                                    >
                                        <FaEye />
                                    </button>
                                    {activeTab === 'active' && (
                                        <>
                                            <button
                                                className="btn btn-sm btn-outline-warning me-2"
                                                title="Edit Promotion"
                                                onClick={() => handleEditClick(promo)}
                                                style={{ border: 'none' }}
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                title="Delete Promotion"
                                                onClick={() => handleDeletePromotion(promo.id)}
                                                style={{ border: 'none' }}
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                         {/* Empty State if no promos */}
                         {(activeTab === 'active' ? promotions : inactivePromotions).length === 0 && (
                            <tr>
                                <td colSpan="5" className="text-center py-5">
                                    <div style={{ color: '#ccc', fontSize: '2rem', marginBottom: '10px' }}><FaImage /></div>
                                    <p className="text-muted">
                                        {activeTab === 'active' ? 'No active promotions found.' : 'No inactive/deleted promotions found.'}
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
        </div>

        {/* --- ADD/EDIT PROMOTION MODAL --- */}
        <Modal show={showAddModal} onHide={() => { setShowAddModal(false); resetForm(); }} centered size="lg">
            <Modal.Header closeButton style={{ borderBottom: 'none' }}>
                <Modal.Title style={{ color: '#4a9ba5' }}>
                    {editingId ? <><FaEdit /> Edit Promotion</> : <><FaTag /> Add New Promotion</>}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label>Promotion Title</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="e.g., Summer Sale 50% Off" 
                                value={newPromoTitle}
                                onChange={(e) => setNewPromoTitle(e.target.value)}
                            />
                        </Form.Group>
                        
                        {/* DATE RANGE INPUTS */}
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Start Date</Form.Label>
                                    <Form.Control 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>End Date</Form.Label>
                                    <Form.Control 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Upload Banner Image</Form.Label>
                            <div 
                                style={{ 
                                    border: '2px dashed #ccc', 
                                    borderRadius: '8px', 
                                    padding: '20px', 
                                    textAlign: 'center', 
                                    cursor: 'pointer',
                                    backgroundColor: '#f9f9f9'
                                }}
                                onClick={() => document.getElementById('fileInput').click()}
                            >
                                <FaImage style={{ fontSize: '2rem', color: '#aaa', marginBottom: '10px' }} />
                                <p style={{ margin: 0, color: '#666' }}>Click to Browse or Drag Image Here</p>
                                <span style={{ fontSize: '0.8rem', color: '#999' }}>Recommended size: 1200 x 600 px</span>
                            </div>
                            <Form.Control 
                                id="fileInput"
                                type="file" 
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Label>Preview</Form.Label>
                        <div style={{ 
                            width: '100%', 
                            height: '200px', 
                            backgroundColor: '#e9ecef', 
                            borderRadius: '8px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            overflow: 'hidden',
                            border: '1px solid #dee2e6'
                        }}>
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span className="text-muted">Image preview will appear here</span>
                            )}
                        </div>
                        {selectedFile && (
                            <div className="mt-2 text-success" style={{ fontSize: '0.9rem' }}>
                                <FaCommentDots /> Selected: {selectedFile.name}
                            </div>
                        )}
                        {!selectedFile && editingId && (
                            <div className="mt-2 text-warning" style={{ fontSize: '0.8rem' }}>
                                * Keeping existing image if no new file selected.
                            </div>
                        )}
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer style={{ borderTop: 'none' }}>
                <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>Cancel</Button>
                <Button 
                    onClick={handleSavePromotion}
                    style={{ backgroundColor: '#4a9ba5', border: 'none' }}
                >
                    {editingId ? 'Update Promotion' : 'Publish to Homepage'}
                </Button>
            </Modal.Footer>
        </Modal>

        {/* --- VIEW IMAGE MODAL --- */}
        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered size="lg">
            <Modal.Header closeButton style={{ borderBottom: 'none' }}>
                <Modal.Title style={{ color: '#4a9ba5' }}>Banner Preview</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0 bg-dark text-center" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {viewImageSrc && (
                    <img src={viewImageSrc} alt="Full Banner" style={{ maxWidth: '100%', maxHeight: '500px' }} />
                )}
            </Modal.Body>
        </Modal>

      </Container>
    </div>
  );
};

export default Promotions;