import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Badge, Table } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

const QRVerification = () => {
  const { tccNumber } = useParams();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tccNumber) {
      verifyTCC(tccNumber);
    }
  }, [tccNumber]);

  const verifyTCC = async (number) => {
    try {
      const response = await api.get(`/verify/tcc/${number}`);
      setVerificationData(response.data);
    } catch (error) {
      setError('TCC not found or invalid');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Valid': return 'success';
      case 'Expired': return 'warning';
      case 'Revoked': return 'danger';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Verifying TCC Certificate...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white text-center">
              <h4 className="mb-0">TCC Certificate Verification</h4>
              <small>Ethiopian Ministry of Revenue</small>
            </Card.Header>
            
            <Card.Body>
              {error ? (
                <Alert variant="danger" className="text-center">
                  <h5>❌ Verification Failed</h5>
                  <p className="mb-0">{error}</p>
                </Alert>
              ) : verificationData ? (
                <>
                  {/* Verification Status */}
                  <Alert variant="success" className="text-center">
                    <h5>✅ Certificate Verified</h5>
                    <p className="mb-0">This Tax Clearance Certificate is valid and authentic</p>
                  </Alert>

                  {/* Certificate Information */}
                  <Row className="mb-4">
                    <Col md={6}>
                      <Card className="border-primary">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Certificate Details</h6>
                        </Card.Header>
                        <Card.Body>
                          <Table borderless size="sm">
                            <tbody>
                              <tr>
                                <td><strong>TCC Number:</strong></td>
                                <td>{verificationData.tcc_number}</td>
                              </tr>
                              <tr>
                                <td><strong>Issue Date:</strong></td>
                                <td>{new Date(verificationData.issue_date).toLocaleDateString()}</td>
                              </tr>
                              <tr>
                                <td><strong>Expiry Date:</strong></td>
                                <td>
                                  <Badge bg={new Date(verificationData.expiry_date) > new Date() ? 'success' : 'danger'}>
                                    {new Date(verificationData.expiry_date).toLocaleDateString()}
                                  </Badge>
                                </td>
                              </tr>
                              <tr>
                                <td><strong>Status:</strong></td>
                                <td>
                                  <Badge bg={getStatusVariant(verificationData.status)}>
                                    {verificationData.status}
                                  </Badge>
                                </td>
                              </tr>
                            </tbody>
                          </Table>
                        </Card.Body>
                      </Card>
                    </Col>
                    
                    <Col md={6}>
                      <Card className="border-success">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Tax Information</h6>
                        </Card.Header>
                        <Card.Body>
                          <Table borderless size="sm">
                            <tbody>
                              <tr>
                                <td><strong>Tax Type:</strong></td>
                                <td>{verificationData.tax_type_name}</td>
                              </tr>
                              <tr>
                                <td><strong>Amount Paid:</strong></td>
                                <td>
                                  <Badge bg="success" className="fs-6">
                                    ETB {verificationData.tax_amount?.toLocaleString()}
                                  </Badge>
                                </td>
                              </tr>
                              <tr>
                                <td><strong>Currency:</strong></td>
                                <td>Ethiopian Birr (ETB)</td>
                              </tr>
                            </tbody>
                          </Table>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {/* Taxpayer Information */}
                  <Card className="mb-4">
                    <Card.Header className="bg-info text-white">
                      <h6 className="mb-0">Taxpayer Information</h6>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <p><strong>Full Name:</strong><br />
                            {verificationData.taxpayer_full_name}
                          </p>
                          <p><strong>TIN Number:</strong><br />
                            <Badge bg="primary">{verificationData.taxpayer_tin}</Badge>
                          </p>
                        </Col>
                        <Col md={6}>
                          <p><strong>Business Name:</strong><br />
                            {verificationData.taxpayer_business_name || 'Not Applicable'}
                          </p>
                          <p><strong>Verification Date:</strong><br />
                            {new Date().toLocaleString()}
                          </p>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>

                  {/* Staff Approval Information */}
                  {verificationData.staff_approval && (
                    <Card className="border-warning">
                      <Card.Header className="bg-warning text-dark">
                        <h6 className="mb-0">Staff Approval Details</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <p><strong>Approved By:</strong><br />
                              {verificationData.staff_approval.staff_name}
                            </p>
                            <p><strong>Staff ID:</strong><br />
                              {verificationData.staff_approval.staff_id}
                            </p>
                          </Col>
                          <Col md={6}>
                            <p><strong>Approval Date:</strong><br />
                              {new Date(verificationData.staff_approval.approval_date).toLocaleString()}
                            </p>
                            <p><strong>Authority:</strong><br />
                              Ethiopian Ministry of Revenue
                            </p>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  )}

                  {/* Security Information */}
                  <Alert variant="info" className="mt-4">
                    <h6>Security Information</h6>
                    <small>
                      <strong>Verified by:</strong> Ethiopian Ministry of Revenue<br />
                      <strong>Verification Timestamp:</strong> {new Date().toISOString()}<br />
                      <strong>Document Hash:</strong> {verificationData.security_hash}<br />
                      This verification is official and can be used for legal purposes.
                    </small>
                  </Alert>
                </>
              ) : null}
            </Card.Body>

            <Card.Footer className="text-center text-muted">
              <small>
                &copy; {new Date().getFullYear()} Federal Democratic Republic of Ethiopia - Ministry of Revenue
              </small>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default QRVerification;