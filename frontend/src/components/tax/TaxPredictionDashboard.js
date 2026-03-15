import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, ProgressBar } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { useLanguage } from '../../contexts/LanguageContext';

const TaxPredictionDashboard = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [currentYearTax, setCurrentYearTax] = useState(null);
    const [predictions, setPredictions] = useState([]);
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
        fetchPredictionData();
    }, [navigate]);

    const fetchPredictionData = async () => {
        try {
            // Fetch taxpayer profile
            const profileRes = await api.get('/taxpayer/profile');
            setProfile(profileRes.data);

            // Fetch current year tax calculation
            const currentYear = new Date().getFullYear();
            const taxRes = await api.get(`/taxpayer/current-year-tax/${currentYear}`);
            setCurrentYearTax(taxRes.data);

            // Fetch predictions
            const predictionsRes = await api.get('/taxpayer/predictions');
            setPredictions(predictionsRes.data.predictions || []);
        } catch (error) {
            console.error('Error fetching prediction data:', error);
            setError('Failed to load prediction data');
        } finally {
            setLoading(false);
        }
    };

    const getConfidenceVariant = (score) => {
        if (score >= 90) return 'success';
        if (score >= 75) return 'info';
        if (score >= 60) return 'warning';
        return 'danger';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-ET', {
            style: 'currency',
            currency: 'ETB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading your tax predictions...</p>
            </Container>
        );
    }

    if (!profile || !currentYearTax) {
        return (
            <Container className="mt-5">
                <Alert variant="warning">
                    <Alert.Heading>No Tax Data Found</Alert.Heading>
                    <p>
                        Your tax profile hasn't been fully set up yet. 
                        Please complete your initial submission or contact your town admin.
                    </p>
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
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>🔮 Tax Predictions Dashboard</h2>
                            <p className="text-muted mb-0">
                                Welcome, {user?.full_name} | {user?.business_name}
                            </p>
                        </div>
                        <Badge bg="info" className="fs-6">
                            TIN: {user?.tin}
                        </Badge>
                    </div>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Current Year Tax Card */}
            <Row className="mb-4">
                <Col md={12}>
                    <Card className="border-primary shadow">
                        <Card.Header className="bg-primary text-white">
                            <h4 className="mb-0">📅 Current Year Tax ({new Date().getFullYear()})</h4>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={8}>
                                    <h5 className="mb-3">Category: {profile.category_code} - {profile.category_name}</h5>
                                    
                                    <table className="table table-borderless">
                                        <tbody>
                                            <tr>
                                                <td style={{ width: '200px' }}><strong>Last Year Tax:</strong></td>
                                                <td>{formatCurrency(profile.last_year_tax_paid)}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Calculation Formula:</strong></td>
                                                <td>
                                                    {currentYearTax.formula_description || 
                                                        `${profile.multiplier || 1.15}x of last year's tax`}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td><strong>Base Amount:</strong></td>
                                                <td>{formatCurrency(profile.last_year_tax_paid)} × {profile.multiplier || 1.15}</td>
                                            </tr>
                                            <tr className="border-top">
                                                <td><h5 className="text-primary">CALCULATED TAX:</h5></td>
                                                <td><h3 className="text-primary">{formatCurrency(currentYearTax.amount)}</h3></td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <div className="mt-3">
                                        <Button 
                                            variant="success" 
                                            size="lg"
                                            as={Link}
                                            to="/tax/dashboard"
                                            className="me-3"
                                        >
                                            💰 PAY NOW
                                        </Button>
                                        <Button 
                                            variant="outline-primary"
                                            as={Link}
                                            to="/tax/history"
                                        >
                                            📊 View History
                                        </Button>
                                    </div>
                                </Col>
                                <Col md={4} className="text-center border-start">
                                    <div className="p-3">
                                        <h6>Due Date</h6>
                                        <h4 className="text-warning">April 30, {new Date().getFullYear()}</h4>
                                        <hr />
                                        <h6>Payment Status</h6>
                                        <Badge bg={currentYearTax.paid ? 'success' : 'warning'} className="fs-6 p-2">
                                            {currentYearTax.paid ? '✅ PAID' : '⏳ PENDING'}
                                        </Badge>
                                        {currentYearTax.paid && (
                                            <div className="mt-3">
                                                <small className="text-muted">
                                                    Paid on: {currentYearTax.paid_date}
                                                </small>
                                            </div>
                                        )}
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Future Predictions */}
            <Row className="mb-4">
                <Col md={12}>
                    <Card className="shadow">
                        <Card.Header className="bg-info text-white">
                            <h4 className="mb-0">🔮 Future Tax Predictions</h4>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                {predictions.length > 0 ? (
                                    predictions.map((pred, index) => (
                                        <Col md={4} key={index} className="mb-3">
                                            <Card className={`border-${getConfidenceVariant(pred.confidence_score)} h-100`}>
                                                <Card.Header className={`bg-${getConfidenceVariant(pred.confidence_score)} bg-opacity-10`}>
                                                    <h5 className="mb-0">{pred.year}</h5>
                                                </Card.Header>
                                                <Card.Body>
                                                    <h2 className="text-center mb-3">
                                                        {formatCurrency(pred.amount)}
                                                    </h2>
                                                    <div className="mb-3">
                                                        <ProgressBar 
                                                            variant={getConfidenceVariant(pred.confidence_score)}
                                                            now={pred.confidence_score} 
                                                            label={`${pred.confidence_score}%`}
                                                        />
                                                        <small className="text-muted">AI Confidence</small>
                                                    </div>
                                                    <p className="small text-muted mb-1">
                                                        <strong>Based on:</strong> {pred.based_on || 'Historical data + growth trend'}
                                                    </p>
                                                    {pred.notes && (
                                                        <p className="small text-muted">
                                                            {pred.notes}
                                                        </p>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))
                                ) : (
                                    <Col md={12}>
                                        <Alert variant="info">
                                            <h5>No future predictions available yet</h5>
                                            <p>Predictions will be generated after your first tax payment.</p>
                                        </Alert>
                                    </Col>
                                )}
                            </Row>

                            {/* Prediction Methodology */}
                            <Card className="bg-light mt-4">
                                <Card.Body>
                                    <h6>📊 How Predictions Are Calculated</h6>
                                    <Row>
                                        <Col md={4}>
                                            <p className="small mb-1">
                                                <strong>Year {new Date().getFullYear() + 1}:</strong> {formatCurrency(predictions[0]?.amount || 0)}
                                            </p>
                                            <p className="text-muted small">Based on: Current year + 10% growth</p>
                                        </Col>
                                        <Col md={4}>
                                            <p className="small mb-1">
                                                <strong>Year {new Date().getFullYear() + 2}:</strong> {formatCurrency(predictions[1]?.amount || 0)}
                                            </p>
                                            <p className="text-muted small">Based on: 3-year historical trend</p>
                                        </Col>
                                        <Col md={4}>
                                            <p className="small mb-1">
                                                <strong>Year {new Date().getFullYear() + 3}:</strong> {formatCurrency(predictions[2]?.amount || 0)}
                                            </p>
                                            <p className="text-muted small">Based on: Category average + inflation</p>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Category Information */}
            <Row>
                <Col md={6}>
                    <Card className="shadow-sm">
                        <Card.Header className="bg-success text-white">
                            <h5 className="mb-0">📋 Your Tax Category Details</h5>
                        </Card.Header>
                        <Card.Body>
                            <table className="table table-sm">
                                <tbody>
                                    <tr>
                                        <td><strong>Category:</strong></td>
                                        <td><Badge bg="primary">{profile.category_code}</Badge> {profile.category_name}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Income Range:</strong></td>
                                        <td>
                                            {formatCurrency(profile.min_income)} 
                                            {profile.max_income ? ` - ${formatCurrency(profile.max_income)}` : '+'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>Formula Type:</strong></td>
                                        <td>{profile.formula_type?.replace(/_/g, ' ') || 'Percentage of last year'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Multiplier/Rate:</strong></td>
                                        <td>{profile.multiplier ? `${profile.multiplier}x` : `${profile.base_rate}%`}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Minimum Tax:</strong></td>
                                        <td>{formatCurrency(profile.minimum_tax)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card className="shadow-sm">
                        <Card.Header className="bg-warning text-dark">
                            <h5 className="mb-0">⚡ Quick Actions</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-grid gap-2">
                                <Button variant="outline-primary" as={Link} to="/tax/dashboard">
                                    💰 Pay Current Year Tax
                                </Button>
                                <Button variant="outline-success" as={Link} to="/tax/history">
                                    📈 View Payment History
                                </Button>
                                <Button variant="outline-info" as={Link} to="/tax/calculator">
                                    🧮 Try Tax Calculator
                                </Button>
                                <Button variant="outline-secondary" as={Link} to="/profile">
                                    👤 View Profile
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default TaxPredictionDashboard;