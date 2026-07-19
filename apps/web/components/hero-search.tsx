'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { searchTools, type ToolDefinition } from '@lovelytools/registry';
import { SearchBar } from '@lovelytools/ui';

const QUICK = ['Compress PDF', 'Remove background', 'MP4 to GIF', 'Word counter', 'JSON formatter'];

/**
 * HeroSearch — the hero's search island.
 * Search runs against the in-memory registry index: 230 rows is small enough that
 * a network round-trip would be slower than the answer. Placeholders are tasks,
 * not features (DS voice: "Compress a PDF…", never "Search tools").
 */
export function HeroSearch() {
  const router = useRouter();
  const [results, setResults] = useState<ToolDefinition[]>([]);

  const onSearch = (query: string) => {
    setResults(searchTools(query, 6));
  };

  return (
    <div className="relative flex w-full max-w-[600px] flex-col gap-4">
      <SearchBar onSearch={onSearch} />

      {results.length > 0 && (
        <ul className="absolute top-[58px] z-20 flex w-full animate-lt-fadeup flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card">
          {results.map((tool) => (
            <li key={tool.slug}>
              <button
                type="button"
                onClick={() => router.push(`/${tool.slug}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface2"
              >
                <span className="text-sm font-medium text-fg">{tool.name}</span>
                <span className="truncate text-[12.5px] text-fg3">{tool.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {QUICK.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => onSearch(label)}
            className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-fg2 transition-colors hover:border-line2 hover:text-fg"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
