import { memo } from 'react';
import { SecurityUtils } from '../../lib/security';

/**
 * Safe HTML component that sanitizes content to prevent XSS attacks
 */
const SafeHTML = memo(({ content, className, ...props }) => {
  if (!content || typeof content !== 'string') {
    return null;
  }

  const sanitizedContent = SecurityUtils.sanitizeHTML(content);

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      {...props}
    />
  );
});

SafeHTML.displayName = 'SafeHTML';

export default SafeHTML;

