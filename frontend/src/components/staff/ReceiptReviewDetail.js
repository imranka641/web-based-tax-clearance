import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Form, Modal, Image } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const ReceiptReviewDetail = () => {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'staff') {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    fetchPaymentDetails();
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      const response = await api.get(`/staff/receipt-review/${paymentId}`);
      setPayment(response.data.payment);
    } catch (error) {
      setError('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    setError('');

    try {
      const response = await api.post(`/staff/receipt-review/${paymentId}/approve`, {
        staff_notes: 'Receipt verified and payment approved by staff'
      });

      if (response.data.success) {
        alert('✅ Payment approved successfully!');
        navigate('/staff/receipt-review');
      } else {
        setError(response.data.error || 'Approval failed');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Approval failed');
    } finally {
      setProcessing(false);
      setShowApproveModal(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const response = await api.post(`/staff/receipt-review/${paymentId}/reject`, {
        staff_notes: rejectReason
      });

      if (response.data.success) {
        alert('❌ Payment rejected successfully!');
        navigate('/staff/receipt-review');
      } else {
        setError(response.data.error || 'Rejection failed');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Rejection failed');
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toLowerCase();
  };

  const isImageFile = (filename) => {
    const ext = getFileExtension(filename);
    return ['jpg', 'jpeg', 'png', 'gif'].includes(ext);
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

  if (!payment) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">Payment not found</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Review Payment Receipt</h2>
              <p className="text-muted">Payment ID: #{payment.id}</p>
            </div>
            <Button variant="outline-secondary" onClick={() => navigate('/staff/receipt-review')}>
              ← Back to Queue
            </Button>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Row>
            {/* Payment Information */}
            <Col md={6}>
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-light">
                  <h5 className="mb-0">Payment Information</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <p><strong>Taxpayer Name:</strong><br />{payment.taxpayer_name}</p>
                      <p><strong>TIN:</strong><br />{payment.taxpayer_tin}</p>
                      <p><strong>Email:</strong><br />{payment.taxpayer_email}</p>
                    </Col>
                    <Col md={6}>
                      <p><strong>Tax Type:</strong><br />{payment.tax_type_name}</p>
                      <p><strong>Amount:</strong><br />
                        <Badge bg="primary" className="fs-6">
                          ETB {payment.declared_amount?.toLocaleString()}
                        </Badge>
                      </p>
                      <p><strong>Payment Method:</strong><br />{payment.payment_method_name}</p>
                    </Col>
                  </Row>
                  
                  <hr />
                  
                  <Row>
                    <Col md={6}>
                      <p><strong>Account Number:</strong><br />{payment.account_number}</p>
                      <p><strong>Uploaded:</strong><br />
                        {new Date(payment.created_at).toLocaleString()}
                      </p>
                    </Col>
                    <Col md={6}>
                      <p><strong>AI Verification:</strong><br />
                        <Badge bg={payment.auto_approved ? 'success' : payment.ai_verification_status === 'approved' ? 'info' : 'warning'}>
                          {payment.auto_approved ? 'Auto Approved' : 
                           payment.ai_verification_status === 'approved' ? 'AI Verified' : 
                           payment.ai_verification_status === 'rejected' ? 'AI Rejected' : 'Pending'}
                        </Badge>
                      </p>
                      <p><strong>Receipt Verified:</strong><br />
                        <Badge bg={payment.receipt_verified ? 'success' : 'warning'}>
                          {payment.receipt_verified ? 'Yes' : 'No'}
                        </Badge>
                      </p>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* AI Verification Details */}
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-info text-white">
                  <h5 className="mb-0">AI Verification Details</h5>
                </Card.Header>
                <Card.Body>
                  <p><strong>Receipt Verification Result:</strong><br />
                    {payment.receipt_verification_result || 'Not available'}
                  </p>
                  <p><strong>AI Confidence:</strong><br />
                    {payment.receipt_verified ? 'High' : 'Needs Review'}
                  </p>
                  {payment.staff_decision && (
                    <Alert variant={payment.staff_decision === 'approved' ? 'success' : 'danger'}>
                      <strong>Staff Decision:</strong> {payment.staff_decision.toUpperCase()}
                      {payment.staff_notes && (
                        <div className="mt-2">
                          <strong>Notes:</strong> {payment.staff_notes}
                        </div>
                      )}
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Receipt Preview */}
            <Col md={6}>
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-warning text-dark">
                  <h5 className="mb-0">📄 Payment Receipt</h5>
                </Card.Header>
                <Card.Body className="text-center">
                  {payment.receipt_file_path ? (
                    isImageFile(payment.receipt_file_path) ? (
                      <div>
                        <Image 
                          src={`http://localhost:5000/${payment.receipt_file_path}`} 
                          alt="Payment Receipt" 
                          fluid 
                          style={{ maxHeight: '400px', border: '1px solid #ddd', borderRadius: '5px' }}
                        />
                        <div className="mt-3">
                          <Button 
                            variant="outline-primary" 
                            href={`http://localhost:5000/${payment.receipt_file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open Full Size
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="p-4 border rounded bg-light">
                          <i className="fas fa-file-pdf fa-3x text-danger mb-3"></i>
                          <p>PDF Receipt Document</p>
                          <Button 
                            variant="outline-danger" 
                            href={`http://localhost:5000/${payment.receipt_file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    )
                  ) : (
                    <Alert variant="warning">
                      No receipt file available for this payment.
                    </Alert>
                  )}
                </Card.Body>
              </Card>

              {/* Review Actions */}
              <Card className="shadow-sm">
                <Card.Header className="bg-light">
                  <h5 className="mb-0">Review Actions</h5>
                </Card.Header>
                <Card.Body>
                  <div className="d-grid gap-2">
                    <Button 
                      variant="success" 
                      size="lg"
                      onClick={() => setShowApproveModal(true)}
                      disabled={processing || payment.staff_decision === 'approved'}
                    >
                      ✅ Approve Payment
                    </Button>

                    <Button 
                      variant="danger" 
                      size="lg"
                      onClick={() => setShowRejectModal(true)}
                      disabled={processing || payment.staff_decision === 'rejected'}
                    >
                      ❌ Reject Payment
                    </Button>

                    <Button 
                      variant="outline-secondary"
                      onClick={() => navigate('/staff/receipt-review')}
                      disabled={processing}
                    >
                      Skip for Now
                    </Button>
                  </div>

                  {payment.staff_decision && (
                    <Alert 
                      variant={payment.staff_decision === 'approved' ? 'success' : 'danger'} 
                      className="mt-3"
                    >
                      <strong>Already {payment.staff_decision} by {payment.staff_reviewed_by_name}</strong>
                      <br />
                      <small>
                        On {new Date(payment.staff_reviewed_at).toLocaleString()}
                      </small>
                      {payment.staff_notes && (
                        <div className="mt-2">
                          <strong>Notes:</strong> {payment.staff_notes}
                        </div>
                      )}
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Approve Modal */}
      <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)}>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>Approve Payment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to approve this payment?</p>
          <p><strong>Taxpayer:</strong> {payment.taxpayer_name}</p>
          <p><strong>Amount:</strong> ETB {payment.declared_amount?.toLocaleString()}</p>
          <p><strong>Tax Type:</strong> {payment.tax_type_name}</p>
          <Alert variant="info">
            This will mark the payment as completed and update the taxpayer's compliance status.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleApprove} disabled={processing}>
            {processing ? (
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
              'Confirm Approval'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>Reject Payment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Reason for Rejection *</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a clear reason for rejecting this payment receipt..."
              required
            />
            <Form.Text className="text-muted">
              This reason will be visible to the taxpayer.
            </Form.Text>
          </Form.Group>
          <Alert variant="warning" className="mt-3">
            Rejected payments will require the taxpayer to submit a new payment with a valid receipt.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleReject} disabled={processing || !rejectReason.trim()}>
            {processing ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Rejecting...
              </>
            ) : (
              'Confirm Rejection'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ReceiptReviewDetail;