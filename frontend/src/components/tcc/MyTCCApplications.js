import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const MyTCCApplications = () => {
    const [user, setUser] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'taxpayer') {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchApplications();
    }, [navigate]);

    const fetchApplications = async () => {
        try {
            const response = await api.get('/tcc/my-applications');
            console.log('Applications fetched:', response.data);
            setApplications(response.data.applications || []);
        } catch (error) {
            console.error('Error fetching TCC applications:', error);
            setError('Failed to load TCC applications');
        } finally {
            setLoading(false);
        }
    };

    // Enhanced download function with multiple fallback methods
    const handleDownload = async (applicationId, certNumber) => {
        setDownloadingId(applicationId);
        try {
            console.log(`Downloading certificate for application: ${applicationId}`);
            
            // Get token from localStorage
            const token = localStorage.getItem('token');
            
            if (!token) {
                alert('You must be logged in to download certificates');
                navigate('/login');
                return;
            }
            
            // Method 1: Direct download via API with token in headers
            const response = await fetch(`http://localhost:5000/api/tcc/download/${applicationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `TCC-${certNumber || applicationId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            alert('✅ Certificate downloaded successfully!');
            
        } catch (error) {
            console.error('Error downloading certificate:', error);
            
            // Method 2: Try using axios with token
            try {
                const token = localStorage.getItem('token');
                const response = await api.get(`/tcc/download/${applicationId}`, {
                    responseType: 'blob',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `TCC-${certNumber || applicationId}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                
                alert('✅ Certificate downloaded successfully!');
                
            } catch (axiosError) {
                console.error('Axios download also failed:', axiosError);
                
                // Method 3: Try certificate view page
                try {
                    const certResponse = await api.get(`/tcc/certificate/${applicationId}`);
                    if (certResponse.data.certificate) {
                        // If we have certificate data but download failed, try direct URL
                        window.open(`http://localhost:5000/api/tcc/download/${applicationId}`, '_blank');
                    }
                } catch (certError) {
                    alert('Certificate not available. Please contact town admin.');
                }
            }
        } finally {
            setDownloadingId(null);
        }
    };

    const handleViewCertificate = (certificateId) => {
        navigate(`/tcc/certificate/${certificateId}`);
    };

    const getStatusBadge = (status) => {
        const colors = {
            'pending': 'warning',
            'approved': 'success',
            'rejected': 'danger',
            'verified': 'info',
            'processing': 'primary'
        };
        return colors[status] || 'secondary';
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'approved': return '✅';
            case 'verified': return '✓';
            case 'rejected': return '❌';
            case 'pending': return '⏳';
            case 'processing': return '⚙️';
            default: return '📄';
        }
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading your TCC applications...</p>
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <Row>
                <Col>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2>📋 My TCC Applications</h2>
                            <p className="text-muted">
                                Welcome, {user?.full_name || user?.fullName} | {user?.business_name || user?.businessName || 'Self Employed'}
                            </p>
                        </div>
                        <Button 
                            variant="primary" 
                            as={Link} 
                            to="/tcc/apply"
                        >
                            + Apply for New TCC
                        </Button>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    {applications.length === 0 ? (
                        <Card className="text-center py-5">
                            <Card.Body>
                                <i className="fas fa-file-invoice fa-4x text-muted mb-3"></i>
                                <h4>No TCC Applications Found</h4>
                                <p className="text-muted">You haven't applied for any Tax Clearance Certificates yet.</p>
                                <Button variant="primary" as={Link} to="/tcc/apply">
                                    Apply for TCC
                                </Button>
                            </Card.Body>
                        </Card>
                    ) : (
                        <Card className="shadow-sm">
                            <Card.Header className="bg-primary text-white">
                                <h5 className="mb-0">Your TCC Applications</h5>
                            </Card.Header>
                            <Card.Body>
                                <div className="table-responsive">
                                    <Table responsive striped hover>
                                        <thead>
                                            <tr>
                                                <th>Application #</th>
                                                <th>Purpose</th>
                                                <th>Submitted Date</th>
                                                <th>Status</th>
                                                <th>Certificate #</th>
                                                <th>Valid Until</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {applications.map(app => {
                                                const isApproved = app.status === 'approved' || app.status === 'verified';
                                                const hasCertificate = app.tcc_number || app.certificate_id;
                                                
                                                return (
                                                    <tr key={app.id}>
                                                        <td>
                                                            <strong>{app.application_number || `#${app.id}`}</strong>
                                                        </td>
                                                        <td>{app.purpose?.replace(/_/g, ' ') || 'N/A'}</td>
                                                        <td>{app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : 'N/A'}</td>
                                                        <td>
                                                            <Badge bg={getStatusBadge(app.status)}>
                                                                {getStatusIcon(app.status)} {app.status?.toUpperCase()}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            {app.tcc_number ? (
                                                                <Badge bg="success">{app.tcc_number}</Badge>
                                                            ) : app.certificate_id ? (
                                                                <Badge bg="info">Certificate Available</Badge>
                                                            ) : (
                                                                <Badge bg="secondary">Not issued</Badge>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {app.expiry_date ? 
                                                                new Date(app.expiry_date).toLocaleDateString() : 
                                                                app.valid_until ? 
                                                                    new Date(app.valid_until).toLocaleDateString() : 
                                                                    'N/A'
                                                            }
                                                        </td>
                                                        <td>
                                                            <div className="d-flex gap-2">
                                                                {isApproved && (
                                                                    <>
                                                                        {app.certificate_id ? (
                                                                            <Button 
                                                                                variant="success" 
                                                                                size="sm"
                                                                                onClick={() => handleViewCertificate(app.certificate_id)}
                                                                                title="View Certificate"
                                                                            >
                                                                                👁️ View
                                                                            </Button>
                                                                        ) : (
                                                                            <Button 
                                                                                variant="success" 
                                                                                size="sm"
                                                                                onClick={() => handleDownload(app.id, app.tcc_number)}
                                                                                disabled={downloadingId === app.id}
                                                                                title="Download Certificate"
                                                                            >
                                                                                {downloadingId === app.id ? (
                                                                                    <>
                                                                                        <Spinner 
                                                                                            as="span"
                                                                                            animation="border" 
                                                                                            size="sm" 
                                                                                            role="status" 
                                                                                            aria-hidden="true" 
                                                                                            className="me-1"
                                                                                        />
                                                                                        Loading...
                                                                                    </>
                                                                                ) : (
                                                                                    '📥 Download'
                                                                                )}
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                )}
                                                                <Button 
                                                                    variant="outline-primary" 
                                                                    size="sm"
                                                                    as={Link}
                                                                    to={`/tcc/application/${app.id}`}
                                                                    title="View Details"
                                                                >
                                                                    Details
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    )}

                    {/* Summary Cards */}
                    {applications.length > 0 && (
                        <Row className="mt-4">
                            <Col md={4}>
                                <Card className="border-success">
                                    <Card.Body className="text-center">
                                        <h6 className="text-muted">Approved</h6>
                                        <h3 className="text-success">
                                            {applications.filter(a => a.status === 'approved' || a.status === 'verified').length}
                                        </h3>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={4}>
                                <Card className="border-warning">
                                    <Card.Body className="text-center">
                                        <h6 className="text-muted">Pending</h6>
                                        <h3 className="text-warning">
                                            {applications.filter(a => a.status === 'pending' || a.status === 'processing').length}
                                        </h3>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={4}>
                                <Card className="border-danger">
                                    <Card.Body className="text-center">
                                        <h6 className="text-muted">Rejected</h6>
                                        <h3 className="text-danger">
                                            {applications.filter(a => a.status === 'rejected').length}
                                        </h3>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {/* Additional Info */}
                    <Card className="mt-4 bg-light">
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <small className="text-muted">
                                        <strong>📌 Note:</strong> Approved certificates can be downloaded as PDF.
                                        The certificate is valid for one year from the date of issue.
                                    </small>
                                </Col>
                                <Col md={6} className="text-md-end">
                                    <small className="text-muted">
                                        <strong>Need help?</strong> Contact town tax office
                                    </small>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default MyTCCApplications;