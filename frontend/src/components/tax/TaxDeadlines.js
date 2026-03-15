import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TaxDeadlines = () => {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const fetchDeadlines = async () => {
    try {
      const response = await api.get('/tax/deadlines');
      setDeadlines(response.data.tax_periods);
    } catch (error) {
      setError('Failed to load deadlines');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'overdue': return 'danger';
      case 'urgent': return 'warning';
      case 'upcoming': return 'success';
      default: return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'overdue': return 'Overdue';
      case 'urgent': return 'Due Soon';
      case 'upcoming': return 'Upcoming';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Tax Deadlines</h2>
              <p className="text-muted">Important tax payment due dates</p>
            </div>
            <Button variant="outline-primary" onClick={fetchDeadlines}>
              Refresh
            </Button>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">📅 Tax Payment Deadlines</h5>
            </Card.Header>
            <Card.Body>
              {deadlines.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No tax deadlines found.</p>
                </div>
              ) : (
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Tax Type</th>
                      <th>Period</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Grace Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deadlines.map(deadline => (
                      <tr key={deadline.id}>
                        <td>
                          <strong>{deadline.tax_type_name}</strong>
                        </td>
                        <td>{deadline.period_name}</td>
                        <td>{new Date(deadline.start_date).toLocaleDateString()}</td>
                        <td>{new Date(deadline.end_date).toLocaleDateString()}</td>
                        <td>
                          <strong>{new Date(deadline.due_date).toLocaleDateString()}</strong>
                        </td>
                        <td>
                          <Badge bg={getStatusVariant(deadline.deadline_status)}>
                            {getStatusText(deadline.deadline_status)}
                          </Badge>
                        </td>
                        <td>{deadline.grace_period_days} days</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {/* Deadline Summary */}
          <Row className="mt-4">
            <Col md={4}>
              <Card className="border-danger">
                <Card.Body className="text-center">
                  <h4 className="text-danger">
                    {deadlines.filter(d => d.deadline_status === 'overdue').length}
                  </h4>
                  <p className="mb-0">Overdue</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-warning">
                <Card.Body className="text-center">
                  <h4 className="text-warning">
                    {deadlines.filter(d => d.deadline_status === 'urgent').length}
                  </h4>
                  <p className="mb-0">Due Soon</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-success">
                <Card.Body className="text-center">
                  <h4 className="text-success">
                    {deadlines.filter(d => d.deadline_status === 'upcoming').length}
                  </h4>
                  <p className="mb-0">Upcoming</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default TaxDeadlines;