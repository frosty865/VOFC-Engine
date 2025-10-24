// Disable Vercel Feedback Widget to prevent touch event warnings
if (typeof window !== 'undefined') {
  // Disable Vercel feedback widget
  window.__VERCEL_FEEDBACK_DISABLED__ = true;
  
  // Remove any existing feedback widgets
  const feedbackElements = document.querySelectorAll('[data-vercel-feedback]');
  feedbackElements.forEach(el => el.remove());
  
  // Prevent feedback widget from loading
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    if (tagName === 'script' && element.src && element.src.includes('feedback')) {
      element.remove();
    }
    return element;
  };
}
