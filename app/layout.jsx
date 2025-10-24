import '../styles/cisa.css'
import './globals.css'
import Navigation from '../components/Navigation'
import AnalyticsProvider from '../components/AnalyticsProvider'
import AdvancedReturnToTop from '../components/AdvancedReturnToTop'

export const metadata = {
  title: 'VOFC Viewer',
  description: 'Vulnerability and Options for Consideration Viewer',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <script dangerouslySetInnerHTML={{
          __html: `
            // Aggressively disable Vercel feedback widget
            window.__VERCEL_FEEDBACK_DISABLED__ = true;
            window.__VERCEL_ANALYTICS_DISABLED__ = true;
            
            // Remove feedback elements immediately
            document.addEventListener('DOMContentLoaded', function() {
              const feedbackElements = document.querySelectorAll('[data-vercel-feedback], [class*="feedback"], [id*="feedback"]');
              feedbackElements.forEach(el => el.remove());
            });
            
            // Override addEventListener to prevent touch events on feedback
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function(type, listener, options) {
              if (type === 'touchstart' && this.className && this.className.includes('feedback')) {
                return;
              }
              return originalAddEventListener.call(this, type, listener, options);
            };
          `
        }} />
      </head>
      <body className="antialiased">
        <div className="min-h-screen" style={{backgroundColor: 'var(--cisa-gray-lighter)'}}>
          <Navigation />
          <main className="w-full py-8">
            {children}
          </main>
          <AdvancedReturnToTop />
        </div>
        <AnalyticsProvider />
      </body>
    </html>
  )
}

