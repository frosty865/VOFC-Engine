import { memo } from 'react';
import SafeHTML from './SafeHTML';

// Function to format option text with proper formatting
const formatOptionText = (text) => {
  if (!text) return '';
  
  let formattedText = text;
  
  // Convert URLs to clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  formattedText = formattedText.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>');
  
  // Convert bullet points to proper HTML list
  // Split the text by bullet points and reconstruct as HTML
  const lines = formattedText.split(/(?=[a-z]\))/);
  let result = '';
  let inList = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (/^[a-z]\)/.test(trimmedLine)) {
      if (!inList) {
        result += '<ol>';
        inList = true;
      }
      // Extract the letter and the rest of the text
      const match = trimmedLine.match(/^([a-z])\)\s*(.*)$/);
      if (match) {
        result += `<li><strong>${match[1]})</strong> ${match[2]}</li>`;
      }
    } else if (inList && trimmedLine) {
      // This is continuation text for the previous list item
      result = result.replace(/<\/li>$/, ` ${trimmedLine}</li>`);
    } else if (!inList) {
      result += line;
    }
  }
  
  if (inList) {
    result += '</ol>';
  }
  
  // Convert line breaks to <br> tags
  result = result.replace(/\n/g, '<br>');
  
  return result;
};

const OFCCard = memo(({ ofc }) => {
  const formattedText = formatOptionText(ofc.option_text);
  
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex justify-end items-start mb-3">
          <div className="flex gap-2">
            <span className="badge bg-primary text-white" style={{ color: 'white !important' }}>
              {ofc.discipline}
            </span>
            <span className="badge bg-secondary text-white" style={{ color: 'white !important' }}>
              {ofc.sector}
            </span>
          </div>
        </div>
        
        {/* Display formatted text */}
        <div className="text-gray-700 mb-3">
          <SafeHTML 
            content={formattedText}
            className="formatted-text"
            style={{
              lineHeight: '1.6',
              fontSize: '14px'
            }}
          />
        </div>
        
        {ofc.source && (
          <div className="text-sm text-secondary">
            <strong>Source:</strong> 
            <SafeHTML content={ofc.source} />
          </div>
        )}
      </div>
    </div>
  );
});

OFCCard.displayName = 'OFCCard';

export default OFCCard;

