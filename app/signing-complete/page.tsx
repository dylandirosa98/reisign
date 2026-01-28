'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

type CompletionStatus = 'loading' | 'completed' | 'waiting' | 'error'

export default function SigningCompletePage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<CompletionStatus>('loading')
  const [message, setMessage] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')

  useEffect(() => {
    const checkStatus = async () => {
      const contractId = searchParams.get('contractId')
      const token = searchParams.get('token')

      if (token || contractId) {
        try {
          // Check contract status via API
          const response = await fetch(`/api/contracts/signing-status?contractId=${contractId}&token=${token}`)

          if (response.ok) {
            const data = await response.json()
            setPropertyAddress(data.propertyAddress || '')

            if (data.status === 'completed') {
              setStatus('completed')
              setMessage('All parties have signed the contract.')
            } else if (data.status === 'seller_signed' || data.status === 'buyer_pending') {
              setStatus('waiting')
              setMessage('Thank you for signing! We are waiting for the other party to sign. You will receive an email notification when the contract is fully executed.')
            } else if (data.status === 'sent' || data.status === 'viewed') {
              setStatus('waiting')
              setMessage('Thank you for signing! The contract is being processed.')
            } else {
              setStatus('completed')
              setMessage('Thank you for signing!')
            }
          } else {
            setStatus('completed')
            setMessage('Thank you for signing the document!')
          }
        } catch (error) {
          console.error('Error checking status:', error)
          setStatus('completed')
          setMessage('Thank you for signing the document!')
        }
      } else {
        // No contract ID - just show generic success
        setStatus('completed')
        setMessage('Thank you for signing the document!')
      }
    }

    checkStatus()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#1a1a2e] mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Processing...</h1>
            <p className="text-gray-600">Please wait while we confirm your signature.</p>
          </>
        )}

        {status === 'completed' && (
          <>
            <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Contract Completed!</h1>
            {propertyAddress && (
              <p className="text-gray-500 mb-4">{propertyAddress}</p>
            )}
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-sm">
                A copy of the fully signed contract will be sent to your email shortly.
              </p>
            </div>
          </>
        )}

        {status === 'waiting' && (
          <>
            <div className="bg-blue-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Clock className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Signature Received!</h1>
            {propertyAddress && (
              <p className="text-gray-500 mb-4">{propertyAddress}</p>
            )}
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                You will receive an email notification when the contract is fully executed by all parties.
              </p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">{message || 'Please contact support if you need assistance.'}</p>
          </>
        )}

        <p className="text-xs text-gray-400 mt-8">
          Powered by REI Sign
        </p>
      </div>
    </div>
  )
}
