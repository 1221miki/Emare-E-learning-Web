import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('Uncaught error in React tree:', error, info);
        this.setState({ info });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#0f172a', padding: 24 }}>
                    <div style={{ maxWidth: 900 }}>
                        <h1 style={{ margin: '0 0 12px', fontSize: 28 }}>Something went wrong</h1>
                        <p style={{ color: '#64748b' }}>The application encountered an error while rendering. Details are shown below — please share them if you need help debugging.</p>
                        <pre style={{ marginTop: 16, background: '#ffffff', padding: 16, borderRadius: 8, color: '#b91c1c', border: '1px solid #e2e8f0', overflow: 'auto' }}>{String(this.state.error && this.state.error.toString())}</pre>
                        {this.state.info?.componentStack && (
                            <pre style={{ marginTop: 12, background: '#ffffff', padding: 16, borderRadius: 8, color: '#475569', border: '1px solid #e2e8f0', overflow: 'auto' }}>{this.state.info.componentStack}</pre>
                        )}
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
