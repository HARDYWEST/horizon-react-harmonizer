import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ConversionStatusProps {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export const ConversionStatus = ({ success, errors, warnings }: ConversionStatusProps) => {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {success && (
        <Card className="p-4 border-converter-success/20 bg-gradient-to-r from-converter-success/10 to-transparent">
          <div className="flex items-center gap-2 text-converter-success">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Conversion Successful!</span>
          </div>
        </Card>
      )}

      {errors.length > 0 && (
        <Card className="p-4 border-converter-error/20 bg-gradient-to-r from-converter-error/10 to-transparent">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-converter-error">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Conversion Errors</span>
            </div>
            <ul className="space-y-1 text-sm text-converter-error/80">
              {errors.map((error, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-converter-error mt-0.5">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card className="p-4 border-converter-warning/20 bg-gradient-to-r from-converter-warning/10 to-transparent">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-converter-warning">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Conversion Warnings</span>
            </div>
            <ul className="space-y-1 text-sm text-converter-warning/80">
              {warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-converter-warning mt-0.5">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      <Card className="p-4 border-converter-accent/20 bg-gradient-to-r from-converter-accent/10 to-transparent">
        <div className="flex items-start gap-2 text-converter-accent">
          <Info className="w-5 h-5 mt-0.5" />
          <div className="space-y-2">
            <span className="font-medium block">Conversion Notes</span>
            <ul className="space-y-1 text-sm text-converter-accent/80">
              <li>• Manual style conversion may be needed for complex CSS classes</li>
              <li>• Event handlers may need adjustment for Horizon UI patterns</li>
              <li>• Review component lifecycle methods for proper Horizon integration</li>
              <li>• Test bindings and animations in the Horizon environment</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};