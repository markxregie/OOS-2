import React from 'react';
import { Container, Row, Col, Table } from 'react-bootstrap';
import './concerns.css';

const Concerns = () => {
  // Placeholder data for concerns
  const concernsData = [
    { id: 1, user: 'John Doe', concern: 'Service was slow', date: '2023-10-01' },
    { id: 2, user: 'Jane Smith', concern: 'Food quality issue', date: '2023-10-02' },
    // Add more as needed
  ];

  return (
    <Container className="concerns-admin py-4">
      <Row>
        <Col>
          <h1 className="mb-4">Manage Concerns</h1>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Concern</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {concernsData.map((concern) => (
                <tr key={concern.id}>
                  <td>{concern.id}</td>
                  <td>{concern.user}</td>
                  <td>{concern.concern}</td>
                  <td>{concern.date}</td>
                  <td>
                    <button className="btn btn-primary btn-sm me-2">View</button>
                    <button className="btn btn-danger btn-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>
      </Row>
    </Container>
  );
};

export default Concerns;
