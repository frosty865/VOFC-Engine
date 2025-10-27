import React from 'react';

export default function ExampleCard() {
  return (
    <div className="bg-surface border border-border rounded-lg shadow-card p-md">
      <h2 className="text-primary font-semibold text-lg mb-sm">Design System Preview</h2>
      <p className="text-text mb-md">
        This component uses the DHS Blue and Gold palette, Inter typeface, and VOFC spacing tokens.
      </p>
      <div className="flex gap-sm">
        <button className="bg-primary text-white px-md py-sm rounded-md shadow-card hover:bg-primary/90">Primary</button>
        <button className="bg-accent text-black px-md py-sm rounded-md hover:bg-accent/90">Accent</button>
        <button className="border border-border px-md py-sm rounded-md text-primary hover:bg-primary/5">Secondary</button>
      </div>
    </div>
  );
}
