import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';

const VerifyCertificate = () => {
    const [certNumber, setCertNumber] = useState('');
    const [result, setResult] = useState(null);

    const handleVerify = () => {
        // Mock verification
        setResult({
            valid: true,
            message: 'Certificate is valid',
            taxpayer: 'Abebe Retail Store',
            issueDate: '2024-01-15',
            expiryDate: '2025-01-14'
        });
    };

    return (
        <Container className="mt-4">
            <Card className="shadow">
                <Card.Header className="bg-primary text-white">
                    <h4>🔍 Verify Tax Clearance Certificate</h4>
                </Card.Header>
                <Card.Body>
                    <Form>
                        <Form.Group>
                            <Form.Label>Certificate Number</Form.Label>
                            <Form.Control
                                type="text"
                                value={certNumber}
                                onChange={(e) => setCertNumber(e.target.value)}
                                placeholder="Enter TCC number (e.g., TCC-2024-000001)"
                            />
                        </Form.Group>
                        <Button className="mt-3" onClick={handleVerify}>Verify Certificate</Button>
                    </Form>

                    {result && (
                        <Alert className="mt-4" variant="success">
                            <h5>✅ {result.message}</h5>
                            <p>Taxpayer: {result.taxpayer}</p>
                            <p>Issue Date: {result.issueDate}</p>
                            <p>Expiry Date: {result.expiryDate}</p>
                        </Alert>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default VerifyCertificate;