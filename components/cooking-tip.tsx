'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRandomTip } from '@/hooks/use-recipes'
import { useState } from 'react'

export function CookingTip() {
  const { data: apiTip, refetch, isLoading } = useRandomTip()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleNewTip = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-orange-800">
            <div className="text-2xl">👨‍🍳</div>
            <div className="text-lg font-bold">Chef Bot says:</div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewTip}
            disabled={isRefreshing || isLoading}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-orange-900 leading-relaxed text-base">
          {isLoading ? 'Loading tip...' : (apiTip?.content || 'Salt enhances flavor, acid brightens it, fat carries it.')}
        </p>
      </CardContent>
    </Card>
  )
}
