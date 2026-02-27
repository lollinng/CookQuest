class SoftwareArchitectAgent {
  constructor() {
    this.name = 'Software Architect';
    this.role = 'System design and architecture planning';
  }

  async process(productManagerOutput, context = {}) {
    const architecture = this.designArchitecture(productManagerOutput);
    
    return {
      agent: this.name,
      output: {
        systemDesign: architecture.design,
        filesToModify: architecture.files.modify,
        filesToCreate: architecture.files.create,
        interfaces: architecture.interfaces,
        dataModels: architecture.dataModels,
        dependencies: architecture.dependencies
      },
      nextAgent: 'test-engineer'
    };
  }

  designArchitecture(pmOutput) {
    const output = pmOutput?.output || {};
    const requirements = output.clarifiedRequirements || { userStory: '', functionalRequirements: [], nonFunctionalRequirements: [], businessObjectives: '' };
    const specification = output.featureSpecification || { title: 'Feature', description: '', scope: '', outOfScope: '', dependencies: '' };
    
    return {
      design: this.createSystemDesign(specification),
      files: this.identifyFiles(requirements, specification),
      interfaces: this.defineInterfaces(requirements),
      dataModels: this.defineDataModels(requirements),
      dependencies: this.identifyDependencies(requirements)
    };
  }

  createSystemDesign(specification) {
    return {
      architecture: 'Layered Architecture',
      layers: [
        {
          name: 'Presentation Layer',
          responsibility: 'UI components and user interaction',
          components: ['React Components', 'Forms', 'Navigation']
        },
        {
          name: 'Business Logic Layer', 
          responsibility: 'Feature logic and business rules',
          components: ['Services', 'Validators', 'Business Logic']
        },
        {
          name: 'Data Access Layer',
          responsibility: 'Data persistence and retrieval',
          components: ['API Calls', 'Database Queries', 'Data Models']
        }
      ],
      patterns: ['Repository Pattern', 'Service Pattern', 'Component Pattern']
    };
  }

  identifyFiles(requirements, specification) {
    const featureName = this.extractFeatureName(specification.title);
    const kebabCase = featureName.toLowerCase().replace(/\s+/g, '-');
    const pascalCase = featureName.replace(/\s+/g, '');
    
    return {
      create: [
        `src/components/${pascalCase}/${pascalCase}.jsx`,
        `src/components/${pascalCase}/${pascalCase}.test.jsx`,
        `src/components/${pascalCase}/index.js`,
        `src/services/${kebabCase}-service.js`,
        `src/hooks/use-${kebabCase}.js`,
        `src/types/${kebabCase}.types.js`
      ],
      modify: [
        'src/App.jsx',
        'src/routes/index.js',
        'package.json'
      ]
    };
  }

  extractFeatureName(title) {
    return title.replace(/^(implement|add|create|build)\s+/i, '').trim();
  }

  defineInterfaces(requirements) {
    const interfaces = [];
    
    // API Interface
    interfaces.push({
      name: 'FeatureAPI',
      type: 'REST API',
      endpoints: [
        {
          method: 'GET',
          path: '/api/feature',
          description: 'Retrieve feature data'
        },
        {
          method: 'POST', 
          path: '/api/feature',
          description: 'Create new feature data'
        }
      ]
    });

    // Component Interface
    interfaces.push({
      name: 'FeatureComponent',
      type: 'React Component',
      props: [
        'data: FeatureData',
        'onAction: (data) => void',
        'loading: boolean'
      ]
    });

    return interfaces;
  }

  defineDataModels(requirements) {
    return [
      {
        name: 'FeatureData',
        type: 'TypeScript Interface',
        properties: [
          'id: string',
          'name: string', 
          'createdAt: Date',
          'updatedAt: Date'
        ]
      },
      {
        name: 'FeatureRequest',
        type: 'TypeScript Interface',
        properties: [
          'name: string',
          'description?: string'
        ]
      }
    ];
  }

  identifyDependencies(requirements) {
    const deps = {
      frontend: [],
      backend: [],
      testing: ['@testing-library/react', '@testing-library/jest-dom']
    };

    const userStory = (requirements.userStory || '').toLowerCase();
    
    if (userStory.includes('form') || userStory.includes('input')) {
      deps.frontend.push('react-hook-form', 'yup');
    }
    
    if (userStory.includes('api') || userStory.includes('data')) {
      deps.frontend.push('axios', 'react-query');
    }
    
    if (userStory.includes('route') || userStory.includes('navigation')) {
      deps.frontend.push('react-router-dom');
    }

    return deps;
  }
}

export default SoftwareArchitectAgent;