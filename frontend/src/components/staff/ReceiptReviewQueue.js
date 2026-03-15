import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const ReceiptReviewQueue = () => {
  const [reviewQueue, setReviewQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'staff') {
      window.location.href = '/login';
      return;
    }
    fetchReviewQueue();
  }, []);

  const fetchReviewQueue = async () => {
    try {
      const response = await api.get('/staff/receipt-review-queue');
      setReviewQueue(response.data.review_queue);
    } catch (error) {
      setError('Failed to load receipt review queue');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'under_review': return 'warning';
      case 'failed': return 'danger';
      default: return 'secondary';
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
              <h2>Receipt Review Queue</h2>
              <p className="text-muted">Review and verify uploaded payment receipts</p>
            </div>
            <Badge bg="primary" className="fs-6">
              {reviewQueue.length} Pending Reviews
            </Badge>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Card className="shadow-sm">
            <Card.Header className="bg-warning text-dark">
              <h5 className="mb-0">📋 Receipts Pending Review</h5>
            </Card.Header>
            <Card.Body>
              {reviewQueue.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No receipts pending review. Great job! 🎉</p>
                </div>
              ) : (
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Taxpayer</th>
                      <th>TIN</th>
                      <th>Tax Type</th>
                      <th>Amount</th>
                      <th>Payment Method</th>
                      <th>Account Number</th>
                      <th>Uploaded</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewQueue.map(payment => (
                      <tr key={payment.id}>
                        <td>
                          <div>
                            <strong>{payment.taxpayer_name}</strong>
                            <br />
                            <small className="text-muted">{payment.taxpayer_email}</small>
                          </div>
                        </td>
                        <td>{payment.taxpayer_tin}</td>
                        <td>{payment.tax_type_name}</td>
                        <td>
                          <strong>ETB {payment.declared_amount?.toLocaleString()}</strong>
                        </td>
                        <td>{payment.payment_method_name}</td>
                        <td>
                          <small>{payment.account_number}</small>
                        </td>
                        <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                        <td>
                          <Badge bg={getStatusVariant(payment.payment_status)}>
                            {payment.payment_status === 'under_review' ? 'Under Review' : payment.payment_status}
                          </Badge>
                        </td>
                        <td>
                          <Link 
                            to={`/staff/receipt-review/${payment.id}`}
                            className="btn btn-primary btn-sm"
                          >
                            Review Receipt
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {/* Quick Stats */}
          <Row className="mt-4">
            <Col md={4}>
              <Card className="border-warning">
                <Card.Body className="text-center">
                  <h4 className="text-warning">{reviewQueue.length}</h4>
                  <p className="mb-0">Pending Review</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-info">
                <Card.Body className="text-center">
                  <h4 className="text-info">
                    {reviewQueue.filter(p => p.payment_method_name).length}
                  </h4>
                  <p className="mb-0">With Payment Method</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-success">
                <Card.Body className="text-center">
                  <h4 className="text-success">
                    {reviewQueue.filter(p => p.account_number).length}
                  </h4>
                  <p className="mb-0">With Account Numbers</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default ReceiptReviewQueue;