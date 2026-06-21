import React from "react";
import { Grid3X3 } from "lucide-react";

export function Layout() {
  return (
    <div className="p-6 h-full flex flex-col items-center justify-center max-w-[1400px] mx-auto text-center">
      <div className="bg-muted p-6 rounded-full mb-6">
        <Grid3X3 className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Facility Layout</h1>
      <p className="text-muted-foreground max-w-md">
        The interactive facility layout view is currently under construction. This module will allow you to visually manage channel utilization and zone planning.
      </p>
      <div className="mt-8 px-4 py-2 bg-primary/10 text-primary font-medium rounded-full text-sm">
        Coming Soon
      </div>
    </div>
  );
}
