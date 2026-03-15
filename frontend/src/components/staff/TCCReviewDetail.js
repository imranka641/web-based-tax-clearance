import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Form, Modal, Table } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { useLanguage } from '../../contexts/LanguageContext';

const TCCReviewDetail = () => {
    const { applicationId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [application, setApplication] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const { t } = useLanguage();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser) {
            window.location.href = '/login';
            return;
        }
        setUser(currentUser);
        fetchApplicationDetails(currentUser);
    }, [applicationId]);

    const fetchApplicationDetails = async (currentUser) => {
        try {
            setLoading(true);
            setError('');
            
            // Determine endpoint based on user role
            let endpoint;
            if (currentUser?.role === 'town_admin') {
                endpoint = `/town-admin/tcc-review/${applicationId}`;
            } else if (currentUser?.role === 'regional_admin') {
                endpoint = `/regional-admin/tcc-review/${applicationId}`;
            } else if (currentUser?.is_super_admin) {
                endpoint = `/admin/tcc-review/${applicationId}`;
            } else {
                endpoint = `/staff/tcc-review/${applicationId}`;
            }
            
            console.log('Fetching from endpoint:', endpoint);
            const response = await api.get(endpoint);
            
            setApplication(response.data.application);
            setPaymentHistory(response.data.payment_history || []);
        } catch (error) {
            console.error('Error fetching application:', error);
            setError(error.response?.data?.error || 'Failed to load application details');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
    setProcessing(true);
    setError('');

    try {
        let endpoint;
        if (user?.role === 'town_admin') {
            endpoint = `/town-admin/tcc-review/${applicationId}/approve`;
        } else {
            endpoint = `/staff/tcc-review/${applicationId}/approve`;
        }

        console.log('Approving with endpoint:', endpoint);
        
        const response = await api.post(endpoint, {
            staff_notes: 'TCC application approved'
        });

        console.log('Approve response:', response.data);

        if (response.data.success) {
            alert('✅ TCC Application approved successfully! Certificate generated.');
            
            // Redirect based on role
            if (user?.role === 'town_admin') {
                navigate('/town/dashboard');
            } else {
                navigate('/staff-dashboard');
            }
        }
    } catch (error) {
        console.error('Approval error:', error);
        console.error('Error response:', error.response);
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
            let endpoint;
            if (user?.role === 'town_admin') {
                endpoint = `/town-admin/tcc-review/${applicationId}/reject`;
            } else if (user?.role === 'regional_admin') {
                endpoint = `/regional-admin/tcc-review/${applicationId}/reject`;
            } else if (user?.is_super_admin) {
                endpoint = `/admin/tcc-review/${applicationId}/reject`;
            } else {
                endpoint = `/staff/tcc-review/${applicationId}/reject`;
            }

            const response = await api.post(endpoint, {
                staff_notes: rejectReason
            });

            if (response.data.success) {
                alert('❌ TCC Application rejected');
                
                // Redirect based on role
                if (user?.role === 'town_admin') {
                    navigate('/town/dashboard');
                } else if (user?.role === 'regional_admin') {
                    navigate('/regional/dashboard');
                } else if (user?.is_super_admin) {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/staff-dashboard');
                }
            }
        } catch (error) {
            console.error('Rejection error:', error);
            setError(error.response?.data?.error || 'Rejection failed');
        } finally {
            setProcessing(false);
            setShowRejectModal(false);
            setRejectReason('');
        }
    };

    const getStatusVariant = (status) => {
        switch (status) {
            case 'completed': return 'success';
            case 'processing': return 'warning';
            case 'under_review': return 'info';
            case 'pending': return 'secondary';
            case 'failed': return 'danger';
            default: return 'secondary';
        }
    };

    const checkCompliance = () => {
        if (!application) return { status: 'unknown', variant: 'secondary', text: 'Unknown', canApprove: false };
        
        // Check if they have any payment (completed or under_review)
        const hasCompletedPayments = paymentHistory.some(p => p.payment_status === 'completed');
        const hasPendingPayments = paymentHistory.some(p => p.payment_status === 'under_review' || p.payment_status === 'processing');
        const hasNoOutstanding = application.outstanding_balance === 0;
        
        console.log('Compliance check:', {
            hasCompletedPayments,
            hasPendingPayments,
            hasNoOutstanding,
            paymentHistory
        });
        
        // If they have any payment (completed or pending) and no outstanding balance, they can be approved
        const canApprove = (hasCompletedPayments || hasPendingPayments) && hasNoOutstanding;
        
        if (hasCompletedPayments && hasNoOutstanding) {
            return { 
                status: 'compliant', 
                variant: 'success', 
                text: 'Fully Compliant',
                details: 'Has completed payments',
                canApprove: true 
            };
        } else if (hasPendingPayments && hasNoOutstanding) {
            return { 
                status: 'pending-compliant', 
                variant: 'info', 
                text: 'Pending Compliance',
                details: 'Has pending payments awaiting verification',
                canApprove: true 
            };
        } else if (hasCompletedPayments || hasPendingPayments) {
            return { 
                status: 'partial', 
                variant: 'warning', 
                text: 'Partial Compliance',
                details: 'Has payments but may have outstanding balance',
                canApprove: false 
            };
        } else {
            return { 
                status: 'non-compliant', 
                variant: 'danger', 
                text: 'Non-Compliant',
                details: 'No payment records found',
                canApprove: false 
            };
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

    if (!application) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">Application not found</Alert>
                <Button variant="secondary" onClick={() => navigate(-1)}>
                    Back
                </Button>
            </Container>
        );
    }

    const compliance = checkCompliance();

    return (
        <Container className="mt-4">
            <Row>
                <Col>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2>Review TCC Application</h2>
                            <p className="text-muted">Application ID: #{applicationId}</p>
                        </div>
                        <Button variant="outline-secondary" onClick={() => navigate(-1)}>
                            ← Back to Dashboard
                        </Button>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Row>
                        {/* Main Content */}
                        <Col md={8}>
                            {/* Taxpayer Information */}
                            <Card className="shadow-sm mb-4">
                                <Card.Header className="bg-primary text-white">
                                    <h5 className="mb-0">👤 Taxpayer Information</h5>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={6}>
                                            <p><strong>Full Name:</strong> {application.taxpayer_name}</p>
                                            <p><strong>TIN:</strong> {application.tin}</p>
                                            <p><strong>Email:</strong> {application.email}</p>
                                        </Col>
                                        <Col md={6}>
                                            <p><strong>Business Name:</strong> {application.business_name || 'N/A'}</p>
                                            <p><strong>Phone:</strong> {application.phone || 'N/A'}</p>
                                            <p><strong>Application Date:</strong> {new Date(application.submitted_at).toLocaleDateString()}</p>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            {/* Payment History */}
                            <Card className="shadow-sm mb-4">
                                <Card.Header className="bg-success text-white">
                                    <h5 className="mb-0">💰 Payment History</h5>
                                </Card.Header>
                                <Card.Body>
                                    {paymentHistory.length === 0 ? (
                                        <Alert variant="warning">
                                            No payment history found for this taxpayer.
                                        </Alert>
                                    ) : (
                                        <Table responsive striped hover>
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Tax Type</th>
                                                    <th>Amount</th>
                                                    <th>Status</th>
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
                                                                {payment.payment_status === 'under_review' ? 'Pending Verification' : payment.payment_status}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}
                                </Card.Body>
                            </Card>

                            {/* Tax Compliance Summary */}
                            <Card className="shadow-sm mb-4">
                                <Card.Header className="bg-info text-white">
                                    <h5 className="mb-0">📊 Tax Compliance Summary</h5>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={6}>
                                            <p><strong>Total Tax Paid (Last 12 months):</strong></p>
                                            <h3 className="text-success">
                                                ETB {application.total_tax_paid?.toLocaleString() || 0}
                                            </h3>
                                        </Col>
                                        <Col md={6}>
                                            <p><strong>Outstanding Balance:</strong></p>
                                            <h3 className={application.outstanding_balance > 0 ? 'text-danger' : 'text-success'}>
                                                ETB {application.outstanding_balance?.toLocaleString() || 0}
                                            </h3>
                                        </Col>
                                    </Row>
                                    <hr />
                                    <Row>
                                        <Col md={4}>
                                            <p><strong>Returns Filed:</strong></p>
                                            <Badge bg={application.has_filed_returns ? 'success' : 'danger'}>
                                                {application.has_filed_returns ? 'Yes' : 'No'}
                                            </Badge>
                                        </Col>
                                        <Col md={4}>
                                            <p><strong>Taxes Paid:</strong></p>
                                            <Badge bg={application.has_paid_taxes ? 'success' : 'warning'}>
                                                {application.has_paid_taxes ? 'Yes' : 'Pending'}
                                            </Badge>
                                        </Col>
                                        <Col md={4}>
                                            <p><strong>Overall Status:</strong></p>
                                            <Badge bg={compliance.variant}>
                                                {compliance.text}
                                            </Badge>
                                            {compliance.details && (
                                                <small className="d-block text-muted mt-1">
                                                    {compliance.details}
                                                </small>
                                            )}
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Sidebar */}
                        <Col md={4}>
                            {/* Decision Card */}
                            <Card className="shadow-sm mb-4">
                                <Card.Header className="bg-warning text-dark">
                                    <h5 className="mb-0">⚖️ Make Decision</h5>
                                </Card.Header>
                                <Card.Body>
                                    <div className="d-grid gap-2">
                                     <Button 
    variant="success" 
    size="lg"
    onClick={() => setShowApproveModal(true)}
    disabled={processing || application?.status !== 'Submitted'}
    className="mb-2"
>
    ✅ Approve Application
</Button>
                                        {!compliance.canApprove && (
                                            <Alert variant="warning" className="mt-2 small">
                                                <strong>Cannot approve:</strong> {compliance.details || 'Taxpayer is not compliant.'}
                                                <br />
                                                <small>They have pending payments that need verification first.</small>
                                            </Alert>
                                        )}
                                        {compliance.canApprove && compliance.status === 'pending-compliant' && (
                                            <Alert variant="info" className="mt-2 small">
                                                <strong>Note:</strong> Taxpayer has pending payments. You can still approve if you've verified the receipt.
                                            </Alert>
                                        )}
                                        <Button 
                                            variant="danger" 
                                            size="lg"
                                            onClick={() => setShowRejectModal(true)}
                                            disabled={processing}
                                        >
                                            ❌ Reject Application
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Application Status Card */}
                            <Card className="shadow-sm mb-4">
                                <Card.Header className="bg-secondary text-white">
                                    <h5 className="mb-0">📋 Application Status</h5>
                                </Card.Header>
                                <Card.Body>
                                    <p><strong>Current Status:</strong><br />
                                        <Badge bg="warning" className="fs-6">
                                            {application.status}
                                        </Badge>
                                    </p>
                                    <p><strong>Submitted:</strong><br />
                                        {new Date(application.submitted_at).toLocaleString()}
                                    </p>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>

            {/* Approve Modal */}
            <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)}>
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title>Approve TCC Application</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to approve this TCC application?</p>
                    <p><strong>Taxpayer:</strong> {application.taxpayer_name}</p>
                    <p><strong>TIN:</strong> {application.tin}</p>
                    {compliance.status === 'pending-compliant' && (
                        <Alert variant="info">
                            <strong>Note:</strong> This taxpayer has pending payments. Make sure you have verified their receipts before approving.
                        </Alert>
                    )}
                    <Alert variant="info">
                        This will generate a digital TCC certificate and update the taxpayer's compliance status.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleApprove} disabled={processing}>
                        {processing ? (
                            <>
                                <Spinner size="sm" className="me-2" />
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
                    <Modal.Title>Reject TCC Application</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Reason for Rejection *</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={4}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Please provide a clear reason for rejection..."
                            required
                        />
                        <Form.Text className="text-muted">
                            This reason will be visible to the taxpayer.
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleReject} disabled={processing || !rejectReason.trim()}>
                        {processing ? (
                            <>
                                <Spinner size="sm" className="me-2" />
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

export default TCCReviewDetail;