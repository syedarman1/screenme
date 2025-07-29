import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const userId = session.metadata?.userId;
        
        if (!userId) {
          console.error('No userId in session metadata');
          break;
        }

        const { data: alreadyProcessed } = await supabase
          .rpc('is_stripe_session_processed', { p_session_id: session.id });
          
        if (alreadyProcessed) {
          console.log(`Session ${session.id} already processed, skipping`);
          break;
        }


        await supabase.rpc('record_stripe_session', {
          p_session_id: session.id,
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
            webhook_event_id: event.id,
            webhook_created: new Date(event.created * 1000).toISOString(),
            processed_via: 'webhook',
            payment_intent: session.payment_intent
          }
        });


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


        if (session.amount_total && session.payment_status === 'paid') {
          await supabase.rpc('record_payment_event', {
            p_user_id: userId,
            p_event_type: 'checkout.session.completed',
            p_event_id: event.id,
            p_amount: session.amount_total,
            p_currency: session.currency || 'usd',
            p_status: 'succeeded',
            p_stripe_payment_intent_id: session.payment_intent as string,
            p_stripe_subscription_id: session.subscription as string,
            p_description: 'Pro plan subscription payment',
            p_metadata: {
              session_id: session.id,
              mode: session.mode
            },
            p_stripe_created_at: new Date(event.created * 1000).toISOString()
          });
        }

        console.log(`User ${userId} upgraded to Pro plan via webhook`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        

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
        

        const { data: planData } = await supabase
          .from('user_plans')
          .select('user_id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single();

        if (planData) {

          await supabase
            .from('user_plans')
            .update({
              plan: 'pro',
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', planData.user_id);

          // Record the payment event
          await supabase.rpc('record_payment_event', {
            p_user_id: planData.user_id,
            p_event_type: 'invoice.payment_succeeded',
            p_event_id: event.id,
            p_amount: invoice.amount_paid,
            p_currency: invoice.currency,
            p_status: 'succeeded',
            p_stripe_invoice_id: invoice.id,
            p_stripe_subscription_id: (invoice as any).subscription || null,
            p_description: 'Recurring subscription payment',
            p_metadata: {
              invoice_number: invoice.number,
              period_start: new Date(invoice.period_start * 1000).toISOString(),
              period_end: new Date(invoice.period_end * 1000).toISOString()
            },
            p_stripe_created_at: new Date(event.created * 1000).toISOString()
          });
            
          console.log(`Payment succeeded for user ${planData.user_id}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        

        const { data: planData } = await supabase
          .from('user_plans')
          .select('user_id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single();

        if (planData) {

          await supabase
            .from('user_plans')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', planData.user_id);


          await supabase.rpc('record_payment_event', {
            p_user_id: planData.user_id,
            p_event_type: 'invoice.payment_failed',
            p_event_id: event.id,
            p_amount: invoice.amount_due,
            p_currency: invoice.currency,
            p_status: 'failed',
            p_stripe_invoice_id: invoice.id,
            p_stripe_subscription_id: (invoice as any).subscription || null,
            p_description: 'Failed subscription payment',
            p_failure_reason: 'Payment failed - marked as past due',
            p_metadata: {
              invoice_number: invoice.number,
              attempt_count: invoice.attempt_count,
              next_payment_attempt: invoice.next_payment_attempt
            },
            p_stripe_created_at: new Date(event.created * 1000).toISOString()
          });
            
          console.log(`Payment failed for user ${planData.user_id} - marked as past_due`);
          
          
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


export const runtime = 'nodejs';