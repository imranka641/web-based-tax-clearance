import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const PaymentHistoryPage = () => {
    const [user, setUser] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'taxpayer') {
            window.location.href = '/login';
            return;
        }
        setUser(currentUser);
        fetchPaymentHistory();
    }, []);

    const fetchPaymentHistory = async () => {
        try {
            const response = await api.get('/tax/payment-history');
            setPayments(response.data.payments || []);
        } catch (error) {
            console.error('Error fetching payment history:', error);
            setError('Failed to load payment history');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            'completed': 'success',
            'processing': 'warning',
            'under_review': 'info',
            'pending': 'secondary',
            'failed': 'danger',
            'rejected': 'danger'
        };
        return colors[status] || 'secondary';
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'completed': return '✅';
            case 'processing': return '⏳';
            case 'under_review': return '🔍';
            case 'pending': return '⏱️';
            case 'failed': return '❌';
            case 'rejected': return '❌';
            default: return '📄';
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
            <Row>
                <Col>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h2>📈 Payment History</h2>
                            <p className="text-muted">View all your tax payments</p>
                        </div>
                        <Button variant="primary" as={Link} to="/tax/dashboard">
                            ← Back to Dashboard
                        </Button>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Card className="shadow-sm">
                        <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0">Your Payment Records</h5>
                        </Card.Header>
                        <Card.Body>
                            {payments.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="fas fa-receipt fa-3x text-muted mb-3"></i>
                                    <h5>No payment history found</h5>
                                    <p className="text-muted">You haven't made any tax payments yet.</p>
                                    <Button variant="primary" as={Link} to="/tax/dashboard">
                                        Make Your First Payment
                                    </Button>
                                </div>
                            ) : (
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Tax Year</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th>Receipt</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map(payment => (
                                            <tr key={payment.id}>
                                                <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                                                <td>{payment.tax_year || '2024'}</td>
                                                <td>
                                                    <strong>ETB {payment.amount?.toLocaleString() || payment.declared_amount?.toLocaleString()}</strong>
                                                </td>
                                                <td>{payment.payment_method_name || 'N/A'}</td>
                                                <td>
                                                    {payment.receipt_file_path ? (
                                                        <Badge bg="success">Uploaded</Badge>
                                                    ) : (
                                                        <Badge bg="secondary">No Receipt</Badge>
                                                    )}
                                                </td>
                                                <td>
                                                    <Badge bg={getStatusBadge(payment.payment_status)}>
                                                        {getStatusIcon(payment.payment_status)} {payment.payment_status}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline-primary"
                                                        onClick={() => window.open(`http://localhost:5000/${payment.receipt_file_path}`, '_blank')}
                                                        disabled={!payment.receipt_file_path}
                                                    >
                                                        View Receipt
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Summary Cards */}
                    <Row className="mt-4">
                        <Col md={4}>
                            <Card className="border-success">
                                <Card.Body>
                                    <h6 className="text-muted">Total Paid</h6>
                                    <h3 className="text-success">
                                        ETB {payments
                                            .filter(p => p.payment_status === 'completed')
                                            .reduce((sum, p) => sum + (p.amount || p.declared_amount || 0), 0)
                                            .toLocaleString()}
                                    </h3>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="border-warning">
                                <Card.Body>
                                    <h6 className="text-muted">Pending Verification</h6>
                                    <h3 className="text-warning">
                                        {payments.filter(p => p.payment_status === 'under_review' || p.payment_status === 'processing').length}
                                    </h3>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="border-info">
                                <Card.Body>
                                    <h6 className="text-muted">Last Payment</h6>
                                    <h3 className="text-info">
                                        {payments[0] ? new Date(payments[0].created_at).toLocaleDateString() : 'N/A'}
                                    </h3>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Container>
    );
};

export default PaymentHistoryPage;