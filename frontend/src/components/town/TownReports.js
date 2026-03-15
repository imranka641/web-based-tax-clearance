import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Table, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../../utils/auth';

const TownReports = () => {
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleGenerateReport = (reportType) => {
        setGenerating(true);
        setMessage(`Generating ${reportType} report...`);
        
        // Simulate report generation
        setTimeout(() => {
            setGenerating(false);
            setMessage(`${reportType} report generated successfully!`);
        }, 2000);
    };

    return (
        <Container className="mt-4">
            <h2>📑 Town Reports</h2>
            <p className="text-muted">Generate and download reports for your town</p>
            
            {message && (
                <Alert variant={message.includes('success') ? 'success' : 'info'} className="mt-3">
                    {message}
                </Alert>
            )}
            
            <Row className="mt-4">
                <Col md={4}>
                    <Card className="shadow-sm h-100">
                        <Card.Header className="bg-primary text-white">Monthly Collection</Card.Header>
                        <Card.Body>
                            <p>Detailed breakdown of tax collection by category and taxpayer for a specific month.</p>
                            <Button 
                                variant="outline-primary" 
                                className="w-100"
                                onClick={() => handleGenerateReport('Monthly Collection')}
                                disabled={generating}
                            >
                                {generating ? 'Generating...' : 'Generate Report'}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={4}>
                    <Card className="shadow-sm h-100">
                        <Card.Header className="bg-success text-white">Quarterly Summary</Card.Header>
                        <Card.Body>
                            <p>Quarterly overview of tax collection, compliance rates, and key metrics.</p>
                            <Button 
                                variant="outline-success" 
                                className="w-100"
                                onClick={() => handleGenerateReport('Quarterly Summary')}
                                disabled={generating}
                            >
                                {generating ? 'Generating...' : 'Generate Report'}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={4}>
                    <Card className="shadow-sm h-100">
                        <Card.Header className="bg-warning text-dark">Annual Report</Card.Header>
                        <Card.Body>
                            <p>Comprehensive annual report with year-over-year comparisons and trends.</p>
                            <Button 
                                variant="outline-warning" 
                                className="w-100"
                                onClick={() => handleGenerateReport('Annual')}
                                disabled={generating}
                            >
                                {generating ? 'Generating...' : 'Generate Report'}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-4">
                <Col md={4}>
                    <Card className="shadow-sm h-100">
                        <Card.Header className="bg-info text-white">Unpaid Taxes</Card.Header>
                        <Card.Body>
                            <p>List of all taxpayers with outstanding balances and overdue payments.</p>
                            <Button 
                                variant="outline-info" 
                                className="w-100"
                                onClick={() => handleGenerateReport('Unpaid Taxes')}
                                disabled={generating}
                            >
                                {generating ? 'Generating...' : 'Generate Report'}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={4}>
                    <Card className="shadow-sm h-100">
                        <Card.Header className="bg-secondary text-white">Category Analysis</Card.Header>
                        <Card.Body>
                            <p>Analysis of taxpayers by category with collection performance.</p>
                            <Button 
                                variant="outline-secondary" 
                                className="w-100"
                                onClick={() => handleGenerateReport('Category Analysis')}
                                disabled={generating}
                            >
                                {generating ? 'Generating...' : 'Generate Report'}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={4}>
                    <Card className="shadow-sm h-100">
                        <Card.Header className="bg-danger text-white">Compliance Report</Card.Header>
                        <Card.Body>
                            <p>Taxpayer compliance status, filing rates, and payment history.</p>
                            <Button 
                                variant="outline-danger" 
                                className="w-100"
                                onClick={() => handleGenerateReport('Compliance')}
                                disabled={generating}
                            >
                                {generating ? 'Generating...' : 'Generate Report'}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="mt-4 shadow-sm">
                <Card.Header>Recent Reports</Card.Header>
                <Card.Body>
                    <Table striped hover>
                        <thead>
                            <tr>
                                <th>Report Name</th>
                                <th>Generated Date</th>
                                <th>Size</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Monthly Collection - February 2024</td>
                                <td>2024-03-01</td>
                                <td>245 KB</td>
                                <td>
                                    <Button size="sm" variant="outline-primary">Download</Button>
                                    <Button size="sm" variant="outline-secondary" className="ms-2">View</Button>
                                </td>
                            </tr>
                            <tr>
                                <td>Quarterly Summary - Q1 2024</td>
                                <td>2024-04-01</td>
                                <td>512 KB</td>
                                <td>
                                    <Button size="sm" variant="outline-primary">Download</Button>
                                    <Button size="sm" variant="outline-secondary" className="ms-2">View</Button>
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default TownReports;