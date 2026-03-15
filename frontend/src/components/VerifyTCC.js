import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Badge, Table } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const VerifyTCC = () => {
  const { tccNumber } = useParams();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    verifyTCC();
  }, [tccNumber]);

  const verifyTCC = async () => {
    try {
      const response = await api.get(`/verify/tcc/${tccNumber}`);
      setVerificationData(response.data);
    } catch (error) {
      setError('TCC verification failed or certificate not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Verifying TCC...</span>
        </Spinner>
        <p className="mt-3">Verifying Tax Clearance Certificate...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white text-center">
              <h4 className="mb-0">TCC Verification</h4>
              <p className="mb-0">Tax Clearance Certificate Verification System</p>
            </Card.Header>
            
            <Card.Body className="p-4">
              {error ? (
                <Alert variant="danger" className="text-center">
                  <h5>❌ Verification Failed</h5>
                  <p className="mb-0">{error}</p>
                </Alert>
              ) : verificationData ? (
                <>
                  <Alert variant="success" className="text-center">
                    <h5>✅ Valid Tax Clearance Certificate</h5>
                    <p className="mb-0">This certificate has been verified by the Ethiopian Ministry of Revenue</p>
                  </Alert>

                  <Row>
                    <Col md={6}>
                      <Card className="h-100">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Certificate Information</h6>
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
                                <td>{new Date(verificationData.expiry_date).toLocaleDateString()}</td>
                              </tr>
                              <tr>
                                <td><strong>Status:</strong></td>
                                <td>
                                  <Badge bg="success">VALID</Badge>
                                </td>
                              </tr>
                            </tbody>
                          </Table>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="h-100">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Taxpayer Information</h6>
                        </Card.Header>
                        <Card.Body>
                          <Table borderless size="sm">
                            <tbody>
                              <tr>
                                <td><strong>Full Name:</strong></td>
                                <td>{verificationData.taxpayer_full_name}</td>
                              </tr>
                              <tr>
                                <td><strong>TIN Number:</strong></td>
                                <td>{verificationData.taxpayer_tin}</td>
                              </tr>
                              <tr>
                                <td><strong>Business:</strong></td>
                                <td>{verificationData.business_name || 'Not Specified'}</td>
                              </tr>
                            </tbody>
                          </Table>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  <Row className="mt-4">
                    <Col md={12}>
                      <Card>
                        <Card.Header className="bg-info text-white">
                          <h6 className="mb-0">Tax Payment Details</h6>
                        </Card.Header>
                        <Card.Body>
                          <Table borderless>
                            <tbody>
                              <tr>
                                <td><strong>Tax Type:</strong></td>
                                <td>{verificationData.tax_type || 'Tax Clearance'}</td>
                              </tr>
                              <tr>
                                <td><strong>Amount Paid:</strong></td>
                                <td>
                                  <Badge bg="primary" className="fs-6">
                                    ETB {verificationData.tax_amount?.toLocaleString() || '0'}
                                  </Badge>
                                </td>
                              </tr>
                              <tr>
                                <td><strong>Currency:</strong></td>
                                <td>Ethiopian Birr (ETB)</td>
                              </tr>
                              <tr>
                                <td><strong>Issuing Authority:</strong></td>
                                <td>Ethiopian Ministry of Revenue</td>
                              </tr>
                            </tbody>
                          </Table>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  <Alert variant="info" className="mt-4">
                    <h6>Verification Details</h6>
                    <p className="mb-2">
                      <strong>Verified on:</strong> {new Date().toLocaleString()}
                    </p>
                    <p className="mb-0">
                      <strong>Verification ID:</strong> {Date.now().toString(36).toUpperCase()}
                    </p>
                  </Alert>
                </>
              ) : null}
            </Card.Body>

            <Card.Footer className="text-center text-muted">
              <small>
                Ethiopian Ministry of Revenue - Tax Clearance Certificate Verification System
                <br />
                This is an official verification. For disputes, contact the Ministry directly.
              </small>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default VerifyTCC;