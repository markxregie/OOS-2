import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import Swal from 'sweetalert2';
import './concerns.css';

const Concerns = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const response = await fetch('http://localhost:4000/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setName(`${data.firstName} ${data.lastName}`);
          setEmail(data.email);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    fetchUserProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('subject', subject);
      formData.append('message', message);
      if (file) {
        formData.append('file', file);
      }
      const response = await fetch('http://127.0.0.1:7007/concerns', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        Swal.fire({
          title: 'Success!',
          text: 'Thank you for your feedback! We will get back to you shortly.',
          icon: 'success',
          confirmButtonColor: '#4a9ba5'
        });
        // Clear the form
        setSubject('');
        setMessage('');
        setFile(null);
      } else {
        Swal.fire({
          title: 'Error!',
          text: 'Failed to submit concern. Please try again.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    } catch (error) {
      console.error('Error submitting concern:', error);
      Swal.fire({
        title: 'Error!',
        text: 'An error occurred. Please try again.',
        icon: 'error',
        confirmButtonColor: '#dc3545'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#edf7f9", minHeight: "100vh", padding: "40px 0" }}>
      <Container className="py-5" style={{ marginTop: "50px" }}>
        <Row className="justify-content-center">
          <Col md={8}>
            <div className="p-4 border rounded" style={{ backgroundColor: "white", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}>
              <h1 className="text-center mb-4" style={{ color: "#4a9ba5" }}>Concerns & Feedback</h1>
              <p className="text-center mb-4" style={{ color: "#666" }}>
                If you have any questions, concerns, or feedback, please use the form below to get in touch with us.
              </p>
            <Form onSubmit={handleSubmit}>
              <Form.Group controlId="formName" className="mb-3">
                <Form.Label style={{ color: "#4a9ba5", fontWeight: "bold" }}>Your Name <span style={{color: 'red'}}>*</span></Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled
                  style={{ borderColor: "#4a9ba5" }}
                />
              </Form.Group>

              <Form.Group controlId="formEmail" className="mb-3">
                <Form.Label style={{ color: "#4a9ba5", fontWeight: "bold" }}>Email address <span style={{color: 'red'}}>*</span></Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled
                  style={{ borderColor: "#4a9ba5" }}
                />
              </Form.Group>

              <Form.Group controlId="formSubject" className="mb-3">
                <Form.Label style={{ color: "#4a9ba5", fontWeight: "bold" }}>Subject <span style={{color: 'red'}}>*</span></Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter the subject of your concern"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  style={{ borderColor: "#4a9ba5" }}
                />
              </Form.Group>

              <Form.Group controlId="formMessage" className="mb-4">
                <Form.Label style={{ color: "#4a9ba5", fontWeight: "bold" }}>Your Concern/Message <span style={{color: 'red'}}>*</span></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  placeholder="Write your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  style={{ borderColor: "#4a9ba5" }}
                />
              </Form.Group>

              <Form.Group controlId="formFile" className="mb-4">
                <Form.Label style={{ color: "#4a9ba5", fontWeight: "bold" }}>Attach File/Image</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => setFile(e.target.files[0])}
                  style={{ borderColor: "#4a9ba5" }}
                />
              </Form.Group>

              <Button type="submit" className="w-100" style={{ backgroundColor: "#4a9ba5", borderColor: "#4a9ba5", color: "white" }}>
                Submit Concern
              </Button>
            </Form>
          </div>
        </Col>
      </Row>
      <Row className="mt-5 text-center">
        <Col>
          <p className="mb-1" style={{ color: "#666" }}>
            You can also reach us directly at:
          </p>
          <p className="mb-0" style={{ color: "#4a9ba5" }}>
         Email: bleubeancafe.ph@gmail.com
          </p>
          <p style={{ color: "#4a9ba5" }}>
            Phone: 0961 687 2463
          </p>
        </Col>
      </Row>
      </Container>
    </div>
  );
};

export default Concerns;