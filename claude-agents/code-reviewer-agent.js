class CodeReviewerAgent {
  constructor() {
    this.name = 'Code Reviewer';
    this.role = 'Code quality assurance and improvement suggestions';
  }

  async process(developerOutput, context = {}) {
    const review = this.reviewCode(developerOutput, context);
    
    return {
      agent: this.name,
      output: {
        reviewComments: review.comments,
        qualityScore: review.score,
        improvements: review.improvements,
        securityIssues: review.security,
        performanceIssues: review.performance,
        approved: review.approved
      },
      nextAgent: review.approved ? 'devops-engineer' : 'developer'
    };
  }

  reviewCode(devOutput, context) {
    const output = devOutput?.output || {};
    const implementedFiles = output.implementedFiles || [];
    const codeQuality = output.codeQuality || {};
    const testResults = output.testResults || {};

    const review = {
      comments: [],
      score: 0,
      improvements: [],
      security: [],
      performance: [],
      approved: false
    };

    implementedFiles.forEach(file => {
      const fileReview = this.reviewFile(file);
      review.comments.push(...fileReview.comments);
      review.improvements.push(...fileReview.improvements);
      review.security.push(...fileReview.security);
      review.performance.push(...fileReview.performance);
    });

    review.score = this.calculateQualityScore(review, implementedFiles);
    review.approved = review.score >= 8.0 && review.security.length === 0;

    return review;
  }

  reviewFile(file) {
    const review = {
      comments: [],
      improvements: [],
      security: [],
      performance: []
    };

    if (file.path.includes('.jsx')) {
      this.reviewReactComponent(file, review);
    } else if (file.path.includes('service')) {
      this.reviewService(file, review);
    } else if (file.path.includes('hooks')) {
      this.reviewHook(file, review);
    }

    this.reviewCommonIssues(file, review);
    
    return review;
  }

  reviewReactComponent(file, review) {
    const content = file.content;
    const fileName = file.path.split('/').pop();

    // Check for best practices
    if (!content.includes('PropTypes')) {
      review.improvements.push({
        file: fileName,
        line: 'import section',
        issue: 'Missing PropTypes validation',
        suggestion: 'Add PropTypes for better type checking',
        severity: 'medium'
      });
    }

    if (!content.includes('data-testid')) {
      review.improvements.push({
        file: fileName,
        line: 'JSX elements',
        issue: 'Missing test IDs',
        suggestion: 'Add data-testid attributes for better testability',
        severity: 'low'
      });
    }

    if (content.includes('console.log')) {
      review.improvements.push({
        file: fileName,
        line: 'Various',
        issue: 'Console.log statements found',
        suggestion: 'Remove or replace with proper logging',
        severity: 'low'
      });
    }

    // Check for accessibility
    if (!content.includes('aria-') && !content.includes('role=')) {
      review.improvements.push({
        file: fileName,
        line: 'JSX elements',
        issue: 'Limited accessibility attributes',
        suggestion: 'Add ARIA labels and roles for better accessibility',
        severity: 'medium'
      });
    }

    // Performance checks
    if (content.includes('useEffect(() => {') && !content.includes('useCallback')) {
      review.performance.push({
        file: fileName,
        issue: 'Potential re-render issues',
        suggestion: 'Consider using useCallback for event handlers',
        severity: 'low'
      });
    }

    review.comments.push({
      file: fileName,
      type: 'approval',
      message: 'React component follows standard patterns and conventions'
    });
  }

  reviewService(file, review) {
    const content = file.content;
    const fileName = file.path.split('/').pop();

    // Security checks
    if (content.includes('process.env') && !content.includes('REACT_APP_')) {
      review.security.push({
        file: fileName,
        issue: 'Potential environment variable exposure',
        suggestion: 'Ensure only REACT_APP_ prefixed variables are used in frontend',
        severity: 'high'
      });
    }

    // Error handling
    if (!content.includes('try {') || !content.includes('catch')) {
      review.improvements.push({
        file: fileName,
        issue: 'Missing comprehensive error handling',
        suggestion: 'Add try-catch blocks for all async operations',
        severity: 'high'
      });
    }

    // API best practices
    if (!content.includes('HTTP error! status:')) {
      review.improvements.push({
        file: fileName,
        issue: 'HTTP error handling could be improved',
        suggestion: 'Add specific HTTP status code handling',
        severity: 'medium'
      });
    }

    review.comments.push({
      file: fileName,
      type: 'approval',
      message: 'Service layer properly implements API communication patterns'
    });
  }

  reviewHook(file, review) {
    const content = file.content;
    const fileName = file.path.split('/').pop();

    // Hook best practices
    if (!content.includes('useCallback')) {
      review.improvements.push({
        file: fileName,
        issue: 'Missing useCallback optimization',
        suggestion: 'Wrap functions in useCallback to prevent unnecessary re-renders',
        severity: 'medium'
      });
    }

    if (!content.includes('useState') || !content.includes('useEffect')) {
      review.improvements.push({
        file: fileName,
        issue: 'Hook might be too simple',
        suggestion: 'Consider if this logic needs to be a custom hook',
        severity: 'low'
      });
    }

    // Dependency array checks
    const useEffectMatches = content.match(/useEffect\([^}]*\}, \[[^\]]*\]/g);
    if (useEffectMatches) {
      useEffectMatches.forEach(match => {
        if (match.includes('[]')) {
          review.comments.push({
            file: fileName,
            type: 'info',
            message: 'useEffect with empty dependency array - verify this is intentional'
          });
        }
      });
    }

    review.comments.push({
      file: fileName,
      type: 'approval',
      message: 'Custom hook follows React hooks conventions'
    });
  }

  reviewCommonIssues(file, review) {
    const content = file.content;
    const fileName = file.path.split('/').pop();

    // Code style
    if (content.includes('var ')) {
      review.improvements.push({
        file: fileName,
        issue: 'Using var instead of const/let',
        suggestion: 'Replace var with const or let for better scoping',
        severity: 'low'
      });
    }

    // Magic numbers
    const magicNumbers = content.match(/\b(?!0|1|2|100|404|500)\d{3,}\b/g);
    if (magicNumbers) {
      review.improvements.push({
        file: fileName,
        issue: 'Magic numbers found',
        suggestion: 'Extract magic numbers to named constants',
        severity: 'low'
      });
    }

    // TODO comments
    if (content.includes('TODO') || content.includes('FIXME')) {
      review.improvements.push({
        file: fileName,
        issue: 'TODO/FIXME comments found',
        suggestion: 'Address or document TODO items',
        severity: 'low'
      });
    }

    // Security - potential XSS
    if (content.includes('dangerouslySetInnerHTML')) {
      review.security.push({
        file: fileName,
        issue: 'Potential XSS vulnerability',
        suggestion: 'Ensure HTML is properly sanitized before using dangerouslySetInnerHTML',
        severity: 'high'
      });
    }

    // Performance - large inline objects
    if (content.includes('style={{')) {
      review.performance.push({
        file: fileName,
        issue: 'Inline styles detected',
        suggestion: 'Consider moving styles to CSS classes or styled-components',
        severity: 'low'
      });
    }
  }

  calculateQualityScore(review, files) {
    let score = 10;
    
    // Deduct points for issues
    review.security.forEach(issue => {
      switch (issue.severity) {
        case 'high': score -= 2; break;
        case 'medium': score -= 1; break;
        case 'low': score -= 0.5; break;
      }
    });

    review.improvements.forEach(issue => {
      switch (issue.severity) {
        case 'high': score -= 1; break;
        case 'medium': score -= 0.5; break;
        case 'low': score -= 0.25; break;
      }
    });

    // Bonus points for good practices
    const hasTests = files.some(f => f.path.includes('.test.'));
    if (hasTests) score += 0.5;

    const hasTypeChecking = files.some(f => f.content.includes('PropTypes'));
    if (hasTypeChecking) score += 0.5;

    const hasErrorHandling = files.some(f => f.content.includes('try {'));
    if (hasErrorHandling) score += 0.5;

    return Math.max(0, Math.min(10, score));
  }
}

export default CodeReviewerAgent;