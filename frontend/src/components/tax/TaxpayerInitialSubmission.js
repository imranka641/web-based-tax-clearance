import React, { useState, useEffect } from 'react';
import {
    Container, Row, Col, Card, Form, Button, Alert,
    Spinner, ProgressBar, Badge, Modal
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser, setUser } from '../../utils/auth';
import { useLanguage } from '../../contexts/LanguageContext';

const TaxpayerInitialSubmission = () => {
    const [user, setUser] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [suggestedCategory, setSuggestedCategory] = useState(null);
    const navigate = useNavigate();
    const { t } = useLanguage();

    // Form data
    const [formData, setFormData] = useState({
        // Financial Data
        last_year_income: '',
        last_year_tax_paid: '',
        business_start_date: '',
        employee_count: '',
        business_type: 'retail',
        
        // Documents
        tax_certificate: null,
        business_license: null,
        financial_statement: null,
        
        // Declaration
        agree_terms: false
    });

    // Document preview
    const [documentPreviews, setDocumentPreviews] = useState({
        tax_certificate: null,
        business_license: null,
        financial_statement: null
    });

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'taxpayer') {
            navigate('/login');
            return;
        }

        // Check if already submitted
        if (currentUser.profile_completed) {
            navigate('/dashboard');
            return;
        }

        setUser(currentUser);
        fetchCategories();
    }, [navigate]);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/taxpayer/tax-categories');
            setCategories(response.data.categories);
        } catch (error) {
            setError('Failed to load tax categories');
        } finally {
            setLoading(false);
        }
    };

    // Auto-suggest category based on income
    useEffect(() => {
        if (formData.last_year_income && categories.length > 0) {
            const income = parseFloat(formData.last_year_income);
            
            // Find matching category
            const matched = categories.find(cat => {
                if (cat.max_income) {
                    return income >= cat.min_income && income <= cat.max_income;
                } else {
                    return income >= cat.min_income;
                }
            });

            if (matched) {
                setSuggestedCategory(matched);
            }
        }
    }, [formData.last_year_income, categories]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        const file = files[0];
        
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                setError(`${name} must be JPEG, PNG, or PDF`);
                return;
            }

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                setError(`${name} must be less than 10MB`);
                return;
            }

            setFormData(prev => ({
                ...prev,
                [name]: file
            }));

            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setDocumentPreviews(prev => ({
                ...prev,
                [name]: previewUrl
            }));
        }
    };

    const calculateConfidence = () => {
        let score = 0;
        
        // Check if all required fields are filled
        if (formData.last_year_income) score += 20;
        if (formData.last_year_tax_paid) score += 20;
        if (formData.business_start_date) score += 15;
        if (formData.employee_count) score += 15;
        if (formData.tax_certificate) score += 10;
        if (formData.business_license) score += 10;
        if (formData.financial_statement) score += 10;
        
        return score;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        // Validate required fields
        if (!formData.last_year_income || !formData.last_year_tax_paid || 
            !formData.tax_certificate || !formData.business_license) {
            setError('Please fill all required fields and upload required documents');
            setSubmitting(false);
            return;
        }

        if (!formData.agree_terms) {
            setError('You must agree to the terms and conditions');
            setSubmitting(false);
            return;
        }

        try {
            const submitData = new FormData();
            
            // Append all form fields
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && key !== 'agree_terms') {
                    submitData.append(key, formData[key]);
                }
            });

            // Send to server
            const response = await api.post('/taxpayer/submit-initial-data', submitData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setSuccess(true);
                
                // Update user in localStorage to mark profile as completed
                const updatedUser = { ...user, profile_completed: true };
                setUser(updatedUser);
                
                // Show success message then redirect
                setTimeout(() => {
                    navigate('/taxpayer/pending-verification');
                }, 3000);
            }

        } catch (error) {
            setError(error.response?.data?.error || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" />
                <p className="mt-3">Loading submission form...</p>
            </Container>
        );
    }

    const confidenceScore = calculateConfidence();

    return (
        <Container className="mt-4">
            <Row className="justify-content-center">
                <Col md={10}>
                    <Card className="shadow-lg">
                        <Card.Header className="bg-primary text-white">
                            <h3 className="mb-0">📝 One-Time Taxpayer Registration</h3>
                            <small>This information will be used for all future tax calculations</small>
                        </Card.Header>

                        <Card.Body className="p-4">
                            {error && <Alert variant="danger">{error}</Alert>}
                            
                            {success ? (
                                <Alert variant="success" className="text-center p-4">
                                    <h4>✅ Submission Successful!</h4>
                                    <p>Your information has been submitted for verification.</p>
                                    <p>You will be redirected shortly...</p>
                                    <Spinner animation="border" size="sm" />
                                </Alert>
                            ) : (
                                <Form onSubmit={handleSubmit}>
                                    {/* Progress Indicator */}
                                    <Card className="mb-4 bg-light">
                                        <Card.Body>
                                            <h6>Profile Completion</h6>
                                            <ProgressBar 
                                                now={confidenceScore} 
                                                label={`${confidenceScore}%`}
                                                variant={confidenceScore > 80 ? 'success' : confidenceScore > 50 ? 'warning' : 'danger'}
                                            />
                                            <small className="text-muted">
                                                {confidenceScore < 100 ? 'Complete all sections for faster approval' : 'Ready for submission!'}
                                            </small>
                                        </Card.Body>
                                    </Card>

                                    {/* Category Suggestion */}
                                    {suggestedCategory && (
                                        <Card className="mb-4 border-info">
                                            <Card.Body className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h6 className="text-info mb-1">📊 Suggested Tax Category</h6>
                                                    <h4>
                                                        <Badge bg="info" className="me-2">
                                                            {suggestedCategory.category_code}
                                                        </Badge>
                                                        {suggestedCategory.category_name}
                                                    </h4>
                                                    <p className="mb-0">
                                                        Based on your income of ETB {parseFloat(formData.last_year_income).toLocaleString()}
                                                    </p>
                                                </div>
                                                <Button 
                                                    variant="outline-info"
                                                    onClick={() => setShowCategoryModal(true)}
                                                >
                                                    View Details
                                                </Button>
                                            </Card.Body>
                                        </Card>
                                    )}

                                    {/* Business Information */}
                                    <Card className="mb-4">
                                        <Card.Header className="bg-light">
                                            <h5 className="mb-0">🏢 Business Information</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Business Name</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={user?.business_name || ''}
                                                            disabled
                                                            readOnly
                                                        />
                                                        <Form.Text>From your registration</Form.Text>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>TIN Number</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={user?.tin || ''}
                                                            disabled
                                                            readOnly
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Business Start Date *</Form.Label>
                                                        <Form.Control
                                                            type="date"
                                                            name="business_start_date"
                                                            value={formData.business_start_date}
                                                            onChange={handleInputChange}
                                                            required
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Number of Employees *</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            name="employee_count"
                                                            value={formData.employee_count}
                                                            onChange={handleInputChange}
                                                            placeholder="e.g., 5"
                                                            required
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <Form.Group className="mb-3">
                                                <Form.Label>Business Type *</Form.Label>
                                                <Form.Select
                                                    name="business_type"
                                                    value={formData.business_type}
                                                    onChange={handleInputChange}
                                                    required
                                                >
                                                    <option value="retail">Retail / Trading</option>
                                                    <option value="service">Service Provider</option>
                                                    <option value="manufacturing">Manufacturing</option>
                                                    <option value="import_export">Import/Export</option>
                                                    <option value="professional">Professional Services</option>
                                                    <option value="other">Other</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Card.Body>
                                    </Card>

                                    {/* Financial Information */}
                                    <Card className="mb-4">
                                        <Card.Header className="bg-light">
                                            <h5 className="mb-0">💰 Financial Information (Last Fiscal Year)</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Total Annual Income (ETB) *</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            name="last_year_income"
                                                            value={formData.last_year_income}
                                                            onChange={handleInputChange}
                                                            placeholder="e.g., 1500000"
                                                            required
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                        <Form.Text>Your total revenue for the last fiscal year</Form.Text>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Tax Paid Last Year (ETB) *</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            name="last_year_tax_paid"
                                                            value={formData.last_year_tax_paid}
                                                            onChange={handleInputChange}
                                                            placeholder="e.g., 225000"
                                                            required
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                        <Form.Text>Amount of tax you paid last year</Form.Text>
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            {/* Tax Calculation Preview */}
                                            {formData.last_year_income && formData.last_year_tax_paid && (
                                                <Alert variant="info" className="mt-3">
                                                    <h6>📊 Tax Ratio Analysis</h6>
                                                    <p className="mb-0">
                                                        Your tax-to-income ratio: 
                                                        <strong> {((formData.last_year_tax_paid / formData.last_year_income) * 100).toFixed(2)}%</strong>
                                                    </p>
                                                    <small>This helps us verify your category assignment</small>
                                                </Alert>
                                            )}
                                        </Card.Body>
                                    </Card>

                                    {/* Document Upload */}
                                    <Card className="mb-4">
                                        <Card.Header className="bg-light">
                                            <h5 className="mb-0">📎 Required Documents</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <Row>
                                                <Col md={4}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Last Year Tax Certificate *</Form.Label>
                                                        <Form.Control
                                                            type="file"
                                                            name="tax_certificate"
                                                            onChange={handleFileChange}
                                                            accept=".jpg,.jpeg,.png,.pdf"
                                                            required
                                                        />
                                                        <Form.Text>PDF or image (max 10MB)</Form.Text>
                                                        {documentPreviews.tax_certificate && (
                                                            <div className="mt-2">
                                                                <Badge bg="success">✓ Uploaded</Badge>
                                                            </div>
                                                        )}
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Business License *</Form.Label>
                                                        <Form.Control
                                                            type="file"
                                                            name="business_license"
                                                            onChange={handleFileChange}
                                                            accept=".jpg,.jpeg,.png,.pdf"
                                                            required
                                                        />
                                                        <Form.Text>Renewed license</Form.Text>
                                                        {documentPreviews.business_license && (
                                                            <div className="mt-2">
                                                                <Badge bg="success">✓ Uploaded</Badge>
                                                            </div>
                                                        )}
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Financial Statement</Form.Label>
                                                        <Form.Control
                                                            type="file"
                                                            name="financial_statement"
                                                            onChange={handleFileChange}
                                                            accept=".jpg,.jpeg,.png,.pdf"
                                                        />
                                                        <Form.Text>Optional but recommended</Form.Text>
                                                        {documentPreviews.financial_statement && (
                                                            <div className="mt-2">
                                                                <Badge bg="success">✓ Uploaded</Badge>
                                                            </div>
                                                        )}
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>

                                    {/* Declaration */}
                                    <Card className="mb-4 border-warning">
                                        <Card.Body>
                                            <Form.Group className="mb-3">
                                                <Form.Check
                                                    type="checkbox"
                                                    label={`
                                                        I declare that all information provided is true and correct. 
                                                        I understand that providing false information may result in 
                                                        legal consequences and penalties.
                                                    `}
                                                    checked={formData.agree_terms}
                                                    onChange={(e) => setFormData({...formData, agree_terms: e.target.checked})}
                                                    required
                                                />
                                            </Form.Group>

                                            <Form.Group className="mb-3">
                                                <Form.Check
                                                    type="checkbox"
                                                    label={`
                                                        I consent to the storage and processing of my documents and data 
                                                        for tax administration purposes.
                                                    `}
                                                    required
                                                />
                                            </Form.Group>
                                        </Card.Body>
                                    </Card>

                                    {/* Submit Button */}
                                    <div className="d-grid">
                                        <Button
                                            variant="success"
                                            type="submit"
                                            size="lg"
                                            disabled={submitting || confidenceScore < 80}
                                        >
                                            {submitting ? (
                                                <>
                                                    <Spinner size="sm" className="me-2" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                'Submit for Verification'
                                            )}
                                        </Button>
                                        {confidenceScore < 80 && (
                                            <small className="text-warning text-center mt-2">
                                                Please complete all required fields before submitting
                                            </small>
                                        )}
                                    </div>
                                </Form>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Category Details Modal */}
            <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Tax Category Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {suggestedCategory && (
                        <>
                            <h4>
                                <Badge bg="info">{suggestedCategory.category_code}</Badge>
                                {' '}{suggestedCategory.category_name}
                            </h4>
                            
                            <h6 className="mt-3">Income Range:</h6>
                            <p>
                                ETB {suggestedCategory.min_income?.toLocaleString()}
                                {suggestedCategory.max_income ? 
                                    ` - ${suggestedCategory.max_income.toLocaleString()}` : 
                                    ' and above'
                                }
                            </p>

                            <h6>Tax Calculation Method:</h6>
                            <p>
                                {suggestedCategory.formula_type === 'percentage_of_last_year' && 
                                    `${suggestedCategory.multiplier}x of last year's tax`
                                }
                                {suggestedCategory.formula_type === 'percentage_of_income' && 
                                    `${suggestedCategory.base_rate}% of annual income`
                                }
                                {suggestedCategory.formula_type === 'fixed_amount' && 
                                    `Fixed amount of ETB ${suggestedCategory.fixed_amount?.toLocaleString()}`
                                }
                            </p>

                            <h6>Estimated Tax (based on your data):</h6>
                            <h3 className="text-primary">
                                ETB {(parseFloat(formData.last_year_tax_paid) * 
                                    (suggestedCategory.multiplier || 1)).toLocaleString()}
                            </h3>

                            <Alert variant="info" className="mt-3">
                                <small>
                                    This is an estimate. Final amount will be confirmed after verification.
                                </small>
                            </Alert>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default TaxpayerInitialSubmission;