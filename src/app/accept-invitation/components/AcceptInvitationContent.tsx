'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useReducer, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type InvitationState = 
  | { type: 'loading' }
  | { type: 'invalidToken'; message: string }
  | { type: 'notAuthenticated'; invitation: InvitationData }
  | { type: 'emailMismatch'; userEmail: string; invitedEmail: string }
  | { type: 'alreadyMember'; invitation: InvitationData }
  | { type: 'ready'; invitation: InvitationData }
  | { type: 'accepting'; invitation: InvitationData }
  | { type: 'accepted'; message: string; redirectUrl: string }
  | { type: 'error'; message: string; canRetry: boolean };

type InvitationAction = 
  | { type: 'SET_TOKEN_INVALID'; message: string }
  | { type: 'SET_INVITATION'; invitation: InvitationData }
  | { type: 'SET_NOT_AUTHENTICATED' }
  | { type: 'SET_EMAIL_MISMATCH'; userEmail: string }
  | { type: 'SET_ALREADY_MEMBER' }
  | { type: 'SET_READY' }
  | { type: 'START_ACCEPTING' }
  | { type: 'ACCEPT_SUCCESS'; message: string; redirectUrl: string }
  | { type: 'ACCEPT_ERROR'; message: string; canRetry: boolean }
  | { type: 'RETRY' };

type InvitationData = {
  id: string;
  email: string;
  role: string;
  message?: string;
  expiresAt: string;
  createdAt: string;
  inviter: {
    id: string;
    name: string | null;
    email: string;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  product?: {
    id: string;
    name: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
};

function invitationReducer(state: InvitationState, action: InvitationAction): InvitationState {
  switch (action.type) {
    case 'SET_TOKEN_INVALID':
      return { type: 'invalidToken', message: action.message };
    case 'SET_INVITATION':
      // Store invitation temporarily during loading
      return { type: 'loading', invitation: action.invitation } as any;
    case 'SET_NOT_AUTHENTICATED':
      if (state.type === 'loading' && 'invitation' in state) {
        return { type: 'notAuthenticated', invitation: (state as any).invitation };
      }
      return state;
    case 'SET_EMAIL_MISMATCH':
      if ('invitation' in state) {
        return { type: 'emailMismatch', userEmail: action.userEmail, invitedEmail: (state as any).invitation.email };
      }
      return state;
    case 'SET_ALREADY_MEMBER':
      if ('invitation' in state) {
        return { type: 'alreadyMember', invitation: (state as any).invitation };
      }
      return state;
    case 'SET_READY':
      if ('invitation' in state) {
        return { type: 'ready', invitation: (state as any).invitation };
      }
      return state;
    case 'START_ACCEPTING':
      if (state.type !== 'ready') return state;
      return { type: 'accepting', invitation: state.invitation };
    case 'ACCEPT_SUCCESS':
      return { type: 'accepted', message: action.message, redirectUrl: action.redirectUrl };
    case 'ACCEPT_ERROR':
      return { type: 'error', message: action.message, canRetry: action.canRetry };
    case 'RETRY':
      if (state.type === 'error' && state.canRetry) {
        return { type: 'loading' };
      }
      return state;
    default:
      return state;
  }
}

export function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [state, dispatch] = useReducer(invitationReducer, { type: 'loading' });

  const token = searchParams.get('token');
  const invitation = 'invitation' in state ? state.invitation : null;

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      dispatch({ 
        type: 'SET_TOKEN_INVALID', 
        message: 'This invitation link is missing required information. Please check the link and try again.' 
      });
      return;
    }

    validateToken(token);
  }, [token]);

  // Handle authentication state changes
  useEffect(() => {
    if (status === 'loading' || !invitation) return;

    if (status === 'unauthenticated') {
      dispatch({ type: 'SET_NOT_AUTHENTICATED' });
    } else if (session?.user?.email) {
      if (session.user.email !== invitation.email) {
        dispatch({ type: 'SET_EMAIL_MISMATCH', userEmail: session.user.email });
      } else {
        dispatch({ type: 'SET_READY' });
      }
    }
  }, [session, status, invitation]);

  const validateToken = async (inviteToken: string) => {
    try {
      const response = await fetch('/api/invitations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken }),
      });

      const result = await response.json();
      
      if (result.valid) {
        dispatch({ type: 'SET_INVITATION', invitation: result.invitation });
      } else {
        dispatch({ 
          type: 'SET_TOKEN_INVALID', 
          message: result.message || 'This invitation is invalid or has expired.' 
        });
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_TOKEN_INVALID', 
        message: 'Failed to validate invitation. Please try again.' 
      });
    }
  };

  const acceptInvitation = async () => {
    if (!token || state.type !== 'ready') return;

    dispatch({ type: 'START_ACCEPTING' });
    
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      
      if (result.success) {
        const redirectUrl = getRedirectUrl(state.invitation);
        dispatch({ 
          type: 'ACCEPT_SUCCESS', 
          message: result.message || 'You have successfully joined the team.',
          redirectUrl 
        });
      } else {
        // Handle specific error cases
        if (result.error === 'EMAIL_MISMATCH') {
          dispatch({ type: 'SET_EMAIL_MISMATCH', userEmail: session?.user?.email || '' });
        } else if (result.error === 'ALREADY_MEMBER') {
          dispatch({ type: 'SET_ALREADY_MEMBER' });
        } else {
          dispatch({ 
            type: 'ACCEPT_ERROR', 
            message: result.message || 'Failed to accept invitation.',
            canRetry: true 
          });
        }
      }
    } catch (error) {
      dispatch({ 
        type: 'ACCEPT_ERROR', 
        message: 'Failed to accept invitation. Please try again.',
        canRetry: true 
      });
    }
  };

  const getEntityName = (inv: InvitationData) => {
    if (inv.organization) return inv.organization.name;
    if (inv.product) return inv.product.name;
    if (inv.project) return inv.project.name;
    return 'Unknown';
  };

  const getEntityType = (inv: InvitationData) => {
    if (inv.organization) return 'organization';
    if (inv.product) return 'product';
    if (inv.project) return 'project';
    return 'entity';
  };

  const getRedirectUrl = (inv: InvitationData) => {
    if (inv.organization) return `/organizations/${inv.organization.slug || inv.organization.id}`;
    if (inv.product) return `/products/${inv.product.id}`;
    if (inv.project) return `/projects/${inv.project.id}`;
    return '/dashboard';
  };

  // Render based on state
  if (state.type === 'loading') {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading invitation...</p>
      </div>
    );
  }

  if (state.type === 'invalidToken') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{state.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (state.type === 'notAuthenticated') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign In Required</CardTitle>
          <CardDescription>
            You need to sign in to accept this invitation to join {getEntityName(state.invitation)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.invitation.message && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">&ldquo;{state.invitation.message}&rdquo;</p>
              <p className="text-xs text-gray-500 mt-1">- {state.invitation.inviter.name || state.invitation.inviter.email}</p>
            </div>
          )}
          <Button 
            onClick={() => {
              // Preserve the current URL so we can redirect back after sign in
              const callbackUrl = window.location.href;
              signIn(undefined, { callbackUrl });
            }} 
            className="w-full"
          >
            Sign In to Accept Invitation
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state.type === 'emailMismatch') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Email Mismatch</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            This invitation was sent to <strong>{state.invitedEmail}</strong>, but you&apos;re signed in as <strong>{state.userEmail}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Please sign in with the correct email address or contact the person who invited you.
          </p>
          <Button 
            onClick={() => {
              const callbackUrl = window.location.href;
              signIn(undefined, { callbackUrl });
            }} 
            variant="outline" 
            className="w-full"
          >
            Sign In with Different Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state.type === 'alreadyMember') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-yellow-600">Already a Member</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            You are already a member of {getEntityName(state.invitation)}.
          </p>
          <Button 
            onClick={() => router.push(getRedirectUrl(state.invitation))} 
            className="w-full"
          >
            Go to {getEntityType(state.invitation)}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state.type === 'ready' || state.type === 'accepting') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join {getEntityName(state.invitation)} as a {state.invitation.role.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.invitation.message && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">&ldquo;{state.invitation.message}&rdquo;</p>
              <p className="text-xs text-gray-500 mt-1">- {state.invitation.inviter.name || state.invitation.inviter.email}</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button 
              onClick={acceptInvitation} 
              className="flex-1"
              disabled={state.type === 'accepting'}
            >
              {state.type === 'accepting' ? 'Accepting...' : 'Accept Invitation'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard')} 
              className="flex-1"
              disabled={state.type === 'accepting'}
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.type === 'accepted') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <CardTitle className="text-green-600">Invitation Accepted!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">{state.message}</p>
          <Button 
            onClick={() => router.push(state.redirectUrl)} 
            className="w-full"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state.type === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">{state.message}</p>
          {state.canRetry && (
            <Button 
              onClick={() => {
                dispatch({ type: 'RETRY' });
                if (token) validateToken(token);
              }} 
              variant="outline" 
              className="w-full"
            >
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}