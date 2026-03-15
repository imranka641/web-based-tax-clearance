import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TaxPaymentDashboard = () => {
  const [user, setUser] = useState(null);
  const [taxTypes, setTaxTypes] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [taxPeriods, setTaxPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [typesRes, historyRes, periodsRes] = await Promise.all([
        api.get('/tax/tax-types'),
        api.get('/tax/payment-history'),
        api.get('/tax/upcoming-deadlines')
      ]);
      
      setTaxTypes(typesRes.data.tax_types);
      setPaymentHistory(historyRes.data.payments);
      setTaxPeriods(periodsRes.data.tax_periods);
    } catch (error) {
      setError('Failed to load tax data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  };

  const getReceiptVariant = (verified) => {
    return verified ? 'success' : 'warning';
  };

  const calculateTax = async (taxTypeId) => {
    try {
      const response = await api.post('/tax/calculate', {
        tax_type_id: taxTypeId,
        user_id: user.id
      });
      
      // Navigate to payment form with calculated amount
      window.location.href = `/tax/pay/${taxTypeId}?calculated_amount=${response.data.calculated_tax}`;
    } catch (error) {
      setError('Failed to calculate tax');
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Tax Payment Portal</h2>
              <p className="text-muted">
                Welcome, {user?.full_name} | TIN: {user?.tin}
              </p>
            </div>
            <Badge bg="primary" className="fs-6">
              ETB 🇪🇹
            </Badge>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Row className="mb-4">
            {/* Tax Calculation Cards */}
            <Col md={8}>
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Calculate & Pay Taxes</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    {taxTypes.map(taxType => (
                      <Col md={6} key={taxType.id} className="mb-3">
                        <Card className="h-100">
                          <Card.Body className="text-center">
                            <h6>{taxType.name}</h6>
                            <p className="text-muted small">{taxType.description}</p>
                            <div className="d-grid gap-2">
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => calculateTax(taxType.id)}
                              >
                                Calculate Tax
                              </Button>
                              <Button 
                                variant="primary" 
                                size="sm"
                                as={Link}
                                to={`/tax/pay/${taxType.id}`}
                              >
                                Pay Directly
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>

              {/* Payment History */}
              <Card className="shadow-sm">
                <Card.Header className="bg-success text-white">
                  <h5 className="mb-0">Payment History</h5>
                </Card.Header>
                <Card.Body>
                  {paymentHistory.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted">No payment history found.</p>
                    </div>
                  ) : (
                    <Table responsive striped>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Tax Type</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Receipt</th>
                          <th>AI Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map(payment => (
                          <tr key={payment.id}>
                            <td>{new Date(payment.payment_date || payment.created_at).toLocaleDateString()}</td>
                            <td>{payment.tax_type_name}</td>
                            <td>ETB {payment.paid_amount?.toLocaleString() || payment.declared_amount?.toLocaleString()}</td>
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Sidebar */}
            <Col md={4}>
              {/* Upcoming Deadlines */}
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-warning text-dark">
                  <h6 className="mb-0">📅 Upcoming Deadlines</h6>
                </Card.Header>
                <Card.Body>
                  {taxPeriods.length === 0 ? (
                    <p className="text-muted small">No upcoming deadlines</p>
                  ) : (
                    taxPeriods.map(period => (
                      <div key={period.id} className="border-bottom pb-2 mb-2">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <strong className="small">{period.tax_type_name}</strong>
                            <br />
                            <small className="text-muted">{period.period_name}</small>
                          </div>
                          <Badge 
                            bg={new Date(period.due_date) > new Date() ? 'warning' : 'danger'}
                            className="ms-2"
                          >
                            {new Date(period.due_date).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                  <Button variant="outline-warning" size="sm" className="w-100 mt-2" as={Link} to="/tax/deadlines">
                    View All Deadlines
                  </Button>
                </Card.Body>
              </Card>

              {/* Quick Actions */}
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-info text-white">
                  <h6 className="mb-0">Quick Actions</h6>
                </Card.Header>
                <Card.Body>
                  <div className="d-grid gap-2">
                    <Button variant="outline-primary" as={Link} to="/tax/calculator">
                      🧮 Tax Calculator
                    </Button>
                    <Button variant="outline-success" as={Link} to="/tax/history">
                      📋 Payment History
                    </Button>
                    <Button variant="outline-info" as={Link} to="/tax/deadlines">
                      📅 View Deadlines
                    </Button>
                  </div>
                </Card.Body>
              </Card>

              {/* Tax Profile */}
              <Card className="shadow-sm">
                <Card.Header className="bg-secondary text-white">
                  <h6 className="mb-0">Your Tax Profile</h6>
                </Card.Header>
                <Card.Body>
                  <div className="small">
                    <p><strong>Last Year Tax:</strong><br />
                    {user?.last_year_tax_amount ? 
                      `ETB ${user.last_year_tax_amount.toLocaleString()}` : 
                      <Button variant="link" size="sm" as={Link} to="/tax/profile">
                        Set Last Year Tax
                      </Button>
                    }</p>
                    <p><strong>Business:</strong><br />{user?.business_name || 'N/A'}</p>
                    <p><strong>Compliance:</strong><br />
                      <Badge bg="success">Good Standing</Badge>
                    </p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default TaxPaymentDashboard;