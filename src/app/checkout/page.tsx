import type { Metadata } from "next";
import CheckoutPage from "./CheckoutPage";

export const metadata: Metadata = {
  title: "Upgrade to Pro · ScreenMe",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CheckoutPage />;
}
