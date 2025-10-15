import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tham Gia Đội Bóng",
  description:
    "Đăng ký tham gia đội bóng FC Không Giải Tán. Gửi yêu cầu tham gia và chờ quản lý duyệt.",
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
