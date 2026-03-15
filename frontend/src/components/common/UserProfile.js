import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser, setUser } from '../../utils/auth';

const UserProfile = () => {
    const [user, setUserState] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        phone: '',
        business_name: '',
        last_year_tax_amount: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser) {
            navigate('/login');
            return;
        }
        setUserState(currentUser);
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users/profile');
            setProfile(response.data);
            setFormData({
                phone: response.data.user?.phone || '',
                business_name: response.data.user?.business_name || '',
                last_year_tax_amount: response.data.user?.last_year_tax_amount || ''
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
            setError(error.response?.data?.error || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            // Update phone and business name
            await api.put('/users/update-profile', {
                phone: formData.phone,
                business_name: formData.business_name
            });

            // Update last year tax amount if provided
            if (formData.last_year_tax_amount) {
                await api.put('/users/update-last-year-tax', {
                    last_year_tax_amount: formData.last_year_tax_amount
                });
            }

            setSuccess('Profile updated successfully');
            
            // Refresh profile data
            await fetchProfile();
            
        } catch (error) {
            console.error('Update error:', error);
            setError(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const getRoleBadge = () => {
        if (!user) return null;
        
        if (user.is_super_admin) return <Badge bg="danger">Super Admin</Badge>;
        if (user.role === 'regional_admin') return <Badge bg="success">Regional Admin</Badge>;
        if (user.role === 'town_admin') return <Badge bg="info">Town Admin</Badge>;
        if (user.role === 'staff') return <Badge bg="warning">Staff</Badge>;
        return <Badge bg="primary">Taxpayer</Badge>;
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
                            <h4 className="mb-0">User Profile</h4>
                        </Card.Header>
                        <Card.Body>
                            {error && <Alert variant="danger">{error}</Alert>}
                            {success && <Alert variant="success">{success}</Alert>}

                            <div className="text-center mb-4">
                                <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                                    <i className="fas fa-user fa-3x text-primary"></i>
                                </div>
                                <h5>{user?.full_name}</h5>
                                <div>{getRoleBadge()}</div>
                            </div>

                            <Form onSubmit={handleSubmit}>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Email</Form.Label>
                                            <Form.Control
                                                type="email"
                                                value={user?.email || ''}
                                                disabled
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>TIN</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={user?.tin || 'N/A'}
                                                disabled
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Region</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={profile?.user?.region_name || 'Not Assigned'}
                                                disabled
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Town</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={profile?.user?.town_name || 'Not Assigned'}
                                                disabled
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Phone</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="Enter phone number"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Business Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="business_name"
                                                value={formData.business_name}
                                                onChange={handleChange}
                                                placeholder="Enter business name"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {user?.role === 'taxpayer' && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Last Year Tax Amount (ETB)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="last_year_tax_amount"
                                            value={formData.last_year_tax_amount}
                                            onChange={handleChange}
                                            placeholder="Enter last year tax amount"
                                            step="0.01"
                                        />
                                        <Form.Text className="text-muted">
                                            Used to calculate current year tax estimates
                                        </Form.Text>
                                    </Form.Group>
                                )}

                                {profile?.payment_stats && (
                                    <div className="bg-light p-3 rounded mb-3">
                                        <h6>Payment Statistics</h6>
                                        <Row>
                                            <Col md={3}>
                                                <small>Total Payments:</small>
                                                <br />
                                                <strong>{profile.payment_stats.total_payments || 0}</strong>
                                            </Col>
                                            <Col md={3}>
                                                <small>Total Paid:</small>
                                                <br />
                                                <strong>ETB {profile.payment_stats.total_paid?.toLocaleString() || 0}</strong>
                                            </Col>
                                            <Col md={3}>
                                                <small>Completed:</small>
                                                <br />
                                                <strong>{profile.payment_stats.completed_payments || 0}</strong>
                                            </Col>
                                            <Col md={3}>
                                                <small>Pending:</small>
                                                <br />
                                                <strong>{profile.payment_stats.pending_reviews || 0}</strong>
                                            </Col>
                                        </Row>
                                    </div>
                                )}

                                <div className="d-grid">
                                    <Button variant="primary" type="submit" disabled={saving}>
                                        {saving ? 'Saving...' : 'Update Profile'}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default UserProfile;