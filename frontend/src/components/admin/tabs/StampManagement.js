import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Alert, Table, Badge, Modal, Image } from 'react-bootstrap';
import api from '../../../services/api';

const StampManagement = () => {
  const [stamps, setStamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [stampForm, setStampForm] = useState({
    stamp_name: '',
    stamp_position: 'bottom_right'
  });

  const [stampFile, setStampFile] = useState(null);

  useEffect(() => {
    fetchStamps();
  }, []);

  const fetchStamps = async () => {
    try {
      const response = await api.get('/admin/stamps');
      setStamps(response.data.stamps);
    } catch (error) {
      setError('Failed to load stamps');
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

  const uploadStamp = async (e) => {
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

      const response = await api.post('/admin/stamps', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Government stamp uploaded successfully!');
      setShowUploadModal(false);
      setStampForm({ stamp_name: '', stamp_position: 'bottom_right' });
      setStampFile(null);
      fetchStamps();

    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload stamp');
    } finally {
      setUploading(false);
    }
  };

  const toggleStampStatus = async (stampId, currentStatus) => {
    try {
      await api.put(`/admin/stamps/${stampId}`, {
        is_active: !currentStatus
      });
      fetchStamps();
    } catch (error) {
      setError('Failed to update stamp status');
    }
  };

  const deleteStamp = async (stampId) => {
    if (window.confirm('Are you sure you want to delete this stamp?')) {
      try {
        await api.delete(`/admin/stamps/${stampId}`);
        fetchStamps();
        setSuccess('Stamp deleted successfully');
      } catch (error) {
        setError('Failed to delete stamp');
      }
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4>Government Stamp Management</h4>
          <p className="text-muted">Manage official stamps for TCC certificates</p>
        </div>
        <Button variant="primary" onClick={() => setShowUploadModal(true)}>
          + Upload New Stamp
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Row>
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Official Stamps</h5>
            </Card.Header>
            <Card.Body>
              {stamps.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No government stamps configured.</p>
                  <Button variant="primary" onClick={() => setShowUploadModal(true)}>
                    Upload First Stamp
                  </Button>
                </div>
              ) : (
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Stamp Preview</th>
                      <th>Stamp Name</th>
                      <th>Position</th>
                      <th>Status</th>
                      <th>Uploaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stamps.map(stamp => (
                      <tr key={stamp.id}>
                        <td>
                          {stamp.stamp_image_path ? (
                            <Image 
                              src={`http://localhost:5000/${stamp.stamp_image_path}`} 
                              alt={stamp.stamp_name}
                              width={80}
                              height={80}
                              style={{ border: '1px solid #ddd', borderRadius: '5px' }}
                            />
                          ) : (
                            <div 
                              style={{ 
                                width: 80, 
                                height: 80, 
                                border: '1px solid #ddd', 
                                borderRadius: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#f8f9fa'
                              }}
                            >
                              No Image
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>{stamp.stamp_name}</strong>
                        </td>
                        <td>
                          <Badge bg="info">{stamp.stamp_position}</Badge>
                        </td>
                        <td>
                          <Badge bg={stamp.is_active ? 'success' : 'secondary'}>
                            {stamp.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          {new Date(stamp.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant={stamp.is_active ? 'warning' : 'success'}
                            onClick={() => toggleStampStatus(stamp.id, stamp.is_active)}
                            className="me-2"
                          >
                            {stamp.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => deleteStamp(stamp.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Stamp Preview Card */}
      <Row className="mt-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">TCC Certificate Preview</h5>
            </Card.Header>
            <Card.Body>
              <div className="border rounded p-4 text-center bg-light">
                <h6>Sample TCC Certificate</h6>
                <p className="text-muted small mb-3">
                  Stamps will appear in the designated positions on the actual PDF
                </p>
                
                <div className="position-relative" style={{ height: '200px', border: '1px solid #ccc' }}>
                  {/* Stamp positions visualization */}
                  <div className="position-absolute top-0 start-0 p-2 border-end border-bottom">
                    <small>Top Left</small>
                  </div>
                  <div className="position-absolute top-0 end-0 p-2 border-start border-bottom">
                    <small>Top Right</small>
                  </div>
                  <div className="position-absolute bottom-0 start-0 p-2 border-end border-top">
                    <small>Bottom Left</small>
                  </div>
                  <div className="position-absolute bottom-0 end-0 p-2 border-start border-top">
                    <small>Bottom Right</small>
                  </div>
                  
                  {/* QR Code position */}
                  <div className="position-absolute top-50 end-0 translate-middle-y p-2">
                    <small>QR Code</small>
                  </div>
                </div>
                
                <div className="mt-3">
                  <Badge bg="info" className="me-2">QR Code</Badge>
                  <Badge bg="success">Government Stamp</Badge>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Stamp Guidelines</h5>
            </Card.Header>
            <Card.Body>
              <h6>Requirements:</h6>
              <ul className="small">
                <li>Image format: PNG or JPEG</li>
                <li>Maximum file size: 2MB</li>
                <li>Recommended dimensions: 200x200 pixels</li>
                <li>Transparent background preferred</li>
                <li>High resolution for print quality</li>
              </ul>
              
              <h6>Position Options:</h6>
              <ul className="small">
                <li><strong>Top Left:</strong> For additional seals</li>
                <li><strong>Top Right:</strong> For approval stamps</li>
                <li><strong>Bottom Left:</strong> For department stamps</li>
                <li><strong>Bottom Right:</strong> For main government stamp</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Upload Stamp Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Upload Government Stamp</Modal.Title>
        </Modal.Header>
        <Form onSubmit={uploadStamp}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Stamp Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={stampForm.stamp_name}
                    onChange={(e) => setStampForm({...stampForm, stamp_name: e.target.value})}
                    placeholder="e.g., Official Government Stamp"
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
                </Form.Group>
              </Col>

              <Col md={6}>
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
                  <div className="text-center">
                    <p><strong>Preview:</strong></p>
                    <Image 
                      src={URL.createObjectURL(stampFile)} 
                      alt="Stamp preview" 
                      style={{ maxWidth: '150px', maxHeight: '150px', border: '1px solid #ddd' }}
                    />
                  </div>
                )}
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Stamp'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default StampManagement;