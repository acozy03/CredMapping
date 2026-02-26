"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

/**
 * A tooltip that only appears when the child text is actually truncated
 * (i.e. `scrollWidth > clientWidth`). Uses a ResizeObserver to stay
 * up-to-date as the layout changes.
 *
 * Usage:
 *   <TruncatedTooltip content="Full long text here">
 *     <p className="truncate">Full long text here</p>
 *   </TruncatedTooltip>
 */

interface TruncatedTooltipProps {
  /** The full text (or ReactNode) shown inside the tooltip popup. */
  content: React.ReactNode;
  /** Side of the trigger the tooltip appears on. */
  side?: "top" | "right" | "bottom" | "left";
  /** Extra className applied to the wrapping span. */
  className?: string;
  children: React.ReactElement;
}

export function TruncatedTooltip({
  content,
  side = "top",
  className,
  children,
}: TruncatedTooltipProps) {
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  const checkTruncation = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    setIsTruncated(el.scrollWidth > el.clientWidth);
  }, []);

  React.useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;

    // Initial check
    checkTruncation();

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkTruncation]);

  // If the text isn't truncated, render children without a tooltip wrapper
  if (!isTruncated) {
    return React.cloneElement(children, {
      ref: triggerRef,
    } as Record<string, unknown>);
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {React.cloneElement(children, {
            ref: triggerRef,
          } as Record<string, unknown>)}
        </TooltipTrigger>
        <TooltipContent side={side} className={className}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
