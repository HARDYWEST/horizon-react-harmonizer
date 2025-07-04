import { ComponentInfo, StateVariable, ComponentBodyResult } from './types';
import { ConverterUtils } from './utils';
import { JSXConverter } from './jsx-converter';

export class ComponentConverter {
  private warnings: string[] = [];
  private components: ComponentInfo[] = [];
  private jsxConverter: JSXConverter;

  constructor() {
    this.jsxConverter = new JSXConverter();
  }

  setContext(warnings: string[], components: ComponentInfo[]) {
    this.warnings = warnings;
    this.components = components;
    this.jsxConverter.setWarnings(warnings);
  }

  convertFunctionalComponents(code: string): string {
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
        props: ConverterUtils.extractProps(props),
        state: this.extractStateFromBody(body),
        effects: this.extractEffectsFromBody(body),
        isClass: false
      };
      this.components.push(componentInfo);
      
      const propsInterface = ConverterUtils.generatePropsInterface(props, componentName);
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

  convertClassComponents(code: string): string {
    // Match class component patterns to extract info
    const classComponentRegex = /(?:export\s+)?class\s+(\w+)\s+extends\s+(?:React\.)?Component(?:<([^>]+)>)?\s*{([\s\S]*?)}/g;
    
    let match;
    while ((match = classComponentRegex.exec(code)) !== null) {
      const [, componentName, propsType, body] = match;
      
      // Extract component info for debugging
      const componentInfo: ComponentInfo = {
        name: componentName,
        props: ConverterUtils.extractClassProps(propsType),
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

  private convertComponentBodyWithStateExtraction(body: string, componentName: string): ComponentBodyResult {
    let stateDeclarations = '';
    let methods = '';
    let convertedBody = body;
    
    // Extract and convert useState hooks to class state declarations
    const useStateRegex = /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState\(([^)]*)\);?/g;
    let match;
    const stateVars: StateVariable[] = [];
    
    while ((match = useStateRegex.exec(body)) !== null) {
      const [fullMatch, stateName, setter, initialValue] = match;
      const inferredType = ConverterUtils.inferTypeFromValue(initialValue || 'null');
      
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
      const convertedJSX = this.jsxConverter.convertJSXToHorizon(jsxContent);
      convertedBody = convertedBody.replace(returnMatch[0], `return ${convertedJSX};`);
    } else {
      // Look for simple return without parentheses
      const simpleReturnMatch = convertedBody.match(/return\s+([\s\S]*?);?\s*$/);
      if (simpleReturnMatch) {
        const jsxContent = simpleReturnMatch[1];
        const convertedJSX = this.jsxConverter.convertJSXToHorizon(jsxContent);
        convertedBody = convertedBody.replace(simpleReturnMatch[0], `return ${convertedJSX};`);
      } else {
        convertedBody += '\n    return View({});';
      }
    }
    
    // Add this. prefix to all state and prop references
    convertedBody = ConverterUtils.addThisPrefixToReferences(convertedBody, stateVars.map(s => s.name));
    
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

  private extractStateFromBody(body: string): string[] {
    const stateVars: string[] = [];
    const useStateRegex = /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState\(([^)]*)\);?/g;
    
    let match;
    while ((match = useStateRegex.exec(body)) !== null) {
      stateVars.push(`${match[1]} (${ConverterUtils.inferTypeFromValue(match[3] || 'null')})`);
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
            return `${name} (${ConverterUtils.inferTypeFromValue(value)})`;
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