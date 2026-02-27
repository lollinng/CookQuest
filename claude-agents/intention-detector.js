class IntentionDetector {
  constructor() {
    this.featureKeywords = [
      // Action verbs (broad)
      'make', 'build', 'create', 'add', 'implement', 'develop',
      'set up', 'setup', 'configure', 'enable', 'integrate',
      'introduce', 'write', 'generate', 'produce', 'prepare', 'establish',
      // Feature phrases
      'add feature', 'new feature', 'create feature', 'feature request',
      'enhancement', 'add functionality',
      // Infrastructure / DevOps
      'docker', 'containerize', 'deploy', 'ci/cd', 'pipeline',
      'kubernetes', 'compose', 'dockerfile', 'hosting', 'server setup',
      // User stories
      'user story', 'as a user', 'I want', 'I need', 'should be able to',
      // Specification
      'requirements', 'specification', 'acceptance criteria'
    ];

    this.conversationKeywords = [
      'explain', 'how does', 'what is', 'why', 'help', 'show me',
      'find', 'search', 'debug', 'fix bug', 'fix error', 'error',
      'issue', 'broken', 'not working',
      'refactor', 'optimize', 'clean up', 'documentation', 'rename'
    ];
  }

  detectIntention(prompt) {
    const lowercasePrompt = prompt.toLowerCase();

    const featureScore = this.featureKeywords.reduce((score, keyword) => {
      return score + (lowercasePrompt.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);

    const conversationScore = this.conversationKeywords.reduce((score, keyword) => {
      return score + (lowercasePrompt.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);

    // Check for user story patterns
    const userStoryPattern = /(as a|i want|i need|should be able to|users can|feature that)/i;
    const hasUserStoryPattern = userStoryPattern.test(prompt);

    // Check for feature implementation indicators (broadened)
    const featurePattern = /(make|implement|build|create|add|develop|set up|configure|enable|integrate|introduce|generate|prepare|establish).*?(feature|functionality|capability|system|docker|container|server|api|endpoint|page|component|service|auth|database|deploy|run|work)/i;
    const hasFeaturePattern = featurePattern.test(prompt);

    // Check for infrastructure/DevOps patterns
    const infraPattern = /(docker|container|deploy|ci\/cd|pipeline|kubernetes|compose|server|hosting|nginx|ssl|https)/i;
    const hasInfraPattern = infraPattern.test(prompt);

    // Default to PRODUCT_FEATURE when ambiguous (both scores 0 or equal)
    // Only classify as CONVERSATION if conversation score clearly wins
    if (hasUserStoryPattern || hasFeaturePattern || hasInfraPattern || featureScore > 0 || featureScore >= conversationScore) {
      // But if conversation clearly dominates, respect that
      if (conversationScore > 0 && conversationScore > featureScore && !hasFeaturePattern && !hasInfraPattern && !hasUserStoryPattern) {
        return {
          type: 'CONVERSATION',
          confidence: conversationScore,
          prompt: prompt
        };
      }
      return {
        type: 'PRODUCT_FEATURE',
        confidence: Math.max(featureScore, hasUserStoryPattern ? 2 : 0, hasFeaturePattern ? 2 : 0, hasInfraPattern ? 2 : 0),
        prompt: prompt
      };
    } else {
      return {
        type: 'CONVERSATION',
        confidence: conversationScore,
        prompt: prompt
      };
    }
  }
}

export default IntentionDetector;
