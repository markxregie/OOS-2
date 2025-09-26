import React, { useState } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import './concerns.css';

const Concerns = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically handle the form submission, e.g., send the data to a backend
    console.log('Form Submitted:', { name, email, subject, message });
    // Clear the form
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    alert('Thank you for your feedback! We will get back to you shortly.');
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
                <Form.Label style={{ color: "#4a9ba5", fontWeight: "bold" }}>Your Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ borderColor: "#4a9ba5" }}
                />
              </Form.Group>

              <Form.Group controlId="formEmail" className="mb-3">
                <Form.Label style={{ color: "#4a9ba5", fontWeight: "bold" }}>Email address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ borderColor: "#4a9ba5" }}
                />
              </Form.Group>

              <Form.Group controlId="formSubject" className="mb-3">
                <Form.Label style={{ color: "#4a9ba5", fontWeight: "bold" }}>Subject</Form.Label>
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
                <Form.Label style={{ color: "#4a9ba5", fontWeight: "bold" }}>Your Concern/Message</Form.Label>
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
          <p className="mb-0" style={{ color: "#4a9ba5", fontWeight: "bold" }}>
            <strong>Email:</strong> support@yourwebsite.com
          </p>
          <p style={{ color: "#4a9ba5", fontWeight: "bold" }}>
            <strong>Phone:</strong> (123) 456-7890
          </p>
        </Col>
      </Row>
      </Container>
    </div>
  );
};

export default Concerns;