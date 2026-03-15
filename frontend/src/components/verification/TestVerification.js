import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge, Table, ProgressBar } from 'react-bootstrap';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TestVerification = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);
    const [fraudScore, setFraudScore] = useState(null);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [tinValidation, setTinValidation] = useState(null);
    const [testData, setTestData] = useState({
        tin: '',
        monthly_income: '',
        business_name: '',
        business_sector: 'TRD001',
        region: '1',
        address: ''
    });

    useEffect(() => {
        const currentUser = getUser();
        setUser(currentUser);
        checkVerificationStatus();
        getFraudScore();
    }, []);

    // Check current verification status
    const checkVerificationStatus = async () => {
        try {
            const response = await api.get('/verify/status');
            setVerificationStatus(response.data);
        } catch (error) {
            console.error('Error checking status:', error);
        }
    };

    // Get fraud score
    const getFraudScore = async () => {
        try {
            const response = await api.get('/verify/fraud-score');
            setFraudScore(response.data);
        } catch (error) {
            console.error('Error getting fraud score:', error);
        }
    };

    // Test TIN validation
    const testTinValidation = async () => {
        try {
            const response = await api.post('/verify/verify-tin', {
                tin: testData.tin
            });
            setTinValidation(response.data);
        } catch (error) {
            console.error('TIN validation error:', error);
        }
    };

    // Run full verification
    const runVerification = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const response = await api.post('/verify/verify', {
                tin: testData.tin,
                monthly_income: parseFloat(testData.monthly_income),
                business_name: testData.business_name,
                business_sector: testData.business_sector,
                region: testData.region,
                address: testData.address
            });
            
            setVerificationResult(response.data);
            
            // Refresh fraud score after verification
            getFraudScore();
            checkVerificationStatus();
            
        } catch (error) {
            console.error('Verification error:', error);
            alert('Verification failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Test data presets
    const loadTestData = (type) => {
        const presets = {
            compliant: {
                tin: '1234567890', // Valid format
                monthly_income: '15000',
                business_name: 'ABC Trading PLC',
                business_sector: 'TRD001',
                region: '1',
                address: 'Bole, Addis Ababa'
            },
            suspicious: {
                tin: '1111111111', // Suspicious TIN
                monthly_income: '500000', // Very high income
                business_name: 'XYZ Import Export',
                business_sector: 'TRD002',
                region: '8',
                address: 'Adama'
            },
            fraudulent: {
                tin: '12345', // Invalid format
                monthly_income: '1000000', // Extremely high
                business_name: 'Fake Business',
                business_sector: 'SVC001',
                region: '2',
                address: 'Unknown'
            }
        };
        
        setTestData(presets[type]);
    };

    const getRiskBadge = (riskLevel) => {
        const variants = {
            'low': 'success',
            'medium': 'warning',
            'high': 'danger',
            'critical': 'danger'
        };
        return <Badge bg={variants[riskLevel] || 'secondary'}>{riskLevel}</Badge>;
    };

    return (
        <Container className="mt-4">
            <Row>
                <Col>
                    <h2 className="mb-4">🔍 Verification System Test Page</h2>
                    
                    <Row>
                        {/* Test Form */}
                        <Col md={6}>
                            <Card className="shadow-sm mb-4">
                                <Card.Header className="bg-primary text-white">
                                    <h5 className="mb-0">Test Data Entry</h5>
                                </Card.Header>
                                <Card.Body>
                                    <div className="mb-3">
                                        <Button variant="outline-success" size="sm" className="me-2" onClick={() => loadTestData('compliant')}>
                                            Load Compliant Data
                                        </Button>
                                        <Button variant="outline-warning" size="sm" className="me-2" onClick={() => loadTestData('suspicious')}>
                                            Load Suspicious Data
                                        </Button>
                                        <Button variant="outline-danger" size="sm" onClick={() => loadTestData('fraudulent')}>
                                            Load Fraudulent Data
                                        </Button>
                                    </div>
                                    
                                    <Form onSubmit={runVerification}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>TIN Number</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={testData.tin}
                                                onChange={(e) => setTestData({...testData, tin: e.target.value})}
                                                placeholder="Enter 10-digit TIN"
                                            />
                                            <Button 
                                                variant="outline-secondary" 
                                                size="sm" 
                                                className="mt-2"
                                                onClick={testTinValidation}
                                            >
                                                Test TIN Format
                                            </Button>
                                            {tinValidation && (
                                                <div className="mt-2">
                                                    <Badge bg={tinValidation.valid ? 'success' : 'danger'}>
                                                        {tinValidation.valid ? '✓ Valid TIN' : '✗ Invalid TIN'}
                                                    </Badge>
                                                    <small className="text-muted d-block">{tinValidation.message}</small>
                                                </div>
                                            )}
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Monthly Income (ETB)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                value={testData.monthly_income}
                                                onChange={(e) => setTestData({...testData, monthly_income: e.target.value})}
                                                placeholder="e.g., 15000"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Business Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={testData.business_name}
                                                onChange={(e) => setTestData({...testData, business_name: e.target.value})}
                                                placeholder="Business name"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Business Sector</Form.Label>
                                            <Form.Select
                                                value={testData.business_sector}
                                                onChange={(e) => setTestData({...testData, business_sector: e.target.value})}
                                            >
                                                <option value="TRD001">Retail Trade</option>
                                                <option value="TRD002">Wholesale Trade</option>
                                                <option value="SVC001">Professional Services</option>
                                                <option value="MFG001">Manufacturing</option>
                                                <option value="AGR001">Agriculture</option>
                                            </Form.Select>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Region</Form.Label>
                                            <Form.Select
                                                value={testData.region}
                                                onChange={(e) => setTestData({...testData, region: e.target.value})}
                                            >
                                                <option value="1">Addis Ababa</option>
                                                <option value="8">Oromia</option>
                                                <option value="3">Amhara</option>
                                                <option value="13">Tigray</option>
                                            </Form.Select>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Address</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={testData.address}
                                                onChange={(e) => setTestData({...testData, address: e.target.value})}
                                                placeholder="Address"
                                            />
                                        </Form.Group>

                                        <div className="d-grid">
                                            <Button variant="primary" type="submit" disabled={loading}>
                                                {loading ? (
                                                    <>
                                                        <Spinner size="sm" className="me-2" />
                                                        Running Verification...
                                                    </>
                                                ) : (
                                                    'Run Full Verification'
                                                )}
                                            </Button>
                                        </div>
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Verification Results */}
                        <Col md={6}>
                            {/* Current Status */}
                            <Card className="shadow-sm mb-4">
                                <Card.Header className="bg-info text-white">
                                    <h5 className="mb-0">Current Verification Status</h5>
                                </Card.Header>
                                <Card.Body>
                                    {verificationStatus ? (
                                        <>
                                            <p><strong>Has Verification:</strong> {verificationStatus.has_verification ? 'Yes' : 'No'}</p>
                                            {verificationStatus.latest && (
                                                <>
                                                    <p><strong>Latest Status:</strong> 
                                                        <Badge bg={
                                                            verificationStatus.latest.verification_status === 'verified' ? 'success' :
                                                            verificationStatus.latest.verification_status === 'flagged' ? 'warning' :
                                                            verificationStatus.latest.verification_status === 'failed' ? 'danger' : 'secondary'
                                                        } className="ms-2">
                                                            {verificationStatus.latest.verification_status}
                                                        </Badge>
                                                    </p>
                                                    <p><strong>Confidence Score:</strong> 
                                                        <ProgressBar 
                                                            now={verificationStatus.latest.confidence_score} 
                                                            label={`${verificationStatus.latest.confidence_score}%`}
                                                            variant={
                                                                verificationStatus.latest.confidence_score >= 80 ? 'success' :
                                                                verificationStatus.latest.confidence_score >= 50 ? 'warning' : 'danger'
                                                            }
                                                            className="mt-2"
                                                        />
                                                    </p>
                                                    <p><strong>Flags:</strong> {verificationStatus.latest.flags?.length || 0}</p>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-muted">No verification data yet</p>
                                    )}
                                </Card.Body>
                            </Card>

                            {/* Fraud Score */}
                            <Card className="shadow-sm mb-4">
                                <Card.Header className="bg-warning text-dark">
                                    <h5 className="mb-0">Fraud Detection Score</h5>
                                </Card.Header>
                                <Card.Body>
                                    {fraudScore && fraudScore.has_score ? (
                                        <>
                                            <div className="text-center mb-3">
                                                <h1 className="display-4">{Math.round(fraudScore.score.overall_score)}%</h1>
                                                {getRiskBadge(fraudScore.score.risk_level)}
                                            </div>
                                            <Table size="sm">
                                                <tbody>
                                                    <tr>
                                                        <td>Income Score:</td>
                                                        <td>{fraudScore.score.income_score}%</td>
                                                        <td>
                                                            <ProgressBar now={fraudScore.score.income_score} variant="info" size="sm" style={{ height: '5px' }} />
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>Location Score:</td>
                                                        <td>{fraudScore.score.location_score}%</td>
                                                        <td>
                                                            <ProgressBar now={fraudScore.score.location_score} variant="info" size="sm" style={{ height: '5px' }} />
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>Historical Score:</td>
                                                        <td>{fraudScore.score.historical_score}%</td>
                                                        <td>
                                                            <ProgressBar now={fraudScore.score.historical_score} variant="info" size="sm" style={{ height: '5px' }} />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                            {fraudScore.score.flagged_reasons?.length > 0 && (
                                                <>
                                                    <p className="mt-3 mb-1"><strong>Flagged Reasons:</strong></p>
                                                    <ul className="small">
                                                        {fraudScore.score.flagged_reasons.map((reason, i) => (
                                                            <li key={i}>{reason}</li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-muted">Run verification to see fraud score</p>
                                    )}
                                </Card.Body>
                            </Card>

                            {/* Latest Verification Result */}
                            {verificationResult && (
                                <Card className="shadow-sm">
                                    <Card.Header className="bg-success text-white">
                                        <h5 className="mb-0">Latest Verification Result</h5>
                                    </Card.Header>
                                    <Card.Body>
                                        <p><strong>Overall Status:</strong> 
                                            <Badge bg={
                                                verificationResult.overall_status === 'verified' ? 'success' :
                                                verificationResult.overall_status === 'flagged' ? 'warning' :
                                                verificationResult.overall_status === 'blocked' ? 'danger' : 'secondary'
                                            } className="ms-2">
                                                {verificationResult.overall_status}
                                            </Badge>
                                        </p>
                                        <p><strong>Confidence Score:</strong> {verificationResult.confidence_score}%</p>
                                        <p><strong>Risk Level:</strong> {getRiskBadge(verificationResult.risk_level)}</p>
                                        
                                        {verificationResult.flags?.length > 0 && (
                                            <>
                                                <p className="mt-3 mb-1"><strong>Flags Detected:</strong></p>
                                                <ul className="text-danger">
                                                    {verificationResult.flags.map((flag, i) => (
                                                        <li key={i}>{flag.message}</li>
                                                    ))}
                                                </ul>
                                            </>
                                        )}

                                        <p className="mt-3 mb-1"><strong>Verification Details:</strong></p>
                                        <Table size="sm" striped>
                                            <thead>
                                                <tr>
                                                    <th>Type</th>
                                                    <th>Status</th>
                                                    <th>Confidence</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {verificationResult.verifications?.map((v, i) => (
                                                    <tr key={i}>
                                                        <td>{v.type}</td>
                                                        <td>
                                                            <Badge bg={
                                                                v.status === 'verified' ? 'success' :
                                                                v.status === 'flagged' ? 'warning' :
                                                                v.status === 'failed' ? 'danger' : 'secondary'
                                                            }>
                                                                {v.status}
                                                            </Badge>
                                                        </td>
                                                        <td>{v.confidence_score}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            )}
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Container>
    );
};

export default TestVerification;