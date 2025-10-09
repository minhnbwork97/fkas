import { Metadata } from "next";
import OrganizerLayoutClient from "./layout-client";

export const metadata: Metadata = {
  title: "Bảng Điều Khiển Quản Lý",
  description:
    "Bảng điều khiển quản lý đội bóng FC Không Giải Tán. Tạo trận đấu, quản lý cầu thủ và theo dõi quỹ đội.",
};

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrganizerLayoutClient>{children}</OrganizerLayoutClient>;
}
