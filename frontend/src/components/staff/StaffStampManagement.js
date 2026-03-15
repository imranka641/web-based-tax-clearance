import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Image, Badge } from 'react-bootstrap';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const StaffStampManagement = () => {
  const [user, setUser] = useState(null);
  const [staffStamp, setStaffStamp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [stampForm, setStampForm] = useState({
    stamp_name: '',
    stamp_position: 'bottom_left'
  });

  const [stampFile, setStampFile] = useState(null);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || (currentUser.role !== 'staff' && !currentUser.is_super_admin)) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    fetchStaffStamp();
  }, []);

  const fetchStaffStamp = async () => {
    try {
      const response = await api.get('/staff/stamp');
      setStaffStamp(response.data.stamp);
    } catch (error) {
      console.error('Error fetching staff stamp:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload PNG or JPEG images only');
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        setError('File size must be less than 2MB');
        return;
      }
      
      setStampFile(file);
    }
  };

  const uploadStaffStamp = async (e) => {
    e.preventDefault();
    setUploading(true);
    setError('');
    setSuccess('');

    if (!stampFile) {
      setError('Please select a stamp image file');
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('stamp_image', stampFile);
      formData.append('stamp_name', stampForm.stamp_name);
      formData.append('stamp_position', stampForm.stamp_position);

      const response = await api.post('/staff/stamp', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Staff stamp uploaded successfully!');
      setStampForm({ stamp_name: '', stamp_position: 'bottom_left' });
      setStampFile(null);
      fetchStaffStamp();

    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload stamp');
    } finally {
      setUploading(false);
    }
  };

  const deleteStaffStamp = async () => {
    if (window.confirm('Are you sure you want to delete your staff stamp?')) {
      try {
        await api.delete('/staff/stamp');
        setSuccess('Staff stamp deleted successfully');
        setStaffStamp(null);
      } catch (error) {
        setError('Failed to delete stamp');
      }
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Staff Stamp Management</h2>
              <p className="text-muted">Manage your personal stamp for TCC certificates</p>
            </div>
            <Badge bg="primary">{user?.full_name}</Badge>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Row>
            {/* Current Stamp */}
            <Col md={6}>
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-info text-white">
                  <h5 className="mb-0">Current Staff Stamp</h5>
                </Card.Header>
                <Card.Body className="text-center">
                  {staffStamp ? (
                    <div>
                      <Image 
                        src={`http://localhost:5000/${staffStamp.stamp_image_path}`} 
                        alt={staffStamp.stamp_name}
                        style={{ 
                          maxWidth: '200px', 
                          maxHeight: '200px', 
                          border: '2px solid #dee2e6',
                          borderRadius: '10px'
                        }}
                      />
                      <div className="mt-3">
                        <h6>{staffStamp.stamp_name}</h6>
                        <Badge bg="secondary" className="me-2">
                          Position: {staffStamp.stamp_position}
                        </Badge>
                        <Badge bg={staffStamp.is_active ? 'success' : 'secondary'}>
                          {staffStamp.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        className="mt-3"
                        onClick={deleteStaffStamp}
                      >
                        Delete Stamp
                      </Button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <p className="text-muted">No staff stamp configured</p>
                      <p className="small text-muted">
                        Upload a stamp to personalize TCC certificates you approve.
                      </p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Upload/Update Stamp */}
            <Col md={6}>
              <Card className="shadow-sm">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">
                    {staffStamp ? 'Update Staff Stamp' : 'Upload Staff Stamp'}
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={uploadStaffStamp}>
                    <Form.Group className="mb-3">
                      <Form.Label>Stamp Name *</Form.Label>
                      <Form.Control
                        type="text"
                        value={stampForm.stamp_name}
                        onChange={(e) => setStampForm({...stampForm, stamp_name: e.target.value})}
                        placeholder="e.g., Approved by John Doe"
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Stamp Position *</Form.Label>
                      <Form.Select
                        value={stampForm.stamp_position}
                        onChange={(e) => setStampForm({...stampForm, stamp_position: e.target.value})}
                        required
                      >
                        <option value="top_left">Top Left</option>
                        <option value="top_right">Top Right</option>
                        <option value="bottom_left">Bottom Left</option>
                        <option value="bottom_right">Bottom Right</option>
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Choose where your stamp appears on TCC certificates
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Stamp Image *</Form.Label>
                      <Form.Control
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        onChange={handleFileUpload}
                        required
                      />
                      <Form.Text className="text-muted">
                        PNG or JPEG, max 2MB. Transparent background recommended.
                      </Form.Text>
                    </Form.Group>

                    {stampFile && (
                      <div className="text-center mb-3">
                        <p><strong>Preview:</strong></p>
                        <Image 
                          src={URL.createObjectURL(stampFile)} 
                          alt="Stamp preview" 
                          style={{ 
                            maxWidth: '150px', 
                            maxHeight: '150px', 
                            border: '1px solid #ddd',
                            borderRadius: '5px'
                          }}
                        />
                      </div>
                    )}

                    <div className="d-grid">
                      <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={uploading}
                      >
                        {uploading ? 'Uploading...' : (staffStamp ? 'Update Stamp' : 'Upload Stamp')}
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Stamp Guidelines */}
          <Row className="mt-4">
            <Col md={12}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Staff Stamp Guidelines</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6>Best Practices:</h6>
                      <ul className="small">
                        <li>Use your name or initials in the stamp</li>
                        <li>Include "Approved by" or "Verified by" text</li>
                        <li>Keep design simple and professional</li>
                        <li>Use transparent background for better integration</li>
                        <li>Recommended size: 150x150 pixels</li>
                      </ul>
                    </Col>
                    <Col md={6}>
                      <h6>Position Recommendations:</h6>
                      <ul className="small">
                        <li><strong>Bottom Left:</strong> Most common for staff approval stamps</li>
                        <li><strong>Bottom Right:</strong> For senior staff or supervisors</li>
                        <li><strong>Top Right:</strong> For additional verification stamps</li>
                        <li><strong>Top Left:</strong> For department-specific stamps</li>
                      </ul>
                    </Col>
                  </Row>

                  {/* TCC Preview */}
                  <div className="mt-4 p-3 border rounded bg-light">
                    <h6 className="text-center">TCC Certificate Preview</h6>
                    <div className="position-relative mx-auto" style={{ height: '200px', width: '80%', border: '1px solid #ccc', backgroundColor: 'white' }}>
                      {/* Government Stamp */}
                      <div className="position-absolute bottom-0 end-0 m-2 p-1 border rounded bg-white">
                        <small>Govt Stamp</small>
                      </div>
                      
                      {/* Staff Stamp */}
                      <div className={`position-absolute ${
                        stampForm.stamp_position === 'top_left' ? 'top-0 start-0' :
                        stampForm.stamp_position === 'top_right' ? 'top-0 end-0' :
                        stampForm.stamp_position === 'bottom_left' ? 'bottom-0 start-0' : 'bottom-0 end-0'
                      } m-2 p-1 border rounded bg-info text-white`}>
                        <small>Staff Stamp</small>
                      </div>
                      
                      {/* QR Code */}
                      <div className="position-absolute top-50 end-0 translate-middle-y m-2 p-1 border rounded bg-white">
                        <small>QR Code</small>
                      </div>
                    </div>
                    <div className="text-center mt-2">
                      <Badge bg="success" className="me-2">Government Stamp</Badge>
                      <Badge bg="info" className="me-2">Staff Stamp</Badge>
                      <Badge bg="warning">QR Code</Badge>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default StaffStampManagement;