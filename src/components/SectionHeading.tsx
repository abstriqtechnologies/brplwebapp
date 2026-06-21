import React from "react";

type HeadingLevel = "h1" | "h2" | "h3";

interface SectionHeadingProps {
  /** Plain text before the highlighted word(s) */
  beforeText?: string;
  /** Highlighted (yellow) word(s) */
  highlightText?: string;
  /** Full title if you don't need a split highlight — overrides beforeText/highlightText */
  title?: string;
  /** Which heading tag to render: h1 | h2 | h3  (default: h2) */
  as?: HeadingLevel;
  /** Extra wrapper className */
  className?: string;
}

/**
 * SectionHeading
 * Renders an h1 / h2 / h3 with the shared "Latest Videos"-style look.
 * All three levels share identical CSS so swapping the tag is purely semantic.
 *
 * Usage examples:
 *   <SectionHeading as="h1" beforeText="Our" highlightText="Mission" />
 *   <SectionHeading as="h2" beforeText="Latest" highlightText="Videos" />
 *   <SectionHeading as="h3" title="Meet The Team" />
 */
const SectionHeading: React.FC<SectionHeadingProps> = ({
  beforeText = "",
  highlightText = "",
  title,
  as: Tag = "h2",
  className = "",
}) => {
  const sharedClass =
    "text-center text-3xl md:text-5xl font-black text-white mb-12 uppercase tracking-tighter font-sans italic drop-shadow-2xl";

  return (
    <div className={`flex items-center justify-center px-4 ${className}`}>
      <Tag className={sharedClass}>
        {title ? (
          title
        ) : (
          <>
            {beforeText && `${beforeText} `}
            {highlightText && (
              <span className="text-[#FFC928]">{highlightText}</span>
            )}
          </>
        )}
      </Tag>
    </div>
  );
};

export default SectionHeading;
