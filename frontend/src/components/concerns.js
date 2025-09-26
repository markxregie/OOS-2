import React, { useState } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import './concerns.css';

const Concerns = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically handle the form submission, e.g., send the data to a backend
    console.log('Form Submitted:', { name, email, message });
    // Clear the form
    setName('');
    setEmail('');
    setMessage('');
    alert('Thank you for your feedback! We will get back to you shortly.');
  };

  return (
    <Container className="concerns-page py-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <div className="concerns-form-container p-4 border rounded">
            <h1 className="text-center mb-4">Concerns & Feedback</h1>
            <p className="text-center mb-4">
              If you have any questions, concerns, or feedback, please use the form below to get in touch with us.
            </p>
            <Form onSubmit={handleSubmit}>
              <Form.Group controlId="formName" className="mb-3">
                <Form.Label>Your Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group controlId="formEmail" className="mb-3">
                <Form.Label>Email address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group controlId="formMessage" className="mb-4">
                <Form.Label>Your Concern/Message</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  placeholder="Write your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </Form.Group>

              <Button variant="primary" type="submit" className="w-100">
                Submit Concern
              </Button>
            </Form>
          </div>
        </Col>
      </Row>
      <Row className="mt-5 text-center">
        <Col>
          <p className="mb-1">
            You can also reach us directly at:
          </p>
          <p className="mb-0">
            <strong>Email:</strong> support@yourwebsite.com
          </p>
          <p>
            <strong>Phone:</strong> (123) 456-7890
          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default Concerns;