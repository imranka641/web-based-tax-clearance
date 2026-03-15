import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge, Table } from 'react-bootstrap';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TaxProfile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    last_year_tax_amount: ''
  });

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      console.log('Fetching tax profile...');
      const response = await api.get('/tax/profile');
      console.log('Profile response:', response.data);
      setProfile(response.data);
      setFormData({
        last_year_tax_amount: response.data.user?.last_year_tax_amount || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateLastYearTax = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put('/tax/update-last-year-tax', {
        last_year_tax_amount: formData.last_year_tax_amount
      });
      
      setSuccess('Last year tax amount updated successfully');
      fetchProfile(); // Refresh profile data
    } catch (error) {
      setError('Failed to update last year tax amount: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const getComplianceStatus = () => {
    if (!profile?.compliance) return 'unknown';
    
    const comp = profile.compliance;
    if (comp.has_filed_returns && comp.has_paid_taxes && comp.outstanding_balance === 0) {
      return 'good';
    } else if (!comp.has_paid_taxes || comp.outstanding_balance > 0) {
      return 'warning';
    } else {
      return 'unknown';
    }
  };

  const getComplianceVariant = () => {
    const status = getComplianceStatus();
    switch (status) {
      case 'good': return 'success';
      case 'warning': return 'warning';
      default: return 'secondary';
    }
  };

  const getComplianceText = () => {
    const status = getComplianceStatus();
    switch (status) {
      case 'good': return 'Good Standing';
      case 'warning': return 'Needs Attention';
      default: return 'Status Unknown';
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading your tax profile...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Tax Profile</h2>
              <p className="text-muted">Manage your tax information and preferences</p>
            </div>
            {user?.tin && (
              <Badge bg="primary">TIN: {user.tin}</Badge>
            )}
          </div>

          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {!profile ? (
            <Alert variant="warning">
              <h4>No Profile Data Available</h4>
              <p>We couldn't load your tax profile information. This might be because:</p>
              <ul>
                <li>Your account is not fully set up</li>
                <li>There's a temporary server issue</li>
                <li>You need to complete your registration</li>
              </ul>
              <Button variant="primary" onClick={fetchProfile}>
                Try Again
              </Button>
            </Alert>
          ) : (
            <Row>
              {/* Personal Information */}
              <Col md={6}>
                <Card className="shadow-sm mb-4">
                  <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">Personal Information</h5>
                  </Card.Header>
                  <Card.Body>
                    <Table borderless>
                      <tbody>
                        <tr>
                          <td><strong>Full Name:</strong></td>
                          <td>{profile.user?.full_name || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>TIN:</strong></td>
                          <td>{profile.user?.tin || 'Not provided'}</td>
                        </tr>
                        <tr>
                          <td><strong>Email:</strong></td>
                          <td>{profile.user?.email || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Phone:</strong></td>
                          <td>{profile.user?.phone || 'Not provided'}</td>
                        </tr>
                        <tr>
                          <td><strong>Business:</strong></td>
                          <td>{profile.user?.business_name || 'Not provided'}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>

                {/* Last Year Tax Amount */}
                <Card className="shadow-sm">
                  <Card.Header className="bg-success text-white">
                    <h5 className="mb-0">Last Year Tax Information</h5>
                  </Card.Header>
                  <Card.Body>
                    <Form onSubmit={updateLastYearTax}>
                      <Form.Group className="mb-3">
                        <Form.Label>Last Year Tax Amount (ETB)</Form.Label>
                        <Form.Control
                          type="number"
                          name="last_year_tax_amount"
                          value={formData.last_year_tax_amount}
                          onChange={handleInputChange}
                          placeholder="Enter your last year tax amount"
                          step="0.01"
                        />
                        <Form.Text className="text-muted">
                          This helps calculate your current year tax accurately (optional)
                        </Form.Text>
                      </Form.Group>

                      <div className="d-grid">
                        <Button 
                          variant="success" 
                          type="submit"
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Saving...
                            </>
                          ) : (
                            'Update Tax Information'
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>

              {/* Payment Statistics */}
              <Col md={6}>
                <Card className="shadow-sm mb-4">
                  <Card.Header className="bg-info text-white">
                    <h5 className="mb-0">Payment Statistics</h5>
                  </Card.Header>
                  <Card.Body>
                    {profile.payment_stats ? (
                      <>
                        <div className="text-center">
                          <h3 className="text-primary">
                            ETB {profile.payment_stats.total_paid?.toLocaleString() || '0'}
                          </h3>
                          <p className="text-muted">Total Tax Paid</p>
                        </div>
                        
                        <Table borderless size="sm">
                          <tbody>
                            <tr>
                              <td>Total Payments:</td>
                              <td>
                                <Badge bg="primary">
                                  {profile.payment_stats.total_payments || 0}
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <td>Completed Payments:</td>
                              <td>
                                <Badge bg="success">
                                  {profile.payment_stats.completed_payments || 0}
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <td>Pending Review:</td>
                              <td>
                                <Badge bg="warning">
                                  {profile.payment_stats.pending_review || 0}
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <td>Failed Payments:</td>
                              <td>
                                <Badge bg="danger">
                                  {profile.payment_stats.failed_payments || 0}
                                </Badge>
                              </td>
                            </tr>
                          </tbody>
                        </Table>
                      </>
                    ) : (
                      <p className="text-muted">No payment statistics available</p>
                    )}
                  </Card.Body>
                </Card>

                {/* Compliance Status */}
                <Card className="shadow-sm">
                  <Card.Header className="bg-warning text-dark">
                    <h5 className="mb-0">Compliance Status</h5>
                  </Card.Header>
                  <Card.Body>
                    <div className="text-center mb-3">
                      <Badge bg={getComplianceVariant()} className="fs-6">
                        {getComplianceText()}
                      </Badge>
                    </div>
                    
                    {profile.compliance ? (
                      <div className="small">
                        <p><strong>Tax Returns Filed:</strong> {profile.compliance.has_filed_returns ? 'Yes' : 'No'}</p>
                        <p><strong>Taxes Paid:</strong> {profile.compliance.has_paid_taxes ? 'Yes' : 'No'}</p>
                        <p><strong>Outstanding Balance:</strong> ETB {profile.compliance.outstanding_balance?.toLocaleString() || '0'}</p>
                        <p><strong>Last Updated:</strong> {profile.compliance.last_updated ? new Date(profile.compliance.last_updated).toLocaleDateString() : 'Never'}</p>
                      </div>
                    ) : (
                      <p className="text-muted">No compliance information available</p>
                    )}

                    <Alert variant="info" className="mt-3">
                      <small>
                        <strong>Tip:</strong> Keeping your tax information updated helps ensure accurate calculations and faster processing.
                      </small>
                    </Alert>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default TaxProfile;