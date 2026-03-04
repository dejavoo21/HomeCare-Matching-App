import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { ServiceType, UrgencyLevel } from '../types/index';
import '../index.css';

export function CreateRequestPage() {
  useAuth(); // Ensure user is authenticated
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    serviceType: ServiceType.MEDICATION_ADMIN,
    description: '',
    address: '',
    scheduledDateTime: '',
    urgency: UrgencyLevel.MEDIUM,
    medication: '',
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.createRequest(
        formData.serviceType,
        formData.description,
        formData.address,
        formData.scheduledDateTime,
        formData.urgency,
        formData.medication
      );
      navigate('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create request'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <h1>Create Care Request</h1>
        <p className="subtitle">Tell us what care you need</p>

        <div className="form-container">
          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="serviceType">Service Type</label>
              <select
                id="serviceType"
                name="serviceType"
                className="form-control"
                value={formData.serviceType}
                onChange={handleChange}
              >
                <option value={ServiceType.MEDICATION_ADMIN}>
                  Medication Administration
                </option>
                <option value={ServiceType.WOUND_CARE}>Wound Care</option>
                <option value={ServiceType.VITAL_CHECKS}>
                  Vital Signs Checks
                </option>
                <option value={ServiceType.GENERAL_CARE}>General Care</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the care you need..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input
                id="address"
                type="text"
                name="address"
                className="form-control"
                value={formData.address}
                onChange={handleChange}
                placeholder="Your home address"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="scheduledDateTime">
                Preferred Date & Time
              </label>
              <input
                id="scheduledDateTime"
                type="datetime-local"
                name="scheduledDateTime"
                className="form-control"
                value={formData.scheduledDateTime}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="urgency">Urgency Level</label>
              <select
                id="urgency"
                name="urgency"
                className="form-control"
                value={formData.urgency}
                onChange={handleChange}
              >
                <option value={UrgencyLevel.LOW}>Low</option>
                <option value={UrgencyLevel.MEDIUM}>Medium</option>
                <option value={UrgencyLevel.HIGH}>High</option>
                <option value={UrgencyLevel.CRITICAL}>Critical</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="medication">
                Medication (if applicable)
              </label>
              <input
                id="medication"
                type="text"
                name="medication"
                className="form-control"
                value={formData.medication}
                onChange={handleChange}
                placeholder="e.g., Metformin 500mg"
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
