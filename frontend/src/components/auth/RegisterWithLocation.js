import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { setToken, setUser } from '../../utils/auth';
import { useLanguage } from '../../contexts/LanguageContext';

const RegisterWithLocation = () => {
    const [formData, setFormData] = useState({
        full_name: '',
        tin: '',
        fayda_number: '',
        national_id_number: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        business_name: '',
        region_id: '',
        town_id: ''
    });

    const [nationalIdFile, setNationalIdFile] = useState(null);
    const [regions, setRegions] = useState([]);
    const [towns, setTowns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingLocations, setFetchingLocations] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { t } = useLanguage();

    useEffect(() => {
        fetchRegions();
    }, []);

    useEffect(() => {
        if (formData.region_id) {
            fetchTowns(formData.region_id);
        } else {
            setTowns([]);
        }
    }, [formData.region_id]);

    const fetchRegions = async () => {
        try {
            setFetchingLocations(true);
            console.log('Fetching regions...');
            
            const response = await api.get('/locations/regions');
            console.log('Full API response:', response);
            
            // Check different possible response structures
            if (response.data) {
                console.log('Response data:', response.data);
                
                // Handle different response formats
                let regionsData = [];
                if (response.data.regions) {
                    regionsData = response.data.regions;
                } else if (Array.isArray(response.data)) {
                    regionsData = response.data;
                } else if (response.data.data && response.data.data.regions) {
                    regionsData = response.data.data.regions;
                }
                
                console.log('Extracted regions:', regionsData);
                
                if (regionsData && regionsData.length > 0) {
                    setRegions(regionsData);
                    setError('');
                } else {
                    console.warn('No regions found in response');
                    setError('No regions found. Please contact support.');
                }
            } else {
                console.error('Unexpected response structure:', response);
                setError('Failed to load regions. Unexpected response format.');
            }
        } catch (error) {
            console.error('Error fetching regions:', error);
            setError('Failed to load regions. Please check your connection and try again.');
            
            // Log detailed error
            if (error.response) {
                console.error('Error response:', error.response.data);
                console.error('Error status:', error.response.status);
            } else if (error.request) {
                console.error('No response received:', error.request);
            } else {
                console.error('Error message:', error.message);
            }
        } finally {
            setFetchingLocations(false);
        }
    };

    const fetchTowns = async (regionId) => {
        try {
            console.log('Fetching towns for region:', regionId);
            
            const response = await api.get(`/locations/towns/${regionId}`);
            console.log('Towns response:', response.data);
            
            // Handle different response formats
            let townsData = [];
            if (response.data.towns) {
                townsData = response.data.towns;
            } else if (Array.isArray(response.data)) {
                townsData = response.data;
            }
            
            console.log('Extracted towns:', townsData);
            setTowns(townsData);
            
        } catch (error) {
            console.error('Error fetching towns:', error);
            setError('Failed to load towns. Please select region again.');
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                setError('Please upload JPEG, PNG, or PDF files only');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }
            
            setNationalIdFile(file);
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (!formData.region_id || !formData.town_id) {
            setError('Please select your region and town');
            setLoading(false);
            return;
        }

        if (!nationalIdFile) {
            setError('Please upload your National ID');
            setLoading(false);
            return;
        }

        try {
            const registerData = new FormData();
            registerData.append('full_name', formData.full_name);
            registerData.append('tin', formData.tin);
            registerData.append('fayda_number', formData.fayda_number);
            registerData.append('national_id_number', formData.national_id_number);
            registerData.append('email', formData.email);
            registerData.append('password', formData.password);
            registerData.append('phone', formData.phone);
            registerData.append('business_name', formData.business_name);
            registerData.append('region_id', formData.region_id);
            registerData.append('town_id', formData.town_id);
            registerData.append('national_id_file', nationalIdFile);

            const response = await api.post('/auth/register-with-id', registerData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            const { token, user } = response.data;
            setToken(token);
            setUser(user);
            
            alert('✅ Registration successful! Your ID will be verified by the town admin.');
            navigate('/dashboard');
            
        } catch (error) {
            console.error('Registration error:', error);
            setError(error.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    if (fetchingLocations) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" />
                <p className="mt-3">Loading regions...</p>
            </Container>
        );
    }

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col md={8}>
                    <Card className="shadow">
                        <Card.Header className="bg-success text-white text-center">
                            <h4>Taxpayer Registration</h4>
                            <small>Please provide all required information including your ID documents</small>
                        </Card.Header>
                        <Card.Body>
                            {error && <Alert variant="danger">{error}</Alert>}
                            
                            <Form onSubmit={handleSubmit}>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Full Name *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="full_name"
                                                value={formData.full_name}
                                                onChange={handleChange}
                                                placeholder="Enter your full name"
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>TIN *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="tin"
                                                value={formData.tin}
                                                onChange={handleChange}
                                                placeholder="Enter your TIN"
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Fayda Number *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="fayda_number"
                                                value={formData.fayda_number}
                                                onChange={handleChange}
                                                placeholder="Enter your Fayda number"
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>National ID Number *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="national_id_number"
                                                value={formData.national_id_number}
                                                onChange={handleChange}
                                                placeholder="Enter your National ID number"
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Form.Group className="mb-3">
                                    <Form.Label>Email *</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Enter your email"
                                        required
                                    />
                                </Form.Group>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Region *</Form.Label>
                                            <Form.Select
                                                name="region_id"
                                                value={formData.region_id}
                                                onChange={handleChange}
                                                required
                                            >
                                                <option value="">-- Select Region --</option>
                                                {regions && regions.length > 0 ? (
                                                    regions.map(region => (
                                                        <option key={region.id} value={region.id}>
                                                            {region.name}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="" disabled>No regions available</option>
                                                )}
                                            </Form.Select>
                                            {regions.length === 0 && !fetchingLocations && (
                                                <Form.Text className="text-danger">
                                                    No regions loaded. Please refresh the page.
                                                </Form.Text>
                                            )}
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Town/City *</Form.Label>
                                            <Form.Select
                                                name="town_id"
                                                value={formData.town_id}
                                                onChange={handleChange}
                                                required
                                                disabled={!formData.region_id}
                                            >
                                                <option value="">-- Select Town --</option>
                                                {towns && towns.length > 0 ? (
                                                    towns.map(town => (
                                                        <option key={town.id} value={town.id}>
                                                            {town.name}
                                                        </option>
                                                    ))
                                                ) : (
                                                    formData.region_id && <option value="">No towns available</option>
                                                )}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Password *</Form.Label>
                                            <Form.Control
                                                type="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                placeholder="Min. 6 characters"
                                                minLength="6"
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Confirm Password *</Form.Label>
                                            <Form.Control
                                                type="password"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="Re-enter password"
                                                minLength="6"
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Phone Number</Form.Label>
                                            <Form.Control
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="+251 XXX XXX XXX"
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
                                                placeholder="Your business name (if applicable)"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Form.Group className="mb-4">
                                    <Form.Label>Upload National ID *</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={handleFileChange}
                                        required
                                    />
                                    <Form.Text className="text-muted">
                                        Upload a clear image or PDF of your National ID (Max 5MB)
                                    </Form.Text>
                                </Form.Group>

                                {nationalIdFile && (
                                    <Alert variant="success" className="mt-2">
                                        ✅ File selected: {nationalIdFile.name}
                                    </Alert>
                                )}

                                <div className="d-grid">
                                    <Button variant="success" type="submit" disabled={loading} size="lg">
                                        {loading ? (
                                            <>
                                                <Spinner size="sm" className="me-2" />
                                                Registering...
                                            </>
                                        ) : (
                                            'Register with ID Verification'
                                        )}
                                    </Button>
                                </div>
                            </Form>

                            <div className="text-center mt-3">
                                <p>Already have an account? <Link to="/login">Login</Link></p>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default RegisterWithLocation;