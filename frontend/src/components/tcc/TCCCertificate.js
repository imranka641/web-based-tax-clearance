import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser, getToken } from '../../utils/auth';

const TCCCertificate = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [certificate, setCertificate] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is authenticated
        const token = getToken();
        const currentUser = getUser();
        
        console.log('Token exists:', !!token);
        console.log('User:', currentUser);
        
        if (!token || !currentUser) {
            console.log('No token or user, redirecting to login');
            navigate('/login');
            return;
        }
        
        if (!id) {
            setError('No certificate ID provided');
            setLoading(false);
            return;
        }
        
        fetchCertificate();
    }, [id, navigate]);

    const fetchCertificate = async () => {
        try {
            console.log(`Fetching certificate with ID: ${id}`);
            const response = await api.get(`/tcc/certificate/${id}`);
            console.log('Certificate data:', response.data);
            setCertificate(response.data.certificate);
        } catch (error) {
            console.error('Error fetching certificate:', error);
            
            if (error.response?.status === 401) {
                setError('Your session has expired. Please login again.');
                setTimeout(() => navigate('/login'), 3000);
            } else if (error.response?.status === 403) {
                setError('You do not have permission to view this certificate');
            } else if (error.response?.status === 404) {
                setError('Certificate not found');
            } else {
                setError(error.response?.data?.error || 'Failed to load certificate');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            console.log(`Downloading certificate: ${id}`);
            
            // Use the API instance which includes the token automatically
            const response = await api.get(`/tcc/download/${id}`, {
                responseType: 'blob'
            });
            
            // Create blob and download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `TCC-${certificate?.tcc_number || id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Download error:', error);
            
            if (error.response?.status === 401) {
                alert('Your session has expired. Please login again.');
                navigate('/login');
            } else {
                alert('Failed to download certificate. Please try again.');
            }
        }
    };

    const handleBack = () => {
        navigate('/my-tcc-applications');
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading certificate...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">
                    <Alert.Heading>Error</Alert.Heading>
                    <p>{error}</p>
                    <hr />
                    <div className="d-flex justify-content-end">
                        <Button variant="primary" onClick={handleBack}>
                            Go to My Applications
                        </Button>
                    </div>
                </Alert>
            </Container>
        );
    }

    if (!certificate) {
        return (
            <Container className="mt-5">
                <Alert variant="warning">
                    <Alert.Heading>Certificate Not Found</Alert.Heading>
                    <p>The certificate you're looking for doesn't exist.</p>
                    <div className="d-flex justify-content-end">
                        <Button variant="primary" onClick={handleBack}>
                            View My Applications
                        </Button>
                    </div>
                </Alert>
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <Row className="justify-content-center">
                <Col md={10}>
                    <Card className="shadow-lg border-success">
                        <Card.Header className="bg-success text-white text-center py-4">
                            <h2>✅ TAX CLEARANCE CERTIFICATE</h2>
                            <h5>Ministry of Revenue - Ethiopia</h5>
                        </Card.Header>
                        <Card.Body className="p-5">
                            <div className="text-center mb-4">
                                <img 
                                    src="/ethiopia-flag.png" 
                                    alt="Ethiopia Flag" 
                                    style={{ width: '80px' }}
                                    onError={(e) => e.target.style.display = 'none'}
                                />
                            </div>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <p><strong>Certificate No:</strong> {certificate.tcc_number || 'N/A'}</p>
                                    <p><strong>Issue Date:</strong> {certificate.issue_date ? new Date(certificate.issue_date).toLocaleDateString() : 'N/A'}</p>
                                    <p><strong>Expiry Date:</strong> {certificate.expiry_date ? new Date(certificate.expiry_date).toLocaleDateString() : 'N/A'}</p>
                                </Col>
                                <Col md={6}>
                                    <p><strong>Taxpayer:</strong> {certificate.taxpayer_name || 'N/A'}</p>
                                    <p><strong>Business:</strong> {certificate.business_name || 'Self Employed'}</p>
                                    <p><strong>TIN:</strong> {certificate.tin || 'N/A'}</p>
                                </Col>
                            </Row>

                            <Card className="bg-light mb-4">
                                <Card.Body>
                                    <h6 className="text-center">THIS IS TO CERTIFY THAT</h6>
                                    <p className="lead text-center">
                                        <strong>{certificate.taxpayer_name}</strong>
                                        {certificate.business_name ? ` operating as ${certificate.business_name}` : ''} 
                                        with TIN <strong>{certificate.tin}</strong> has fulfilled all tax obligations 
                                        and is in good standing with the Ministry of Revenue.
                                    </p>
                                </Card.Body>
                            </Card>

                            <Row className="mb-4">
                                <Col md={8}>
                                    <p><strong>Period Verified:</strong> {
                                        certificate.period || 
                                        (certificate.issue_date && certificate.expiry_date ? 
                                            `${new Date(certificate.issue_date).toLocaleDateString()} - ${new Date(certificate.expiry_date).toLocaleDateString()}` : 
                                            'N/A')
                                    }</p>
                                    <p><strong>Status:</strong> <span className="text-success fw-bold">✅ COMPLIANT</span></p>
                                </Col>
                                <Col md={4} className="text-center">
                                    <div className="border p-3 rounded">
                                        <p className="mb-2"><strong>QR CODE</strong></p>
                                        <div style={{ 
                                            width: '100px', 
                                            height: '100px', 
                                            margin: '0 auto',
                                            background: '#f0f0f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid #ddd',
                                            borderRadius: '5px'
                                        }}>
                                            <span style={{ fontSize: '40px' }}>🔲</span>
                                        </div>
                                        <small className="text-muted">Scan to verify</small>
                                    </div>
                                </Col>
                            </Row>

                            <hr />

                            <Row>
                                <Col md={6}>
                                    <p>
                                        <strong>Authorized by:</strong><br />
                                        {certificate.reviewed_by_name || 'Town Administrator'}<br />
                                        Town Administrator<br />
                                        {certificate.town_name || 'Local Town Administration'}
                                    </p>
                                </Col>
                                <Col md={6} className="text-end">
                                    <p>
                                        <strong>Issued by:</strong><br />
                                        Ministry of Revenue<br />
                                        Federal Democratic Republic of Ethiopia
                                    </p>
                                </Col>
                            </Row>

                            <div className="text-center mt-4">
                                <small className="text-muted">
                                    * This is an electronically generated certificate. No signature required.
                                </small>
                            </div>
                        </Card.Body>
                        <Card.Footer className="bg-white text-center py-3">
                            <Button variant="success" onClick={handleDownload} className="me-2">
                                📥 Download PDF
                            </Button>
                            <Button variant="outline-secondary" onClick={handleBack}>
                                ← Back to Applications
                            </Button>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default TCCCertificate;