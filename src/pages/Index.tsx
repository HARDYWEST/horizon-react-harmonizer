import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CodeEditor } from '@/components/CodeEditor';
import { ReactToHorizonConverter } from '@/components/ConverterEngine';
import { ConversionStatus } from '@/components/ConversionStatus';
import { ExampleSelector } from '@/components/ExampleSelector';
import { ArrowRight, Copy, Download, Sparkles, Code, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [reactCode, setReactCode] = useState('');
  const [horizonCode, setHorizonCode] = useState('');
  const [conversionResult, setConversionResult] = useState<{
    success: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const { toast } = useToast();

  const converter = new ReactToHorizonConverter();

  const handleConvert = () => {
    if (!reactCode.trim()) {
      toast({
        title: "No code to convert",
        description: "Please enter some React code to convert.",
        variant: "destructive",
      });
      return;
    }

    const result = converter.convert(reactCode);
    setHorizonCode(result.code);
    setConversionResult({
      success: result.success,
      errors: result.errors,
      warnings: result.warnings
    });

    toast({
      title: result.success ? "Conversion successful!" : "Conversion completed with issues",
      description: result.success 
        ? "Your React code has been converted to Horizon UI format."
        : "Check the status panel for errors and warnings.",
      variant: result.success ? "default" : "destructive",
    });
  };

  const handleCopyCode = async () => {
    if (!horizonCode) return;
    
    try {
      await navigator.clipboard.writeText(horizonCode);
      toast({
        title: "Code copied!",
        description: "Horizon UI code has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy code to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!horizonCode) return;

    const blob = new Blob([horizonCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'horizon-ui-component.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "File downloaded!",
      description: "Horizon UI code has been saved as horizon-ui-component.ts",
    });
  };

  const handleSelectExample = (code: string) => {
    setReactCode(code);
    setHorizonCode('');
    setConversionResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-gradient-primary shadow-glow">
              <Code className="w-8 h-8 text-primary-foreground" />
            </div>
            <ArrowRight className="w-6 h-6 text-primary animate-pulse" />
            <div className="p-3 rounded-full bg-gradient-to-r from-converter-accent to-converter-accent/80 shadow-converter">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-converter-accent bg-clip-text text-transparent mb-4">
            React to Horizon UI Converter
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your React components into working Horizon UI code with intelligent conversion and best practice recommendations.
          </p>
        </div>

        {/* Example Selector */}
        <div className="mb-8">
          <ExampleSelector onSelectExample={handleSelectExample} />
        </div>

        <Separator className="my-8" />

        {/* Main Converter Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Input Section */}
          <Card className="p-6 shadow-converter border-border/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">React Code</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Code className="w-4 h-4" />
                  <span>JSX/TSX</span>
                </div>
              </div>
              <CodeEditor
                value={reactCode}
                onChange={setReactCode}
                language="typescript"
                placeholder="Paste your React component code here..."
                height="500px"
              />
            </div>
          </Card>

          {/* Output Section */}
          <Card className="p-6 shadow-converter border-border/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Horizon UI Code</h2>
                <div className="flex items-center gap-2">
                  {horizonCode && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCode}
                        className="transition-smooth hover:bg-converter-accent/10"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        className="transition-smooth hover:bg-converter-accent/10"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <CodeEditor
                value={horizonCode}
                onChange={() => {}} // Read-only
                language="typescript"
                placeholder="Converted Horizon UI code will appear here..."
                readOnly={true}
                height="500px"
              />
            </div>
          </Card>
        </div>

        {/* Convert Button */}
        <div className="flex justify-center mb-8">
          <Button
            onClick={handleConvert}
            variant="converter"
            size="lg"
            disabled={!reactCode.trim()}
            className="px-8 py-3 text-lg font-semibold"
          >
            <Sparkles className="w-5 h-5" />
            Convert to Horizon UI
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Conversion Status */}
        {conversionResult && (
          <div className="mb-8">
            <ConversionStatus
              success={conversionResult.success}
              errors={conversionResult.errors}
              warnings={conversionResult.warnings}
            />
          </div>
        )}

        {/* Information Section */}
        <Card className="p-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              What this converter does
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">✨ Component Conversion</h4>
                <ul className="space-y-1">
                  <li>• Converts functional components to UIComponent classes</li>
                  <li>• Transforms useState to Binding objects</li>
                  <li>• Maps React lifecycle to Horizon patterns</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">🎨 JSX Transformation</h4>
                <ul className="space-y-1">
                  <li>• Converts HTML elements to Horizon UI functions</li>
                  <li>• Maps event handlers to Horizon patterns</li>
                  <li>• Transforms lists to DynamicList components</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">🔧 Style Processing</h4>
                <ul className="space-y-1">
                  <li>• Converts inline styles to Horizon style objects</li>
                  <li>• Identifies CSS classes needing manual conversion</li>
                  <li>• Maps React props to Horizon component props</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">⚡ Smart Features</h4>
                <ul className="space-y-1">
                  <li>• Intelligent prop type inference</li>
                  <li>• Comprehensive error reporting</li>
                  <li>• Best practice recommendations</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;