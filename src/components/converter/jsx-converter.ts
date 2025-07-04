import { ConverterUtils } from './utils';

export class JSXConverter {
  private warnings: string[] = [];

  setWarnings(warnings: string[]) {
    this.warnings = warnings;
  }

  convertJSXToHorizon(jsx: string): string {
    // Clean up the JSX first
    jsx = jsx.trim();
    
    // Handle simple cases first
    if (!jsx.includes('<')) {
      // No JSX, might be a simple expression
      if (jsx.includes('{') && jsx.includes('}')) {
        return jsx; // Keep expressions as-is for now
      }
      return `"${jsx}"`;
    }
    
    // Convert specific JSX elements
    jsx = this.convertSpecificElements(jsx);
    
    return jsx;
  }

  private convertSpecificElements(jsx: string): string {
    // Convert div elements
    jsx = jsx.replace(/<div([^>]*?)>(.*?)<\/div>/gs, (match, attributes, children) => {
      const props = ConverterUtils.parseAttributes(attributes, this.warnings);
      const convertedChildren = this.convertChildren(children);
      
      if (convertedChildren) {
        return `View({ ${props}${props ? ', ' : ''}children: ${convertedChildren} })`;
      } else {
        return `View({ ${props} })`;
      }
    });

    // Convert header elements
    jsx = jsx.replace(/<header([^>]*?)>(.*?)<\/header>/gs, (match, attributes, children) => {
      this.warnings.push('Converting header to View - consider appropriate Horizon component');
      const props = ConverterUtils.parseAttributes(attributes, this.warnings);
      const convertedChildren = this.convertChildren(children);
      
      if (convertedChildren) {
        return `View({ ${props}${props ? ', ' : ''}children: ${convertedChildren} })`;
      } else {
        return `View({ ${props} })`;
      }
    });

    // Convert main elements  
    jsx = jsx.replace(/<main([^>]*?)>(.*?)<\/main>/gs, (match, attributes, children) => {
      this.warnings.push('Converting main to View - consider appropriate Horizon component');
      const props = ConverterUtils.parseAttributes(attributes, this.warnings);
      const convertedChildren = this.convertChildren(children);
      
      if (convertedChildren) {
        return `View({ ${props}${props ? ', ' : ''}children: ${convertedChildren} })`;
      } else {
        return `View({ ${props} })`;
      }
    });

    // Convert h1-h6 and p elements to Text
    const textTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'];
    textTags.forEach(tag => {
      const regex = new RegExp(`<${tag}([^>]*?)>(.*?)<\\/${tag}>`, 'gs');
      jsx = jsx.replace(regex, (match, attributes, content) => {
        const props = ConverterUtils.parseAttributes(attributes, this.warnings);
        
        // Handle text content
        if (content.includes('{') && content.includes('}')) {
          // Dynamic content
          const expression = content.match(/\{([^}]+)\}/);
          if (expression) {
            const cleanExpr = expression[1].trim();
            return `Text({ text: ${cleanExpr}${props ? ', ' + props : ''} })`;
          }
        } else {
          // Static text
          const cleanText = content.trim();
          return `Text({ text: "${cleanText}"${props ? ', ' + props : ''} })`;
        }
        
        return match;
      });
    });

    // Convert button elements
    jsx = jsx.replace(/<button([^>]*?)>(.*?)<\/button>/gs, (match, attributes, content) => {
      const props = ConverterUtils.parseAttributes(attributes, this.warnings);
      const updatedProps = props.replace(/onClick:/g, 'onPress:');
      const cleanText = content.trim();
      
      return `Pressable({ ${updatedProps}${updatedProps ? ', ' : ''}children: Text({ text: "${cleanText}" }) })`;
    });

    // Convert img elements
    jsx = jsx.replace(/<img([^>]*?)\s*\/?>/g, (match, attributes) => {
      const props = ConverterUtils.parseAttributes(attributes, this.warnings);
      const updatedProps = props.replace(/src:/g, 'source:').replace(/alt:/g, 'accessibilityLabel:');
      return `Image({ ${updatedProps} })`;
    });

    // Convert span elements
    jsx = jsx.replace(/<span([^>]*?)>(.*?)<\/span>/gs, (match, attributes, content) => {
      this.warnings.push('Converting span to Text - verify if appropriate');
      const props = ConverterUtils.parseAttributes(attributes, this.warnings);
      
      if (content.includes('{') && content.includes('}')) {
        // Dynamic content
        const expression = content.match(/\{([^}]+)\}/);
        if (expression) {
          const cleanExpr = expression[1].trim();
          return `Text({ text: ${cleanExpr}${props ? ', ' + props : ''} })`;
        }
      } else {
        // Static text
        const cleanText = content.trim();
        return `Text({ text: "${cleanText}"${props ? ', ' + props : ''} })`;
      }
      
      return match;
    });

    return jsx;
  }

  private convertChildren(children: string): string {
    if (!children.trim()) return '';
    
    // Split children by JSX elements and handle each piece
    const childElements = this.extractChildElements(children);
    
    if (childElements.length === 0) {
      return '';
    }
    
    if (childElements.length === 1) {
      return this.convertSingleChild(childElements[0]);
    }
    
    // Multiple children - wrap in array
    const convertedChildren = childElements.map(child => this.convertSingleChild(child));
    return `[${convertedChildren.join(', ')}]`;
  }

  private extractChildElements(content: string): string[] {
    const elements: string[] = [];
    let current = '';
    let depth = 0;
    let inBraces = 0;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        inBraces++;
      } else if (char === '}') {
        inBraces--;
      } else if (char === '<' && inBraces === 0) {
        if (content[i + 1] === '/') {
          depth--;
        } else {
          if (depth === 0 && current.trim()) {
            elements.push(current.trim());
            current = '';
          }
          depth++;
        }
      }
      
      current += char;
      
      if (depth === 0 && inBraces === 0 && current.trim()) {
        elements.push(current.trim());
        current = '';
      }
    }
    
    if (current.trim()) {
      elements.push(current.trim());
    }
    
    return elements.filter(el => el.length > 0);
  }

  private convertSingleChild(child: string): string {
    child = child.trim();
    
    if (!child) return '""';
    
    // If it's JSX, convert it
    if (child.startsWith('<')) {
      return this.convertSpecificElements(child);
    }
    
    // If it's an expression, handle it
    if (child.startsWith('{') && child.endsWith('}')) {
      const expression = child.slice(1, -1).trim();
      return expression;
    }
    
    // Plain text
    return `"${child}"`;
  }
}