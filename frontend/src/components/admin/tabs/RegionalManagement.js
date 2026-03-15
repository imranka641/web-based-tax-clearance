import React, { useState, useEffect } from 'react';
import {
    Container, Row, Col, Card, Table, Button, Alert, Spinner,
    Modal, Form, Badge, InputGroup, Tab, Nav, ProgressBar
} from 'react-bootstrap';
import api from '../../../services/api';
import { getUser } from '../../../utils/auth';

// Simple inline icons instead of react-icons/fa
const IconEdit = () => <span className="me-1">✏️</span>;
const IconDelete = () => <span className="me-1">🗑️</span>;
const IconAdd = () => <span className="me-1">➕</span>;
const IconUser = () => <span className="me-1">👤</span>;
const IconBuilding = () => <span className="me-1">🏛️</span>;
const IconChart = () => <span className="me-1">📊</span>;
const IconSearch = () => <span className="me-1">🔍</span>;

const RegionalManagement = () => {
    const [user, setUser] = useState(null);
    const [regions, setRegions] = useState([]);
    const [regionalAdmins, setRegionalAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('regions');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [showCreateRegionModal, setShowCreateRegionModal] = useState(false);
    const [showEditRegionModal, setShowEditRegionModal] = useState(false);
    const [showDeleteRegionModal, setShowDeleteRegionModal] = useState(false);
    const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
    const [showEditAdminModal, setShowEditAdminModal] = useState(false);
    const [showDeleteAdminModal, setShowDeleteAdminModal] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [selectedAdmin, setSelectedAdmin] = useState(null);

    // Form states
    const [regionForm, setRegionForm] = useState({
        name: '',
        name_am: '',
        name_om: '',
        name_so: '',
        code: '',
        capital: '',
        population: ''
    });

    const [adminForm, setAdminForm] = useState({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        region_id: '',
        tax_target: ''
    });

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || !currentUser.is_super_admin) {
            window.location.href = '/login';
            return;
        }
        setUser(currentUser);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [regionsRes, adminsRes] = await Promise.all([
                api.get('/admin/regions'),
                api.get('/admin/regional-admins')
            ]);
            setRegions(regionsRes.data.regions);
            setRegionalAdmins(adminsRes.data.admins);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError(error.response?.data?.error || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // Region CRUD Operations
    const handleCreateRegion = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/admin/regions/create', regionForm);
            setSuccess('Region created successfully!');
            setShowCreateRegionModal(false);
            resetRegionForm();
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create region');
        }
    };

    const handleUpdateRegion = async (e) => {
        e.preventDefault();
        try {
            const response = await api.put(`/admin/regions/${selectedRegion.id}/update`, regionForm);
            setSuccess('Region updated successfully!');
            setShowEditRegionModal(false);
            resetRegionForm();
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update region');
        }
    };

    const handleDeleteRegion = async () => {
        try {
            const response = await api.delete(`/admin/regions/${selectedRegion.id}/delete`);
            setSuccess(response.data.message || 'Region deleted successfully!');
            setShowDeleteRegionModal(false);
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to delete region');
        }
    };

    // Admin CRUD Operations
    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/admin/regional-admins/create', adminForm);
            setSuccess('Regional admin created successfully!');
            setShowCreateAdminModal(false);
            resetAdminForm();
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to create regional admin');
        }
    };

    const handleUpdateAdmin = async (e) => {
        e.preventDefault();
        try {
            const response = await api.put(`/admin/regional-admins/${selectedAdmin.id}/update`, adminForm);
            setSuccess('Regional admin updated successfully!');
            setShowEditAdminModal(false);
            resetAdminForm();
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to update regional admin');
        }
    };

    const handleDeleteAdmin = async () => {
        try {
            const response = await api.delete(`/admin/regional-admins/${selectedAdmin.id}/delete`);
            setSuccess(response.data.message || 'Regional admin deleted successfully!');
            setShowDeleteAdminModal(false);
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to delete regional admin');
        }
    };

    const handleToggleAdminStatus = async (adminId, currentStatus) => {
        try {
            await api.put(`/admin/regional-admins/${adminId}/toggle-status`, {
                is_active: !currentStatus
            });
            fetchData();
            setSuccess(`Admin ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError('Failed to update admin status');
        }
    };

    // Helper functions
    const openEditRegionModal = (region) => {
        setSelectedRegion(region);
        setRegionForm({
            name: region.name || '',
            name_am: region.name_am || '',
            name_om: region.name_om || '',
            name_so: region.name_so || '',
            code: region.code || '',
            capital: region.capital || '',
            population: region.population || ''
        });
        setShowEditRegionModal(true);
    };

    const openEditAdminModal = (admin) => {
        setSelectedAdmin(admin);
        setAdminForm({
            full_name: admin.full_name || '',
            email: admin.email || '',
            password: '',
            phone: admin.phone || '',
            region_id: admin.region_id || '',
            tax_target: admin.tax_target || ''
        });
        setShowEditAdminModal(true);
    };

    const resetRegionForm = () => {
        setRegionForm({
            name: '',
            name_am: '',
            name_om: '',
            name_so: '',
            code: '',
            capital: '',
            population: ''
        });
        setSelectedRegion(null);
    };

    const resetAdminForm = () => {
        setAdminForm({
            full_name: '',
            email: '',
            password: '',
            phone: '',
            region_id: '',
            tax_target: ''
        });
        setSelectedAdmin(null);
    };

    const filteredRegions = regions.filter(region =>
        region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        region.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (region.capital && region.capital.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredAdmins = regionalAdmins.filter(admin =>
        admin.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.region_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Container className="text-center py-5">
                <Spinner animation="border" />
            </Container>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4>🌍 Regional Administration</h4>
                <div>
                    <Button
                        variant="success"
                        className="me-2"
                        onClick={() => setShowCreateRegionModal(true)}
                    >
                        <IconAdd /> New Region
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => setShowCreateAdminModal(true)}
                    >
                        <IconUser /> New Regional Admin
                    </Button>
                </div>
            </div>

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
                        <InputGroup.Text>
                            <IconSearch />
                        </InputGroup.Text>
                        <Form.Control
                            type="text"
                            placeholder="Search regions or admins..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </InputGroup>
                </Card.Body>
            </Card>

            {/* Tabs */}
            <Card>
                <Card.Header>
                    <Nav variant="tabs" activeKey={activeTab} onSelect={setActiveTab}>
                        <Nav.Item>
                            <Nav.Link eventKey="regions">
                                <IconBuilding /> Regions ({regions.length})
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="admins">
                                <IconUser /> Regional Admins ({regionalAdmins.length})
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="stats">
                                <IconChart /> Regional Statistics
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                </Card.Header>
                <Card.Body>
                    {/* Regions Tab */}
                    {activeTab === 'regions' && (
                        <>
                            {filteredRegions.length === 0 ? (
                                <Alert variant="info">No regions found.</Alert>
                            ) : (
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Region Name</th>
                                            <th>Code</th>
                                            <th>Capital</th>
                                            <th>Population</th>
                                            <th>Admins</th>
                                            <th>Towns</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRegions.map((region, index) => (
                                            <tr key={region.id}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <strong>{region.name}</strong>
                                                    {region.name_am && (
                                                        <div><small className="text-muted">አማ: {region.name_am}</small></div>
                                                    )}
                                                </td>
                                                <td>{region.code}</td>
                                                <td>{region.capital || '-'}</td>
                                                <td>{region.population?.toLocaleString() || '-'}</td>
                                                <td>
                                                    <Badge bg="info">{region.admin_count || 0}</Badge>
                                                </td>
                                                <td>
                                                    <Badge bg="secondary">{region.town_count || 0}</Badge>
                                                </td>
                                                <td>
                                                    <Badge bg={region.is_active ? 'success' : 'secondary'}>
                                                        {region.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={() => openEditRegionModal(region)}
                                                    >
                                                        <IconEdit /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedRegion(region);
                                                            setShowDeleteRegionModal(true);
                                                        }}
                                                        disabled={region.admin_count > 0}
                                                        title={region.admin_count > 0 ? 'Cannot delete region with admins' : ''}
                                                    >
                                                        <IconDelete /> Delete
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </>
                    )}

                    {/* Admins Tab */}
                    {activeTab === 'admins' && (
                        <>
                            {filteredAdmins.length === 0 ? (
                                <Alert variant="info">No regional admins found.</Alert>
                            ) : (
                                <Table responsive striped hover>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Region</th>
                                            <th>Phone</th>
                                            <th>Target</th>
                                            <th>Performance</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAdmins.map((admin, index) => (
                                            <tr key={admin.id}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <strong>{admin.full_name}</strong>
                                                </td>
                                                <td>{admin.email}</td>
                                                <td>
                                                    <Badge bg="info">{admin.region_name}</Badge>
                                                </td>
                                                <td>{admin.phone || '-'}</td>
                                                <td>ETB {admin.tax_target?.toLocaleString() || 0}</td>
                                                <td style={{ minWidth: '120px' }}>
                                                    <ProgressBar
                                                        variant={admin.performance >= 70 ? 'success' : admin.performance >= 40 ? 'warning' : 'danger'}
                                                        now={admin.performance || 0}
                                                        label={`${admin.performance || 0}%`}
                                                    />
                                                </td>
                                                <td>
                                                    <Badge bg={admin.is_active ? 'success' : 'secondary'}>
                                                        {admin.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={() => openEditAdminModal(admin)}
                                                    >
                                                        <IconEdit /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline-warning"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={() => handleToggleAdminStatus(admin.id, admin.is_active)}
                                                    >
                                                        {admin.is_active ? 'Deactivate' : 'Activate'}
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedAdmin(admin);
                                                            setShowDeleteAdminModal(true);
                                                        }}
                                                    >
                                                        <IconDelete /> Delete
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </>
                    )}

                    {/* Statistics Tab */}
                    {activeTab === 'stats' && (
                        <Row>
                            <Col md={4}>
                                <Card className="border-primary mb-3">
                                    <Card.Body className="text-center">
                                        <h3 className="text-primary">{regions.length}</h3>
                                        <p>Total Regions</p>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={4}>
                                <Card className="border-success mb-3">
                                    <Card.Body className="text-center">
                                        <h3 className="text-success">{regionalAdmins.length}</h3>
                                        <p>Total Regional Admins</p>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={4}>
                                <Card className="border-info mb-3">
                                    <Card.Body className="text-center">
                                        <h3 className="text-info">
                                            {regions.filter(r => r.is_active).length}/{regions.length}
                                        </h3>
                                        <p>Active Regions</p>
                                    </Card.Body>
                                </Card>
                            </Col>

                            <Col md={12}>
                                <Card>
                                    <Card.Header>
                                        <h5>Regional Performance Summary</h5>
                                    </Card.Header>
                                    <Card.Body>
                                        <Table responsive>
                                            <thead>
                                                <tr>
                                                    <th>Region</th>
                                                    <th>Admin</th>
                                                    <th>Towns</th>
                                                    <th>Tax Target</th>
                                                    <th>Collected</th>
                                                    <th>Achievement</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {regions.slice(0, 5).map(region => (
                                                    <tr key={region.id}>
                                                        <td>{region.name}</td>
                                                        <td>
                                                            {regionalAdmins.find(a => a.region_id === region.id)?.full_name || 
                                                                <Badge bg="warning">No Admin</Badge>
                                                            }
                                                        </td>
                                                        <td>{region.town_count || 0}</td>
                                                        <td>ETB {region.total_target?.toLocaleString() || 0}</td>
                                                        <td>ETB {region.total_collected?.toLocaleString() || 0}</td>
                                                        <td style={{ width: '200px' }}>
                                                            <ProgressBar
                                                                variant="success"
                                                                now={region.achievement || 0}
                                                                label={`${region.achievement || 0}%`}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    )}
                </Card.Body>
            </Card>

            {/* Create Region Modal */}
            <Modal show={showCreateRegionModal} onHide={() => {
                setShowCreateRegionModal(false);
                resetRegionForm();
            }} size="lg">
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title>Create New Region</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateRegion}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Region Name (English) *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={regionForm.name}
                                        onChange={(e) => setRegionForm({...regionForm, name: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Region Code *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="code"
                                        value={regionForm.code}
                                        onChange={(e) => setRegionForm({...regionForm, code: e.target.value})}
                                        placeholder="e.g., AA, OR, AM"
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
                                        value={regionForm.name_am}
                                        onChange={(e) => setRegionForm({...regionForm, name_am: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Name (Afan Oromo)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name_om"
                                        value={regionForm.name_om}
                                        onChange={(e) => setRegionForm({...regionForm, name_om: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Name (Somali)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name_so"
                                        value={regionForm.name_so}
                                        onChange={(e) => setRegionForm({...regionForm, name_so: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Capital City</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="capital"
                                        value={regionForm.capital}
                                        onChange={(e) => setRegionForm({...regionForm, capital: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Population</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="population"
                                        value={regionForm.population}
                                        onChange={(e) => setRegionForm({...regionForm, population: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => {
                            setShowCreateRegionModal(false);
                            resetRegionForm();
                        }}>
                            Cancel
                        </Button>
                        <Button variant="success" type="submit">
                            Create Region
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Edit Region Modal */}
            <Modal show={showEditRegionModal} onHide={() => {
                setShowEditRegionModal(false);
                resetRegionForm();
            }} size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Edit Region</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleUpdateRegion}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Region Name (English) *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={regionForm.name}
                                        onChange={(e) => setRegionForm({...regionForm, name: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Region Code *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="code"
                                        value={regionForm.code}
                                        onChange={(e) => setRegionForm({...regionForm, code: e.target.value})}
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
                                        value={regionForm.name_am}
                                        onChange={(e) => setRegionForm({...regionForm, name_am: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Name (Afan Oromo)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name_om"
                                        value={regionForm.name_om}
                                        onChange={(e) => setRegionForm({...regionForm, name_om: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Name (Somali)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name_so"
                                        value={regionForm.name_so}
                                        onChange={(e) => setRegionForm({...regionForm, name_so: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Capital City</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="capital"
                                        value={regionForm.capital}
                                        onChange={(e) => setRegionForm({...regionForm, capital: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Population</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="population"
                                        value={regionForm.population}
                                        onChange={(e) => setRegionForm({...regionForm, population: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                label="Active"
                                checked={regionForm.is_active}
                                onChange={(e) => setRegionForm({...regionForm, is_active: e.target.checked})}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => {
                            setShowEditRegionModal(false);
                            resetRegionForm();
                        }}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Update Region
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Delete Region Modal */}
            <Modal show={showDeleteRegionModal} onHide={() => setShowDeleteRegionModal(false)}>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>Delete Region</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedRegion && (
                        <>
                            <p>Are you sure you want to delete <strong>{selectedRegion.name}</strong>?</p>
                            {selectedRegion.admin_count > 0 && (
                                <Alert variant="warning">
                                    This region has {selectedRegion.admin_count} regional admin(s). Please reassign or delete them first.
                                </Alert>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteRegionModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDeleteRegion}
                        disabled={selectedRegion?.admin_count > 0}
                    >
                        Delete Region
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Create Admin Modal */}
            <Modal show={showCreateAdminModal} onHide={() => {
                setShowCreateAdminModal(false);
                resetAdminForm();
            }} size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Create Regional Admin</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateAdmin}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Full Name *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="full_name"
                                        value={adminForm.full_name}
                                        onChange={(e) => setAdminForm({...adminForm, full_name: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email *</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={adminForm.email}
                                        onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
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
                                        name="password"
                                        value={adminForm.password}
                                        onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Phone</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="phone"
                                        value={adminForm.phone}
                                        onChange={(e) => setAdminForm({...adminForm, phone: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Region *</Form.Label>
                                    <Form.Select
                                        name="region_id"
                                        value={adminForm.region_id}
                                        onChange={(e) => setAdminForm({...adminForm, region_id: e.target.value})}
                                        required
                                    >
                                        <option value="">Select Region</option>
                                        {regions.map(region => (
                                            <option key={region.id} value={region.id}>
                                                {region.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Annual Tax Target (ETB)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="tax_target"
                                        value={adminForm.tax_target}
                                        onChange={(e) => setAdminForm({...adminForm, tax_target: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => {
                            setShowCreateAdminModal(false);
                            resetAdminForm();
                        }}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Create Admin
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Edit Admin Modal */}
            <Modal show={showEditAdminModal} onHide={() => {
                setShowEditAdminModal(false);
                resetAdminForm();
            }} size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Edit Regional Admin</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleUpdateAdmin}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Full Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="full_name"
                                        value={adminForm.full_name}
                                        onChange={(e) => setAdminForm({...adminForm, full_name: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={adminForm.email}
                                        onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Password (leave blank to keep current)</Form.Label>
                                    <Form.Control
                                        type="password"
                                        name="password"
                                        value={adminForm.password}
                                        onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Phone</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="phone"
                                        value={adminForm.phone}
                                        onChange={(e) => setAdminForm({...adminForm, phone: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Region</Form.Label>
                                    <Form.Select
                                        name="region_id"
                                        value={adminForm.region_id}
                                        onChange={(e) => setAdminForm({...adminForm, region_id: e.target.value})}
                                        required
                                    >
                                        <option value="">Select Region</option>
                                        {regions.map(region => (
                                            <option key={region.id} value={region.id}>
                                                {region.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Annual Tax Target (ETB)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="tax_target"
                                        value={adminForm.tax_target}
                                        onChange={(e) => setAdminForm({...adminForm, tax_target: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                label="Active"
                                checked={adminForm.is_active}
                                onChange={(e) => setAdminForm({...adminForm, is_active: e.target.checked})}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => {
                            setShowEditAdminModal(false);
                            resetAdminForm();
                        }}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Update Admin
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Delete Admin Modal */}
            <Modal show={showDeleteAdminModal} onHide={() => setShowDeleteAdminModal(false)}>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>Delete Regional Admin</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedAdmin && (
                        <p>Are you sure you want to delete <strong>{selectedAdmin.full_name}</strong>?</p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteAdminModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteAdmin}>
                        Delete Admin
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default RegionalManagement;