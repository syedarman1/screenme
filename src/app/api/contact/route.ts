import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "../../lib/rate-limit";

// Contact form schema
const ContactSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address"),
    subject: z.string().min(1, "Please select a subject").max(200),
    message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export async function POST(req: Request) {
    try {
        // Rate limiting
        const ip = req.headers.get("x-forwarded-for") || "anonymous";
        const { success, limit, remaining } = await rateLimit(ip);

        if (!success) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": limit.toString(),
                        "X-RateLimit-Remaining": remaining.toString(),
                    }
                }
            );
        }

        // Parse and validate request body
        const body = await req.json().catch(() => ({}));
        const validation = ContactSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: "Invalid form data",
                    details: validation.error.issues
                },
                { status: 400 }
            );
        }

        const { name, email, subject, message } = validation.data;

        // Here you would typically:
        // 1. Store the contact form submission in your database
        // 2. Send an email notification to your support team
        // 3. Send a confirmation email to the user

        // For now, we'll simulate a successful submission
        console.log("Contact form submission:", {
            name,
            email,
            subject,
            message,
            timestamp: new Date().toISOString(),
            ip
        });

        // TODO: Implement actual contact form handling
        // Example database insertion:
        // await supabase.from('contact_submissions').insert({
        //   name,
        //   email,
        //   subject,
        //   message,
        //   ip_address: ip,
        //   created_at: new Date().toISOString()
        // });

        return NextResponse.json(
            {
                success: true,
                message: "Thank you for your message! We'll get back to you soon."
            },
            {
                headers: {
                    'Cache-Control': 'no-cache',
                }
            }
        );

    } catch (error: any) {
        console.error("Error processing contact form:", error);

        return NextResponse.json(
            {
                error: "Failed to send message",
                message: error.message || "Unknown error",
            },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
} 