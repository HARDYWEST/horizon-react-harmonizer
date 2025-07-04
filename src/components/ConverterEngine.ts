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
    
    // Convert React hooks to Horizon bindings
    converted = this.convertHooks(converted);
    
    // Convert JSX to Horizon UI function calls (after hooks conversion)
    converted = this.convertJSX(converted);
    
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
  
  // Horizon UI lifecycle method - called after constructor
  initializeUI(): UINode {
${convertedBody}
  }
  
  // Horizon UI lifecycle method - called before start
  prestart(): void {
    // TODO: Setup logic before component starts
  }
  
  // Horizon UI lifecycle method - called when component starts
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
               .replace(/render\(\)\s*{/g, 'initializeUI(): UINode { // TODO: Move render logic to initializeUI() lifecycle method');
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
    if (value === 'null' || value === 'undefined') return 'any';
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
    
    // Convert return statement and add this. prefixes
    convertedBody = this.convertReturnStatementWithThisPrefix(convertedBody);
    
    // Add this. prefix to all state and prop references
    convertedBody = this.addThisPrefixToReferences(convertedBody, stateVars.map(s => s.name));
    
    // Ensure we return a UINode
    if (!convertedBody.includes('return ')) {
      convertedBody += '\n    return View({});';
    }
    
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

  private convertReturnStatementWithThisPrefix(code: string): string {
    // Find the return statement with JSX
    const returnRegex = /return\s*\(([\s\S]*?)\);?\s*$/;
    const match = code.match(returnRegex);
    
    if (match) {
      const jsxContent = match[1].trim();
      // Convert JSX to actual Horizon UI component calls
      const convertedJSX = this.convertJSXToHorizon(jsxContent);
      // Return the properly converted Horizon UI code
      return code.replace(returnRegex, `return ${convertedJSX};`);
    }
    
    return code;
  }

  private addThisPrefixToReferences(code: string, stateNames: string[]): string {
    // Add this. prefix to props access (but not if already has this.)
    code = code.replace(/(?<!this\.)(\bprops\.\w+)/g, 'this.$1');
    
    // Add this. prefix to state variable references
    stateNames.forEach(stateName => {
      const stateRegex = new RegExp(`(?<!this\\.)\\b${stateName}\\b`, 'g');
      code = code.replace(stateRegex, `this.${stateName}`);
    });
    
    // Add this. prefix to setter function calls (but not if already has this.)
    code = code.replace(/(?<!this\.)(\bset\w+)\s*\(/g, 'this.$1(');
    
    // Add this. prefix to method calls that aren't already prefixed
    code = code.replace(/(?<!this\.)(\bhandle\w+)(?=\s*[(),])/g, 'this.$1');
    
    return code;
  }

  private convertJSX(code: string): string {
    return this.convertJSXToHorizon(code);
  }

  private convertJSXToHorizon(jsx: string): string {
    // Convert JSX to Horizon UI component creation calls
    jsx = this.convertDivElements(jsx);
    jsx = this.convertTextElements(jsx);
    jsx = this.convertButtonElements(jsx);
    jsx = this.convertImageElements(jsx);
    jsx = this.convertListElements(jsx);
    jsx = this.convertGenericElements(jsx);
    
    return jsx;
  }

  private convertDivElements(jsx: string): string {
    // Convert <div> elements to View() - used for layout wrappers
    return this.convertJSXElement(jsx, 'div', 'View');
  }

  private convertGenericElements(jsx: string): string {
    // Convert other container elements to View() with TODO comments
    jsx = this.convertJSXElement(jsx, 'span', 'View /* TODO: Convert span to appropriate Meta Horizon component */');
    jsx = this.convertJSXElement(jsx, 'section', 'View /* TODO: Convert section to appropriate Meta Horizon component */');
    jsx = this.convertJSXElement(jsx, 'article', 'View /* TODO: Convert article to appropriate Meta Horizon component */');
    jsx = this.convertJSXElement(jsx, 'main', 'View /* TODO: Convert main to appropriate Meta Horizon component */');
    jsx = this.convertJSXElement(jsx, 'header', 'View /* TODO: Convert header to appropriate Meta Horizon component */');
    jsx = this.convertJSXElement(jsx, 'footer', 'View /* TODO: Convert footer to appropriate Meta Horizon component */');
    jsx = this.convertJSXElement(jsx, 'nav', 'View /* TODO: Convert nav to appropriate Meta Horizon component */');
    jsx = this.convertJSXElement(jsx, 'aside', 'View /* TODO: Convert aside to appropriate Meta Horizon component */');
    
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
        const childrenProp = convertedChildren.startsWith('[') ? 
          `children: ${convertedChildren}` : 
          `children: [${convertedChildren}]`;
        return `${horizonFunction}({ ${props}${props ? ', ' : ''}${childrenProp} })`;
      } else {
        return `${horizonFunction}({ ${props} })`;
      }
    });

    return jsx;
  }

  private convertTextElements(jsx: string): string {
    // Convert <p>, <h1>-<h6> with text content to Text() - Use Text for any readable content
    const textTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    
    textTags.forEach(tag => {
      const textRegex = new RegExp(`<${tag}([^>]*?)>(.*?)<\\/${tag}>`, 'gs');
      jsx = jsx.replace(textRegex, (match, attributes, content) => {
        const props = this.parseAttributes(attributes);
        const textContent = content.trim();
        
        // Handle dynamic expressions and template literals properly
        if (textContent.includes('{') && textContent.includes('}')) {
          // Check for mixed static text and expressions
          const hasStaticAndDynamic = /[^{}]+\{[^}]+\}|^[^{}]*\{[^}]+\}[^{}]*$/.test(textContent);
          
          if (hasStaticAndDynamic) {
            // Convert to template literal for mixed content
            const templateContent = textContent.replace(/\{([^}]+)\}/g, '${this.$1}');
            return `Text({ text: \`${templateContent.replace(/\{|\}/g, '')}\`${props ? ', ' + props : ''} })`;
          } else {
            // Pure expression content
            const expressionMatch = textContent.match(/\{([^}]+)\}/);
            if (expressionMatch) {
              const expression = expressionMatch[1].trim();
              return `Text({ text: this.${expression}${props ? ', ' + props : ''} })`;
            }
          }
        } else if (textContent) {
          // Pure static text
          return `Text({ text: "${textContent}"${props ? ', ' + props : ''} })`;
        }
        
        return match; // fallback if parsing fails
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
    
    // Parse className to style with proper TODO comment - more robust regex
    const classNameMatch = attributesStr.match(/className\s*=\s*(?:["']([^"']+)["']|\{([^}]+)\})/);
    if (classNameMatch) {
      const className = classNameMatch[1] || classNameMatch[2];
      this.warnings.push('Converting className to style object - manual style conversion needed');
      attributes.push(`style: { /* TODO: Convert className to Horizon style - CSS classes: ${className} */ }`);
    }
    
    // Parse style attribute - more robust
    const styleMatch = attributesStr.match(/style\s*=\s*\{([^}]+)\}/);
    if (styleMatch) {
      attributes.push(`style: { ${styleMatch[1]} }`);
    }
    
    // Parse onClick specifically - ensure it's always converted to onPress
    const onClickMatch = attributesStr.match(/onClick\s*=\s*\{([^}]+)\}/);
    if (onClickMatch) {
      const handler = onClickMatch[1].trim();
      // Add this. prefix if it's a method reference
      const prefixedHandler = handler.includes('this.') ? handler : `this.${handler}`;
      attributes.push(`onPress: ${prefixedHandler}`);
    }
    
    // Parse other attributes - exclude already processed ones
    const otherAttrs = attributesStr
      .replace(/(?:className|style|onClick)\s*=\s*(?:["'][^"']*["']|\{[^}]*\})/g, '')
      .trim();
    
    if (otherAttrs) {
      const attrMatches = otherAttrs.match(/(\w+)\s*=\s*(?:["']([^"']*)["']|\{([^}]*)\})/g);
      
      if (attrMatches) {
        attrMatches.forEach(attr => {
          const match = attr.match(/(\w+)\s*=\s*(?:["']([^"']*)["']|\{([^}]*)\})/);
          if (match) {
            const [, name, stringValue, jsValue] = match;
            if (stringValue !== undefined) {
              attributes.push(`${name}: "${stringValue}"`);
            } else if (jsValue !== undefined) {
              // Add this. prefix for method references
              const prefixedValue = jsValue.includes('this.') ? jsValue : 
                                   (name.startsWith('on') ? `this.${jsValue}` : jsValue);
              attributes.push(`${name}: ${prefixedValue}`);
            }
          }
        });
      }
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
    
    // Check if we have multiple JSX elements that need to be wrapped in an array
    const jsxElements = this.extractJSXElements(trimmed);
    if (jsxElements.length > 1) {
      const convertedElements = jsxElements.map(element => {
        if (element.includes('<')) {
          return this.convertJSXToHorizon(element);
        } else if (element.includes('{') && element.includes('}')) {
          // Handle expression
          const expressionMatch = element.match(/\{([^}]+)\}/);
          if (expressionMatch) {
            return `this.${expressionMatch[1].trim()}`;
          }
        }
        return `"${element.trim()}"`;
      });
      return `[${convertedElements.join(', ')}]`;
    }
    
    // If it contains JSX, convert it
    if (trimmed.includes('<')) {
      return this.convertJSXToHorizon(trimmed);
    }
    
    // If it contains expressions, handle them
    if (trimmed.includes('{') && trimmed.includes('}')) {
      const expressionMatch = trimmed.match(/\{([^}]+)\}/);
      if (expressionMatch) {
        return `this.${expressionMatch[1].trim()}`;
      }
    }
    
    // Plain text
    return `"${trimmed}"`;
  }

  private extractJSXElements(jsx: string): string[] {
    const elements: string[] = [];
    let depth = 0;
    let currentElement = '';
    let i = 0;
    
    while (i < jsx.length) {
      const char = jsx[i];
      
      if (char === '<') {
        if (jsx[i + 1] === '/') {
          // Closing tag
          depth--;
          currentElement += char;
        } else {
          // Opening tag
          if (depth === 0 && currentElement.trim()) {
            elements.push(currentElement.trim());
            currentElement = '';
          }
          depth++;
          currentElement += char;
        }
      } else {
        currentElement += char;
      }
      
      if (depth === 0 && currentElement.trim()) {
        elements.push(currentElement.trim());
        currentElement = '';
      }
      
      i++;
    }
    
    if (currentElement.trim()) {
      elements.push(currentElement.trim());
    }
    
    return elements.filter(el => el.length > 0);
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