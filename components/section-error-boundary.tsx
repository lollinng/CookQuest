'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  section: string
}

interface State {
  hasError: boolean
}

export class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in section "${this.props.section}":`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-700">
          Something went wrong loading this section. Try refreshing the page.
        </div>
      )
    }
    return this.props.children
  }
}
