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
            // Disable Vercel feedback widget to prevent touch event warnings
            window.__VERCEL_FEEDBACK_DISABLED__ = true;
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

