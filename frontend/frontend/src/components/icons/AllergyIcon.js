import React from 'react';

const AllergyIcon = ({ allergyInfo, size = '16px' }) => {
  // Only show the icon if allergy info exists and isn't 'None'
  if (!allergyInfo || allergyInfo.toLowerCase() === 'none') {
    return null;
  }

  return (
    <div 
      className="allergy-icon-wrapper"
      style={{
        position: 'relative',
        display: 'inline-flex',
        marginLeft: '8px',
        flexShrink: 0,
        cursor: 'help',
      }}
    >
      <div 
        className="allergy-icon" 
        title={`Allergens: ${allergyInfo}`}
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ff6b6b',
          color: 'white',
          width: size,
          height: size,
          borderRadius: '50%',
          fontSize: `calc(${size} * 0.7)`,
          fontWeight: 'bold',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      >
        !
      </div>
      <div className="allergy-tooltip">
        {allergyInfo}
      </div>
    </div>
  );
};

export default AllergyIcon; 