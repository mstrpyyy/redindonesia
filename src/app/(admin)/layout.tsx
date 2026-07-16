import type { Metadata } from "next";
import { Sidebar } from "./components/sidebar";
import { ContentWrapper } from "./components/content-wrapper";





export const metadata: Metadata = {
  title: {
    template: '%s | Dashboard Admin RED',
    default: 'Dashboard Admin RED', // a default is required when creating a template
  },
  description: "Established in 2004, PT. Radian Elok Distriversa has many years of experience and a broad network in the field of trading and distribution for medical aesthetic devices, medical laser devices, and cosmoceutical products. Headquartered in Jakarta, Indonesia, we work with many of the world's leading companies in Europe and USA. Our clients include leading local plastic surgeons, dermatologists, and aesthetic general practitioners.",
};

export default function userLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      <ContentWrapper>
        {children}
      </ContentWrapper>
    </div>
  );
}

