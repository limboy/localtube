import { Fragment } from "react";

// Matches timestamps like 0:08, 35:18, 1:09:54 (optionally hours).
// Requires a word boundary so things like "1.2.7" or "v1:2" aren't matched.
const TIMESTAMP_REGEX = /(?<![\d:])(\d{1,2}:)?\d{1,2}:\d{2}(?![\d:])/g;

function parseTimestamp(text: string): number {
  const parts = text.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + parts[1];
}

interface VideoDescriptionProps {
  text: string;
  onSeek: (seconds: number) => void;
}

export function VideoDescription({ text, onSeek }: VideoDescriptionProps) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TIMESTAMP_REGEX.lastIndex = 0;
  while ((match = TIMESTAMP_REGEX.exec(text)) !== null) {
    const start = match.index;
    const value = match[0];

    if (start > lastIndex) {
      nodes.push(
        <Fragment key={`t-${lastIndex}`}>{text.slice(lastIndex, start)}</Fragment>
      );
    }

    const seconds = parseTimestamp(value);
    nodes.push(
      <button
        key={`ts-${start}`}
        type="button"
        className="text-primary hover:underline cursor-pointer"
        onClick={() => onSeek(seconds)}
      >
        {value}
      </button>
    );

    lastIndex = start + value.length;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`t-${lastIndex}`}>{text.slice(lastIndex)}</Fragment>);
  }

  return <>{nodes}</>;
}
