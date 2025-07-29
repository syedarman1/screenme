import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-04-30.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Security logging function
function logSecurityEvent(level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
    const logData = {
        timestamp: new Date().toISOString(),
        level,
        message,
        metadata,
        service: 'stripe-webhook'
    };

    if (level === 'error') {
        console.error('SECURITY:', JSON.stringify(logData));
    } else if (level === 'warn') {
        console.warn('SECURITY:', JSON.stringify(logData));
    } else {
        console.log('SECURITY:', JSON.stringify(logData));
    }
}

// In-memory store for processed webhook events (prevent replay attacks)
const processedEvents = new Map<string, number>();
const EVENT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Clean up old processed events periodically
setInterval(() => {
    const now = Date.now();
    for (const [eventId, timestamp] of processedEvents.entries()) {
        if (now - timestamp > EVENT_CACHE_TTL) {
            processedEvents.delete(eventId);
        }
    }
}, 5 * 60 * 1000); // Clean every 5 minutes

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    let event: Stripe.Event | undefined;

    try {
        // 1. Validate Content-Type header
        const contentType = req.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            logSecurityEvent('warn', 'Invalid content-type header', {
                contentType,
                requestId,
                ip: req.headers.get('x-forwarded-for') || 'unknown'
            });
            return NextResponse.json(
                { error: 'Invalid content-type. Expected application/json' },
                { status: 400 }
            );
        }

        // 2. Check for missing stripe-signature header
        const stripeSignature = req.headers.get('stripe-signature');
        if (!stripeSignature) {
            logSecurityEvent('error', 'Missing stripe-signature header', {
                requestId,
                ip: req.headers.get('x-forwarded-for') || 'unknown'
            });
            return NextResponse.json(
                { error: 'Missing stripe-signature header' },
                { status: 400 }
            );
        }

        // 3. Validate webhook secret is configured
        if (!endpointSecret) {
            logSecurityEvent('error', 'STRIPE_WEBHOOK_SECRET not configured', { requestId });
            return NextResponse.json(
                { error: 'Webhook endpoint not properly configured' },
                { status: 500 }
            );
        }

        // 4. Get request body
        const body = await req.text();
        if (!body) {
            logSecurityEvent('warn', 'Empty request body', { requestId });
            return NextResponse.json(
                { error: 'Empty request body' },
                { status: 400 }
            );
        }

        // 5. Verify webhook signature using stripe.webhooks.constructEvent
        try {
            event = stripe.webhooks.constructEvent(body, stripeSignature, endpointSecret);
            logSecurityEvent('info', 'Webhook signature verified', {
                eventId: event.id,
                eventType: event.type,
                requestId
            });
        } catch (err: any) {
            logSecurityEvent('error', 'Webhook signature verification failed', {
                error: err.message,
                requestId,
                ip: req.headers.get('x-forwarded-for') || 'unknown',
                userAgent: req.headers.get('user-agent') || 'unknown'
            });
            return NextResponse.json(
                { error: 'Invalid webhook signature' },
                { status: 400 }
            );
        }

        // 6. Check for duplicate/replay attacks
        if (processedEvents.has(event.id)) {
            logSecurityEvent('warn', 'Duplicate webhook event detected', {
                eventId: event.id,
                eventType: event.type,
                requestId
            });
            // Return success to avoid Stripe retries for legitimate duplicates
            return NextResponse.json({ received: true, duplicate: true });
        }

        // 7. Validate event structure
        if (!event.id || !event.type || !event.data || !event.created) {
            logSecurityEvent('error', 'Invalid event structure', {
                eventId: event.id,
                eventType: event.type,
                requestId,
                hasData: !!event.data,
                hasCreated: !!event.created
            });
            return NextResponse.json(
                { error: 'Invalid event structure' },
                { status: 400 }
            );
        }

        // 8. Check event age (prevent old event replay)
        const eventAge = Date.now() - (event.created * 1000);
        const MAX_EVENT_AGE = 10 * 60 * 1000; // 10 minutes
        if (eventAge > MAX_EVENT_AGE) {
            logSecurityEvent('warn', 'Event too old', {
                eventId: event.id,
                eventType: event.type,
                eventAge: Math.round(eventAge / 1000),
                requestId
            });
            return NextResponse.json(
                { error: 'Event too old' },
                { status: 400 }
            );
        }

        // 9. Mark event as processed
        processedEvents.set(event.id, Date.now());

        // 10. Process the webhook event with comprehensive error handling
        switch (event.type) {
            case 'checkout.session.completed': {
                try {
                    const session = event.data.object as Stripe.Checkout.Session;

                    // Validate session data structure
                    if (!session.id || !session.metadata) {
                        logSecurityEvent('error', 'Invalid session structure', {
                            eventId: event.id,
                            hasSessionId: !!session.id,
                            hasMetadata: !!session.metadata,
                            requestId
                        });
                        break;
                    }

                    const userId = session.metadata?.userId;

                    if (!userId) {
                        logSecurityEvent('warn', 'No userId in session metadata', {
                            eventId: event.id,
                            sessionId: session.id,
                            requestId
                        });
                        break;
                    }

                    // Check if session already processed in database
                    const { data: alreadyProcessed, error: checkError } = await supabase
                        .rpc('is_stripe_session_processed', { p_session_id: session.id });

                    if (checkError) {
                        logSecurityEvent('error', 'Database error checking session status', {
                            eventId: event.id,
                            sessionId: session.id,
                            error: checkError.message,
                            requestId
                        });
                        throw checkError;
                    }

                    if (alreadyProcessed) {
                        logSecurityEvent('info', 'Session already processed in database', {
                            eventId: event.id,
                            sessionId: session.id,
                            userId,
                            requestId
                        });
                        break;
                    }

                    // Record session in database
                    const { error: recordError } = await supabase.rpc('record_stripe_session', {
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
                            payment_intent: session.payment_intent,
                            request_id: requestId
                        }
                    });

                    if (recordError) {
                        logSecurityEvent('error', 'Failed to record session', {
                            eventId: event.id,
                            sessionId: session.id,
                            error: recordError.message,
                            requestId
                        });
                        throw recordError;
                    }

                    // Upgrade user to Pro
                    const { data: upgradeSuccess, error: upgradeError } = await supabase
                        .rpc('upgrade_user_to_pro_with_stripe', {
                            p_user_id: userId,
                            p_stripe_customer_id: session.customer as string,
                            p_stripe_subscription_id: session.subscription as string
                        });

                    if (upgradeError || !upgradeSuccess) {
                        logSecurityEvent('error', 'Failed to upgrade user to Pro', {
                            eventId: event.id,
                            sessionId: session.id,
                            userId,
                            error: upgradeError?.message,
                            requestId
                        });
                        throw upgradeError;
                    }

                    // Record payment event if paid
                    if (session.amount_total && session.payment_status === 'paid') {
                        const { error: paymentError } = await supabase.rpc('record_payment_event', {
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
                                mode: session.mode,
                                request_id: requestId
                            },
                            p_stripe_created_at: new Date(event.created * 1000).toISOString()
                        });

                        if (paymentError) {
                            logSecurityEvent('error', 'Failed to record payment event', {
                                eventId: event.id,
                                sessionId: session.id,
                                userId,
                                error: paymentError.message,
                                requestId
                            });
                            // Don't throw here as the main upgrade succeeded
                        }
                    }

                    logSecurityEvent('info', 'User upgraded to Pro plan successfully', {
                        eventId: event.id,
                        sessionId: session.id,
                        userId,
                        amount: session.amount_total,
                        requestId
                    });

                } catch (error: any) {
                    logSecurityEvent('error', 'Error processing checkout.session.completed', {
                        eventId: event.id,
                        error: error.message,
                        requestId
                    });
                    throw error;
                }
                break;
            }

            case 'customer.subscription.updated': {
                try {
                    const subscription = event.data.object as Stripe.Subscription;

                    // Validate subscription data structure
                    if (!subscription.id || !subscription.status) {
                        logSecurityEvent('error', 'Invalid subscription structure', {
                            eventId: event.id,
                            hasSubscriptionId: !!subscription.id,
                            hasStatus: !!subscription.status,
                            requestId
                        });
                        break;
                    }

                    const { data: planData, error: fetchError } = await supabase
                        .from('user_plans')
                        .select('user_id')
                        .eq('stripe_subscription_id', subscription.id)
                        .single();

                    if (fetchError) {
                        logSecurityEvent('error', 'Failed to fetch user plan data', {
                            eventId: event.id,
                            subscriptionId: subscription.id,
                            error: fetchError.message,
                            requestId
                        });
                        throw fetchError;
                    }

                    if (planData) {
                        const status = subscription.status;

                        if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
                            // Downgrade to free plan
                            const { error: updateError } = await supabase
                                .from('user_plans')
                                .update({
                                    plan: 'free',
                                    subscription_status: status,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('user_id', planData.user_id);

                            if (updateError) {
                                logSecurityEvent('error', 'Failed to downgrade user plan', {
                                    eventId: event.id,
                                    subscriptionId: subscription.id,
                                    userId: planData.user_id,
                                    error: updateError.message,
                                    requestId
                                });
                                throw updateError;
                            }

                            logSecurityEvent('info', 'User downgraded to Free plan', {
                                eventId: event.id,
                                subscriptionId: subscription.id,
                                userId: planData.user_id,
                                status,
                                requestId
                            });

                        } else if (status === 'active') {
                            // Ensure they're on Pro if subscription is active
                            const { error: updateError } = await supabase
                                .from('user_plans')
                                .update({
                                    plan: 'pro',
                                    subscription_status: status,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('user_id', planData.user_id);

                            if (updateError) {
                                logSecurityEvent('error', 'Failed to reactivate user plan', {
                                    eventId: event.id,
                                    subscriptionId: subscription.id,
                                    userId: planData.user_id,
                                    error: updateError.message,
                                    requestId
                                });
                                throw updateError;
                            }

                            logSecurityEvent('info', 'User subscription reactivated', {
                                eventId: event.id,
                                subscriptionId: subscription.id,
                                userId: planData.user_id,
                                requestId
                            });
                        }
                    } else {
                        logSecurityEvent('warn', 'No user plan found for subscription', {
                            eventId: event.id,
                            subscriptionId: subscription.id,
                            requestId
                        });
                    }

                } catch (error: any) {
                    logSecurityEvent('error', 'Error processing customer.subscription.updated', {
                        eventId: event.id,
                        error: error.message,
                        requestId
                    });
                    throw error;
                }
                break;
            }

            case 'customer.subscription.deleted': {
                try {
                    const subscription = event.data.object as Stripe.Subscription;

                    // Validate subscription data structure
                    if (!subscription.id) {
                        logSecurityEvent('error', 'Invalid subscription structure for deletion', {
                            eventId: event.id,
                            hasSubscriptionId: !!subscription.id,
                            requestId
                        });
                        break;
                    }

                    const { data: planData, error: fetchError } = await supabase
                        .from('user_plans')
                        .select('user_id')
                        .eq('stripe_subscription_id', subscription.id)
                        .single();

                    if (fetchError) {
                        logSecurityEvent('error', 'Failed to fetch user plan for deletion', {
                            eventId: event.id,
                            subscriptionId: subscription.id,
                            error: fetchError.message,
                            requestId
                        });
                        throw fetchError;
                    }

                    if (planData) {
                        const { error: updateError } = await supabase
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

                        if (updateError) {
                            logSecurityEvent('error', 'Failed to cancel user subscription', {
                                eventId: event.id,
                                subscriptionId: subscription.id,
                                userId: planData.user_id,
                                error: updateError.message,
                                requestId
                            });
                            throw updateError;
                        }

                        logSecurityEvent('info', 'User subscription cancelled successfully', {
                            eventId: event.id,
                            subscriptionId: subscription.id,
                            userId: planData.user_id,
                            requestId
                        });
                    } else {
                        logSecurityEvent('warn', 'No user plan found for subscription deletion', {
                            eventId: event.id,
                            subscriptionId: subscription.id,
                            requestId
                        });
                    }

                } catch (error: any) {
                    logSecurityEvent('error', 'Error processing customer.subscription.deleted', {
                        eventId: event.id,
                        error: error.message,
                        requestId
                    });
                    throw error;
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                try {
                    const invoice = event.data.object as Stripe.Invoice;

                    // Validate invoice data structure
                    if (!invoice.id || !invoice.customer) {
                        logSecurityEvent('error', 'Invalid invoice structure for payment success', {
                            eventId: event.id,
                            hasInvoiceId: !!invoice.id,
                            hasCustomer: !!invoice.customer,
                            requestId
                        });
                        break;
                    }

                    const { data: planData, error: fetchError } = await supabase
                        .from('user_plans')
                        .select('user_id')
                        .eq('stripe_customer_id', invoice.customer as string)
                        .single();

                    if (fetchError) {
                        logSecurityEvent('error', 'Failed to fetch user plan for payment success', {
                            eventId: event.id,
                            invoiceId: invoice.id,
                            customerId: invoice.customer,
                            error: fetchError.message,
                            requestId
                        });
                        throw fetchError;
                    }

                    if (planData) {
                        // Update user plan to active
                        const { error: updateError } = await supabase
                            .from('user_plans')
                            .update({
                                plan: 'pro',
                                subscription_status: 'active',
                                updated_at: new Date().toISOString()
                            })
                            .eq('user_id', planData.user_id);

                        if (updateError) {
                            logSecurityEvent('error', 'Failed to update user plan for payment success', {
                                eventId: event.id,
                                invoiceId: invoice.id,
                                userId: planData.user_id,
                                error: updateError.message,
                                requestId
                            });
                            throw updateError;
                        }

                        // Record the payment event
                        const { error: paymentError } = await supabase.rpc('record_payment_event', {
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
                                period_end: new Date(invoice.period_end * 1000).toISOString(),
                                request_id: requestId
                            },
                            p_stripe_created_at: new Date(event.created * 1000).toISOString()
                        });

                        if (paymentError) {
                            logSecurityEvent('error', 'Failed to record payment success event', {
                                eventId: event.id,
                                invoiceId: invoice.id,
                                userId: planData.user_id,
                                error: paymentError.message,
                                requestId
                            });
                            // Don't throw here as the main plan update succeeded
                        }

                        logSecurityEvent('info', 'Payment succeeded and plan updated', {
                            eventId: event.id,
                            invoiceId: invoice.id,
                            userId: planData.user_id,
                            amount: invoice.amount_paid,
                            requestId
                        });
                    } else {
                        logSecurityEvent('warn', 'No user plan found for payment success', {
                            eventId: event.id,
                            invoiceId: invoice.id,
                            customerId: invoice.customer,
                            requestId
                        });
                    }

                } catch (error: any) {
                    logSecurityEvent('error', 'Error processing invoice.payment_succeeded', {
                        eventId: event.id,
                        error: error.message,
                        requestId
                    });
                    throw error;
                }
                break;
            }

            case 'invoice.payment_failed': {
                try {
                    const invoice = event.data.object as Stripe.Invoice;

                    // Validate invoice data structure
                    if (!invoice.id || !invoice.customer) {
                        logSecurityEvent('error', 'Invalid invoice structure for payment failure', {
                            eventId: event.id,
                            hasInvoiceId: !!invoice.id,
                            hasCustomer: !!invoice.customer,
                            requestId
                        });
                        break;
                    }

                    const { data: planData, error: fetchError } = await supabase
                        .from('user_plans')
                        .select('user_id')
                        .eq('stripe_customer_id', invoice.customer as string)
                        .single();

                    if (fetchError) {
                        logSecurityEvent('error', 'Failed to fetch user plan for payment failure', {
                            eventId: event.id,
                            invoiceId: invoice.id,
                            customerId: invoice.customer,
                            error: fetchError.message,
                            requestId
                        });
                        throw fetchError;
                    }

                    if (planData) {
                        // Update subscription status to past_due
                        const { error: updateError } = await supabase
                            .from('user_plans')
                            .update({
                                subscription_status: 'past_due',
                                updated_at: new Date().toISOString()
                            })
                            .eq('user_id', planData.user_id);

                        if (updateError) {
                            logSecurityEvent('error', 'Failed to update user plan for payment failure', {
                                eventId: event.id,
                                invoiceId: invoice.id,
                                userId: planData.user_id,
                                error: updateError.message,
                                requestId
                            });
                            throw updateError;
                        }

                        // Record the payment failure event
                        const { error: paymentError } = await supabase.rpc('record_payment_event', {
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
                                next_payment_attempt: invoice.next_payment_attempt,
                                request_id: requestId
                            },
                            p_stripe_created_at: new Date(event.created * 1000).toISOString()
                        });

                        if (paymentError) {
                            logSecurityEvent('error', 'Failed to record payment failure event', {
                                eventId: event.id,
                                invoiceId: invoice.id,
                                userId: planData.user_id,
                                error: paymentError.message,
                                requestId
                            });
                            // Don't throw here as the status update succeeded
                        }

                        logSecurityEvent('warn', 'Payment failed - user marked as past due', {
                            eventId: event.id,
                            invoiceId: invoice.id,
                            userId: planData.user_id,
                            amount: invoice.amount_due,
                            attemptCount: invoice.attempt_count,
                            requestId
                        });
                    } else {
                        logSecurityEvent('warn', 'No user plan found for payment failure', {
                            eventId: event.id,
                            invoiceId: invoice.id,
                            customerId: invoice.customer,
                            requestId
                        });
                    }

                } catch (error: any) {
                    logSecurityEvent('error', 'Error processing invoice.payment_failed', {
                        eventId: event.id,
                        error: error.message,
                        requestId
                    });
                    throw error;
                }
                break;
            }

            default:
                logSecurityEvent('info', 'Unhandled webhook event type', {
                    eventId: event.id,
                    eventType: event.type,
                    requestId
                });
        }

        // Log successful webhook processing
        logSecurityEvent('info', 'Webhook processed successfully', {
            eventId: event.id,
            eventType: event.type,
            processingTime: Date.now() - startTime,
            requestId
        });

        return NextResponse.json({
            received: true,
            eventId: event.id,
            eventType: event.type
        });

    } catch (error: any) {
        // Comprehensive error logging and handling
        logSecurityEvent('error', 'Critical webhook processing error', {
            eventId: (event as Stripe.Event)?.id || 'unknown',
            eventType: (event as Stripe.Event)?.type || 'unknown',
            error: error.message,
            stack: error.stack,
            processingTime: Date.now() - startTime,
            requestId
        });

        // Return appropriate error response
        const statusCode = error.name === 'SupabaseError' ? 500 : 400;
        return NextResponse.json(
            {
                error: 'Webhook processing failed',
                eventId: (event as Stripe.Event)?.id || null,
                requestId
            },
            { status: statusCode }
        );
    }
}

export const runtime = 'nodejs'; 