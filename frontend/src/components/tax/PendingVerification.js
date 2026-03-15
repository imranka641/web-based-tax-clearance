import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const PendingVerification = () => {
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [estimatedTime, setEstimatedTime] = useState('2-3 business days');
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'taxpayer') {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        checkVerificationStatus();

        // Poll every 30 seconds
        const interval = setInterval(checkVerificationStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const checkVerificationStatus = async () => {
        try {
            const response = await api.get('/taxpayer/verification-status');
            setStatus(response.data.status);
            
            if (response.data.status === 'verified') {
                // Redirect to dashboard after verification
                setTimeout(() => {
                    navigate('/dashboard');
                }, 3000);
            }
        } catch (error) {
            console.error('Failed to check status:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" />
            </Container>
        );
    }

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col md={8}>
                    <Card className="shadow-lg text-center">
                        <Card.Header className={`bg-${status === 'verified' ? 'success' : 'warning'} text-white`}>
                            <h3 className="mb-0">
                                {status === 'verified' ? '✅ Verification Complete!' : '⏳ Verification Pending'}
                            </h3>
                        </Card.Header>
                        <Card.Body className="p-5">
                            {status === 'verified' ? (
                                <>
                                    <div className="display-1 text-success mb-4">✓</div>
                                    <h4>Your account has been verified!</h4>
                                    <p>Redirecting to your dashboard...</p>
                                    <ProgressBar 
                                        animated 
                                        now={100} 
                                        variant="success"
                                        className="mt-4"
                                    />
                                </>
                            ) : (
                                <>
                                    <div className="display-1 text-warning mb-4">⏳</div>
                                    <h4>Your submission is being reviewed</h4>
                                    <p className="text-muted">
                                        A town administrator is verifying your documents and information.
                                    </p>
                                    
                                    <Card className="bg-light mt-4">
                                        <Card.Body>
                                            <Row>
                                                <Col md={6}>
                                                    <h5>📋 Status</h5>
                                                    <p>In Review Queue</p>
                                                </Col>
                                                <Col md={6}>
                                                    <h5>⏱️ Estimated Time</h5>
                                                    <p>{estimatedTime}</p>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>

                                    <Alert variant="info" className="mt-4">
                                        <h6>What happens next?</h6>
                                        <ol className="text-start">
                                            <li>Town admin reviews your documents</li>
                                            <li>Your tax category is confirmed</li>
                                            <li>You'll receive a notification</li>
                                            <li>You can then access all features</li>
                                        </ol>
                                    </Alert>

                                    <ProgressBar 
                                        animated 
                                        now={50} 
                                        variant="warning"
                                        className="mt-4"
                                    />
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default PendingVerification;