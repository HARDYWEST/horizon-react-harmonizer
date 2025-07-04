import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Code, Eye, FileText, Zap } from 'lucide-react';
import { CodeEditor } from './CodeEditor';

interface ReactCodePreviewProps {
  code: string;
  onClose?: () => void;
}

interface ComponentInfo {
  name: string;
  type: 'functional' | 'class';
  hooks: string[];
  props: string[];
  jsx: boolean;
}

export const ReactCodePreview = ({ code, onClose }: ReactCodePreviewProps) => {
  // Parse the React code to extract component information
  const parseReactCode = (code: string): ComponentInfo[] => {
    const components: ComponentInfo[] = [];
    
    // Find functional components
    const funcComponentRegex = /(?:export\s+)?(?:const|function)\s+(\w+)\s*(?::\s*React\.FC[^=]*)?[=\s]*\(([^)]*)\)\s*(?::\s*JSX\.Element\s*)?[=>\s]*{/g;
    let match;
    
    while ((match = funcComponentRegex.exec(code)) !== null) {
      const [, name, params] = match;
      const hooks = extractHooks(code, match.index);
      const props = extractPropsFromParams(params);
      
      components.push({
        name,
        type: 'functional',
        hooks,
        props,
        jsx: code.includes('<') && code.includes('>')
      });
    }
    
    // Find class components
    const classComponentRegex = /(?:export\s+)?class\s+(\w+)\s+extends\s+(?:React\.)?Component/g;
    while ((match = classComponentRegex.exec(code)) !== null) {
      const [, name] = match;
      
      components.push({
        name,
        type: 'class',
        hooks: [], // Class components don't use hooks
        props: extractClassProps(code, match.index),
        jsx: code.includes('<') && code.includes('>')
      });
    }
    
    return components;
  };
  
  const extractHooks = (code: string, startIndex: number): string[] => {
    const hooks: string[] = [];
    const hookRegex = /use(\w+)/g;
    let match;
    
    // Look for hooks in the component body
    const componentEnd = findComponentEnd(code, startIndex);
    const componentBody = code.slice(startIndex, componentEnd);
    
    while ((match = hookRegex.exec(componentBody)) !== null) {
      const hookName = `use${match[1]}`;
      if (!hooks.includes(hookName)) {
        hooks.push(hookName);
      }
    }
    
    return hooks;
  };
  
  const extractPropsFromParams = (params: string): string[] => {
    if (!params.trim()) return [];
    
    const propMatches = params.match(/{\s*([^}]+)\s*}/);
    if (propMatches) {
      return propMatches[1]
        .split(',')
        .map(prop => prop.split('=')[0].trim())
        .filter(prop => prop.length > 0);
    }
    
    return params.trim() ? [params.trim()] : [];
  };
  
  const extractClassProps = (code: string, startIndex: number): string[] => {
    // Simple extraction for class component props
    const propsMatch = code.match(/this\.props\.(\w+)/g);
    if (propsMatch) {
      return [...new Set(propsMatch.map(match => match.replace('this.props.', '')))];
    }
    return [];
  };
  
  const findComponentEnd = (code: string, startIndex: number): number => {
    let braceCount = 0;
    let inComponent = false;
    
    for (let i = startIndex; i < code.length; i++) {
      if (code[i] === '{') {
        braceCount++;
        inComponent = true;
      } else if (code[i] === '}') {
        braceCount--;
        if (inComponent && braceCount === 0) {
          return i;
        }
      }
    }
    
    return code.length;
  };
  
  const components = parseReactCode(code);
  const hasJSX = code.includes('<') && code.includes('>');
  const hasHooks = /use\w+/.test(code);
  const hasImports = code.includes('import');
  const lineCount = code.split('\n').length;
  
  return (
    <Card className="p-6 shadow-code border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
              <Eye className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">React Code Preview</h3>
              <p className="text-sm text-muted-foreground">Analysis and formatted display</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close preview"
            >
              ×
            </button>
          )}
        </div>
        
        {/* Code Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">{components.length}</div>
            <div className="text-xs text-muted-foreground">Components</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-converter-accent">{lineCount}</div>
            <div className="text-xs text-muted-foreground">Lines</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-green-500">{hasJSX ? '✓' : '✗'}</div>
            <div className="text-xs text-muted-foreground">JSX</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-blue-500">{hasHooks ? '✓' : '✗'}</div>
            <div className="text-xs text-muted-foreground">Hooks</div>
          </div>
        </div>
        
        {/* Component Analysis */}
        {components.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground">Detected Components</h4>
            </div>
            
            <div className="grid gap-3">
              {components.map((component, index) => (
                <Card key={index} className="p-4 border-border/50 bg-background/30">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          component.type === 'class' ? 'bg-orange-500' : 'bg-blue-500'
                        }`} />
                        <span className="font-medium text-foreground">{component.name}</span>
                        <Badge variant={component.type === 'class' ? 'secondary' : 'default'} className="text-xs">
                          {component.type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {component.jsx && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            JSX
                          </Badge>
                        )}
                        {component.hooks.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            {component.hooks.length} hooks
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {(component.props.length > 0 || component.hooks.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {component.props.length > 0 && (
                          <div>
                            <h5 className="font-medium text-foreground mb-1">Props:</h5>
                            <div className="flex flex-wrap gap-1">
                              {component.props.map((prop, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {prop}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {component.hooks.length > 0 && (
                          <div>
                            <h5 className="font-medium text-foreground mb-1">Hooks:</h5>
                            <div className="flex flex-wrap gap-1">
                              {component.hooks.map((hook, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {hook}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Code Display */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-foreground">Source Code</h4>
          </div>
          
          <CodeEditor
            value={code}
            onChange={() => {}} // Read-only preview
            language="typescript"
            readOnly={true}
            height="400px"
          />
        </div>
        
        {/* Features Detected */}
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Features Detected</h4>
          <div className="flex flex-wrap gap-2">
            {hasImports && (
              <Badge variant="outline" className="text-xs">
                <Code className="w-3 h-3 mr-1" />
                ES6 Imports
              </Badge>
            )}
            {hasJSX && (
              <Badge variant="outline" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                JSX Syntax
              </Badge>
            )}
            {hasHooks && (
              <Badge variant="outline" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                React Hooks
              </Badge>
            )}
            {code.includes('useState') && (
              <Badge variant="outline" className="text-xs">
                State Management
              </Badge>
            )}
            {code.includes('useEffect') && (
              <Badge variant="outline" className="text-xs">
                Side Effects
              </Badge>
            )}
            {code.includes('onClick') && (
              <Badge variant="outline" className="text-xs">
                Event Handlers
              </Badge>
            )}
            {code.includes('className') && (
              <Badge variant="outline" className="text-xs">
                CSS Classes
              </Badge>
            )}
            {code.includes('style=') && (
              <Badge variant="outline" className="text-xs">
                Inline Styles
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};