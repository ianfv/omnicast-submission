import React from 'react';
import { OmnicastSpinner } from './OmnicastSpinner';

/**
 * Example usage of OmnicastSpinner component
 * 
 * This demonstrates different sizes, speeds, and background options
 */
export const OmnicastSpinnerExample: React.FC = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ color: '#fff', marginBottom: '2rem' }}>Omnicast Spinner Examples</h2>
      
      {/* Default spinner */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Default (48px, 1.2s)</h3>
        <div style={{ background: '#000', padding: '2rem', borderRadius: '8px', display: 'inline-block' }}>
          <OmnicastSpinner />
        </div>
      </div>

      {/* Different sizes */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Different Sizes</h3>
        <div style={{ background: '#000', padding: '2rem', borderRadius: '8px', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '0.5rem' }}>24px</p>
            <OmnicastSpinner size={24} />
          </div>
          <div>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '0.5rem' }}>36px</p>
            <OmnicastSpinner size={36} />
          </div>
          <div>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '0.5rem' }}>48px</p>
            <OmnicastSpinner size={48} />
          </div>
          <div>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '0.5rem' }}>64px</p>
            <OmnicastSpinner size={64} />
          </div>
          <div>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '0.5rem' }}>96px</p>
            <OmnicastSpinner size={96} />
          </div>
        </div>
      </div>

      {/* Different speeds */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Different Speeds</h3>
        <div style={{ background: '#000', padding: '2rem', borderRadius: '8px', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '0.5rem' }}>Fast (0.6s)</p>
            <OmnicastSpinner size={48} speed={0.6} />
          </div>
          <div>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '0.5rem' }}>Normal (1.2s)</p>
            <OmnicastSpinner size={48} speed={1.2} />
          </div>
          <div>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '0.5rem' }}>Slow (2.0s)</p>
            <OmnicastSpinner size={48} speed={2.0} />
          </div>
        </div>
      </div>

      {/* With background prop */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ color: '#fff', marginBottom: '1rem' }}>With Background Prop</h3>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '0.5rem' }}>background="black"</p>
            <OmnicastSpinner size={64} background="black" />
          </div>
          <div style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '8px' }}>
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '0.5rem' }}>background="transparent"</p>
            <OmnicastSpinner size={64} background="transparent" />
          </div>
        </div>
      </div>

      {/* Loading state example */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ color: '#fff', marginBottom: '1rem' }}>In Loading State Context</h3>
        <div style={{ 
          background: '#000', 
          padding: '3rem', 
          borderRadius: '8px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <OmnicastSpinner size={64} />
          <p style={{ color: '#fff', fontSize: '16px' }}>Generating your podcast...</p>
          <p style={{ color: '#999', fontSize: '14px' }}>This may take a few moments</p>
        </div>
      </div>

      {/* Inline usage */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Inline Usage</h3>
        <div style={{ background: '#000', padding: '2rem', borderRadius: '8px' }}>
          <p style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <OmnicastSpinner size={20} speed={0.8} />
            Loading content...
          </p>
        </div>
      </div>
    </div>
  );
};

export default OmnicastSpinnerExample;
