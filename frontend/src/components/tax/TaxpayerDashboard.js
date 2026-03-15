import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, ProgressBar, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TaxpayerDashboard = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [currentYearTax, setCurrentYearTax] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'taxpayer') {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [profileRes, taxRes] = await Promise.all([
                api.get('/taxpayer/my-profile').catch(() => ({ data: { profile: null } })),
                api.get('/taxpayer/current-year-tax').catch(() => ({ data: { amount: 0, paid: false } }))
            ]);

            setProfile(profileRes.data.profile);
            setCurrentYearTax(taxRes.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const getCategoryColor = (category) => {
        const colors = { 'A': 'danger', 'B': 'warning', 'C': 'info', 'D': 'primary', 'E': 'secondary' };
        return colors[category] || 'light';
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading your dashboard...</p>
            </Container>
        );
    }

    const needsInitialSubmission = !profile || profile.verification_status === 'pending';

    return (
        <Container fluid className="mt-4">
            {/* Welcome Header */}
            <Row className="mb-4">
                <Col>
                    <Card className="bg-primary text-white">
                        <Card.Body className="p-4">
                            <Row>
                                <Col md={8}>
                                    <h2>Welcome, {user?.full_name || 'Taxpayer'}!</h2>
                                    <p className="mb-0">
                                        <Badge bg="light" text="dark" className="me-2">
                                            {user?.business_name || 'Business Owner'}
                                        </Badge>
                                        <Badge bg="light" text="dark" className="me-2">
                                            TIN: {user?.tin || 'Not assigned'}
                                        </Badge>
                                        {profile?.category_code && (
                                            <Badge bg={getCategoryColor(profile.category_code)}>
                                                Category {profile.category_code}
                                            </Badge>
                                        )}
                                    </p>
                                </Col>
                                <Col md={4} className="text-end">
                                    <h3 className="mb-0">
                                        {profile?.verification_status === 'verified' ? 
                                            '✅ Verified' : '⏳ Pending Verification'}
                                    </h3>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            {needsInitialSubmission ? (
                /* Initial Submission Required */
                <Row className="justify-content-center">
                    <Col md={8}>
                        <Card className="shadow-lg border-warning">
                            <Card.Header className="bg-warning text-dark">
                                <h4 className="mb-0">⚠️ Initial Submission Required</h4>
                            </Card.Header>
                            <Card.Body className="text-center p-5">
                                <div className="display-1 mb-4">📋</div>
                                <h3>Complete Your Profile</h3>
                                <p className="lead text-muted mb-4">
                                    Before you can start using the tax system, you need to complete your 
                                    one-time profile submission. This includes uploading your tax certificate 
                                    and business license.
                                </p>
                                <Button 
                                    variant="primary" 
                                    size="lg"
                                    as={Link}
                                    to="/taxpayer/initial-submission"
                                >
                                    Start Initial Submission →
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            ) : (
                /* Verified Taxpayer Dashboard */
                <>
                    {/* Current Year Tax Card */}
                    <Row className="mb-4">
                        <Col md={12}>
                            <Card className="shadow-lg border-0">
                                <Card.Body className="p-4">
                                    <Row>
                                        <Col md={8}>
                                            <h4 className="text-muted mb-2">Current Year Tax (2024)</h4>
                                            <h1 className="display-3 text-primary mb-3">
                                                ETB {currentYearTax?.amount?.toLocaleString() || '0'}
                                            </h1>
                                            <p className="text-muted mb-3">
                                                Based on Category {profile?.category_code} formula: 
                                                {profile?.formula_description || 'Percentage of last year'}
                                            </p>
                                            <div>
                                                <Button 
                                                    variant="success" 
                                                    size="lg" 
                                                    className="me-3"
                                                    as={Link}
                                                    to="/tax/pay/current"
                                                >
                                                    💰 PAY NOW
                                                </Button>
                                                <Button 
                                                    variant="outline-primary" 
                                                    size="lg"
                                                    as={Link}
                                                    to="/tax/calculator"
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        </Col>
                                        <Col md={4} className="text-end">
                                            <div className="bg-light p-3 rounded">
                                                <h6 className="text-muted">Due Date</h6>
                                                <h4>April 30, 2024</h4>
                                                <ProgressBar 
                                                    now={65} 
                                                    variant="warning" 
                                                    className="mt-2"
                                                    label="65%"
                                                />
                                                <small className="text-muted">Days remaining</small>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Quick Actions Cards */}
                    <Row className="mb-4">
                        <Col md={3}>
                            <Card className="shadow-sm border-primary h-100">
                                <Card.Body className="text-center">
                                    <div className="display-4 mb-3">💰</div>
                                    <h5>Pay Tax</h5>
                                    <p className="text-muted small">Make your tax payment</p>
                                    <Button variant="primary" size="sm" as={Link} to="/tax/pay/current">
                                        Pay Now
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="shadow-sm border-success h-100">
                                <Card.Body className="text-center">
                                    <div className="display-4 mb-3">📋</div>
                                    <h5>Apply for TCC</h5>
                                    <p className="text-muted small">Get Tax Clearance Certificate</p>
                                    <Button variant="success" size="sm" as={Link} to="/tcc/apply">
                                        Apply Now
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="shadow-sm border-info h-100">
                                <Card.Body className="text-center">
                                    <div className="display-4 mb-3">📊</div>
                                    <h5>Payment History</h5>
                                    <p className="text-muted small">View past payments</p>
                                    <Button variant="info" size="sm" as={Link} to="/tax/history">
                                        View History
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="shadow-sm border-warning h-100">
                                <Card.Body className="text-center">
                                    <div className="display-4 mb-3">🔮</div>
                                    <h5>Predictions</h5>
                                    <p className="text-muted small">Future tax estimates</p>
                                    <Button variant="warning" size="sm" as={Link} to="/tax/predict">
                                        View Predictions
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Two Column Layout */}
                    <Row>
                        <Col md={8}>
                            {/* Recent Activity */}
                            <Card className="shadow-sm mb-4">
                                <Card.Header>
                                    <h5 className="mb-0">Recent Activity</h5>
                                </Card.Header>
                                <Card.Body>
                                    <div className="text-center text-muted py-4">
                                        <p>No recent activity to display</p>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            {/* Profile Summary */}
                            <Card className="shadow-sm">
                                <Card.Header>
                                    <h5 className="mb-0">Profile Summary</h5>
                                </Card.Header>
                                <Card.Body>
                                    <p><strong>Category:</strong> <Badge bg={getCategoryColor(profile?.category_code)}>{profile?.category_code || 'Pending'}</Badge></p>
                                    <p><strong>Business Type:</strong> {profile?.business_type || 'Not set'}</p>
                                    <p><strong>Employees:</strong> {profile?.employee_count || '0'}</p>
                                    <p><strong>Started:</strong> {profile?.business_start_date ? new Date(profile.business_start_date).toLocaleDateString() : 'Not set'}</p>
                                    <hr />
                                    <Button variant="outline-primary" size="sm" as={Link} to="/profile" block>
                                        View Full Profile
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </Container>
    );
};

export default TaxpayerDashboard;