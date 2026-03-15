import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Image, Badge, Modal, Form } from 'react-bootstrap';
import api from '../../services/api';

const SuperAdminStampApproval = () => {
    const [pendingStamps, setPendingStamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedStamp, setSelectedStamp] = useState(null);
    const [decision, setDecision] = useState({ status: 'approved', notes: '' });

    useEffect(() => {
        fetchPendingStamps();
    }, []);

    const fetchPendingStamps = async () => {
        try {
            const response = await api.get('/admin/pending-stamps');
            setPendingStamps(response.data.stamps || []);
        } catch (error) {
            console.error('Error fetching stamps:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = (stamp) => {
        setSelectedStamp(stamp);
        setShowModal(true);
    };

    const handleDecision = async () => {
        try {
            await api.post(`/admin/stamp-decision/${selectedStamp.id}`, decision);
            setShowModal(false);
            fetchPendingStamps();
        } catch (error) {
            console.error('Error processing decision:', error);
        }
    };

    return (
        <Container className="mt-4">
            <Card>
                <Card.Header>🏛️ Regional Admin Stamp Approvals</Card.Header>
                <Card.Body>
                    <Table striped hover>
                        <thead>
                            <tr>
                                <th>Regional Admin</th>
                                <th>Region</th>
                                <th>Stamp Preview</th>
                                <th>Uploaded</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingStamps.map(stamp => (
                                <tr key={stamp.id}>
                                    <td>{stamp.admin_name}</td>
                                    <td>{stamp.region_name}</td>
                                    <td>
                                        <Image 
                                            src={`http://localhost:5000/${stamp.stamp_path}`}
                                            style={{ maxHeight: '50px' }}
                                        />
                                    </td>
                                    <td>{new Date(stamp.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <Button 
                                            size="sm" 
                                            variant="primary"
                                            onClick={() => handleReview(stamp)}
                                        >
                                            Review
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Container>
    );
};