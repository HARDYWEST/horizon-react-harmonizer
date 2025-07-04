import { ConversionResult, ComponentInfo } from './types';
import { ComponentConverter } from './component-converter';

export class ReactToHorizonConverter {
  private errors: string[] = [];
  private warnings: string[] = [];
  private components: ComponentInfo[] = [];
  private componentConverter: ComponentConverter;

  constructor() {
    this.componentConverter = new ComponentConverter();
  }

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
    // Set context for component converter
    this.componentConverter.setContext(this.warnings, this.components);
    
    // Convert functional components
    code = this.componentConverter.convertFunctionalComponents(code);
    
    // Convert class components  
    code = this.componentConverter.convertClassComponents(code);
    
    return code;
  }
}

// Re-export types for convenience
export type { ConversionResult, ComponentInfo } from './types';