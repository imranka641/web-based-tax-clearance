import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TCCReviewPage = () => {
    const [user, setUser] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [decision, setDecision] = useState({
        status: 'approved',
        reason: '',
        notes: ''
    });

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'town_admin') {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const response = await api.get('/town-admin/tcc-applications');
            setApplications(response.data.applications || []);
        } catch (error) {
            console.error('Error fetching TCC applications:', error);
            setError('Failed to load TCC applications');
        } finally {
            setLoading(false);
        }
    };

    const handleReview = (application) => {
        setSelectedApplication(application);
        setShowReviewModal(true);
        setDecision({ status: 'approved', reason: '', notes: '' });
    };

    const handleApprove = async () => {
        setProcessing(true);
        try {
            await api.post(`/town-admin/tcc-applications/${selectedApplication.id}/approve`, {
                notes: decision.notes
            });
            
            setShowReviewModal(false);
            fetchApplications();
            alert('✅ TCC Application Approved Successfully!');
        } catch (error) {
            console.error('Error approving application:', error);
            setError('Failed to approve application');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!decision.reason) {
            alert('Please provide a rejection reason');
            return;
        }

        setProcessing(true);
        try {
            await api.post(`/town-admin/tcc-applications/${selectedApplication.id}/reject`, {
                reason: decision.reason
            });
            
            setShowReviewModal(false);
            fetchApplications();
            alert('❌ TCC Application Rejected');
        } catch (error) {
            console.error('Error rejecting application:', error);
            setError('Failed to reject application');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            'pending': 'warning',
            'approved': 'success',
            'rejected': 'danger'
        };
        return colors[status] || 'secondary';
    };

    const navigate = useNavigate();

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" />
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4">
            <Row>
                <Col>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2>📋 TCC Applications Review</h2>
                            <p className="text-muted">Review and approve/reject TCC applications from taxpayers</p>
                        </div>
                        <Badge bg="primary" className="fs-6">
                            {applications.filter(a => a.status === 'pending').length} Pending
                        </Badge>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Card className="shadow-sm">
                        <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0">TCC Applications</h5>
                        </Card.Header>
                        <Card.Body>
                            {applications.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                                    <h5>No TCC Applications Found</h5>
                                    <p className="text-muted">All applications have been processed.</p>
                                </div>
                            ) : (
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>App #</th>
                                            <th>Taxpayer</th>
                                            <th>Business</th>
                                            <th>TIN</th>
                                            <th>Purpose</th>
                                            <th>Submitted</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {applications.map(app => (
                                            <tr key={app.id}>
                                                <td>{app.application_number}</td>
                                                <td>{app.taxpayer_name}</td>
                                                <td>{app.business_name}</td>
                                                <td>{app.tin}</td>
                                                <td>{app.purpose?.replace(/_/g, ' ')}</td>
                                                <td>{new Date(app.submitted_at).toLocaleDateString()}</td>
                                                <td>
                                                    <Badge bg={getStatusBadge(app.status)}>
                                                        {app.status}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    {app.status === 'pending' && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="primary"
                                                            onClick={() => handleReview(app)}
                                                        >
                                                            Review
                                                        </Button>
                                                    )}
                                                    {app.status === 'approved' && (
                                                        <Button size="sm" variant="outline-success">
                                                            View Certificate
                                                        </Button>
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
            </Row>

            {/* Review Modal */}
            <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Review TCC Application</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedApplication && (
                        <>
                            <Row className="mb-4">
                                <Col md={6}>
                                    <Card className="bg-light">
                                        <Card.Body>
                                            <h6>Taxpayer Information</h6>
                                            <p><strong>Name:</strong> {selectedApplication.taxpayer_name}</p>
                                            <p><strong>Business:</strong> {selectedApplication.business_name}</p>
                                            <p><strong>TIN:</strong> {selectedApplication.tin}</p>
                                            <p><strong>Category:</strong> <Badge bg="info">{selectedApplication.category_code || 'N/A'}</Badge></p>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="bg-light">
                                        <Card.Body>
                                            <h6>Application Details</h6>
                                            <p><strong>Purpose:</strong> {selectedApplication.purpose?.replace(/_/g, ' ')}</p>
                                            <p><strong>Applied on:</strong> {new Date(selectedApplication.submitted_at).toLocaleString()}</p>
                                            <p><strong>Total Paid (12mo):</strong> ETB {selectedApplication.total_paid?.toLocaleString() || 0}</p>
                                            <p><strong>Payment Count:</strong> {selectedApplication.payment_count || 0}</p>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {selectedApplication.notes && (
                                <Card className="mb-4">
                                    <Card.Header>Applicant Notes</Card.Header>
                                    <Card.Body>
                                        <p>{selectedApplication.notes}</p>
                                    </Card.Body>
                                </Card>
                            )}

                            <Card className="mb-4">
                                <Card.Header>Payment History (Last 10)</Card.Header>
                                <Card.Body>
                                    {selectedApplication.payment_history?.length > 0 ? (
                                        <Table size="sm">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedApplication.payment_history.map((payment, idx) => (
                                                    <tr key={idx}>
                                                        <td>{new Date(payment.date).toLocaleDateString()}</td>
                                                        <td>ETB {payment.amount?.toLocaleString()}</td>
                                                        <td><Badge bg="success">Paid</Badge></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    ) : (
                                        <p className="text-muted">No payment history available</p>
                                    )}
                                </Card.Body>
                            </Card>

                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Decision</Form.Label>
                                    <div>
                                        <Form.Check
                                            inline
                                            type="radio"
                                            label="✅ Approve"
                                            name="decision"
                                            checked={decision.status === 'approved'}
                                            onChange={() => setDecision({...decision, status: 'approved'})}
                                        />
                                        <Form.Check
                                            inline
                                            type="radio"
                                            label="❌ Reject"
                                            name="decision"
                                            checked={decision.status === 'rejected'}
                                            onChange={() => setDecision({...decision, status: 'rejected'})}
                                        />
                                    </div>
                                </Form.Group>

                                {decision.status === 'rejected' && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Rejection Reason *</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            value={decision.reason}
                                            onChange={(e) => setDecision({...decision, reason: e.target.value})}
                                            placeholder="Please provide reason for rejection..."
                                            required
                                        />
                                    </Form.Group>
                                )}

                                <Form.Group className="mb-3">
                                    <Form.Label>Notes (Optional)</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        value={decision.notes}
                                        onChange={(e) => setDecision({...decision, notes: e.target.value})}
                                        placeholder="Additional notes..."
                                    />
                                </Form.Group>
                            </Form>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
                        Cancel
                    </Button>
                    {decision.status === 'approved' ? (
                        <Button 
                            variant="success" 
                            onClick={handleApprove}
                            disabled={processing}
                        >
                            {processing ? 'Processing...' : 'Confirm Approval'}
                        </Button>
                    ) : (
                        <Button 
                            variant="danger" 
                            onClick={handleReject}
                            disabled={processing || !decision.reason}
                        >
                            {processing ? 'Processing...' : 'Confirm Rejection'}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default TCCReviewPage;