import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Add validation
if (!endpointSecret) {
  console.error('STRIPE_WEBHOOK_SECRET is not configured');
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Get the user ID from metadata
        const userId = session.metadata?.userId;
        
        if (!userId) {
          console.error('No userId in session metadata');
          break;
        }

        // Check if we already processed this session using your function
        const { data: alreadyProcessed } = await supabase
          .rpc('is_stripe_session_processed', { p_session_id: session.id });
          
        if (alreadyProcessed) {
          console.log(`Session ${session.id} already processed, skipping`);
          break;
        }

        // Record the session with metadata using your function
        const sessionMetadata = {
          amount_total: session.amount_total,
          currency: session.currency,
          customer_email: session.customer_details?.email,
          payment_status: session.payment_status,
          mode: session.mode,
          subscription_id: session.subscription,
          customer_id: session.customer,
          payment_intent: session.payment_intent,
          webhook_event_id: event.id,
          webhook_created: new Date(event.created * 1000).toISOString(),
          processed_via: 'webhook'
        };

        await supabase.rpc('record_stripe_session', {
          p_session_id: session.id,
          p_user_id: userId,
          p_metadata: sessionMetadata
        });

        // Upgrade user to Pro using your function
        const { data: upgradeSuccess, error: upgradeError } = await supabase
          .rpc('upgrade_user_to_pro_with_stripe', {
            p_user_id: userId,
            p_stripe_customer_id: session.customer as string,
            p_stripe_subscription_id: session.subscription as string
          });

        if (upgradeError || !upgradeSuccess) {
          console.error('Error upgrading user to Pro:', upgradeError);
          throw upgradeError;
        }

        console.log(`User ${userId} upgraded to Pro plan via webhook`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Handle subscription status changes
        const { data: planData } = await supabase
          .from('user_plans')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (planData) {
          const status = subscription.status;
          
          if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
            // Downgrade to free plan by updating user_plans directly
            await supabase
              .from('user_plans')
              .update({
                plan: 'free',
                subscription_status: status,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', planData.user_id);
              
            console.log(`User ${planData.user_id} downgraded to Free plan (status: ${status})`);
          } else if (status === 'active') {
            // Ensure they're on Pro if subscription is active
            await supabase
              .from('user_plans')
              .update({
                plan: 'pro',
                subscription_status: status,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', planData.user_id);
              
            console.log(`User ${planData.user_id} subscription reactivated`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Handle subscription cancellation
        const { data: planData } = await supabase
          .from('user_plans')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (planData) {
          await supabase
            .from('user_plans')
            .update({
              plan: 'free',
              stripe_subscription_id: null,
              stripe_customer_id: null,
              subscription_status: 'canceled',
              subscription_end_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', planData.user_id);
            
          console.log(`User ${planData.user_id} subscription cancelled, downgraded to Free`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Handle successful recurring payment
        const { data: planData } = await supabase
          .from('user_plans')
          .select('user_id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single();

        if (planData) {
          // Ensure user is on Pro and status is active
          await supabase
            .from('user_plans')
            .update({
              plan: 'pro',
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', planData.user_id);
            
          console.log(`Payment succeeded for user ${planData.user_id}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Handle failed payment
        const { data: planData } = await supabase
          .from('user_plans')
          .select('user_id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single();

        if (planData) {
          // Update status but don't immediately downgrade
          // Stripe usually gives a few retry attempts
          await supabase
            .from('user_plans')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', planData.user_id);
            
          console.log(`Payment failed for user ${planData.user_id} - marked as past_due`);
          
          // You might want to send an email notification here
          // or implement your own retry logic
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// Required for Stripe webhook verification
export const runtime = 'nodejs'; 