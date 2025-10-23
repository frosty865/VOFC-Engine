import SubmissionReview from '../components/SubmissionReview';

export default function ReviewPage() {
  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="card-header">
          <h1 className="card-title">Submission Review</h1>
          <p className="card-subtitle">
            Review and approve document submissions before they are added to the VOFC database.
          </p>
        </div>
        
        <SubmissionReview />
      </div>
    </div>
  );
}
