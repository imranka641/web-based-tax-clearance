import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { useLanguage } from '../../contexts/LanguageContext';

const TCCApplicationPage = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [eligibility, setEligibility] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        purpose: 'business_license_renewal',
        notes: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'taxpayer') {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchEligibilityData();
    }, [navigate]);

    const fetchEligibilityData = async () => {
        try {
            // Fetch all data in parallel
            const [profileRes, historyRes, eligibilityRes] = await Promise.all([
                api.get('/taxpayer/my-profile').catch(err => ({ data: { profile: null } })),
                api.get('/taxpayer/payment-history').catch(err => ({ data: { payments: [] } })),
                api.get('/tcc/tcc-eligibility').catch(err => ({ data: { 
                    eligible: false, 
                    reasons: ['Could not check eligibility'],
                    total_paid: 0,
                    outstanding: 0 
                } }))
            ]);

            setProfile(profileRes.data.profile);
            setPaymentHistory(historyRes.data.payments || []);
            setEligibility(eligibilityRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load TCC eligibility data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const response = await api.post('/tcc/apply', {
                purpose: formData.purpose,
                notes: formData.notes
            });

            if (response.data.success) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/dashboard');
                }, 3000);
            }
        } catch (error) {
            console.error('TCC application error:', error);
            setError(error.response?.data?.error || 'Application failed');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount) => {
        return parseFloat(amount || 0).toLocaleString();
    };

    const getStatusBadge = (status) => {
        const colors = {
            'completed': 'success',
            'pending': 'warning',
            'processing': 'info',
            'failed': 'danger'
        };
        return colors[status] || 'secondary';
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" />
                <p className="mt-3">Checking TCC eligibility...</p>
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <Row className="justify-content-center">
                <Col md={10}>
                    <Card className="shadow-lg">
                        <Card.Header className="bg-primary text-white">
                            <h3 className="mb-0">📋 Apply for Tax Clearance Certificate</h3>
                            <small>Get your official TCC after verification</small>
                        </Card.Header>

                        <Card.Body className="p-4">
                            {error && <Alert variant="danger">{error}</Alert>}
                            
                            {success ? (
                                <Alert variant="success" className="text-center p-4">
                                    <h4>✅ Application Submitted Successfully!</h4>
                                    <p>Your TCC application has been sent to the town admin for review.</p>
                                    <p>You will be notified once it's approved.</p>
                                    <Spinner animation="border" size="sm" className="mt-3" />
                                    <p className="mt-2">Redirecting to dashboard...</p>
                                </Alert>
                            ) : (
                                <>
                                    {/* Eligibility Status */}
                                    <Card className={`mb-4 ${eligibility?.eligible ? 'border-success' : 'border-warning'}`}>
                                        <Card.Header className={eligibility?.eligible ? 'bg-success text-white' : 'bg-warning'}>
                                            <h5 className="mb-0">
                                                {eligibility?.eligible ? '✅ You are eligible for TCC' : '⚠️ Eligibility Check'}
                                            </h5>
                                        </Card.Header>
                                        <Card.Body>
                                            {eligibility?.eligible ? (
                                                <p>Based on your payment history and compliance status, you can apply for TCC.</p>
                                            ) : (
                                                <>
                                                    <p>You are currently not eligible for TCC. Please address the following:</p>
                                                    <ul>
                                                        {(eligibility?.reasons || ['Unable to verify eligibility']).map((reason, index) => (
                                                            <li key={index} className="text-danger">{reason}</li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                        </Card.Body>
                                    </Card>

                                    {/* Taxpayer Information */}
                                    <Row className="mb-4">
                                        <Col md={6}>
                                            <Card className="bg-light">
                                                <Card.Body>
                                                    <h6>Business Information</h6>
                                                    <p><strong>Business:</strong> {user?.business_name || 'Self Employed'}</p>
                                                    <p><strong>Owner:</strong> {user?.full_name}</p>
                                                    <p><strong>TIN:</strong> {user?.tin}</p>
                                                    <p><strong>Category:</strong> <Badge bg="info">{profile?.category_code || 'B'}</Badge></p>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={6}>
                                            <Card className="bg-light">
                                                <Card.Body>
                                                    <h6>Compliance Summary</h6>
                                                    <p><strong>Total Paid (12 months):</strong> ETB {formatCurrency(eligibility?.total_paid)}</p>
                                                    <p><strong>Outstanding:</strong> ETB {formatCurrency(eligibility?.outstanding)}</p>
                                                    <p><strong>Payment Status:</strong> 
                                                        <Badge bg={eligibility?.outstanding === 0 ? 'success' : 'warning'} className="ms-2">
                                                            {eligibility?.outstanding === 0 ? 'Good Standing' : 'Has Outstanding'}
                                                        </Badge>
                                                    </p>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>

                                    {/* Recent Payment History */}
                                    <Card className="mb-4">
                                        <Card.Header>
                                            <h5 className="mb-0">Recent Payment History (Last 12 Months)</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            {paymentHistory.length === 0 ? (
                                                <p className="text-muted text-center">No payment history found</p>
                                            ) : (
                                                <Table responsive striped size="sm">
                                                    <thead>
                                                        <tr>
                                                            <th>Date</th>
                                                            <th>Tax Type</th>
                                                            <th>Amount</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {paymentHistory.slice(0, 5).map(payment => (
                                                            <tr key={payment.id}>
                                                                <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                                                                <td>{payment.tax_type_name || 'Income Tax'}</td>
                                                                <td>ETB {formatCurrency(payment.amount)}</td>
                                                                <td>
                                                                    <Badge bg={getStatusBadge(payment.status)}>
                                                                        {payment.status}
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            )}
                                        </Card.Body>
                                    </Card>

                                    {/* Application Form */}
                                    {eligibility?.eligible && (
                                        <Form onSubmit={handleSubmit}>
                                            <Card className="mb-4 border-primary">
                                                <Card.Header className="bg-light">
                                                    <h5 className="mb-0">TCC Application Form</h5>
                                                </Card.Header>
                                                <Card.Body>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Purpose of TCC *</Form.Label>
                                                        <Form.Select
                                                            name="purpose"
                                                            value={formData.purpose}
                                                            onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                                                            required
                                                        >
                                                            <option value="business_license_renewal">Business License Renewal</option>
                                                            <option value="bank_loan">Bank Loan Application</option>
                                                            <option value="government_tender">Government Tender</option>
                                                            <option value="tax_clearance">General Tax Clearance</option>
                                                            <option value="other">Other</option>
                                                        </Form.Select>
                                                    </Form.Group>

                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Additional Notes (Optional)</Form.Label>
                                                        <Form.Control
                                                            as="textarea"
                                                            rows={3}
                                                            name="notes"
                                                            value={formData.notes}
                                                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                                            placeholder="Any additional information..."
                                                        />
                                                    </Form.Group>

                                                    <Form.Group className="mb-3">
                                                        <Form.Check
                                                            type="checkbox"
                                                            label="I confirm that all information provided is accurate and complete."
                                                            required
                                                        />
                                                    </Form.Group>
                                                </Card.Body>
                                            </Card>

                                            <div className="d-grid">
                                                <Button 
                                                    type="submit" 
                                                    variant="success" 
                                                    size="lg"
                                                    disabled={submitting}
                                                >
                                                    {submitting ? (
                                                        <>
                                                            <Spinner size="sm" className="me-2" />
                                                            Submitting Application...
                                                        </>
                                                    ) : (
                                                        'Submit TCC Application'
                                                    )}
                                                </Button>
                                            </div>
                                        </Form>
                                    )}

                                    {!eligibility?.eligible && (
                                        <div className="text-center mt-4">
                                            <Button variant="primary" onClick={() => navigate('/tax/dashboard')}>
                                                Go to Payment Dashboard
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default TCCApplicationPage;