import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge, ProgressBar, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { useLanguage } from '../../contexts/LanguageContext';

const TaxPaymentPage = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [currentYearTax, setCurrentYearTax] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const navigate = useNavigate();
    const { t } = useLanguage();

    const [formData, setFormData] = useState({
        payment_method_id: '',
        account_number: '',
        confirm_payment: false
    });

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'taxpayer') {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchPaymentData();
    }, [navigate]);

    const fetchPaymentData = async () => {
        try {
            const [profileRes, taxRes, methodsRes] = await Promise.all([
                api.get('/taxpayer/my-profile'),
                api.get('/taxpayer/current-year-tax'),
                api.get('/tax/payment-methods')
            ]);

            setProfile(profileRes.data.profile);
            setCurrentYearTax(taxRes.data);
            setPaymentMethods(methodsRes.data.payment_methods);

            // Auto-fill account number from user's phone if available
            const currentUser = getUser();
            if (currentUser?.phone) {
                setFormData(prev => ({
                    ...prev,
                    account_number: currentUser.phone
                }));
            }
        } catch (error) {
            console.error('Error fetching payment data:', error);
            setError('Failed to load payment data');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                setError('Please upload JPEG, PNG, or PDF files only');
                return;
            }

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }

            setReceiptFile(file);
            
            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setReceiptPreview(previewUrl);
            setError('');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate form
        if (!formData.payment_method_id) {
            setError('Please select a payment method');
            return;
        }
        if (!formData.account_number) {
            setError('Please enter your account number');
            return;
        }
        if (!receiptFile) {
            setError('Please upload your payment receipt');
            return;
        }
        if (!formData.confirm_payment) {
            setError('Please confirm that you have made the payment');
            return;
        }

        // Show confirmation modal
        setShowConfirmModal(true);
    };

    const processPayment = async () => {
        setSubmitting(true);
        setError('');

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('tax_type_id', profile?.category_id || 1);
            formDataToSend.append('tax_amount', currentYearTax?.amount || 0);
            formDataToSend.append('payment_method_id', formData.payment_method_id);
            formDataToSend.append('account_number', formData.account_number);
            formDataToSend.append('receipt', receiptFile);

            const response = await api.post('/tax/process-payment-manual', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/tax/history');
                }, 3000);
            }
        } catch (error) {
            console.error('Payment error:', error);
            setError(error.response?.data?.error || 'Payment submission failed');
        } finally {
            setSubmitting(false);
            setShowConfirmModal(false);
        }
    };

    const getCategoryColor = (category) => {
        const colors = {
            'A': 'danger',
            'B': 'warning',
            'C': 'info',
            'D': 'primary',
            'E': 'secondary'
        };
        return colors[category] || 'light';
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading payment page...</p>
            </Container>
        );
    }

    if (!profile || profile.verification_status !== 'verified') {
        return (
            <Container className="mt-5">
                <Alert variant="warning">
                    <Alert.Heading>Account Not Verified</Alert.Heading>
                    <p>Your account is still pending verification. You can only make payments after your profile is verified by the town admin.</p>
                    <Button variant="primary" href="/taxpayer/pending-verification">
                        Check Verification Status
                    </Button>
                </Alert>
            </Container>
        );
    }

    if (currentYearTax?.paid) {
        return (
            <Container className="mt-5">
                <Alert variant="success">
                    <Alert.Heading>✅ Tax Already Paid</Alert.Heading>
                    <p>You have already paid your tax for the current year.</p>
                    <Button variant="primary" href="/tax/history">
                        View Payment History
                    </Button>
                </Alert>
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <Row className="justify-content-center">
                <Col md={10}>
                    <Card className="shadow-lg border-0">
                        <Card.Header className="bg-primary text-white py-3">
                            <h3 className="mb-0">💰 Tax Payment</h3>
                            <small>Complete your payment in 3 simple steps</small>
                        </Card.Header>

                        <Card.Body className="p-4">
                            {error && <Alert variant="danger">{error}</Alert>}
                            {success && (
                                <Alert variant="success">
                                    <Alert.Heading>✅ Payment Submitted Successfully!</Alert.Heading>
                                    <p>Your payment receipt has been sent to the town admin for verification. You will be notified once approved.</p>
                                    <ProgressBar animated now={100} variant="success" />
                                    <p className="mt-2">Redirecting to payment history...</p>
                                </Alert>
                            )}

                            {!success && (
                                <Form onSubmit={handleSubmit}>
                                    {/* Step 1: Tax Summary */}
                                    <Card className="mb-4 border-primary">
                                        <Card.Header className="bg-light">
                                            <h5 className="mb-0">Step 1: Tax Summary</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <Row>
                                                <Col md={6}>
                                                    <p><strong>Tax Year:</strong> 2024</p>
                                                    <p><strong>Tax Type:</strong> Income Tax</p>
                                                    <p>
                                                        <strong>Your Category:</strong>{' '}
                                                        <Badge bg={getCategoryColor(profile.category_code)}>
                                                            Category {profile.category_code}
                                                        </Badge>
                                                    </p>
                                                </Col>
                                                <Col md={6}>
                                                    <p><strong>Amount Due:</strong></p>
                                                    <h2 className="text-primary">
                                                        ETB {currentYearTax?.amount?.toLocaleString() || '0'}
                                                    </h2>
                                                    <p className="text-muted">
                                                        <small>Based on last year's tax × {profile.multiplier || 1.15}</small>
                                                    </p>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>

                                    {/* Step 2: Payment Method */}
                                    <Card className="mb-4 border-warning">
                                        <Card.Header className="bg-light">
                                            <h5 className="mb-0">Step 2: Select Payment Method</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Payment Method *</Form.Label>
                                                        <Form.Select
                                                            name="payment_method_id"
                                                            value={formData.payment_method_id}
                                                            onChange={handleInputChange}
                                                            required
                                                        >
                                                            <option value="">Choose payment method</option>
                                                            {paymentMethods.map(method => (
                                                                <option key={method.id} value={method.id}>
                                                                    {method.name} - {method.account_number}
                                                                </option>
                                                            ))}
                                                        </Form.Select>
                                                        <Form.Text className="text-muted">
                                                            Select where you made the payment
                                                        </Form.Text>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Your Account Number *</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="account_number"
                                                            value={formData.account_number}
                                                            onChange={handleInputChange}
                                                            placeholder="Enter your account number"
                                                            required
                                                        />
                                                        <Form.Text className="text-muted">
                                                            The account you used for payment
                                                        </Form.Text>
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>

                                    {/* Step 3: Upload Receipt */}
                                    <Card className="mb-4 border-success">
                                        <Card.Header className="bg-light">
                                            <h5 className="mb-0">Step 3: Upload Payment Receipt</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <Row>
                                                <Col md={8}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Payment Receipt *</Form.Label>
                                                        <Form.Control
                                                            type="file"
                                                            accept=".jpg,.jpeg,.png,.pdf"
                                                            onChange={handleFileChange}
                                                            required
                                                        />
                                                        <Form.Text className="text-muted">
                                                            Upload a clear photo or scan of your payment receipt (Max 5MB)
                                                        </Form.Text>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    {receiptPreview && (
                                                        <div className="text-center">
                                                            {receiptFile?.type?.includes('image') ? (
                                                                <img 
                                                                    src={receiptPreview} 
                                                                    alt="Receipt preview" 
                                                                    style={{ maxWidth: '100%', maxHeight: '100px' }}
                                                                    className="border rounded"
                                                                />
                                                            ) : (
                                                                <div className="border rounded p-2">
                                                                    <i className="fas fa-file-pdf fa-2x text-danger"></i>
                                                                    <p className="small mb-0">PDF Receipt</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>

                                    {/* Confirmation */}
                                    <Card className="mb-4 border-info">
                                        <Card.Body>
                                            <Form.Group className="mb-3">
                                                <Form.Check
                                                    type="checkbox"
                                                    label={`
                                                        I confirm that I have made the payment of 
                                                        ETB ${currentYearTax?.amount?.toLocaleString()} 
                                                        using the selected payment method.
                                                    `}
                                                    name="confirm_payment"
                                                    checked={formData.confirm_payment}
                                                    onChange={(e) => setFormData({
                                                        ...formData, 
                                                        confirm_payment: e.target.checked
                                                    })}
                                                    required
                                                />
                                            </Form.Group>

                                            <Alert variant="info" className="mb-0">
                                                <i className="fas fa-info-circle me-2"></i>
                                                Your payment will be verified by the town admin. 
                                                You will receive a notification once approved.
                                            </Alert>
                                        </Card.Body>
                                    </Card>

                                    {/* Submit Button */}
                                    <div className="d-grid">
                                        <Button 
                                            variant="success" 
                                            type="submit" 
                                            size="lg"
                                            disabled={submitting}
                                        >
                                            {submitting ? (
                                                <>
                                                    <Spinner size="sm" className="me-2" />
                                                    Processing...
                                                </>
                                            ) : (
                                                'Submit Payment for Verification'
                                            )}
                                        </Button>
                                    </div>
                                </Form>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Confirmation Modal */}
            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
                <Modal.Header closeButton className="bg-warning">
                    <Modal.Title>Confirm Payment Submission</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Please review your payment details:</p>
                    
                    <Card className="bg-light mb-3">
                        <Card.Body>
                            <p><strong>Amount:</strong> ETB {currentYearTax?.amount?.toLocaleString()}</p>
                            <p><strong>Payment Method:</strong> {
                                paymentMethods.find(m => m.id === parseInt(formData.payment_method_id))?.name
                            }</p>
                            <p><strong>Account Number:</strong> {formData.account_number}</p>
                            <p><strong>Receipt:</strong> {receiptFile?.name}</p>
                        </Card.Body>
                    </Card>

                    <Alert variant="info">
                        <i className="fas fa-clock me-2"></i>
                        After submission, your payment will be sent to the town admin for verification. 
                        This usually takes 1-2 business days.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={processPayment} disabled={submitting}>
                        {submitting ? 'Processing...' : 'Confirm & Submit'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default TaxPaymentPage;