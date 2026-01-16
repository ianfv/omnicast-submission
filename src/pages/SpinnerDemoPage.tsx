import React from 'react';
import { OmnicastSpinnerExample } from '../components/OmnicastSpinner.example';

/**
 * Demo page to showcase the OmnicastSpinner component
 * Navigate to /spinner-demo to view
 */
const SpinnerDemoPage: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      padding: '2rem'
    }}>
      <OmnicastSpinnerExample />
    </div>
  );
};

export default SpinnerDemoPage;
