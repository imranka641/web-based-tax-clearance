import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { getUser } from '../../../utils/auth';

const RegionalReports = () => {
    const [user, setUser] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = getUser();
        if (!currentUser || (currentUser.role !== 'regional_admin' && !currentUser.is_super_admin)) {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        fetchReports();
    }, [navigate]);

    const fetchReports = async () => {
        try {
            // Mock data for now
            setReports([
                { id: 1, name: 'Monthly Collection Report', period: 'March 2024', generated: '2024-03-15' },
                { id: 2, name: 'Quarterly Compliance Report', period: 'Q1 2024', generated: '2024-04-01' },
                { id: 3, name: 'Town Performance Report', period: '2024', generated: '2024-03-10' }
            ]);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" />
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <h2>📊 Regional Reports</h2>
            <p className="text-muted">Welcome, {user?.full_name}</p>
            
            <Row className="mt-4">
                <Col md={8}>
                    <Card>
                        <Card.Header>Generated Reports</Card.Header>
                        <Card.Body>
                            <Table striped hover>
                                <thead>
                                    <tr>
                                        <th>Report Name</th>
                                        <th>Period</th>
                                        <th>Generated Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map(report => (
                                        <tr key={report.id}>
                                            <td>{report.name}</td>
                                            <td>{report.period}</td>
                                            <td>{report.generated}</td>
                                            <td>
                                                <Button size="sm" variant="outline-primary">View</Button>
                                                <Button size="sm" variant="outline-success" className="ms-2">Download</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col md={4}>
                    <Card>
                        <Card.Header>Generate New Report</Card.Header>
                        <Card.Body>
                            <Button variant="primary" className="w-100 mb-2">Monthly Collection</Button>
                            <Button variant="primary" className="w-100 mb-2">Quarterly Summary</Button>
                            <Button variant="primary" className="w-100 mb-2">Annual Report</Button>
                            <Button variant="primary" className="w-100">Town Comparison</Button>
                        </Card.Body>
                    </Card>
                    
                    <Card className="mt-3">
                        <Card.Header>Summary</Card.Header>
                        <Card.Body>
                            <p><strong>Total Reports:</strong> {reports.length}</p>
                            <p><strong>Last Generated:</strong> 2024-03-15</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default RegionalReports;