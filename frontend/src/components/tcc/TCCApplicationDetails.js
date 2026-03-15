import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Spinner, Badge, Row, Col, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TCCApplicationDetails = () => {
    const { id } = useParams();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchApplication();
    }, [id]);

    const fetchApplication = async () => {
        try {
            // Mock data for now
            setApplication({
                id: id,
                application_number: `TCC-2024-${String(id).padStart(6, '0')}`,
                purpose: 'Business License Renewal',
                status: 'approved',
                submitted_at: '2024-03-10',
                reviewed_at: '2024-03-11',
                taxpayer_name: 'Abebe Retail Store',
                business_name: 'Abebe Retail Store',
                tin: 'TIN1001',
                category: 'B',
                notes: 'For business license renewal at Adama City Council'
            });
        } catch (error) {
            console.error('Error fetching application:', error);
            setError('Failed to load application details');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            'approved': 'success',
            'pending': 'warning',
            'rejected': 'danger'
        };
        return colors[status] || 'secondary';
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'approved': return '✅';
            case 'rejected': return '❌';
            case 'pending': return '⏳';
            default: return '📄';
        }
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading application details...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">
                    <Alert.Heading>Error</Alert.Heading>
                    <p>{error}</p>
                </Alert>
                <Button variant="primary" onClick={() => navigate('/my-tcc-applications')}>
                    Back to Applications
                </Button>
            </Container>
        );
    }

    if (!application) {
        return (
            <Container className="mt-5">
                <Alert variant="warning">
                    <Alert.Heading>Application Not Found</Alert.Heading>
                    <p>The application you're looking for doesn't exist.</p>
                </Alert>
                <Button variant="primary" onClick={() => navigate('/my-tcc-applications')}>
                    Back to Applications
                </Button>
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <Card className="shadow-lg">
                <Card.Header className="bg-primary text-white py-3">
                    <h4 className="mb-0">TCC Application Details</h4>
                </Card.Header>
                <Card.Body className="p-4">
                    <Row>
                        <Col md={6}>
                            <Card className="bg-light mb-3">
                                <Card.Body>
                                    <h6>Application Information</h6>
                                    <p><strong>Application #:</strong> {application.application_number}</p>
                                    <p><strong>Purpose:</strong> {application.purpose?.replace(/_/g, ' ')}</p>
                                    <p><strong>Status:</strong> <Badge bg={getStatusBadge(application.status)}>
                                        {getStatusIcon(application.status)} {application.status.toUpperCase()}
                                    </Badge></p>
                                    <p><strong>Submitted:</strong> {new Date(application.submitted_at).toLocaleDateString()}</p>
                                    <p><strong>Reviewed:</strong> {application.reviewed_at ? new Date(application.reviewed_at).toLocaleDateString() : 'Pending'}</p>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6}>
                            <Card className="bg-light mb-3">
                                <Card.Body>
                                    <h6>Taxpayer Information</h6>
                                    <p><strong>Name:</strong> {application.taxpayer_name}</p>
                                    <p><strong>Business:</strong> {application.business_name}</p>
                                    <p><strong>TIN:</strong> {application.tin}</p>
                                    <p><strong>Category:</strong> <Badge bg={
                                        application.category === 'A' ? 'danger' :
                                        application.category === 'B' ? 'warning' :
                                        application.category === 'C' ? 'info' :
                                        application.category === 'D' ? 'primary' : 'secondary'
                                    }>Category {application.category}</Badge></p>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                    
                    {application.notes && (
                        <Card className="bg-light mt-3">
                            <Card.Body>
                                <h6>Additional Notes</h6>
                                <p className="mb-0">{application.notes}</p>
                            </Card.Body>
                        </Card>
                    )}
                    
                    <hr />
                    
                    <div className="d-flex justify-content-between mt-4">
                        <Button 
                            variant="secondary" 
                            onClick={() => navigate('/my-tcc-applications')}
                        >
                            ← Back to Applications
                        </Button>
                        {application.status === 'approved' && (
                            <Button 
                                variant="success"
                                onClick={() => navigate(`/tcc/certificate/${application.id}`)}
                            >
                                View Certificate →
                            </Button>
                        )}
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default TCCApplicationDetails;