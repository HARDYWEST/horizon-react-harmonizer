interface ConversionResult {
  success: boolean;
  code: string;
  errors: string[];
  warnings: string[];
  components: ComponentInfo[];
}

interface ComponentInfo {
  name: string;
  props: string[];
  state: string[];
  effects: string[];
  isClass: boolean;
}

export class ReactToHorizonConverter {
  private errors: string[] = [];
  private warnings: string[] = [];
  private components: ComponentInfo[] = [];

  convert(reactCode: string): ConversionResult {
    this.errors = [];
    this.warnings = [];
    this.components = [];

    try {
      const converted = this.processReactCode(reactCode);
      return {
        success: this.errors.length === 0,
        code: converted,
        errors: this.errors,
        warnings: this.warnings,
        components: this.components
      };
    } catch (error) {
      this.errors.push(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        code: '',
        errors: this.errors,
        warnings: this.warnings,
        components: this.components
      };
    }
  }

  private processReactCode(code: string): string {
    // Remove imports and add Horizon imports
    let converted = this.replaceImports(code);
    
    // Convert React components to Horizon UIComponent classes
    converted = this.convertComponents(converted);
    
    // Convert JSX to Horizon UI function calls
    converted = this.convertJSX(converted);
    
    // Convert React hooks to Horizon bindings
    converted = this.convertHooks(converted);
    
    return converted;
  }

  private replaceImports(code: string): string {
    // Remove React imports and add TypeScript-only Meta Horizon imports
    const horizonImports = `// Meta Horizon Worlds TypeScript Component
// Generated from React component - manual verification required

`;
    
    // Remove React imports and other framework imports
    let result = code.replace(/import\s+.*from\s+['"]react['"];?\n?/g, '');
    result = result.replace(/import\s+.*from\s+['"]react\/.*['"];?\n?/g, '');
    result = result.replace(/import\s+.*from\s+['"]@\/.*['"];?\n?/g, '');
    result = result.replace(/import\s+.*from\s+['"].*\/.*['"];?\n?/g, '');
    
    return horizonImports + result;
  }

  private convertComponents(code: string): string {
    // Convert functional components
    code = this.convertFunctionalComponents(code);
    
    // Convert class components
    code = this.convertClassComponents(code);
    
    return code;
  }

  private convertFunctionalComponents(code: string): string {
    // Match functional component patterns
    const funcComponentRegex = /(?:export\s+)?(?:const|function)\s+(\w+)\s*(?::\s*React\.FC[^=]*)?[=\s]*\(([^)]*)\)\s*(?::\s*JSX\.Element\s*)?[=>\s]*{([\s\S]*?)^}/gm;
    
    return code.replace(funcComponentRegex, (match, componentName, props, body) => {
      this.warnings.push(`Converting functional component: ${componentName}`);
      
      // Extract component info for debugging
      const componentInfo: ComponentInfo = {
        name: componentName,
        props: this.extractProps(props),
        state: this.extractStateFromBody(body),
        effects: this.extractEffectsFromBody(body),
        isClass: false
      };
      this.components.push(componentInfo);
      
      const propsInterface = this.generatePropsInterface(props);
      const convertedBody = this.convertComponentBody(body, componentName);
      
      return `${propsInterface}

// TODO: Extend appropriate Meta Horizon Worlds base class
export class ${componentName} {
  private props: ${componentName}Props;
  
  constructor(props: ${componentName}Props) {
    this.props = props;
  }
  
  // TODO: Implement Meta Horizon UI rendering method
  render(): any {
${convertedBody}
  }
}`;
    });
  }

  private convertClassComponents(code: string): string {
    // Match class component patterns to extract info
    const classComponentRegex = /(?:export\s+)?class\s+(\w+)\s+extends\s+(?:React\.)?Component(?:<([^>]+)>)?\s*{([\s\S]*?)}/g;
    
    let match;
    while ((match = classComponentRegex.exec(code)) !== null) {
      const [, componentName, propsType, body] = match;
      
      // Extract component info for debugging
      const componentInfo: ComponentInfo = {
        name: componentName,
        props: this.extractClassProps(propsType),
        state: this.extractClassStateFromBody(body),
        effects: this.extractEffectsFromBody(body),
        isClass: true
      };
      this.components.push(componentInfo);
    }
    
    // Convert React.Component to plain TypeScript class
    return code.replace(/extends\s+React\.Component/g, '// TODO: Extend appropriate Meta Horizon base class')
               .replace(/extends\s+Component/g, '// TODO: Extend appropriate Meta Horizon base class')
               .replace(/render\(\)\s*{/g, 'render(): any { // TODO: Use appropriate Meta Horizon return type');
  }

  private generatePropsInterface(propsStr: string): string {
    if (!propsStr.trim()) {
      return 'interface Props {}';
    }
    
    // Extract prop names and types from destructured props
    const propMatches = propsStr.match(/{\s*([^}]+)\s*}/);
    if (propMatches) {
      const props = propMatches[1].split(',').map(prop => {
        const [name, defaultValue] = prop.split('=').map(p => p.trim());
        const type = this.inferPropType(defaultValue);
        return `  ${name}${defaultValue ? '?' : ''}: ${type};`;
      }).join('\n');
      
      return `interface Props {\n${props}\n}`;
    }
    
    return `interface Props {\n  [key: string]: any;\n}`;
  }

  private inferPropType(defaultValue?: string): string {
    if (!defaultValue) return 'any';
    if (defaultValue.startsWith("'") || defaultValue.startsWith('"')) return 'string';
    if (/^\d+$/.test(defaultValue)) return 'number';
    if (defaultValue === 'true' || defaultValue === 'false') return 'boolean';
    if (defaultValue.startsWith('[')) return 'any[]';
    if (defaultValue.startsWith('{')) return 'object';
    return 'any';
  }

  private inferTypeFromValue(value: string): string {
    if (value === 'null' || value === 'undefined') return 'any';
    if (value.startsWith("'") || value.startsWith('"')) return 'string';
    if (/^\d+$/.test(value)) return 'number';
    if (value === 'true' || value === 'false') return 'boolean';
    if (value.startsWith('[')) return 'any[]';
    if (value.startsWith('{')) return 'object';
    return 'any';
  }

  private convertComponentBody(body: string, componentName: string): string {
    // Convert useState to Binding
    body = this.convertUseState(body);
    
    // Convert useEffect to component lifecycle
    body = this.convertUseEffect(body);
    
    // Convert return statement to return JSX converted to Horizon UI
    body = this.convertReturnStatement(body);
    
    // Indent the body properly
    return body.split('\n').map(line => `    ${line}`).join('\n');
  }

  private convertUseState(code: string): string {
    const useStateRegex = /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState\(([^)]*)\);?/g;
    
    return code.replace(useStateRegex, (match, stateName, setter, initialValue) => {
      this.warnings.push(`Converting useState for ${stateName} - implement state management for Meta Horizon`);
      return `// TODO: Implement state management for Meta Horizon Worlds
    private ${stateName}: ${this.inferTypeFromValue(initialValue || 'null')} = ${initialValue || 'null'};
    // TODO: Create setter method for ${stateName}`;
    });
  }

  private convertUseEffect(code: string): string {
    const useEffectRegex = /useEffect\(\(\)\s*=>\s*{([\s\S]*?)},\s*\[([^\]]*)\]\);?/g;
    
    return code.replace(useEffectRegex, (match, effect, deps) => {
      this.warnings.push('Converting useEffect - consider using component lifecycle methods');
      return `// TODO: Convert this useEffect to appropriate Horizon lifecycle method
    // Dependencies: [${deps}]
    // Effect: ${effect.replace(/\n/g, '\n    // ')}`;
    });
  }

  private convertReturnStatement(code: string): string {
    // Find the return statement with JSX
    const returnRegex = /return\s*\(([\s\S]*?)\);?\s*$/;
    const match = code.match(returnRegex);
    
    if (match) {
      const jsxContent = match[1];
      const convertedJSX = this.convertJSXToHorizon(jsxContent);
      return code.replace(returnRegex, `return ${convertedJSX};`);
    }
    
    return code;
  }

  private convertJSX(code: string): string {
    return this.convertJSXToHorizon(code);
  }

  private convertJSXToHorizon(jsx: string): string {
    // Convert JSX to TypeScript object/function calls structure
    jsx = this.convertJSXElement(jsx, 'div', '// TODO: Convert div to Meta Horizon container');
    jsx = this.convertJSXElement(jsx, 'span', '// TODO: Convert span to Meta Horizon container');
    jsx = this.convertJSXElement(jsx, 'section', '// TODO: Convert section to Meta Horizon container');
    jsx = this.convertJSXElement(jsx, 'article', '// TODO: Convert article to Meta Horizon container');
    jsx = this.convertTextElements(jsx);
    jsx = this.convertButtonElements(jsx);
    jsx = this.convertImageElements(jsx);
    jsx = this.convertListElements(jsx);
    
    return jsx;
  }

  private convertJSXElement(jsx: string, reactTag: string, horizonFunction: string): string {
    // Handle self-closing tags
    const selfClosingRegex = new RegExp(`<${reactTag}([^>]*?)\\s*/>`, 'g');
    jsx = jsx.replace(selfClosingRegex, (match, attributes) => {
      const props = this.parseAttributes(attributes);
      return `${horizonFunction}({ ${props} })`;
    });

    // Handle opening/closing tags
    const openCloseRegex = new RegExp(`<${reactTag}([^>]*?)>(.*?)<\\/${reactTag}>`, 'gs');
    jsx = jsx.replace(openCloseRegex, (match, attributes, children) => {
      const props = this.parseAttributes(attributes);
      const convertedChildren = this.convertChildren(children);
      
      if (convertedChildren.trim()) {
        return `${horizonFunction}({ ${props}${props ? ', ' : ''}children: ${convertedChildren} })`;
      } else {
        return `${horizonFunction}({ ${props} })`;
      }
    });

    return jsx;
  }

  private convertTextElements(jsx: string): string {
    // Convert <p>, <h1>-<h6>, <span> with text content to Text()
    const textTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    
    textTags.forEach(tag => {
      const textRegex = new RegExp(`<${tag}([^>]*?)>(.*?)<\\/${tag}>`, 'gs');
      jsx = jsx.replace(textRegex, (match, attributes, content) => {
        const props = this.parseAttributes(attributes);
        const textContent = content.trim();
        
        // Check if content is just text or contains variables
        if (textContent.includes('{') && textContent.includes('}')) {
          const cleanContent = textContent.replace(/[{}]/g, '');
          return `Text({ text: ${cleanContent}${props ? ', ' + props : ''} })`;
        } else {
          return `Text({ text: "${textContent}"${props ? ', ' + props : ''} })`;
        }
      });
    });

    return jsx;
  }

  private convertButtonElements(jsx: string): string {
    const buttonRegex = /<button([^>]*?)>(.*?)<\/button>/gs;
    
    return jsx.replace(buttonRegex, (match, attributes, content) => {
      const props = this.parseAttributes(attributes);
      const textContent = content.trim();
      
      // Convert onClick to onPress
      const updatedProps = props.replace(/onClick:/g, 'onPress:');
      
      return `Pressable({ ${updatedProps}${updatedProps ? ', ' : ''}children: Text({ text: "${textContent}" }) })`;
    });
  }

  private convertImageElements(jsx: string): string {
    const imgRegex = /<img([^>]*?)\\s*\/?>/g;
    
    return jsx.replace(imgRegex, (match, attributes) => {
      const props = this.parseAttributes(attributes);
      // Convert src to source and alt to accessibilityLabel
      const updatedProps = props.replace(/src:/g, 'source:').replace(/alt:/g, 'accessibilityLabel:');
      return `Image({ ${updatedProps} })`;
    });
  }

  private convertListElements(jsx: string): string {
    // Convert map operations to DynamicList
    const mapRegex = /{([^}]*?)\.map\(\(([^)]+)\)\s*=>\s*\(([\s\S]*?)\)\)}/g;
    
    return jsx.replace(mapRegex, (match, arrayName, itemParam, itemJSX) => {
      this.warnings.push('Converting array.map to DynamicList');
      const convertedItem = this.convertJSXToHorizon(itemJSX);
      
      return `DynamicList({
        data: ${arrayName},
        renderItem: (${itemParam}) => ${convertedItem}
      })`;
    });
  }

  private parseAttributes(attributesStr: string): string {
    if (!attributesStr.trim()) return '';
    
    const attributes: string[] = [];
    
    // Parse className to style
    const classNameMatch = attributesStr.match(/className\s*=\s*["']([^"']+)["']/);
    if (classNameMatch) {
      this.warnings.push('Converting className to style object - manual style conversion needed');
      attributes.push(`style: { /* Convert CSS classes: ${classNameMatch[1]} */ }`);
    }
    
    // Parse style attribute
    const styleMatch = attributesStr.match(/style\s*=\s*{([^}]+)}/);
    if (styleMatch) {
      attributes.push(`style: { ${styleMatch[1]} }`);
    }
    
    // Parse other attributes
    const otherAttrs = attributesStr.replace(/(?:className|style)\s*=\s*(?:["'][^"']*["']|{[^}]*})/g, '');
    const attrMatches = otherAttrs.match(/(\w+)\s*=\s*(?:["']([^"']*)["']|{([^}]*)})/g);
    
    if (attrMatches) {
      attrMatches.forEach(attr => {
        const [, name, stringValue, jsValue] = attr.match(/(\w+)\s*=\s*(?:["']([^"']*)["']|{([^}]*)})/);
        if (stringValue !== undefined) {
          attributes.push(`${name}: "${stringValue}"`);
        } else if (jsValue !== undefined) {
          attributes.push(`${name}: ${jsValue}`);
        }
      });
    }
    
    return attributes.join(', ');
  }

  private convertChildren(children: string): string {
    const trimmed = children.trim();
    if (!trimmed) return '';
    
    // If it's just text, return it as a string
    if (!trimmed.includes('<') && !trimmed.includes('{')) {
      return `"${trimmed}"`;
    }
    
    // If it contains JSX, convert it
    if (trimmed.includes('<')) {
      return this.convertJSXToHorizon(trimmed);
    }
    
    // If it contains expressions, return as-is
    return trimmed;
  }

  private convertHooks(code: string): string {
    // Convert useCallback
    code = code.replace(/useCallback\(\s*([^,]+),\s*\[([^\]]*)\]\s*\)/g, '($1) /* Dependencies: [$2] */');
    
    // Convert useMemo
    code = code.replace(/useMemo\(\s*\(\)\s*=>\s*([^,]+),\s*\[([^\]]*)\]\s*\)/g, '($1) /* Memoized, deps: [$2] */');
    
    // Convert useRef
    code = code.replace(/const\s+(\w+)\s*=\s*useRef\(([^)]*)\);?/g, 'const $1 = { current: $2 }; // TODO: Convert to Horizon equivalent');
    
    return code;
  }

  // ComponentInfo extraction methods for debugging
  private extractProps(propsStr: string): string[] {
    if (!propsStr.trim()) return [];
    
    const propMatches = propsStr.match(/{\s*([^}]+)\s*}/);
    if (propMatches) {
      return propMatches[1]
        .split(',')
        .map(prop => prop.split('=')[0].trim())
        .filter(prop => prop.length > 0);
    }
    
    // Simple prop parameter (non-destructured)
    if (propsStr.trim() && !propsStr.includes('{')) {
      return [propsStr.trim()];
    }
    
    return [];
  }

  private extractStateFromBody(body: string): string[] {
    const stateVars: string[] = [];
    const useStateRegex = /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState\(([^)]*)\);?/g;
    
    let match;
    while ((match = useStateRegex.exec(body)) !== null) {
      stateVars.push(`${match[1]} (${this.inferTypeFromValue(match[3] || 'null')})`);
    }
    
    return stateVars;
  }

  private extractEffectsFromBody(body: string): string[] {
    const effects: string[] = [];
    const useEffectRegex = /useEffect\(\(\)\s*=>\s*{([\s\S]*?)},\s*\[([^\]]*)\]\);?/g;
    
    let match;
    while ((match = useEffectRegex.exec(body)) !== null) {
      const deps = match[2].trim();
      const effectDescription = match[1].trim().split('\n')[0].substring(0, 50) + '...';
      effects.push(`Effect [${deps || 'no deps'}]: ${effectDescription}`);
    }
    
    return effects;
  }

  private extractClassProps(propsType?: string): string[] {
    if (!propsType) return [];
    
    // Handle interface/type props like "{ title: string, count: number }"
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
    
    // Handle named interface/type
    if (propsType.trim()) {
      return [`Props (${propsType.trim()})`];
    }
    
    return [];
  }

  private extractClassStateFromBody(body: string): string[] {
    const stateVars: string[] = [];
    
    // Look for this.state declarations
    const stateRegex = /this\.state\s*=\s*{([^}]+)}/g;
    let match;
    while ((match = stateRegex.exec(body)) !== null) {
      const stateContent = match[1];
      const stateProps = stateContent
        .split(',')
        .map(prop => {
          const colonIndex = prop.indexOf(':');
          if (colonIndex > 0) {
            const name = prop.substring(0, colonIndex).trim();
            const value = prop.substring(colonIndex + 1).trim();
            return `${name} (${this.inferTypeFromValue(value)})`;
          }
          return prop.trim();
        })
        .filter(prop => prop.length > 0);
      stateVars.push(...stateProps);
    }
    
    // Also check for useState hooks (mixed class/functional patterns)
    stateVars.push(...this.extractStateFromBody(body));
    
    return stateVars;
  }
}