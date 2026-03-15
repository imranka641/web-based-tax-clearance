import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Form, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const ApplicationReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'staff') {
      window.location.href = '/login';
      return;
    }
    fetchApplicationDetails();
  }, [id]);

  const fetchApplicationDetails = async () => {
    try {
      const response = await api.get(`/staff/applications/${id}`);
      setApplication(response.data.application);
      setCompliance(response.data.compliance);
    } catch (err) {
      setError('Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  const checkCompliance = async () => {
    try {
      setActionLoading(true);
      const response = await api.get(`/staff/compliance/${application.tin}`);
      setCompliance(response.data);
    } catch (err) {
      setError('Failed to check compliance');
    } finally {
      setActionLoading(false);
    }
  };

  const updateApplicationStatus = async (status, reason = '') => {
    try {
      setActionLoading(true);
      await api.put(`/staff/applications/${id}`, {
        status,
        rejection_reason: reason
      });
      
      setSuccess(`Application ${status.toLowerCase()} successfully!`);
      setTimeout(() => {
        navigate('/staff-dashboard');
      }, 1500);
      
    } catch (err) {
      setError(`Failed to ${status.toLowerCase()} application`);
      setActionLoading(false);
    }
  };

  const handleApprove = () => {
    if (window.confirm('Are you sure you want to approve this TCC application?')) {
      updateApplicationStatus('Approved');
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    updateApplicationStatus('Rejected', rejectionReason);
    setShowRejectModal(false);
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

  if (!application) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">Application not found</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Review TCC Application</h2>
              <p className="text-muted">Application ID: #{application.id}</p>
            </div>
            <Button variant="outline-secondary" onClick={() => navigate('/staff-dashboard')}>
              ← Back to Dashboard
            </Button>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Row>
            <Col md={8}>
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-light">
                  <h5 className="mb-0">Applicant Information</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <strong>Full Name:</strong> {application.taxpayer_name}
                    </Col>
                    <Col md={6}>
                      <strong>TIN:</strong> {application.tin}
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col md={6}>
                      <strong>Email:</strong> {application.email}
                    </Col>
                    <Col md={6}>
                      <strong>Phone:</strong> {application.phone || 'N/A'}
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col md={6}>
                      <strong>Business Name:</strong> {application.business_name || 'N/A'}
                    </Col>
                    <Col md={6}>
                      <strong>Application Date:</strong> {new Date(application.submitted_at).toLocaleString()}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="shadow-sm">
                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Tax Compliance Check</h5>
                  {!compliance && (
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={checkCompliance}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Checking...' : 'Check Compliance'}
                    </Button>
                  )}
                </Card.Header>
                <Card.Body>
                  {compliance ? (
                    <div>
                      <Row>
                        <Col md={6}>
                          <strong>Tax Returns Filed:</strong>{' '}
                          <Badge bg={compliance.has_filed_returns ? 'success' : 'danger'}>
                            {compliance.has_filed_returns ? 'Yes' : 'No'}
                          </Badge>
                        </Col>
                        <Col md={6}>
                          <strong>Taxes Paid:</strong>{' '}
                          <Badge bg={compliance.has_paid_taxes ? 'success' : 'danger'}>
                            {compliance.has_paid_taxes ? 'Yes' : 'No'}
                          </Badge>
                        </Col>
                      </Row>
                      <Row className="mt-2">
                        <Col md={6}>
                          <strong>Outstanding Balance:</strong>{' '}
                          <Badge bg={compliance.outstanding_balance === 0 ? 'success' : 'danger'}>
                            ETB {compliance.outstanding_balance.toLocaleString()}
                          </Badge>
                        </Col>
                        <Col md={6}>
                          <strong>Overall Compliance:</strong>{' '}
                          <Badge bg={compliance.is_compliant ? 'success' : 'danger'}>
                            {compliance.is_compliant ? 'Compliant' : 'Non-Compliant'}
                          </Badge>
                        </Col>
                      </Row>
                      {!compliance.is_compliant && (
                        <Alert variant="warning" className="mt-3">
                          <strong>Compliance Issues Found:</strong>
                          <ul className="mb-0">
                            {!compliance.has_filed_returns && <li>Tax returns not filed</li>}
                            {!compliance.has_paid_taxes && <li>Taxes not paid</li>}
                            {compliance.outstanding_balance > 0 && <li>Outstanding balance: ETB {compliance.outstanding_balance.toLocaleString()}</li>}
                          </ul>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-muted">Compliance not checked yet</p>
                      <Button 
                        variant="primary"
                        onClick={checkCompliance}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Checking Compliance...
                          </>
                        ) : (
                          'Check Taxpayer Compliance'
                        )}
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="shadow-sm">
                <Card.Header className="bg-light">
                  <h5 className="mb-0">Application Actions</h5>
                </Card.Header>
                <Card.Body>
                  <div className="d-grid gap-2">
                    <Button 
                      variant="success" 
                      size="lg"
                      onClick={handleApprove}
                      disabled={!compliance || actionLoading || !compliance.is_compliant}
                    >
                      {actionLoading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Approving...
                        </>
                      ) : (
                        'Approve Application'
                      )}
                    </Button>

                    <Button 
                      variant="outline-danger" 
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                    >
                      Reject Application
                    </Button>
                  </div>

                  {compliance && !compliance.is_compliant && (
                    <Alert variant="warning" className="mt-3">
                      <small>
                        Cannot approve: Taxpayer is not compliant. Address compliance issues first.
                      </small>
                    </Alert>
                  )}

                  {!compliance && (
                    <Alert variant="info" className="mt-3">
                      <small>
                        Check taxpayer compliance before making a decision.
                      </small>
                    </Alert>
                  )}
                </Card.Body>
              </Card>

              <Card className="shadow-sm mt-4">
                <Card.Header className="bg-light">
                  <h5 className="mb-0">Application Status</h5>
                </Card.Header>
                <Card.Body>
                  <Badge 
                    bg={
                      application.status === 'Approved' ? 'success' :
                      application.status === 'Rejected' ? 'danger' :
                      application.status === 'Under Review' ? 'warning' : 'info'
                    }
                    className="fs-6"
                  >
                    {application.status}
                  </Badge>
                  
                  {application.reviewed_by_name && (
                    <div className="mt-2">
                      <small>
                        <strong>Reviewed by:</strong> {application.reviewed_by_name}<br />
                        <strong>Reviewed at:</strong> {application.reviewed_at ? new Date(application.reviewed_at).toLocaleString() : 'N/A'}
                      </small>
                    </div>
                  )}

                  {application.rejection_reason && (
                    <Alert variant="danger" className="mt-2 p-2">
                      <strong>Rejection Reason:</strong><br />
                      {application.rejection_reason}
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Rejection Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Application</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Reason for Rejection *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a clear reason for rejecting this application..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleReject}>
            Confirm Rejection
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ApplicationReview;