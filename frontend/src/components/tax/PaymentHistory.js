import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const response = await api.get('/tax/payment-history');
      setPayments(response.data.payments);
    } catch (error) {
      setError('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'under_review': return 'info';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  };

  const getReceiptVariant = (verified) => {
    return verified ? 'success' : 'warning';
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
              <h2>Payment History</h2>
              <p className="text-muted">Your tax payment records</p>
            </div>
            <Button variant="outline-primary" onClick={fetchPaymentHistory}>
              Refresh
            </Button>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Card className="shadow-sm">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">📋 Payment History</h5>
            </Card.Header>
            <Card.Body>
              {payments.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No payment history found.</p>
                  <Button variant="primary" href="/tax/dashboard">
                    Make Your First Payment
                  </Button>
                </div>
              ) : (
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Tax Type</th>
                      <th>Amount</th>
                      <th>Payment Method</th>
                      <th>Status</th>
                      <th>Receipt</th>
                      <th>AI Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id}>
                        <td>{new Date(payment.payment_date || payment.created_at).toLocaleDateString()}</td>
                        <td>
                          <strong>{payment.tax_type_name}</strong>
                        </td>
                        <td>
                          <strong>ETB {payment.paid_amount?.toLocaleString() || payment.declared_amount?.toLocaleString()}</strong>
                        </td>
                        <td>{payment.payment_method_name}</td>
                        <td>
                          <Badge bg={getStatusVariant(payment.payment_status)}>
                            {payment.payment_status}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={getReceiptVariant(payment.receipt_verified)}>
                            {payment.receipt_verified ? 'Verified' : 'Pending'}
                          </Badge>
                        </td>
                        <td>
                          {payment.auto_approved && (
                            <Badge bg="success">AI Approved</Badge>
                          )}
                          {payment.ai_verification_status === 'rejected' && (
                            <Badge bg="danger">AI Rejected</Badge>
                          )}
                          {!payment.auto_approved && payment.ai_verification_status === 'approved' && (
                            <Badge bg="info">AI Verified</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {/* Payment Summary */}
          <Row className="mt-4">
            <Col md={3}>
              <Card className="border-success">
                <Card.Body className="text-center">
                  <h4 className="text-success">
                    ETB {payments.filter(p => p.payment_status === 'completed').reduce((sum, p) => sum + parseFloat(p.paid_amount || p.declared_amount || 0), 0).toLocaleString()}
                  </h4>
                  <p className="mb-0">Total Paid</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-primary">
                <Card.Body className="text-center">
                  <h4 className="text-primary">
                    {payments.filter(p => p.payment_status === 'completed').length}
                  </h4>
                  <p className="mb-0">Completed</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-warning">
                <Card.Body className="text-center">
                  <h4 className="text-warning">
                    {payments.filter(p => p.payment_status === 'processing' || p.payment_status === 'under_review').length}
                  </h4>
                  <p className="mb-0">In Progress</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-info">
                <Card.Body className="text-center">
                  <h4 className="text-info">
                    {payments.filter(p => p.auto_approved).length}
                  </h4>
                  <p className="mb-0">AI Approved</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default PaymentHistory;