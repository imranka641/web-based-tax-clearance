import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Alert, Spinner, ProgressBar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { useLanguage } from '../../contexts/LanguageContext';

const EnhancedTaxpayerDashboard = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [currentYearTax, setCurrentYearTax] = useState(null);
    const [predictions, setPredictions] = useState([]);
    const [declarations, setDeclarations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { t } = useLanguage();

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
            const [profileRes, taxRes, predictionsRes, declarationsRes] = await Promise.all([
                api.get('/taxpayer/my-profile'),
                api.get('/taxpayer/current-year-tax'),
                api.get('/taxpayer/my-predictions'),
                api.get('/taxpayer/my-declarations')
            ]);

            setProfile(profileRes.data.profile);
            setCurrentYearTax(taxRes.data);
            setPredictions(predictionsRes.data.predictions || []);
            setDeclarations(declarationsRes.data.declarations || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const getCategoryBadge = (category) => {
        const colors = {
            'A': 'danger',
            'B': 'warning',
            'C': 'info',
            'D': 'primary',
            'E': 'secondary'
        };
        return colors[category] || 'light';
    };

    const getStatusBadge = (status) => {
        const colors = {
            'paid': 'success',
            'pending': 'warning',
            'overdue': 'danger',
            'approved': 'success',
            'submitted': 'info'
        };
        return colors[status] || 'secondary';
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading your dashboard...</p>
            </Container>
        );
    }

    if (!profile) {
        return (
            <Container className="mt-5">
                <Alert variant="warning">
                    <Alert.Heading>Profile Not Found</Alert.Heading>
                    <p>You need to complete your initial submission first.</p>
                    <Button variant="primary" href="/taxpayer/initial-submission">
                        Complete Initial Submission
                    </Button>
                </Alert>
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <Card className="border-0 bg-primary text-white">
                        <Card.Body className="p-4">
                            <Row>
                                <Col md={8}>
                                    <h2>Welcome, {user?.full_name}</h2>
                                    <p className="mb-0">
                                        <Badge bg="light" text="dark" className="me-2">
                                            {user?.business_name || 'Self Employed'}
                                        </Badge>
                                        <Badge bg="light" text="dark" className="me-2">
                                            TIN: {user?.tin}
                                        </Badge>
                                        <Badge bg={getCategoryBadge(profile.category_code)}>
                                            Category {profile.category_code}
                                        </Badge>
                                    </p>
                                </Col>
                                <Col md={4} className="text-end">
                                    <h3 className="mb-0">
                                        {profile.verification_status === 'verified' ? 
                                            '✅ Verified' : '⏳ Pending'}
                                    </h3>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

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
                                        Based on your Category {profile.category_code} formula: 
                                        {profile.formula_description || 'Percentage of last year'}
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
                                            label={`${new Date().toLocaleDateString()}`}
                                        />
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Stats Cards */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="shadow-sm border-primary">
                        <Card.Body>
                            <h6 className="text-muted">Next Year Prediction</h6>
                            <h3 className="text-primary">
                                ETB {predictions[0]?.predicted_amount?.toLocaleString() || '0'}
                            </h3>
                            <small>Confidence: {predictions[0]?.confidence_score || 85}%</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="shadow-sm border-success">
                        <Card.Body>
                            <h6 className="text-muted">Total Paid (YTD)</h6>
                            <h3 className="text-success">
                                ETB {declarations.filter(d => d.status === 'paid')
                                    .reduce((sum, d) => sum + (d.calculated_tax || 0), 0)
                                    .toLocaleString()}
                            </h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="shadow-sm border-warning">
                        <Card.Body>
                            <h6 className="text-muted">Payment Status</h6>
                            <h3>
                                <Badge bg={currentYearTax?.paid ? 'success' : 'warning'}>
                                    {currentYearTax?.paid ? 'PAID' : 'PENDING'}
                                </Badge>
                            </h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="shadow-sm border-info">
                        <Card.Body>
                            <h6 className="text-muted">TCC Status</h6>
                            <h3>
                                <Badge bg={currentYearTax?.paid ? 'success' : 'secondary'}>
                                    {currentYearTax?.paid ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                                </Badge>
                            </h3>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Main Content */}
            <Row>
                <Col md={8}>
                    {/* Recent Declarations */}
                    <Card className="shadow-sm mb-4">
                        <Card.Header className="bg-light">
                            <h5 className="mb-0">📋 Recent Declarations</h5>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive striped hover>
                                <thead>
                                    <tr>
                                        <th>Period</th>
                                        <th>Tax Type</th>
                                        <th>Revenue</th>
                                        <th>Tax Amount</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {declarations.slice(0, 5).map(dec => (
                                        <tr key={dec.id}>
                                            <td>{dec.period || '2024'}</td>
                                            <td>{dec.tax_type_name || 'Income Tax'}</td>
                                            <td>ETB {dec.revenue?.toLocaleString() || '-'}</td>
                                            <td><strong>ETB {dec.calculated_tax?.toLocaleString()}</strong></td>
                                            <td>
                                                <Badge bg={getStatusBadge(dec.status)}>
                                                    {dec.status}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Button size="sm" variant="outline-primary">View</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            <div className="text-center mt-3">
                                <Button variant="link" as={Link} to="/tax/history">
                                    View All History →
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Future Predictions */}
                    <Card className="shadow-sm">
                        <Card.Header className="bg-info text-white">
                            <h5 className="mb-0">🔮 Future Tax Predictions</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                {predictions.slice(0, 3).map((pred, index) => (
                                    <Col md={4} key={index}>
                                        <Card className="mb-3 border-info">
                                            <Card.Body className="text-center">
                                                <h6 className="text-muted">{pred.year || 2025}</h6>
                                                <h4 className="text-info">
                                                    ETB {pred.predicted_amount?.toLocaleString()}
                                                </h4>
                                                <ProgressBar 
                                                    now={pred.confidence_score || 85} 
                                                    variant="info"
                                                    className="mt-2"
                                                />
                                                <small>{pred.confidence_score || 85}% confidence</small>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    {/* Quick Actions */}
                    <Card className="shadow-sm mb-4">
                        <Card.Header className="bg-success text-white">
                            <h6 className="mb-0">⚡ Quick Actions</h6>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-grid gap-2">
                                <Button variant="outline-primary" as={Link} to="/tax/pay/current">
                                    💰 Pay Current Tax
                                </Button>
                                <Button variant="outline-success" as={Link} to="/apply-tcc">
                                    📋 Apply for TCC
                                </Button>
                                <Button variant="outline-info" as={Link} to="/tax/calculator">
                                    🧮 Tax Calculator
                                </Button>
                                <Button variant="outline-warning" as={Link} to="/tax/predict">
                                    🔮 View Predictions
                                </Button>
                                <Button variant="outline-secondary" as={Link} to="/profile">
                                    👤 My Profile
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Category Information */}
                    <Card className="shadow-sm mb-4">
                        <Card.Header className="bg-primary text-white">
                            <h6 className="mb-0">📊 Your Tax Category</h6>
                        </Card.Header>
                        <Card.Body>
                            <h2 className="text-center mb-3">
                                <Badge bg={getCategoryBadge(profile.category_code)} style={{ fontSize: '2rem' }}>
                                    {profile.category_code}
                                </Badge>
                            </h2>
                            <p><strong>Category:</strong> {profile.category_name}</p>
                            <p><strong>Income Range:</strong> {profile.income_range}</p>
                            <p><strong>Formula:</strong> {profile.formula_description}</p>
                            <p><strong>Verification Status:</strong> 
                                <Badge bg={profile.verification_status === 'verified' ? 'success' : 'warning'} className="ms-2">
                                    {profile.verification_status}
                                </Badge>
                            </p>
                        </Card.Body>
                    </Card>

                    {/* Compliance Status */}
                    <Card className="shadow-sm">
                        <Card.Header className="bg-warning text-dark">
                            <h6 className="mb-0">✅ Compliance Status</h6>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Profile Verification:</span>
                                <Badge bg={profile.verification_status === 'verified' ? 'success' : 'warning'}>
                                    {profile.verification_status === 'verified' ? 'Complete' : 'Pending'}
                                </Badge>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Current Year Tax:</span>
                                <Badge bg={currentYearTax?.paid ? 'success' : 'warning'}>
                                    {currentYearTax?.paid ? 'Paid' : 'Pending'}
                                </Badge>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Previous Years:</span>
                                <Badge bg="success">Up to Date</Badge>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>TCC Eligibility:</span>
                                <Badge bg={currentYearTax?.paid ? 'success' : 'secondary'}>
                                    {currentYearTax?.paid ? 'Eligible' : 'Not Eligible'}
                                </Badge>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default EnhancedTaxpayerDashboard;