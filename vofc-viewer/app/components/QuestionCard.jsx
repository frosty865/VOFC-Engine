import { memo } from 'react';

const QuestionCard = memo(({ question, sectors }) => {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex justify-between items-start mb-2">
          <h4 className="mb-0">{question.question_text}</h4>
          <span className="badge bg-info text-white">
            {sectors.find(s => s.sector_id === question.sector_id)?.sector_name || 'Unknown'}
          </span>
        </div>
        
        {question.technology_class && (
          <p className="text-sm text-secondary mb-1">
            <strong>Technology Class:</strong> {question.technology_class}
          </p>
        )}
        
        {question.source_doc && (
          <p className="text-sm text-secondary">
            <strong>Source:</strong> {question.source_doc}
            {question.page_number && ` (Page ${question.page_number})`}
          </p>
        )}
      </div>
    </div>
  );
});

QuestionCard.displayName = 'QuestionCard';

export default QuestionCard;
