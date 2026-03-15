import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { getUser } from '../../../utils/auth';

const RegionalTowns = () => {
    const [user, setUser] = useState(null);
    const [towns, setTowns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || (currentUser.role !== 'regional_admin' && !currentUser.is_super_admin)) {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchTowns();
    }, []);

    const fetchTowns = async () => {
        try {
            setLoading(true);
            const response = await api.get('/regional-admin/towns');
            setTowns(response.data.towns || []);
        } catch (error) {
            console.error('Error fetching towns:', error);
            setError(error.response?.data?.error || 'Failed to load towns');
        } finally {
            setLoading(false);
        }
    };

    const getPerformanceVariant = (percentage) => {
        if (percentage >= 80) return 'success';
        if (percentage >= 50) return 'warning';
        return 'danger';
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" />
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4">
            <Row className="mb-4">
                <Col>
                    <h2>🏘️ Towns in {user?.region_name || 'Your Region'}</h2>
                    <p className="text-muted">Manage and monitor town performance</p>
                </Col>
                <Col xs="auto">
                    <Button variant="outline-primary" onClick={fetchTowns}>
                        Refresh
                    </Button>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            <Card>
                <Card.Body>
                    {towns.length === 0 ? (
                        <Alert variant="info">No towns found in your region.</Alert>
                    ) : (
                        <Table responsive striped hover>
                            <thead>
                                <tr>
                                    <th>Town</th>
                                    <th>Admin</th>
                                    <th>Monthly Target</th>
                                    <th>Collected</th>
                                    <th>Progress</th>
                                    <th>Pending Receipts</th>
                                    <th>Pending TCC</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {towns.map(town => (
                                    <tr key={town.id}>
                                        <td><strong>{town.name}</strong></td>
                                        <td>
                                            {town.admin_name ? (
                                                <Badge bg="success">{town.admin_name}</Badge>
                                            ) : (
                                                <Badge bg="warning">No Admin</Badge>
                                            )}
                                        </td>
                                        <td>ETB {town.target?.toLocaleString() || 0}</td>
                                        <td>ETB {town.collected?.toLocaleString() || 0}</td>
                                        <td style={{ minWidth: '150px' }}>
                                            <ProgressBar 
                                                variant={getPerformanceVariant(town.percentage)}
                                                now={town.percentage || 0} 
                                                label={`${town.percentage || 0}%`}
                                            />
                                        </td>
                                        <td>
                                            <Badge bg={town.pending > 0 ? 'warning' : 'success'}>
                                                {town.pending || 0}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge bg={town.pending_tcc > 0 ? 'warning' : 'success'}>
                                                {town.pending_tcc || 0}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge bg={town.has_admin ? 'success' : 'danger'}>
                                                {town.has_admin ? 'Active' : 'No Admin'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default RegionalTowns;