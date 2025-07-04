export class ConverterUtils {
  static inferPropType(defaultValue?: string): string {
    if (!defaultValue) return 'any';
    if (defaultValue.startsWith("'") || defaultValue.startsWith('"')) return 'string';
    if (/^\d+$/.test(defaultValue)) return 'number';
    if (defaultValue === 'true' || defaultValue === 'false') return 'boolean';
    if (defaultValue.startsWith('[')) return 'any[]';
    if (defaultValue.startsWith('{')) return 'object';
    return 'any';
  }

  static inferTypeFromValue(value: string): string {
    if (!value || value === 'null' || value === 'undefined') return 'any';
    if (value.startsWith("'") || value.startsWith('"')) return 'string';
    if (/^\d+$/.test(value)) return 'number';
    if (value === 'true' || value === 'false') return 'boolean';
    if (value.startsWith('[')) return 'any[]';
    if (value.startsWith('{')) return 'object';
    return 'any';
  }

  static generatePropsInterface(propsStr: string, componentName: string): string {
    if (!propsStr.trim()) {
      return `interface ${componentName}Props {}`;
    }
    
    // Extract prop names and types from destructured props
    const propMatches = propsStr.match(/{\s*([^}]+)\s*}/);
    if (propMatches) {
      const props = propMatches[1].split(',').map(prop => {
        const [name, defaultValue] = prop.split('=').map(p => p.trim());
        const type = this.inferPropType(defaultValue);
        return `  ${name}${defaultValue ? '?' : ''}: ${type};`;
      }).join('\n');
      
      return `interface ${componentName}Props {\n${props}\n}`;
    }
    
    return `interface ${componentName}Props {\n  [key: string]: any;\n}`;
  }

  static extractProps(propsStr: string): string[] {
    if (!propsStr.trim()) return [];
    
    const propMatches = propsStr.match(/{\s*([^}]+)\s*}/);
    if (propMatches) {
      return propMatches[1]
        .split(',')
        .map(prop => prop.split('=')[0].trim())
        .filter(prop => prop.length > 0);
    }
    
    if (propsStr.trim() && !propsStr.includes('{')) {
      return [propsStr.trim()];
    }
    
    return [];
  }

  static extractClassProps(propsType?: string): string[] {
    if (!propsType) return [];
    
    const propMatches = propsType.match(/{\s*([^}]+)\s*}/);
    if (propMatches) {
      return propMatches[1]
        .split(',')
        .map(prop => {
          const colonIndex = prop.indexOf(':');
          return colonIndex > 0 ? prop.substring(0, colonIndex).trim() : prop.trim();
        })
        .filter(prop => prop.length > 0);
    }
    
    if (propsType.trim()) {
      return [`Props (${propsType.trim()})`];
    }
    
    return [];
  }

  static parseAttributes(attributesStr: string, warnings: string[]): string {
    if (!attributesStr.trim()) return '';
    
    const attributes: string[] = [];
    
    // Parse className to style
    const classNameMatch = attributesStr.match(/className\s*=\s*["']([^"']+)["']/);
    if (classNameMatch) {
      const className = classNameMatch[1];
      warnings.push(`Converting className "${className}" to style object - manual conversion needed`);
      attributes.push(`/* TODO: Convert className "${className}" to Horizon style */`);
    }
    
    // Parse style attribute
    const styleMatch = attributesStr.match(/style\s*=\s*\{([^}]+)\}/);
    if (styleMatch) {
      attributes.push(`style: { ${styleMatch[1]} }`);
    }
    
    // Parse onClick
    const onClickMatch = attributesStr.match(/onClick\s*=\s*\{([^}]+)\}/);
    if (onClickMatch) {
      const handler = onClickMatch[1].trim();
      attributes.push(`onPress: ${handler}`);
    }
    
    // Parse other common attributes
    const srcMatch = attributesStr.match(/src\s*=\s*\{([^}]+)\}/);
    if (srcMatch) {
      attributes.push(`source: ${srcMatch[1]}`);
    }
    
    const altMatch = attributesStr.match(/alt\s*=\s*["']([^"']+)["']/);
    if (altMatch) {
      attributes.push(`accessibilityLabel: "${altMatch[1]}"`);
    }
    
    return attributes.join(', ');
  }

  static addThisPrefixToReferences(code: string, stateNames: string[]): string {
    // Add this. prefix to props access (but not if already has this.)
    code = code.replace(/(?<!this\.)(\bprops\.\w+)/g, 'this.$1');
    
    // Add this. prefix to state variable references in JSX expressions
    stateNames.forEach(stateName => {
      // More careful regex to avoid breaking JSX
      const stateRegex = new RegExp(`(?<!this\\.)\\b${stateName}\\b(?=\\s*[\\}\\.]|$)`, 'g');
      code = code.replace(stateRegex, `this.${stateName}`);
    });
    
    // Add this. prefix to setter function calls (but not if already has this.)
    code = code.replace(/(?<!this\.)(\bset\w+)\s*\(/g, 'this.$1(');
    
    return code;
  }
}