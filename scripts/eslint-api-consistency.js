/**
 * ESLint plugin for enforcing API naming conventions
 * To use, include this in your .eslintrc.js file:
 * 
 * plugins: ['./scripts/eslint-api-consistency.js'],
 * rules: {
 *   'api-consistency/method-naming': 'warn',
 *   'api-consistency/option-objects': 'warn',
 *   'api-consistency/access-modifiers': 'warn',
 * }
 */

module.exports = {
  rules: {
    'method-naming': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Enforce method naming conventions',
          category: 'Stylistic Issues',
          recommended: true,
        },
        fixable: 'code',
        schema: []
      },
      create: function(context) {
        const forbiddenPrefixes = {
          'init': {
            pattern: /^init(?!ialize)[A-Z]/,
            replacement: 'initialize'
          },
          'setup': {
            pattern: /^setup[A-Z]/,
            replacement: 'initialize'
          },
          'destroy': {
            pattern: /^destroy/,
            replacement: 'dispose'
          },
          'clean': {
            pattern: /^clean/,
            replacement: 'dispose'
          }
        };
        
        return {
          MethodDefinition(node) {
            // Skip constructors
            if (node.kind === 'constructor') return;
            
            const methodName = node.key.name;
            
            // Check for forbidden prefixes
            Object.keys(forbiddenPrefixes).forEach(prefix => {
              const { pattern, replacement } = forbiddenPrefixes[prefix];
              
              if (pattern.test(methodName)) {
                const suggestedName = methodName.replace(
                  new RegExp(`^${prefix}`), 
                  replacement
                );
                
                context.report({
                  node,
                  message: `Method '${methodName}' uses non-standard prefix '${prefix}', use '${replacement}' instead.`,
                  fix: function(fixer) {
                    return fixer.replaceText(node.key, suggestedName);
                  }
                });
              }
            });
          }
        };
      }
    },
    
    'option-objects': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Enforce option object naming and usage patterns',
          category: 'Stylistic Issues',
          recommended: true,
        },
        schema: []
      },
      create: function(context) {
        const defaultOptionsPattern = /^DEFAULT_([A-Za-z0-9]+)_OPTIONS$/;
        const optionsInterfacePattern = /^([A-Za-z0-9]+)Options$/;
        const sourceCode = context.getSourceCode();
        
        // Track declarations
        const defaultOptions = new Map();
        const optionsInterfaces = new Set();
        
        return {
          // Check default options constants
          VariableDeclarator(node) {
            if (node.id.type === 'Identifier' && defaultOptionsPattern.test(node.id.name)) {
              const match = node.id.name.match(defaultOptionsPattern);
              if (match) {
                defaultOptions.set(match[1], node);
              }
            }
          },
          
          // Check options interfaces
          TSInterfaceDeclaration(node) {
            if (node.id.type === 'Identifier' && optionsInterfacePattern.test(node.id.name)) {
              const match = node.id.name.match(optionsInterfacePattern);
              if (match) {
                optionsInterfaces.add(match[1]);
              }
            }
          },
          
          // Check proper option merging pattern
          'Program:exit'() {
            // For each default options, check if there's a corresponding interface
            defaultOptions.forEach((node, className) => {
              if (!optionsInterfaces.has(className)) {
                context.report({
                  node,
                  message: `Missing options interface ${className}Options for DEFAULT_${className}_OPTIONS`
                });
              }
            });
          }
        };
      }
    },
    
    'access-modifiers': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Enforce proper access modifiers',
          category: 'Stylistic Issues',
          recommended: true,
        },
        schema: []
      },
      create: function(context) {
        // Cache for class members by class name
        const classMembers = new Map();
        
        return {
          // Track all class methods and their access modifiers
          MethodDefinition(node) {
            const className = node.parent.parent.id.name;
            
            if (!classMembers.has(className)) {
              classMembers.set(className, []);
            }
            
            classMembers.get(className).push({
              name: node.key.name,
              accessibility: node.accessibility || 'public',
              node,
              override: node.decorators && node.decorators.some(d => d.expression.name === 'override')
            });
          },
          
          // Check issues at the end of program
          'Program:exit'() {
            classMembers.forEach((members, className) => {
              // Check for private methods that are overridden elsewhere
              const privateMethodNames = new Set(
                members
                  .filter(m => m.accessibility === 'private')
                  .map(m => m.name)
              );
              
              // Check for public methods without JSDoc
              members.forEach(member => {
                if (member.accessibility === 'public' && member.name !== 'constructor') {
                  const sourceCode = context.getSourceCode();
                  const comments = sourceCode.getCommentsBefore(member.node);
                  
                  // Check if any comment is a JSDoc comment
                  const hasJSDoc = comments.some(comment => 
                    comment.type === 'Block' && comment.value.startsWith('*')
                  );
                  
                  if (!hasJSDoc) {
                    context.report({
                      node: member.node,
                      message: `Public method '${member.name}' should have JSDoc documentation`
                    });
                  }
                }
                
                // Check for methods that are both private and have @override
                if (member.accessibility === 'private' && member.override) {
                  context.report({
                    node: member.node,
                    message: `Method '${member.name}' is marked as private but has @override, should be protected`
                  });
                }
              });
            });
          }
        };
      }
    }
  }
}; 