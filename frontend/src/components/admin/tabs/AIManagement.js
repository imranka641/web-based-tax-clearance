import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import api from '../../../services/api';

const AIManagement = () => {
  const [aiConfigs, setAiConfigs] = useState([]);
  const [systemSettings, setSystemSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAIData();
  }, []);

  const fetchAIData = async () => {
    try {
      const [configsRes, settingsRes] = await Promise.all([
        api.get('/admin/ai-configs'),
        api.get('/admin/system-settings')
      ]);
      setAiConfigs(configsRes.data.ai_configs);
      setSystemSettings(settingsRes.data.settings);
    } catch (error) {
      console.error('Error fetching AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAIConfig = async (configId, updates) => {
    try {
      await api.put(`/admin/ai-configs/${configId}`, updates);
      fetchAIData();
    } catch (error) {
      console.error('Error updating AI config:', error);
    }
  };

  const updateSystemSetting = async (key, value) => {
    try {
      await api.put('/admin/system-settings', { key, value });
      fetchAIData();
    } catch (error) {
      console.error('Error updating system setting:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>AI System Management</h4>
        <Badge bg="info">AI Powered</Badge>
      </div>

      <Alert variant="info" className="mb-4">
        <strong>AI Tax Verification System</strong> - Manages automated tax amount verification and fraud detection.
      </Alert>

      <Row>
        {/* AI Model Configurations */}
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">AI Model Configurations</h5>
            </Card.Header>
            <Card.Body>
              {aiConfigs.length === 0 ? (
                <p className="text-muted text-center">No AI configurations found</p>
              ) : (
                aiConfigs.map(config => (
                  <Card key={config.id} className="mb-3">
                    <Card.Body>
                      <h6>{config.model_name}</h6>
                      <small className="text-muted d-block mb-2">
                        Tax Type: {config.tax_type_name}
                      </small>
                      <Form.Group className="mb-2">
                        <Form.Label>Verification Threshold (%)</Form.Label>
                        <Form.Range
                          min="5"
                          max="50"
                          step="1"
                          value={config.verification_threshold}
                          onChange={(e) => updateAIConfig(config.id, {
                            verification_threshold: parseFloat(e.target.value)
                          })}
                        />
                        <div className="d-flex justify-content-between">
                          <small>5%</small>
                          <small>{config.verification_threshold}%</small>
                          <small>50%</small>
                        </div>
                      </Form.Group>
                      <Form.Group className="mb-2">
                        <Form.Label>Growth Rate Multiplier</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.1"
                          min="1.0"
                          max="3.0"
                          value={config.growth_rate_multiplier}
                          onChange={(e) => updateAIConfig(config.id, {
                            growth_rate_multiplier: parseFloat(e.target.value)
                          })}
                        />
                      </Form.Group>
                      <Form.Group className="mb-2">
                        <Form.Label>Under-reporting Tolerance</Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          max="10"
                          value={config.under_reporting_tolerance}
                          onChange={(e) => updateAIConfig(config.id, {
                            under_reporting_tolerance: parseInt(e.target.value)
                          })}
                        />
                      </Form.Group>
                      <Form.Check
                        type="checkbox"
                        label="Active Model"
                        checked={config.is_active}
                        onChange={(e) => updateAIConfig(config.id, {
                          is_active: e.target.checked
                        })}
                      />
                    </Card.Body>
                  </Card>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* System Settings */}
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">System Settings</h5>
            </Card.Header>
            <Card.Body>
              {Object.keys(systemSettings).length === 0 ? (
                <p className="text-muted text-center">No system settings found</p>
              ) : (
                Object.entries(systemSettings).map(([key, setting]) => (
                  <Form.Group key={key} className="mb-3">
                    <Form.Label>{setting.description}</Form.Label>
                    <Form.Control
                      type="text"
                      value={setting.setting_value}
                      onChange={(e) => updateSystemSetting(key, e.target.value)}
                    />
                    <Form.Text className="text-muted">
                      Key: {key}
                    </Form.Text>
                  </Form.Group>
                ))
              )}
            </Card.Body>
          </Card>

          {/* AI Performance Metrics */}
          <Card className="mt-4">
            <Card.Header>
              <h5 className="mb-0">AI Performance Metrics</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center">
                <h3 className="text-success">92%</h3>
                <p className="text-muted">Accuracy Rate</p>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <small>True Positives: 1,234</small>
                <small>False Positives: 45</small>
              </div>
              <div className="d-flex justify-content-between">
                <small>True Negatives: 876</small>
                <small>False Negatives: 23</small>
              </div>
              <Button variant="outline-primary" size="sm" className="w-100 mt-3">
                Retrain AI Models
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AIManagement;