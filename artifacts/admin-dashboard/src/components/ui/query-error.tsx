import React from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorProps {
  /** What we were trying to load, e.g. "cycles" or "inventory". */
  resource?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Standard error state for any data-bound surface (§8 state contract).
 * Icon + message + Retry. Pairs with the existing Skeleton (loading) and
 * empty-state patterns so every async surface implements all branches.
 */
export function QueryError({ resource, onRetry, className }: QueryErrorProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-16 text-muted-foreground ${className ?? ""}`}
      role="alert"
    >
      <AlertCircle className="h-10 w-10 mb-3 text-destructive/70" />
      <p className="text-sm font-medium text-foreground">
        Couldn't load{resource ? ` ${resource}` : " data"}
      </p>
      <p className="text-xs mt-1 max-w-xs">
        The server didn't respond. Check the connection and try again.
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
