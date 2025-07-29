import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../lib/supabaseClient';

// Only create Stripe client if secret key is available
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-04-30.basil',
  })
  : null;

// POST /api/stripe - Create checkout session
export async function POST(req: NextRequest) {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      console.error('Supabase client not available - missing environment variables');
      return NextResponse.json(
        { error: 'Database service not available' },
        { status: 500 }
      );
    }

    const body = await req.json();

    // Check if this is a verification request
    if (body.action === 'verify' && body.sessionId) {
      return await verifySession(body.sessionId, body.userId);
    }

    // Otherwise, create checkout session
    return await createCheckoutSession(body.priceId, body.userId);
  } catch (error: any) {
    console.error('Error in Stripe API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create checkout session
async function createCheckoutSession(priceId: string, userId: string) {
  console.log('Creating checkout session:', { priceId, userId });

  // Check if Stripe client is available
  if (!stripe) {
    console.error('Stripe client not available - missing environment variables');
    return NextResponse.json(
      { error: 'Payment service not available' },
      { status: 500 }
    );
  }

  // Validate required environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined');
  }

  // Get base URL with fallback for development
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

  if (!baseUrl || baseUrl === 'undefined') {
    throw new Error('NEXT_PUBLIC_URL environment variable is required for Stripe checkout');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}`,
    metadata: {
      userId,
    },
  });

  console.log('Checkout session created:', session.url);
  return NextResponse.json({ url: session.url });
}

// Verify completed session and upgrade user
async function verifySession(sessionId: string, userId: string) {
  if (!sessionId || !userId) {
    return NextResponse.json(
      {
        success: false,
        message: 'Missing session ID or user ID'
      },
      { status: 400 }
    );
  }

  // Check if Supabase client is available
  if (!supabase) {
    console.error('Supabase client not available during session verification');
    return NextResponse.json(
      {
        success: false,
        message: 'Database service not available'
      },
      { status: 500 }
    );
  }

  // Check if Stripe client is available
  if (!stripe) {
    console.error('Stripe client not available during session verification');
    return NextResponse.json(
      { 
        success: false, 
        message: 'Payment service not available' 
      },
      { status: 500 }
    );
  }

  // Verify the session with Stripe
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error('Error retrieving Stripe session:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid session ID or session not found'
      },
      { status: 400 }
    );
  }

  // Verify the session belongs to the current user
  if (session.metadata?.userId !== userId) {
    console.error('Session user mismatch:', {
      sessionUserId: session.metadata?.userId,
      requestUserId: userId
    });
    return NextResponse.json(
      {
        success: false,
        message: 'Session does not belong to the current user'
      },
      { status: 403 }
    );
  }

  // Check if payment was successful
  if (session.payment_status !== 'paid') {
    return NextResponse.json(
      {
        success: false,
        message: `Payment not completed. Status: ${session.payment_status}`
      },
      { status: 400 }
    );
  }

  // Check if this session has already been processed using your function
  const { data: isProcessed, error: checkError } = await supabase
    .rpc('is_stripe_session_processed', { p_session_id: sessionId });

  if (checkError) {
    console.error('Error checking session status:', checkError);
    return NextResponse.json(
      {
        success: false,
        message: 'Database error while checking session status'
      },
      { status: 500 }
    );
  }

  if (isProcessed) {
    // Session already processed
    return NextResponse.json({
      success: true,
      message: 'Payment already processed',
      alreadyProcessed: true
    });
  }

  // Upgrade user to Pro using your database function
  const { data: upgradeSuccess, error: upgradeError } = await supabase
    .rpc('upgrade_user_to_pro_with_stripe', {
      p_user_id: userId,
      p_stripe_customer_id: session.customer as string,
      p_stripe_subscription_id: session.subscription as string
    });

  if (upgradeError || !upgradeSuccess) {
    console.error('Error upgrading user to Pro:', upgradeError);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to upgrade user to Pro plan'
      },
      { status: 500 }
    );
  }

  // Record that this session has been processed with full details
  const { data: recordSuccess, error: recordError } = await supabase
    .rpc('record_stripe_session', {
      p_session_id: sessionId,
      p_user_id: userId,
      p_amount: session.amount_total,
      p_currency: session.currency || 'usd',
      p_customer_email: session.customer_details?.email,
      p_stripe_customer_id: session.customer as string,
      p_subscription_id: session.subscription as string,
      p_price_id: session.line_items?.data?.[0]?.price?.id,
      p_mode: session.mode,
      p_payment_status: session.payment_status,
      p_metadata: {
        webhook_processed: false,
        manual_verification: true,
        processed_at: new Date().toISOString(),
        checkout_session_url: session.url
      }
    });

  if (recordError) {
    console.error('Error recording session:', recordError);
    // Don't fail the request if we can't record the session, 
    // but log it for monitoring
  }

  console.log(`Successfully upgraded user ${userId} to Pro plan`);

  return NextResponse.json({
    success: true,
    message: 'Payment verified and plan updated successfully',
    planUpdated: true
  });
} 