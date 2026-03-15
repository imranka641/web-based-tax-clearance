import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Badge, Alert, Spinner, Table } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const VerifyCertificate = () => {
    const { certificateNumber } = useParams();
    const [loading, setLoading] = useState(true);
    const [certificate, setCertificate] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        verifyCertificate();
    }, [certificateNumber]);

    const verifyCertificate = async () => {
        try {
            const response = await api.get(`/public/verify-certificate/${certificateNumber}`);
            setCertificate(response.data.certificate);
        } catch (error) {
            console.error('Verification error:', error);
            setError('Certificate not found or invalid');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Verifying certificate...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">
                    <Alert.Heading>❌ Invalid Certificate</Alert.Heading>
                    <p>{error}</p>
                    <p>The certificate you are trying to verify does not exist or has been tampered with.</p>
                </Alert>
            </Container>
        );
    }

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col md={10}>
                    <Card className="shadow-lg border-success">
                        <Card.Header className="bg-success text-white text-center py-4">
                            <h2>✅ CERTIFICATE VERIFICATION RESULT</h2>
                            <h5>Ministry of Revenue - Ethiopia</h5>
                        </Card.Header>
                        <Card.Body className="p-5">
                            <Alert variant="success" className="text-center">
                                <h4>✓ This is a VALID Tax Clearance Certificate</h4>
                                <p>Issued by the Ethiopian Ministry of Revenue</p>
                            </Alert>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <Card className="bg-light">
                                        <Card.Body>
                                            <h6 className="text-primary">Certificate Information</h6>
                                            <Table borderless size="sm">
                                                <tbody>
                                                    <tr>
                                                        <td><strong>Certificate No:</strong></td>
                                                        <td>{certificate.tcc_number}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Issue Date:</strong></td>
                                                        <td>{new Date(certificate.issue_date).toLocaleDateString()}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Expiry Date:</strong></td>
                                                        <td>{new Date(certificate.expiry_date).toLocaleDateString()}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Status:</strong></td>
                                                        <td><Badge bg="success">ACTIVE</Badge></td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="bg-light">
                                        <Card.Body>
                                            <h6 className="text-primary">Taxpayer Information</h6>
                                            <Table borderless size="sm">
                                                <tbody>
                                                    <tr>
                                                        <td><strong>Full Name:</strong></td>
                                                        <td>{certificate.taxpayer_name}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>TIN:</strong></td>
                                                        <td>{certificate.tin}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Fayda Number:</strong></td>
                                                        <td>{certificate.fayda_number || 'N/A'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>National ID:</strong></td>
                                                        <td>{certificate.national_id_number || 'N/A'}</td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <Card className="bg-light">
                                        <Card.Body>
                                            <h6 className="text-primary">Business & Location</h6>
                                            <Table borderless size="sm">
                                                <tbody>
                                                    <tr>
                                                        <td><strong>Business Name:</strong></td>
                                                        <td>{certificate.business_name || 'Self Employed'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Region:</strong></td>
                                                        <td>{certificate.region_name}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Town/City:</strong></td>
                                                        <td>{certificate.town_name}</td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="bg-light">
                                        <Card.Body>
                                            <h6 className="text-primary">Payment Information</h6>
                                            <Table borderless size="sm">
                                                <tbody>
                                                    <tr>
                                                        <td><strong>Total Tax Paid:</strong></td>
                                                        <td>ETB {certificate.total_paid?.toLocaleString()}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Last Payment:</strong></td>
                                                        <td>{new Date(certificate.last_payment_date).toLocaleDateString()}</td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            <Card className="bg-warning text-dark">
                                <Card.Body>
                                    <h6 className="text-center">VERIFICATION DETAILS</h6>
                                    <p className="text-center mb-0">
                                        This certificate was verified on {new Date().toLocaleString()}<br />
                                        <small>The information above matches the official records of the Ministry of Revenue</small>
                                    </p>
                                </Card.Body>
                            </Card>
                        </Card.Body>
                        <Card.Footer className="text-center text-muted">
                            <small>For official verification, please contact the Ministry of Revenue</small>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default VerifyCertificate;