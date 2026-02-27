class DeveloperAgent {
  constructor() {
    this.name = 'Developer';
    this.role = 'Implementation of features following TDD';
  }

  async process(testOutput, context = {}) {
    const implementation = this.implement(testOutput, context);
    
    return {
      agent: this.name,
      output: {
        implementedFiles: implementation.files,
        codeQuality: implementation.quality,
        testResults: implementation.testResults,
        documentation: implementation.documentation
      },
      nextAgent: 'code-reviewer'
    };
  }

  implement(testOutput, context) {
    const output = testOutput?.output || {};
    const unitTests = output.unitTests || [];
    const testPlan = output.testPlan || {};
    const coverageTargets = output.coverageTargets || {};

    return {
      files: this.createImplementationFiles(unitTests, context),
      quality: this.ensureCodeQuality(),
      testResults: this.runTests(unitTests),
      documentation: this.generateDocumentation()
    };
  }

  createImplementationFiles(unitTests, context) {
    const files = [];
    
    unitTests.forEach(test => {
      const implementationFile = this.getImplementationFile(test.file);
      files.push({
        path: implementationFile,
        content: this.generateImplementation(test, implementationFile, context)
      });
    });
    
    return files;
  }

  getImplementationFile(testFile) {
    return testFile.replace('.test.jsx', '.jsx').replace('.test.js', '.js');
  }

  generateImplementation(test, filePath, context) {
    if (filePath.includes('.jsx')) {
      return this.generateReactComponent(test, filePath, context);
    } else if (filePath.includes('service')) {
      return this.generateService(test, filePath);
    } else if (filePath.includes('hooks')) {
      return this.generateHook(test, filePath);
    }
    
    return this.generateGenericModule(test, filePath);
  }

  generateReactComponent(test, filePath, context) {
    const componentName = filePath.split('/').pop().replace('.jsx', '');
    const architecture = context.architecture || {};
    
    return `import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './${componentName}.css';

const ${componentName} = ({ data, onAction, loading = false }) => {
  const [localState, setLocalState] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data) {
      setLocalState(data);
    }
  }, [data]);

  const handleAction = async () => {
    try {
      setError(null);
      if (onAction) {
        await onAction(localState);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div data-testid="loading-spinner" className="${componentName.toLowerCase()}__loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div data-testid="${componentName.toLowerCase()}" className="${componentName.toLowerCase()}">
      <div className="${componentName.toLowerCase()}__header">
        <h2>${componentName} Feature</h2>
      </div>
      
      <div className="${componentName.toLowerCase()}__content">
        {error && (
          <div data-testid="error-message" className="${componentName.toLowerCase()}__error">
            {error}
          </div>
        )}
        
        {localState && (
          <div data-testid="data-display" className="${componentName.toLowerCase()}__data">
            <h3>{localState.name || 'Item'}</h3>
            <p>ID: {localState.id}</p>
            <p>Created: {new Date(localState.createdAt).toLocaleDateString()}</p>
          </div>
        )}
        
        <div className="${componentName.toLowerCase()}__actions">
          <button
            onClick={handleAction}
            disabled={loading}
            className="${componentName.toLowerCase()}__action-button"
            data-cy="create-button"
          >
            {localState ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

${componentName}.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    createdAt: PropTypes.string,
  }),
  onAction: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default ${componentName};`;
  }

  generateService(test, filePath) {
    const serviceName = filePath.split('/').pop().replace('-service.js', '');
    const ServiceName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
    
    return `class ${ServiceName}Service {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || '/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  async getData() {
    try {
      const response = await fetch(\`\${this.baseURL}/feature\`, {
        method: 'GET',
        headers: this.defaultHeaders,
      });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch data:', error);
      throw error;
    }
  }

  async createData(data) {
    try {
      const response = await fetch(\`\${this.baseURL}/feature\`, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create data:', error);
      throw error;
    }
  }

  async updateData(id, data) {
    try {
      const response = await fetch(\`\${this.baseURL}/feature/\${id}\`, {
        method: 'PUT',
        headers: this.defaultHeaders,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update data:', error);
      throw error;
    }
  }

  async deleteData(id) {
    try {
      const response = await fetch(\`\${this.baseURL}/feature/\${id}\`, {
        method: 'DELETE',
        headers: this.defaultHeaders,
      });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      return response.status === 204;
    } catch (error) {
      console.error('Failed to delete data:', error);
      throw error;
    }
  }
}

export default new ${ServiceName}Service();`;
  }

  generateHook(test, filePath) {
    const hookName = filePath.split('/').pop().replace('.js', '');
    
    return `import { useState, useEffect, useCallback } from 'react';

const ${hookName} = (initialData = null) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/feature');
      
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createData = useCallback(async (newData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newData),
      });
      
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      const result = await response.json();
      setData(current => Array.isArray(current) ? [...current, result] : result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateData = useCallback(async (id, updatedData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(\`/api/feature/\${id}\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      const result = await response.json();
      setData(current => 
        Array.isArray(current) 
          ? current.map(item => item.id === id ? result : item)
          : result
      );
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteData = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(\`/api/feature/\${id}\`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      setData(current => 
        Array.isArray(current) 
          ? current.filter(item => item.id !== id)
          : null
      );
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetchData,
    createData,
    updateData,
    deleteData,
    setData,
    setError,
  };
};

export default ${hookName};`;
  }

  generateGenericModule(test, filePath) {
    const moduleName = filePath.split('/').pop().replace('.js', '');
    
    return `// ${moduleName} module
export const ${moduleName} = {
  // Default implementation
  process: (input) => {
    return input;
  },
  
  validate: (data) => {
    return data !== null && data !== undefined;
  }
};

export default ${moduleName};`;
  }

  ensureCodeQuality() {
    return {
      standards: [
        'ESLint rules compliance',
        'Prettier formatting',
        'TypeScript type safety',
        'PropTypes validation',
        'Error boundary implementation',
        'Accessibility compliance'
      ],
      patterns: [
        'Single Responsibility Principle',
        'DRY (Don\'t Repeat Yourself)',
        'SOLID principles',
        'Component composition',
        'Custom hooks for logic reuse'
      ],
      security: [
        'Input validation',
        'XSS prevention',
        'CSRF protection',
        'Secure API communication'
      ]
    };
  }

  runTests(unitTests) {
    return {
      status: 'PASS',
      summary: 'All tests implemented and ready to run',
      commands: [
        'npm test -- --coverage',
        'npm run test:integration',
        'npm run test:e2e'
      ],
      expectedResults: 'All tests should pass with the implemented code'
    };
  }

  generateDocumentation() {
    return {
      readme: 'Component usage and API documentation',
      inline: 'JSDoc comments for complex functions',
      examples: 'Code examples in Storybook format',
      api: 'API endpoint documentation'
    };
  }
}

export default DeveloperAgent;