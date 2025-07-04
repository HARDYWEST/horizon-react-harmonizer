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
    
    return converted;
  }

  private replaceImports(code: string): string {
    // Remove React imports and add Meta Horizon Worlds imports
    const horizonImports = `// Meta Horizon Worlds UIComponent
// Generated from React component - manual verification required
import { 
  UIComponent, 
  View, 
  Text, 
  Pressable, 
  Image, 
  ScrollView, 
  DynamicList,
  Binding
} from '../horizon_ui';

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
    // Match functional component patterns - more precise regex
    const funcComponentRegex = /(?:export\s+)?(?:const|function)\s+(\w+)\s*(?::\s*React\.FC[^=]*)?[=\s]*\(([^)]*)\)\s*(?::\s*JSX\.Element\s*)?\s*=>\s*{([\s\S]*?)(?=\n(?:export|const|function|\w+\s*=|$))|(?:export\s+)?(?:const|function)\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*JSX\.Element\s*)?\s*{([\s\S]*?)(?=\n(?:export|const|function|\w+\s*=|$))/g;
    
    return code.replace(funcComponentRegex, (match, arrowName, arrowProps, arrowBody, funcName, funcProps, funcBody) => {
      const componentName = arrowName || funcName;
      const props = arrowProps || funcProps;
      const body = arrowBody || funcBody;
      
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
      
      const propsInterface = this.generatePropsInterface(props, componentName);
      const { stateDeclarations, methods, convertedBody } = this.convertComponentBodyWithStateExtraction(body, componentName);
      
      return `${propsInterface}

export class ${componentName} extends UIComponent {
  private props: ${componentName}Props;${stateDeclarations}
  
  constructor(props: ${componentName}Props) {
    super();
    this.props = props;
  }
${methods}
  
  initializeUI(): UINode {
${convertedBody}
  }
  
  prestart(): void {
    // TODO: Setup logic before component starts
  }
  
  start(): void {
    // TODO: Move useEffect logic here
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
    
    // Convert React.Component to UIComponent
    return code.replace(/extends\s+React\.Component/g, 'extends UIComponent')
               .replace(/extends\s+Component/g, 'extends UIComponent')
               .replace(/render\(\)\s*:/g, 'initializeUI(): UINode //');
  }

  private generatePropsInterface(propsStr: string, componentName: string): string {
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
    if (!value || value === 'null' || value === 'undefined') return 'any';
    if (value.startsWith("'") || value.startsWith('"')) return 'string';
    if (/^\d+$/.test(value)) return 'number';
    if (value === 'true' || value === 'false') return 'boolean';
    if (value.startsWith('[')) return 'any[]';
    if (value.startsWith('{')) return 'object';
    return 'any';
  }

  private convertComponentBodyWithStateExtraction(body: string, componentName: string): { stateDeclarations: string, methods: string, convertedBody: string } {
    let stateDeclarations = '';
    let methods = '';
    let convertedBody = body;
    
    // Extract and convert useState hooks to class state declarations
    const useStateRegex = /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState\(([^)]*)\);?/g;
    let match;
    const stateVars: Array<{name: string, setter: string, type: string, initial: string}> = [];
    
    while ((match = useStateRegex.exec(body)) !== null) {
      const [fullMatch, stateName, setter, initialValue] = match;
      const inferredType = this.inferTypeFromValue(initialValue || 'null');
      
      stateVars.push({
        name: stateName,
        setter: setter,
        type: inferredType,
        initial: initialValue || 'null'
      });
      
      // Remove useState from body
      convertedBody = convertedBody.replace(fullMatch, '');
    }
    
    // Generate state declarations
    if (stateVars.length > 0) {
      stateDeclarations = '\n  // TODO: Implement state as Binding<T> for Meta Horizon';
      stateVars.forEach(state => {
        stateDeclarations += `\n  private ${state.name}: Binding<${state.type}> = new Binding(${state.initial});`;
      });
    }
    
    // Generate setter methods
    if (stateVars.length > 0) {
      methods = stateVars.map(state => {
        return `  private ${state.setter} = (newValue: ${state.type}) => {
    this.${state.name}.set(newValue);
  };`;
      }).join('\n\n');
    }
    
    // Convert useEffect to component lifecycle comments
    convertedBody = this.convertUseEffect(convertedBody);
    
    // Find and convert the return statement
    const returnMatch = convertedBody.match(/return\s*\(([\s\S]*?)\);?\s*$/);
    if (returnMatch) {
      const jsxContent = returnMatch[1];
      const convertedJSX = this.convertJSXToHorizon(jsxContent);
      convertedBody = convertedBody.replace(returnMatch[0], `return ${convertedJSX};`);
    } else {
      // Look for simple return without parentheses
      const simpleReturnMatch = convertedBody.match(/return\s+([\s\S]*?);?\s*$/);
      if (simpleReturnMatch) {
        const jsxContent = simpleReturnMatch[1];
        const convertedJSX = this.convertJSXToHorizon(jsxContent);
        convertedBody = convertedBody.replace(simpleReturnMatch[0], `return ${convertedJSX};`);
      } else {
        convertedBody += '\n    return View({});';
      }
    }
    
    // Add this. prefix to all state and prop references
    convertedBody = this.addThisPrefixToReferences(convertedBody, stateVars.map(s => s.name));
    
    // Indent the body properly
    convertedBody = convertedBody.split('\n').map(line => `    ${line}`).join('\n');
    
    return {
      stateDeclarations,
      methods,
      convertedBody
    };
  }

  private convertUseEffect(code: string): string {
    const useEffectRegex = /useEffect\(\(\)\s*=>\s*{([\s\S]*?)},\s*\[([^\]]*)\]\);?/g;
    
    return code.replace(useEffectRegex, (match, effect, deps) => {
      this.warnings.push('Converting useEffect - place logic in start lifecycle method');
      return `// TODO: Move this to start lifecycle method
    // Original useEffect dependencies: [${deps}]
    ${effect.trim()}`;
    });
  }

  private addThisPrefixToReferences(code: string, stateNames: string[]): string {
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

  private convertJSXToHorizon(jsx: string): string {
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
      const props = this.parseAttributes(attributes);
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
      const props = this.parseAttributes(attributes);
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
      const props = this.parseAttributes(attributes);
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
        const props = this.parseAttributes(attributes);
        
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
      const props = this.parseAttributes(attributes);
      const updatedProps = props.replace(/onClick:/g, 'onPress:');
      const cleanText = content.trim();
      
      return `Pressable({ ${updatedProps}${updatedProps ? ', ' : ''}children: Text({ text: "${cleanText}" }) })`;
    });

    // Convert img elements
    jsx = jsx.replace(/<img([^>]*?)\s*\/?>/g, (match, attributes) => {
      const props = this.parseAttributes(attributes);
      const updatedProps = props.replace(/src:/g, 'source:').replace(/alt:/g, 'accessibilityLabel:');
      return `Image({ ${updatedProps} })`;
    });

    // Convert span elements
    jsx = jsx.replace(/<span([^>]*?)>(.*?)<\/span>/gs, (match, attributes, content) => {
      this.warnings.push('Converting span to Text - verify if appropriate');
      const props = this.parseAttributes(attributes);
      
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

  private parseAttributes(attributesStr: string): string {
    if (!attributesStr.trim()) return '';
    
    const attributes: string[] = [];
    
    // Parse className to style
    const classNameMatch = attributesStr.match(/className\s*=\s*["']([^"']+)["']/);
    if (classNameMatch) {
      const className = classNameMatch[1];
      this.warnings.push(`Converting className "${className}" to style object - manual conversion needed`);
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

  private extractClassStateFromBody(body: string): string[] {
    const stateVars: string[] = [];
    
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
    
    stateVars.push(...this.extractStateFromBody(body));
    
    return stateVars;
  }
}