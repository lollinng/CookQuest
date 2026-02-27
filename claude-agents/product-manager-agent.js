class ProductManagerAgent {
  constructor() {
    this.name = 'Product Manager';
    this.role = 'Requirements clarification and specification writing';
  }

  async process(input, context = {}) {
    // Extract the user story string from pipeline input or raw string
    const prompt = typeof input === 'string'
      ? input
      : (input?.output?.userStory || input?.prompt || String(input));
    const analysis = this.analyzeRequirements(prompt);

    return {
      agent: this.name,
      output: {
        clarifiedRequirements: analysis.requirements,
        featureSpecification: analysis.specification,
        acceptanceCriteria: analysis.acceptanceCriteria,
        questions: analysis.questions
      },
      nextAgent: analysis.questions.length > 0 ? null : 'architect'
    };
  }

  analyzeRequirements(prompt) {
    const promptStr = typeof prompt === 'string' ? prompt : String(prompt);
    const requirements = this.extractRequirements(promptStr);
    const specification = this.writeSpecification(requirements);
    const acceptanceCriteria = this.defineAcceptanceCriteria(requirements);
    const questions = this.identifyQuestions(requirements);

    return {
      requirements,
      specification,
      acceptanceCriteria,
      questions
    };
  }

  extractRequirements(prompt) {
    const promptStr = typeof prompt === 'string' ? prompt : String(prompt);
    return {
      userStory: promptStr,
      functionalRequirements: this.parseFunctionalRequirements(prompt),
      nonFunctionalRequirements: this.parseNonFunctionalRequirements(prompt),
      businessObjectives: this.parseBusinessObjectives(prompt)
    };
  }

  parseFunctionalRequirements(prompt) {
    const requirements = [];
    
    // Extract action words and objects
    const actionPattern = /(add|create|implement|build|develop|enable|allow|provide)\s+([^.!?]+)/gi;
    let match;
    
    while ((match = actionPattern.exec(prompt)) !== null) {
      requirements.push(`System shall ${match[1].toLowerCase()} ${match[2].trim()}`);
    }
    
    return requirements.length > 0 ? requirements : ['System shall implement the requested feature'];
  }

  parseNonFunctionalRequirements(prompt) {
    const nfr = [];
    
    if (prompt.toLowerCase().includes('performance') || prompt.toLowerCase().includes('fast')) {
      nfr.push('System shall respond within 2 seconds');
    }
    if (prompt.toLowerCase().includes('secure') || prompt.toLowerCase().includes('authentication')) {
      nfr.push('System shall implement secure authentication');
    }
    if (prompt.toLowerCase().includes('mobile') || prompt.toLowerCase().includes('responsive')) {
      nfr.push('System shall be mobile responsive');
    }
    
    return nfr;
  }

  parseBusinessObjectives(prompt) {
    if (prompt.toLowerCase().includes('user engagement')) return 'Increase user engagement';
    if (prompt.toLowerCase().includes('conversion')) return 'Improve conversion rates';
    if (prompt.toLowerCase().includes('retention')) return 'Improve user retention';
    return 'Enhance user experience';
  }

  writeSpecification(requirements) {
    return {
      title: this.generateTitle(requirements.userStory),
      description: requirements.userStory,
      scope: 'MVP implementation of the requested feature',
      outOfScope: 'Advanced configurations and enterprise features',
      dependencies: 'Existing authentication and database systems'
    };
  }

  generateTitle(userStory) {
    const words = userStory.split(' ');
    const actionWord = words.find(word => 
      ['add', 'create', 'implement', 'build', 'develop'].includes(word.toLowerCase())
    );
    const subject = words.slice(words.indexOf(actionWord) + 1, words.indexOf(actionWord) + 4).join(' ');
    return `${actionWord || 'Implement'} ${subject}`.replace(/[^\w\s]/gi, '');
  }

  defineAcceptanceCriteria(requirements) {
    const criteria = [];
    
    requirements.functionalRequirements.forEach((req, index) => {
      criteria.push({
        id: `AC${index + 1}`,
        given: 'User is on the application',
        when: `User ${req.toLowerCase().replace('system shall ', '')}`,
        then: 'The action completes successfully'
      });
    });

    criteria.push({
      id: `AC${criteria.length + 1}`,
      given: 'Feature is implemented',
      when: 'User interacts with the feature',
      then: 'All functionality works as expected'
    });

    return criteria;
  }

  identifyQuestions(requirements) {
    const questions = [];
    
    if (!requirements.userStory.includes('user') && !requirements.userStory.includes('customer')) {
      questions.push('Who is the target user for this feature?');
    }
    
    if (requirements.functionalRequirements.length <= 1) {
      questions.push('What specific functionality should this feature include?');
    }
    
    if (!requirements.userStory.toLowerCase().includes('data') && 
        !requirements.userStory.toLowerCase().includes('store') &&
        !requirements.userStory.toLowerCase().includes('save')) {
      questions.push('What data needs to be stored or retrieved?');
    }

    return questions;
  }
}

export default ProductManagerAgent;