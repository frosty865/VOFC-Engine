# Vercel Analytics Setup for VOFC Engine

This document outlines the analytics implementation for the VOFC Engine using Vercel Analytics and Speed Insights.

## 📊 Analytics Components

### 1. Vercel Analytics
- **Purpose**: Track user interactions, page views, and custom events
- **Package**: `@vercel/analytics/react`
- **Implementation**: Added to root layout for global tracking

### 2. Vercel Speed Insights
- **Purpose**: Monitor Core Web Vitals and performance metrics
- **Package**: `@vercel/speed-insights/next`
- **Implementation**: Added to root layout for performance monitoring

## 🔧 Implementation Details

### Analytics Provider Component
Located at `components/AnalyticsProvider.jsx`:

```javascript
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function AnalyticsProvider() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
```

### Custom Event Tracking
The analytics provider includes custom tracking functions for VOFC-specific events:

```javascript
export const trackVOFCEvent = {
  // Authentication events
  login: (role) => trackEvent('vofc_login', { role }),
  logout: () => trackEvent('vofc_logout'),
  
  // VOFC submission events
  submitVOFC: (type) => trackEvent('vofc_submit', { type }),
  bulkSubmit: (count) => trackEvent('vofc_bulk_submit', { count }),
  
  // Navigation events
  viewDashboard: () => trackEvent('vofc_view_dashboard'),
  viewVulnerabilities: () => trackEvent('vofc_view_vulnerabilities'),
  viewOFCS: () => trackEvent('vofc_view_ofcs'),
  
  // Admin events
  adminAction: (action) => trackEvent('vofc_admin_action', { action }),
  userManagement: (action) => trackEvent('vofc_user_management', { action }),
  
  // Error tracking
  error: (error, context) => trackEvent('vofc_error', { error, context }),
  
  // Performance events
  pageLoad: (page, loadTime) => trackEvent('vofc_page_load', { page, loadTime }),
  apiCall: (endpoint, duration) => trackEvent('vofc_api_call', { endpoint, duration })
};
```

## 📈 Tracked Events

### Authentication Events
- `vofc_login` - User login with role information
- `vofc_logout` - User logout
- `vofc_error` - Login failures and errors

### Navigation Events
- `page_view` - Page visits with custom properties
- `vofc_view_dashboard` - Dashboard page views
- `vofc_view_vulnerabilities` - Vulnerabilities page views
- `vofc_view_ofcs` - OFCs page views

### User Engagement
- `user_engagement` - General user interaction tracking
- `vofc_submit` - VOFC record submissions
- `vofc_bulk_submit` - Bulk submission events

### Admin Events
- `vofc_admin_action` - Admin-specific actions
- `vofc_user_management` - User management operations

### Performance Events
- `vofc_page_load` - Page load times
- `vofc_api_call` - API call performance

## 🚀 Usage Examples

### Basic Event Tracking
```javascript
import { trackVOFCEvent } from '../components/AnalyticsProvider';

// Track login
trackVOFCEvent.login('admin');

// Track VOFC submission
trackVOFCEvent.submitVOFC('vulnerability');

// Track errors
trackVOFCEvent.error('api_failure', { endpoint: '/api/submit' });
```

### Page View Tracking
```javascript
import { trackPageView } from '../components/AnalyticsProvider';

// Track page views with custom properties
trackPageView('dashboard', { userRole: 'admin' });
```

### Engagement Tracking
```javascript
import { trackEngagement } from '../components/AnalyticsProvider';

// Track user engagement
trackEngagement('form_submission', { formType: 'vofc_submit' });
```

## 📊 Vercel Dashboard

### Analytics Dashboard
Access your analytics data at:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your VOFC Engine project
3. Navigate to the "Analytics" tab

### Available Metrics
- **Page Views**: Track which pages users visit
- **Custom Events**: Monitor VOFC-specific user actions
- **User Sessions**: Understand user engagement patterns
- **Error Tracking**: Monitor application errors and failures

### Speed Insights
Access performance data at:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your VOFC Engine project
3. Navigate to the "Speed Insights" tab

### Performance Metrics
- **Core Web Vitals**: LCP, FID, CLS scores
- **Page Load Times**: Performance across different pages
- **API Response Times**: Backend performance monitoring
- **User Experience**: Real user monitoring (RUM) data

## 🔒 Privacy Considerations

### Data Collection
- **Anonymous**: No personally identifiable information is collected
- **Aggregated**: Data is aggregated for analysis
- **GDPR Compliant**: Vercel Analytics is GDPR compliant

### Data Retention
- **Analytics Data**: Retained for 24 months
- **Performance Data**: Retained for 30 days
- **Custom Events**: Follow Vercel's data retention policies

## 🛠️ Configuration

### Environment Variables
No additional environment variables are required for basic analytics. Vercel automatically detects and enables analytics for deployed projects.

### Custom Configuration
For advanced configuration, you can modify the AnalyticsProvider component:

```javascript
// Custom analytics configuration
<Analytics 
  beforeSend={(event) => {
    // Filter or modify events before sending
    return event;
  }}
/>
```

## 📋 Monitoring Checklist

### Analytics Setup
- [ ] Analytics component added to root layout
- [ ] Custom event tracking implemented
- [ ] Page view tracking active
- [ ] Error tracking configured

### Performance Monitoring
- [ ] Speed Insights enabled
- [ ] Core Web Vitals tracking
- [ ] API performance monitoring
- [ ] User experience metrics

### Data Quality
- [ ] Events firing correctly
- [ ] No duplicate tracking
- [ ] Proper error handling
- [ ] Privacy compliance

## 🚨 Troubleshooting

### Common Issues

1. **Events Not Tracking**
   - Check browser console for errors
   - Verify Vercel deployment
   - Ensure analytics component is loaded

2. **Performance Data Missing**
   - Wait 24-48 hours for data to appear
   - Check Vercel dashboard for deployment status
   - Verify Speed Insights is properly configured

3. **Custom Events Not Appearing**
   - Check event names and properties
   - Verify tracking functions are called
   - Check Vercel Analytics dashboard

### Debug Mode
Enable debug mode for development:

```javascript
// Add to your component for debugging
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Analytics debug mode enabled');
  }
}, []);
```

## 📚 Additional Resources

- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Vercel Speed Insights Documentation](https://vercel.com/docs/speed-insights)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Analytics Best Practices](https://vercel.com/docs/analytics/analytics-api)

---

**Note**: Analytics data is automatically collected when your application is deployed to Vercel. No additional setup is required beyond the implementation shown above.
