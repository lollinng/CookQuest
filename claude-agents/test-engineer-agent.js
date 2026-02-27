class TestEngineerAgent {
  constructor() {
    this.name = 'Test Engineer';
    this.role = 'Test-driven development and quality assurance';
  }

  async process(architectOutput, context = {}) {
    const tests = this.createTests(architectOutput);
    
    return {
      agent: this.name,
      output: {
        unitTests: tests.unit,
        integrationTests: tests.integration,
        e2eTests: tests.e2e,
        testPlan: tests.plan,
        coverageTargets: tests.coverage
      },
      nextAgent: 'developer'
    };
  }

  createTests(archOutput) {
    const output = archOutput?.output || {};
    const systemDesign = output.systemDesign || {};
    const filesToCreate = output.filesToCreate || [];
    const interfaces = output.interfaces || [];
    const dataModels = output.dataModels || [];

    return {
      unit: this.createUnitTests(filesToCreate, interfaces),
      integration: this.createIntegrationTests(interfaces),
      e2e: this.createE2ETests(systemDesign),
      plan: this.createTestPlan(),
      coverage: this.defineCoverageTargets()
    };
  }

  createUnitTests(files, interfaces) {
    const tests = [];
    
    files.forEach(file => {
      if (file.includes('.jsx') && !file.includes('.test.')) {
        const componentName = this.extractComponentName(file);
        tests.push({
          file: file.replace('.jsx', '.test.jsx'),
          content: this.generateComponentTest(componentName)
        });
      }
      
      if (file.includes('service.js')) {
        const serviceName = this.extractServiceName(file);
        tests.push({
          file: file.replace('.js', '.test.js'),
          content: this.generateServiceTest(serviceName)
        });
      }
      
      if (file.includes('hooks/')) {
        const hookName = this.extractHookName(file);
        tests.push({
          file: file.replace('.js', '.test.js'),
          content: this.generateHookTest(hookName)
        });
      }
    });
    
    return tests;
  }

  extractComponentName(file) {
    return file.split('/').pop().replace('.jsx', '');
  }

  extractServiceName(file) {
    return file.split('/').pop().replace('-service.js', '').replace(/-/g, '');
  }

  extractHookName(file) {
    return file.split('/').pop().replace('.js', '').replace(/-/g, '');
  }

  generateComponentTest(componentName) {
    return `import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ${componentName} from './${componentName}';

describe('${componentName}', () => {
  const mockProps = {
    data: null,
    onAction: jest.fn(),
    loading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<${componentName} {...mockProps} />);
    expect(screen.getByTestId('${componentName.toLowerCase()}')).toBeInTheDocument();
  });

  test('displays loading state', () => {
    render(<${componentName} {...mockProps} loading={true} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('handles user interaction', async () => {
    render(<${componentName} {...mockProps} />);
    
    const actionButton = screen.getByRole('button', { name: /action/i });
    fireEvent.click(actionButton);
    
    await waitFor(() => {
      expect(mockProps.onAction).toHaveBeenCalledTimes(1);
    });
  });

  test('displays data when provided', () => {
    const mockData = { id: '1', name: 'Test Item' };
    render(<${componentName} {...mockProps} data={mockData} />);
    
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });
});`;
  }

  generateServiceTest(serviceName) {
    const ServiceName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
    
    return `import ${ServiceName}Service from './${serviceName}-service';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('${ServiceName}Service', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getData', () => {
    test('successfully fetches data', async () => {
      const mockData = { id: '1', name: 'Test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const result = await ${ServiceName}Service.getData();
      
      expect(fetch).toHaveBeenCalledWith('/api/feature');
      expect(result).toEqual(mockData);
    });

    test('handles fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(${ServiceName}Service.getData()).rejects.toThrow('Network error');
    });
  });

  describe('createData', () => {
    test('successfully creates data', async () => {
      const newData = { name: 'New Item' };
      const mockResponse = { id: '2', ...newData };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await ${ServiceName}Service.createData(newData);
      
      expect(fetch).toHaveBeenCalledWith('/api/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      expect(result).toEqual(mockResponse);
    });
  });
});`;
  }

  generateHookTest(hookName) {
    const HookName = hookName.replace(/([A-Z])/g, ' $1').trim();
    
    return `import { renderHook, act } from '@testing-library/react';
import ${hookName} from './${hookName.replace(/([A-Z])/g, '-$1').toLowerCase()}';

describe('${hookName}', () => {
  test('initializes with default state', () => {
    const { result } = renderHook(() => ${hookName}());
    
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('handles loading state', async () => {
    const { result } = renderHook(() => ${hookName}());
    
    act(() => {
      result.current.fetchData();
    });
    
    expect(result.current.loading).toBe(true);
  });

  test('handles successful data fetch', async () => {
    const mockData = { id: '1', name: 'Test' };
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const { result } = renderHook(() => ${hookName}());
    
    await act(async () => {
      await result.current.fetchData();
    });
    
    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('handles fetch error', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => ${hookName}());
    
    await act(async () => {
      await result.current.fetchData();
    });
    
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('API Error');
  });
});`;
  }

  createIntegrationTests(interfaces) {
    return [
      {
        file: 'src/__tests__/integration/feature-flow.test.js',
        content: `import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';

// Mock API responses
global.fetch = jest.fn();

describe('Feature Integration Tests', () => {
  const renderWithRouter = (component) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    fetch.mockClear();
  });

  test('complete feature workflow', async () => {
    // Mock successful API responses
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', name: 'Test Item' })
      });

    renderWithRouter(<App />);
    
    // Navigate to feature page
    const featureLink = screen.getByRole('link', { name: /feature/i });
    fireEvent.click(featureLink);
    
    // Interact with feature
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);
    
    // Verify success
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
  });
});`
      }
    ];
  }

  createE2ETests(systemDesign) {
    return [
      {
        file: 'cypress/e2e/feature.cy.js',
        content: `describe('Feature E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should complete the main user journey', () => {
    // Navigate to feature
    cy.get('[data-cy=feature-nav]').click();
    
    // Verify page loads
    cy.get('[data-cy=feature-page]').should('be.visible');
    
    // Interact with feature
    cy.get('[data-cy=create-button]').click();
    
    // Fill form if exists
    cy.get('[data-cy=feature-form]').within(() => {
      cy.get('input[name="name"]').type('E2E Test Item');
      cy.get('button[type="submit"]').click();
    });
    
    // Verify success
    cy.get('[data-cy=success-message]').should('contain', 'Created successfully');
    cy.get('[data-cy=item-list]').should('contain', 'E2E Test Item');
  });

  it('should handle error states gracefully', () => {
    // Mock API error
    cy.intercept('POST', '/api/feature', { statusCode: 500 });
    
    cy.get('[data-cy=feature-nav]').click();
    cy.get('[data-cy=create-button]').click();
    cy.get('[data-cy=feature-form]').within(() => {
      cy.get('input[name="name"]').type('Error Test');
      cy.get('button[type="submit"]').click();
    });
    
    cy.get('[data-cy=error-message]').should('be.visible');
  });
});`
      }
    ];
  }

  createTestPlan() {
    return {
      strategy: 'Test-Driven Development (TDD)',
      phases: [
        {
          name: 'Unit Testing',
          description: 'Test individual components and services',
          coverage: 'All business logic and component rendering'
        },
        {
          name: 'Integration Testing', 
          description: 'Test component interactions and API integration',
          coverage: 'Data flow between components and external services'
        },
        {
          name: 'End-to-End Testing',
          description: 'Test complete user workflows',
          coverage: 'Critical user journeys and error scenarios'
        }
      ],
      testingGuidelines: [
        'Write tests before implementation',
        'Test behavior, not implementation',
        'Cover happy path and edge cases',
        'Use descriptive test names',
        'Keep tests independent and isolated'
      ]
    };
  }

  defineCoverageTargets() {
    return {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
      excludes: [
        'src/index.js',
        'src/reportWebVitals.js',
        '**/*.test.js',
        '**/*.spec.js'
      ]
    };
  }
}

export default TestEngineerAgent;