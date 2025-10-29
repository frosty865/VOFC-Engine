<!-- VOFC Processing Dashboard - Embeddable Script -->
<!-- Include this script in any HTML page to embed the dashboard -->

<script>
(function() {
    // Configuration
    const config = {
        height: '400px',
        width: '100%',
        mode: 'live', // live, ollama-only
        theme: 'dark' // dark, light
    };
    
    // Create dashboard container
    function createDashboard() {
        const container = document.createElement('div');
        container.id = 'vofc-dashboard-container';
        container.style.cssText = `
            width: ${config.width};
            height: ${config.height};
            border: 1px solid #30363d;
            border-radius: 8px;
            overflow: hidden;
            background: #0d1117;
        `;
        
        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = '/dashboard-embeddable.html';
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            background: #0d1117;
        `;
        
        container.appendChild(iframe);
        return container;
    }
    
    // Auto-initialize if target element exists
    function autoInit() {
        const target = document.getElementById('vofc-dashboard');
        if (target) {
            const dashboard = createDashboard();
            target.appendChild(dashboard);
        }
    }
    
    // Manual initialization function
    window.VOFCDashboard = {
        init: function(elementId, options = {}) {
            Object.assign(config, options);
            const target = document.getElementById(elementId);
            if (target) {
                const dashboard = createDashboard();
                target.appendChild(dashboard);
                return dashboard;
            } else {
                console.error('VOFC Dashboard: Target element not found:', elementId);
            }
        },
        
        create: function(options = {}) {
            Object.assign(config, options);
            return createDashboard();
        }
    };
    
    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
})();
</script>

<!-- Usage Examples: -->

<!-- 
1. Auto-initialize (place this div where you want the dashboard):
<div id="vofc-dashboard"></div>

2. Manual initialization:
<script>
VOFCDashboard.init('my-dashboard', { height: '500px', mode: 'live' });
</script>

3. Create and append manually:
<script>
const dashboard = VOFCDashboard.create({ height: '600px', mode: 'ollama-only' });
document.body.appendChild(dashboard);
</script>
-->
