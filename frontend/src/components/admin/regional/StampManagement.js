import React, { useState, useEffect } from 'react';
import {
    Container, Row, Col, Card, Button, Form, Alert,
    Spinner, Image, Badge, Modal
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { getUser } from '../../../utils/auth';

const StampManagement = () => {
    const [user, setUser] = useState(null);
    const [stamp, setStamp] = useState(null);
    const [stampPreview, setStampPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || (currentUser.role !== 'regional_admin' && !currentUser.is_super_admin)) {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchStampInfo();
    }, []);

    const fetchStampInfo = async () => {
        try {
            const response = await api.get('/regional-admin/stamp-info');
            setStamp(response.data.stamp);
            if (response.data.stamp?.stamp_path) {
                setStampPreview(`http://localhost:5000/${response.data.stamp.stamp_path}`);
            }
        } catch (error) {
            console.error('Error fetching stamp info:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
            if (!validTypes.includes(file.type)) {
                setError('Please upload PNG or JPEG images only');
                return;
            }

            // Validate file size (2MB)
            if (file.size > 2 * 1024 * 1024) {
                setError('File size must be less than 2MB');
                return;
            }

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setStampPreview(reader.result);
            };
            reader.readAsDataURL(file);
            
            setStamp(file);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!stamp) {
            setError('Please select a stamp image');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        const formData = new FormData();
        formData.append('stamp', stamp);

        try {
            const response = await api.post('/regional-admin/upload-stamp', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setSuccess('Stamp uploaded successfully! It will be reviewed by super admin.');
                setTimeout(() => {
                    navigate('/regional/dashboard');
                }, 3000);
            }
        } catch (error) {
            console.error('Error uploading stamp:', error);
            setError(error.response?.data?.error || 'Failed to upload stamp');
        } finally {
            setUploading(false);
            setShowConfirmModal(false);
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
        <Container className="mt-4">
            <Row className="justify-content-center">
                <Col md={8}>
                    <Card className="shadow">
                        <Card.Header className="bg-primary text-white">
                            <h4 className="mb-0">🏛️ Official Stamp Management</h4>
                            <small>Upload your regional admin stamp for TCC certificates</small>
                        </Card.Header>

                        <Card.Body className="p-4">
                            {error && <Alert variant="danger">{error}</Alert>}
                            {success && <Alert variant="success">{success}</Alert>}

                            {/* Current Stamp Status */}
                            <Card className="mb-4 bg-light">
                                <Card.Body>
                                    <h6>Current Stamp Status:</h6>
                                    {stamp?.stamp_path ? (
                                        <div className="text-center">
                                            <Image 
                                                src={`http://localhost:5000/${stamp.stamp_path}`}
                                                style={{ maxHeight: '150px', maxWidth: '200px' }}
                                                className="border rounded p-2"
                                            />
                                            <div className="mt-2">
                                                <Badge bg={stamp.stamp_approved ? 'success' : 'warning'}>
                                                    {stamp.stamp_approved ? '✅ Approved' : '⏳ Pending Approval'}
                                                </Badge>
                                                <p className="text-muted mt-2">
                                                    Uploaded: {new Date(stamp.stamp_uploaded_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <Alert variant="info">
                                            No stamp uploaded yet. Please upload your official stamp.
                                        </Alert>
                                    )}
                                </Card.Body>
                            </Card>

                            {/* Stamp Guidelines */}
                            <Card className="mb-4 border-info">
                                <Card.Header className="bg-info text-white">
                                    <h6 className="mb-0">📋 Stamp Guidelines</h6>
                                </Card.Header>
                                <Card.Body>
                                    <ul className="mb-0">
                                        <li>Use official regional admin stamp with clear impression</li>
                                        <li>Format: PNG or JPEG (transparent background preferred)</li>
                                        <li>Maximum size: 2MB</li>
                                        <li>Recommended dimensions: 300x300 pixels</li>
                                        <li>Stamp will appear on all TCC certificates issued in your region</li>
                                        <li>Must be approved by super admin before use</li>
                                    </ul>
                                </Card.Body>
                            </Card>

                            {/* Upload Form */}
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Select Stamp Image</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept=".png,.jpg,.jpeg"
                                        onChange={handleFileChange}
                                    />
                                    <Form.Text className="text-muted">
                                        Upload a clear image of your official stamp
                                    </Form.Text>
                                </Form.Group>

                                {stampPreview && (
                                    <Card className="mb-3">
                                        <Card.Header>Preview</Card.Header>
                                        <Card.Body className="text-center">
                                            <Image 
                                                src={stampPreview} 
                                                style={{ maxHeight: '200px', maxWidth: '250px' }}
                                                className="border rounded"
                                            />
                                        </Card.Body>
                                    </Card>
                                )}

                                <div className="d-grid gap-2">
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={() => setShowConfirmModal(true)}
                                        disabled={!stamp || uploading}
                                    >
                                        {uploading ? (
                                            <>
                                                <Spinner size="sm" className="me-2" />
                                                Uploading...
                                            </>
                                        ) : (
                                            'Upload Stamp for Approval'
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => navigate('/regional/dashboard')}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Confirmation Modal */}
            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Stamp Upload</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>By uploading this stamp, you confirm that:</p>
                    <ul>
                        <li>This is your official regional admin stamp</li>
                        <li>It will be used on all TCC certificates in your region</li>
                        <li>You understand it requires super admin approval</li>
                    </ul>
                    <Alert variant="warning">
                        The stamp will not appear on certificates until approved by super admin.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleUpload}>
                        Confirm Upload
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default StampManagement;