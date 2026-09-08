import { boundedRequest } from "../../lib/aiRequest";
import { supabaseAdmin as db } from "../../lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "../../lib/rate-limit";

// Contact form schema
const ContactSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address").max(254),
    subject: z.string().min(1, "Please select a subject").max(200),
    message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export async function POST(req: Request) {
    try {
        // Rate limiting
        const ip = req.headers.get("x-forwarded-for") || "anonymous";
        const { success, limit, remaining } = await rateLimit(`contact:${ip.split(",")[0].trim()}`, 5, 3600);

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
        const body = await (await boundedRequest(req, 12_000)).json().catch(() => ({}));
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

        if (!db) throw new Error("Contact storage is unavailable");
        const { data: saved, error: saveError } = await db.from("contact_messages").insert(validation.data).select("id").single();
        if (saveError || !saved) throw new Error("Message could not be saved");




        return NextResponse.json(
            {
                success: true,
                reference: saved.id,
                message: "Thank you for your message! We'll get back to you soon."
            },
            {
                headers: {
                    'Cache-Control': 'no-cache',
                }
            }
        );

    } catch (error: unknown) {
        console.error("Contact submission failed");

        return NextResponse.json(
            {
                error: error instanceof RangeError ? "Message is too large." : "Your message could not be saved. Please try again.",
            },
            { status: error instanceof RangeError ? 413 : 503 }
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
