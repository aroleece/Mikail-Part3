import React, { useState } from 'react';

/**
 * TruncatedNote component to handle note display with truncation
 * 
 * Props:
 * @param {string} note - The note text to display
 * @param {number} maxLength - Maximum length before truncation (default: 80)
 * @returns React component
 */
const TruncatedNote = ({ note, maxLength = 80 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  if (!note) return <span>No notes provided</span>;
  
  // If note is shorter than max length, just return it
  if (note.length <= maxLength) return <span>{note}</span>;
  
  // For very long notes, provide modal option
  const isVeryLong = note.length > 300;
  
  return (
    <div className="truncated-note">
      {showModal && (
        <div className="note-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="note-modal-content" onClick={e => e.stopPropagation()}>
            <div className="note-modal-header">
              <h3>Note Details</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="note-modal-body">
              <p>{note}</p>
            </div>
          </div>
        </div>
      )}
      
      {isExpanded ? (
        <div className="full-note">
          <p>{isVeryLong ? note.substring(0, 300) + '...' : note}</p>
          <div className="note-action-buttons">
            <button 
              className="view-toggle-button" 
              onClick={() => setIsExpanded(false)}
            >
              Show Less
            </button>
            {isVeryLong && (
              <button 
                className="view-modal-button" 
                onClick={() => setShowModal(true)}
              >
                View Full Note
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="truncated-content">
          <p>{note.substring(0, maxLength)}...</p>
          <button 
            className="view-toggle-button" 
            onClick={() => setIsExpanded(true)}
          >
            View More
          </button>
        </div>
      )}
    </div>
  );
};

export default TruncatedNote; 