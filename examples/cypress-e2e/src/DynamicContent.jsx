import React from 'react';
import { processData, formatResult } from './utils';

/**
 * Dynamic Content Component
 * This component is only loaded when the user clicks the "Load Dynamic Content" button
 * Navigation tests should NOT cover this file
 */
export function DynamicContent() {
  const data = processData('Hello from dynamic content!');
  const formattedResult = formatResult(data);

  return (
    <div className="dynamic-content">
      <h2 data-cy="dynamic-title">Dynamic Content Loaded!</h2>
      <p data-cy="dynamic-message">
        
        This content was loaded dynamically and should only be covered by 
        tests that actually click the button. Enhanced for TIA demo.
      </p>
      <div data-cy="processed-data" className="processed-data">
        <strong>Processed Result:</strong> {formattedResult}
      </div>
      <div data-cy="timestamp" className="timestamp">
        Loaded at: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
