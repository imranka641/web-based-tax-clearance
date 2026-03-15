import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Badge, Form, Modal } from 'react-bootstrap';
import api from '../../../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    tin: '',
    password: '',
    role: 'taxpayer',
    is_super_admin: false
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', newUser);
      setShowCreateModal(false);
      setNewUser({
        full_name: '',
        email: '',
        tin: '',
        password: '',
        role: 'taxpayer',
        is_super_admin: false
      });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}`, {
        is_active: !currentStatus
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const getRoleVariant = (role, isSuperAdmin) => {
    if (isSuperAdmin) return 'danger';
    if (role === 'staff') return 'success';
    return 'primary';
  };

  const getRoleText = (role, isSuperAdmin) => {
    if (isSuperAdmin) return 'Super Admin';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>User Management</h4>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          + Create User
        </Button>
      </div>

      <Row>
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">System Users</h5>
            </Card.Header>
            <Card.Body>
              <Table responsive striped>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>TIN</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.full_name}</td>
                      <td>{user.email}</td>
                      <td>{user.tin || 'N/A'}</td>
                      <td>
                        <Badge bg={getRoleVariant(user.role, user.is_super_admin)}>
                          {getRoleText(user.role, user.is_super_admin)}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={user.is_active ? 'success' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <Button
                          size="sm"
                          variant={user.is_active ? 'warning' : 'success'}
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create User Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New User</Modal.Title>
        </Modal.Header>
        <Form onSubmit={createUser}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                value={newUser.full_name}
                onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>TIN (Taxpayer Identification Number)</Form.Label>
              <Form.Control
                type="text"
                value={newUser.tin}
                onChange={(e) => setNewUser({...newUser, tin: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="taxpayer">Taxpayer</option>
                <option value="staff">Staff</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Super Admin"
                checked={newUser.is_super_admin}
                onChange={(e) => setNewUser({...newUser, is_super_admin: e.target.checked})}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create User
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;