import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { getUser } from '../../../utils/auth';

const RegionalAdmins = () => {
    const [user, setUser] = useState(null);
    const [admins, setAdmins] = useState([]);
    const [towns, setTowns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        town_id: '',
        tax_target: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || (currentUser.role !== 'regional_admin' && !currentUser.is_super_admin)) {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [adminsRes, townsRes] = await Promise.all([
                api.get('/regional-admin/town-admins'),
                api.get('/regional-admin/towns')
            ]);
            setAdmins(adminsRes.data.admins || []);
            setTowns(townsRes.data.towns || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError(error.response?.data?.error || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        try {
            await api.post('/regional-admin/create-town-admin', newAdmin);
            setShowCreateModal(false);
            setNewAdmin({
                full_name: '',
                email: '',
                password: '',
                phone: '',
                town_id: '',
                tax_target: ''
            });
            fetchData();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create admin');
        }
    };

    const toggleAdminStatus = async (adminId, currentStatus) => {
        try {
            await api.put(`/regional-admin/town-admin/${adminId}/toggle-status`, {
                is_active: !currentStatus
            });
            fetchData();
        } catch (error) {
            setError('Failed to update admin status');
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
        <Container fluid className="mt-4">
            <Row className="mb-4">
                <Col>
                    <h2>👥 Town Administrators</h2>
                    <p className="text-muted">Manage town administrators in your region</p>
                </Col>
                <Col xs="auto">
                    <Button variant="success" onClick={() => setShowCreateModal(true)}>
                        + Create Town Admin
                    </Button>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            <Card>
                <Card.Body>
                    {admins.length === 0 ? (
                        <Alert variant="info">No town administrators found in your region.</Alert>
                    ) : (
                        <Table responsive striped hover>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Town</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Monthly Target</th>
                                    <th>Performance</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map(admin => (
                                    <tr key={admin.id}>
                                        <td>{admin.full_name}</td>
                                        <td>{admin.town_name}</td>
                                        <td>{admin.email}</td>
                                        <td>{admin.phone || 'N/A'}</td>
                                        <td>ETB {admin.tax_target?.toLocaleString() || 0}</td>
                                        <td>
                                            <Badge bg={admin.performance >= 70 ? 'success' : 'warning'}>
                                                {admin.performance || 0}%
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge bg={admin.is_active ? 'success' : 'secondary'}>
                                                {admin.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Button
                                                size="sm"
                                                variant={admin.is_active ? 'warning' : 'success'}
                                                onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                                            >
                                                {admin.is_active ? 'Deactivate' : 'Activate'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Create Admin Modal */}
            <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Create Town Administrator</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateAdmin}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Full Name *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={newAdmin.full_name}
                                        onChange={(e) => setNewAdmin({...newAdmin, full_name: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email *</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={newAdmin.email}
                                        onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Password *</Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={newAdmin.password}
                                        onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Phone</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={newAdmin.phone}
                                        onChange={(e) => setNewAdmin({...newAdmin, phone: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Select Town *</Form.Label>
                                    <Form.Select
                                        value={newAdmin.town_id}
                                        onChange={(e) => setNewAdmin({...newAdmin, town_id: e.target.value})}
                                        required
                                    >
                                        <option value="">Choose town...</option>
                                        {towns.filter(t => !t.has_admin).map(town => (
                                            <option key={town.id} value={town.id}>
                                                {town.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Monthly Tax Target (ETB) *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newAdmin.tax_target}
                                        onChange={(e) => setNewAdmin({...newAdmin, tax_target: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Create Admin
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default RegionalAdmins;