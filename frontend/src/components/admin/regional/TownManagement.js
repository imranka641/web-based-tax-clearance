import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, Table, Button, Alert, Spinner, 
    Modal, Form, Badge, InputGroup 
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { getUser } from '../../../utils/auth';

const TownManagement = () => {
    const [user, setUser] = useState(null);
    const [towns, setTowns] = useState([]);
    const [filteredTowns, setFilteredTowns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTown, setSelectedTown] = useState(null);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        name_am: '',
        name_om: '',
        name_so: '',
        code: '',
        woreda: '',
        zone: '',
        population: '',
        is_active: true
    });

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

    useEffect(() => {
        // Filter towns based on search term
        if (searchTerm) {
            const filtered = towns.filter(town => 
                town.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                town.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (town.woreda && town.woreda.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (town.zone && town.zone.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            setFilteredTowns(filtered);
        } else {
            setFilteredTowns(towns);
        }
    }, [searchTerm, towns]);

    const fetchTowns = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/regional-admin/towns/list');
            setTowns(response.data.towns);
            setFilteredTowns(response.data.towns);
        } catch (error) {
            console.error('Error fetching towns:', error);
            setError(error.response?.data?.error || 'Failed to load towns');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCreateTown = async (e) => {
        e.preventDefault();
        try {
            setError('');
            const response = await api.post('/regional-admin/towns/create', formData);
            setSuccess('Town created successfully!');
            setShowCreateModal(false);
            resetForm();
            fetchTowns();
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Create town error:', error);
            setError(error.response?.data?.error || 'Failed to create town');
        }
    };

    const handleUpdateTown = async (e) => {
        e.preventDefault();
        try {
            setError('');
            const response = await api.put(`/regional-admin/towns/${selectedTown.id}/update`, formData);
            setSuccess('Town updated successfully!');
            setShowEditModal(false);
            resetForm();
            fetchTowns();
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Update town error:', error);
            setError(error.response?.data?.error || 'Failed to update town');
        }
    };

    const handleDeleteTown = async () => {
        try {
            setError('');
            const response = await api.delete(`/regional-admin/towns/${selectedTown.id}/delete`);
            setSuccess(response.data.message || 'Town deleted successfully!');
            setShowDeleteModal(false);
            fetchTowns();
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Delete town error:', error);
            setError(error.response?.data?.error || 'Failed to delete town');
        }
    };

    const handleToggleStatus = async (town) => {
        try {
            setError('');
            const response = await api.put(`/regional-admin/towns/${town.id}/update`, {
                is_active: !town.is_active
            });
            setSuccess(`Town ${!town.is_active ? 'activated' : 'deactivated'} successfully!`);
            fetchTowns();
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Toggle status error:', error);
            setError(error.response?.data?.error || 'Failed to update town status');
        }
    };

    const openEditModal = (town) => {
        setSelectedTown(town);
        setFormData({
            name: town.name || '',
            name_am: town.name_am || '',
            name_om: town.name_om || '',
            name_so: town.name_so || '',
            code: town.code || '',
            woreda: town.woreda || '',
            zone: town.zone || '',
            population: town.population || '',
            is_active: town.is_active !== undefined ? town.is_active : true
        });
        setShowEditModal(true);
    };

    const openViewModal = (town) => {
        setSelectedTown(town);
        setShowViewModal(true);
    };

    const openDeleteModal = (town) => {
        setSelectedTown(town);
        setShowDeleteModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            name_am: '',
            name_om: '',
            name_so: '',
            code: '',
            woreda: '',
            zone: '',
            population: '',
            is_active: true
        });
        setSelectedTown(null);
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading towns...</p>
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <h2>🏘️ Town Management</h2>
                    <p className="text-muted">
                        Manage towns in {user?.region_name || 'your region'}
                    </p>
                </Col>
                <Col xs="auto">
                    <Button 
                        variant="success" 
                        onClick={() => setShowCreateModal(true)}
                        className="d-flex align-items-center"
                    >
                        <span className="me-2">➕</span>
                        Add New Town
                    </Button>
                </Col>
            </Row>

            {/* Alerts */}
            {error && (
                <Alert variant="danger" onClose={() => setError('')} dismissible>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" onClose={() => setSuccess('')} dismissible>
                    {success}
                </Alert>
            )}

            {/* Search Bar */}
            <Card className="mb-4">
                <Card.Body>
                    <InputGroup>
                        <InputGroup.Text>🔍</InputGroup.Text>
                        <Form.Control
                            type="text"
                            placeholder="Search towns by name, code, woreda, or zone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <Button 
                                variant="outline-secondary" 
                                onClick={() => setSearchTerm('')}
                            >
                                Clear
                            </Button>
                        )}
                    </InputGroup>
                </Card.Body>
            </Card>

            {/* Towns Table */}
            <Card>
                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Towns List</h5>
                    <Badge bg="info">{filteredTowns.length} towns</Badge>
                </Card.Header>
                <Card.Body>
                    {filteredTowns.length === 0 ? (
                        <Alert variant="info">
                            {searchTerm ? 'No towns match your search.' : 'No towns found. Click "Add New Town" to create one.'}
                        </Alert>
                    ) : (
                        <Table responsive striped hover>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Town Name</th>
                                    <th>Code</th>
                                    <th>Woreda</th>
                                    <th>Zone</th>
                                    <th>Population</th>
                                    <th>Admin</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTowns.map((town, index) => (
                                    <tr key={town.id}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <strong>{town.name}</strong>
                                            {town.name_am && (
                                                <div><small className="text-muted">አማ: {town.name_am}</small></div>
                                            )}
                                        </td>
                                        <td>
                                            <Badge bg="secondary">{town.code}</Badge>
                                        </td>
                                        <td>{town.woreda || '-'}</td>
                                        <td>{town.zone || '-'}</td>
                                        <td>{town.population?.toLocaleString() || '-'}</td>
                                        <td>
                                            {town.has_admin ? (
                                                <Badge bg="success">{town.admin_name}</Badge>
                                            ) : (
                                                <Badge bg="warning">No Admin</Badge>
                                            )}
                                        </td>
                                        <td>
                                            <Badge bg={town.is_active ? 'success' : 'secondary'}>
                                                {town.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Button
                                                variant="outline-info"
                                                size="sm"
                                                className="me-2"
                                                onClick={() => openViewModal(town)}
                                                title="View Details"
                                            >
                                                👁️
                                            </Button>
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="me-2"
                                                onClick={() => openEditModal(town)}
                                                title="Edit Town"
                                            >
                                                ✏️
                                            </Button>
                                            {town.is_active ? (
                                                <Button
                                                    variant="outline-warning"
                                                    size="sm"
                                                    className="me-2"
                                                    onClick={() => handleToggleStatus(town)}
                                                    title="Deactivate Town"
                                                >
                                                    ⏸️
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline-success"
                                                    size="sm"
                                                    className="me-2"
                                                    onClick={() => handleToggleStatus(town)}
                                                    title="Activate Town"
                                                >
                                                    ▶️
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => openDeleteModal(town)}
                                                disabled={town.has_admin}
                                                title={town.has_admin ? 'Cannot delete town with assigned admin' : 'Delete Town'}
                                            >
                                                🗑️
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Create Town Modal */}
            <Modal show={showCreateModal} onHide={() => {
                setShowCreateModal(false);
                resetForm();
            }} size="lg">
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title>➕ Create New Town</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateTown}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Town Name (English) *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter town name in English"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Town Code *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="code"
                                        value={formData.code}
                                        onChange={handleInputChange}
                                        placeholder="e.g., AA-BO, OR-AD"
                                        required
                                    />
                                    <Form.Text className="text-muted">
                                        Unique code for the town (e.g., AA-BO for Addis Ababa Bole)
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Name (Amharic)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name_am"
                                        value={formData.name_am}
                                        onChange={handleInputChange}
                                        placeholder="አማርኛ"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Name (Afan Oromo)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name_om"
                                        value={formData.name_om}
                                        onChange={handleInputChange}
                                        placeholder="Afaan Oromoo"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Name (Somali)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name_so"
                                        value={formData.name_so}
                                        onChange={handleInputChange}
                                        placeholder="Soomaali"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Woreda</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="woreda"
                                        value={formData.woreda}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Bole Woreda 1"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Zone</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="zone"
                                        value={formData.zone}
                                        onChange={handleInputChange}
                                        placeholder="e.g., East Shewa"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Population</Form.Label>
                            <Form.Control
                                type="number"
                                name="population"
                                value={formData.population}
                                onChange={handleInputChange}
                                placeholder="Enter town population"
                                min="0"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => {
                            setShowCreateModal(false);
                            resetForm();
                        }}>
                            Cancel
                        </Button>
                        <Button variant="success" type="submit">
                            Create Town
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Edit Town Modal */}
            <Modal show={showEditModal} onHide={() => {
                setShowEditModal(false);
                resetForm();
            }} size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>✏️ Edit Town</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleUpdateTown}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Town Name (English) *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Town Code *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="code"
                                        value={formData.code}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Name (Amharic)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name_am"
                                        value={formData.name_am}
                                        onChange={handleInputChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Name (Afan Oromo)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name_om"
                                        value={formData.name_om}
                                        onChange={handleInputChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Name (Somali)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name_so"
                                        value={formData.name_so}
                                        onChange={handleInputChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Woreda</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="woreda"
                                        value={formData.woreda}
                                        onChange={handleInputChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Zone</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="zone"
                                        value={formData.zone}
                                        onChange={handleInputChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Population</Form.Label>
                            <Form.Control
                                type="number"
                                name="population"
                                value={formData.population}
                                onChange={handleInputChange}
                                min="0"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                label="Active"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleInputChange}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => {
                            setShowEditModal(false);
                            resetForm();
                        }}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Update Town
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* View Town Modal */}
            <Modal show={showViewModal} onHide={() => setShowViewModal(false)}>
                <Modal.Header closeButton className="bg-info text-white">
                    <Modal.Title>👁️ Town Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedTown && (
                        <div>
                            <Row>
                                <Col md={6}>
                                    <p><strong>ID:</strong> {selectedTown.id}</p>
                                    <p><strong>Name (EN):</strong> {selectedTown.name}</p>
                                    <p><strong>Name (AM):</strong> {selectedTown.name_am || '-'}</p>
                                    <p><strong>Name (OM):</strong> {selectedTown.name_om || '-'}</p>
                                    <p><strong>Name (SO):</strong> {selectedTown.name_so || '-'}</p>
                                    <p><strong>Code:</strong> {selectedTown.code}</p>
                                </Col>
                                <Col md={6}>
                                    <p><strong>Woreda:</strong> {selectedTown.woreda || '-'}</p>
                                    <p><strong>Zone:</strong> {selectedTown.zone || '-'}</p>
                                    <p><strong>Population:</strong> {selectedTown.population?.toLocaleString() || '-'}</p>
                                    <p><strong>Status:</strong> 
                                        <Badge bg={selectedTown.is_active ? 'success' : 'secondary'} className="ms-2">
                                            {selectedTown.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </p>
                                    <p><strong>Has Admin:</strong> 
                                        <Badge bg={selectedTown.has_admin ? 'success' : 'warning'} className="ms-2">
                                            {selectedTown.has_admin ? 'Yes' : 'No'}
                                        </Badge>
                                    </p>
                                    <p><strong>Admin Name:</strong> {selectedTown.admin_name || '-'}</p>
                                    <p><strong>Created:</strong> {new Date(selectedTown.created_at).toLocaleDateString()}</p>
                                </Col>
                            </Row>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>🗑️ Delete Town</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedTown && (
                        <>
                            <p>Are you sure you want to delete <strong>{selectedTown.name}</strong>?</p>
                            {selectedTown.has_admin && (
                                <Alert variant="warning">
                                    <strong>Warning:</strong> This town has an administrator assigned. 
                                    Please reassign or deactivate them first before deleting.
                                </Alert>
                            )}
                            {!selectedTown.has_admin && (
                                <Alert variant="danger">
                                    <strong>Warning:</strong> This action cannot be undone. All town data will be permanently deleted.
                                </Alert>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant="danger" 
                        onClick={handleDeleteTown}
                        disabled={selectedTown?.has_admin}
                    >
                        Delete Town
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default TownManagement;