import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ConversionStatusProps {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export const ConversionStatus: React.FC<ConversionStatusProps> = ({
  success,
  errors,
  warnings
}) => {
  return (
    <Card className="p-6 border-border/50">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {success ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <XCircle className="w-6 h-6 text-red-500" />
          )}
          <h3 className="text-lg font-semibold text-foreground">
            Conversion {success ? 'Successful' : 'Failed'}
          </h3>
          <Badge variant={success ? "default" : "destructive"}>
            {success ? 'Success' : 'Error'}
          </Badge>
        </div>

        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-600 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Errors ({errors.length})
            </h4>
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded border-l-4 border-red-500">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-orange-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Warnings ({warnings.length})
            </h4>
            <ul className="space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="text-sm text-orange-600 bg-orange-50 p-2 rounded border-l-4 border-orange-500">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {success && errors.length === 0 && warnings.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Your React code was successfully converted to Horizon UI format with no issues.
          </p>
        )}
      </div>
    </Card>
  );
};