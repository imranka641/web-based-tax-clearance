import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const TownStatistics = () => {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || currentUser.role !== 'town_admin') {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchStatistics();
    }, [navigate]);

    const fetchStatistics = async () => {
        try {
            // Mock data for now
            setStats({
                totalTaxpayers: 1247,
                totalCollected: 3450000,
                pendingVerifications: 23,
                complianceRate: 87,
                byCategory: {
                    A: 45,
                    B: 234,
                    C: 567,
                    D: 345,
                    E: 56
                },
                monthlyCollection: [
                    { month: 'Jan', amount: 280000 },
                    { month: 'Feb', amount: 295000 },
                    { month: 'Mar', amount: 310000 }
                ]
            });
        } catch (error) {
            console.error('Error fetching statistics:', error);
            setError('Failed to load statistics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading statistics...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <h2>📊 Town Statistics</h2>
            <p className="text-muted">Statistical overview for {user?.town_name || 'Your Town'}</p>
            
            <Row className="mt-4">
                <Col md={3}>
                    <Card className="text-center border-primary shadow-sm">
                        <Card.Body>
                            <h3 className="text-primary">{stats?.totalTaxpayers?.toLocaleString()}</h3>
                            <p className="text-muted">Total Taxpayers</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center border-success shadow-sm">
                        <Card.Body>
                            <h3 className="text-success">ETB {stats?.totalCollected?.toLocaleString()}</h3>
                            <p className="text-muted">Total Collected</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center border-warning shadow-sm">
                        <Card.Body>
                            <h3 className="text-warning">{stats?.pendingVerifications}</h3>
                            <p className="text-muted">Pending Verifications</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center border-info shadow-sm">
                        <Card.Body>
                            <h3 className="text-info">{stats?.complianceRate}%</h3>
                            <p className="text-muted">Compliance Rate</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-4">
                <Col md={6}>
                    <Card className="shadow-sm">
                        <Card.Header>Taxpayers by Category</Card.Header>
                        <Card.Body>
                            <Table striped>
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Count</th>
                                        <th>Percentage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats?.byCategory && Object.entries(stats.byCategory).map(([cat, count]) => (
                                        <tr key={cat}>
                                            <td><Badge bg={cat === 'A' ? 'danger' : cat === 'B' ? 'warning' : cat === 'C' ? 'info' : cat === 'D' ? 'primary' : 'secondary'}>Category {cat}</Badge></td>
                                            <td>{count}</td>
                                            <td>{((count / stats.totalTaxpayers) * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={6}>
                    <Card className="shadow-sm">
                        <Card.Header>Monthly Collection</Card.Header>
                        <Card.Body>
                            <Table striped>
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats?.monthlyCollection?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.month}</td>
                                            <td>ETB {item.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default TownStatistics;