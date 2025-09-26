import React, { useState } from 'react';

/**
 * Main App Component
 * This component is always loaded and covers the basic page functionality
 */
function App() {
  const [showDynamic, setShowDynamic] = useState(false);
  const [DynamicComponent, setDynamicComponent] = useState(null);

  const handleLoadDynamic = async () => {
    console.log('Loading dynamic content...');
    if (!DynamicComponent) {
      // Dynamic import - only loads DynamicContent.jsx when button is clicked
      const { DynamicContent } = await import('./DynamicContent');
      setDynamicComponent(() => DynamicContent);
    }
    setShowDynamic(true);
  };

  return (
    <div className="container">
      <header>
        <h1 data-cy="page-title">TIA Demo App</h1>
        <p data-cy="page-description">
          Simple React app to demonstrate Test Impact Analysis with precision
        </p>
      </header>

      <main>
        <div className="main-content">
          <p data-cy="welcome-message">
            Welcome! This is the main page content that's always visible.
          </p>
          
          <button 
            data-cy="load-dynamic-btn"
            onClick={handleLoadDynamic}
            className="load-button"
          >
            Load Dynamic Content
          </button>

          {showDynamic && DynamicComponent && (
            <div data-cy="dynamic-section">
              <DynamicComponent />
            </div>
          )}
        </div>
      </main>

      <footer>
        <p data-cy="app-version">TIA Demo v1.0.0</p>
      </footer>
    </div>
  );
}

export default App;
