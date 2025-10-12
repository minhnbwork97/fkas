import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingCarousel } from "./onboarding-carousel";

export const metadata: Metadata = {
  title: "Hướng Dẫn Sử Dụng - FC Không Giải Tán",
  description:
    "Hướng dẫn chi tiết cách đăng ký, điểm danh và thanh toán cho cầu thủ FC Không Giải Tán. Hệ thống quản lý điểm danh và quỹ đội bóng đơn giản, dễ sử dụng.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 scroll-smooth">
      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Hướng Dẫn Sử Dụng Hệ Thống Điểm Danh
          </h1>
          <p className="text-lg text-gray-600">FC Không Giải Tán</p>
        </div>

        {/* Table of Contents */}
        <Card className="mb-8 bg-white/80 backdrop-blur">
          <CardContent className="py-4 px-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-6">
              <a
                href="#dang-ky"
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex-shrink-0">
                  1
                </span>
                <span className="flex-1 sm:flex-none">Đăng Ký Tham Gia</span>
              </a>
              <span className="hidden sm:block text-gray-300">•</span>
              <a
                href="#diem-danh"
                className="flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 transition-colors px-3 py-2 rounded-lg hover:bg-green-50"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs flex-shrink-0">
                  2
                </span>
                <span className="flex-1 sm:flex-none">Điểm Danh</span>
              </a>
              <span className="hidden sm:block text-gray-300">•</span>
              <a
                href="#thanh-toan"
                className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors px-3 py-2 rounded-lg hover:bg-purple-50"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex-shrink-0">
                  3
                </span>
                <span className="flex-1 sm:flex-none">Thanh Toán Sau Trận</span>
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          {/* Step 1: Registration */}
          <Card id="dang-ky" className="scroll-mt-4">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 p-6 pb-6">
              <CardTitle className="text-2xl flex items-center gap-3 m-0">
                <span className="flex items-center justify-center min-w-[3rem] h-12 rounded-xl bg-blue-600 text-white text-xl font-bold shadow-md">
                  1
                </span>
                <span className="text-blue-900">Đăng Ký Tham Gia</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Để đăng ký, bạn có thể truy cập{" "}
                <a
                  href="/join"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-700 underline decoration-2 underline-offset-2 transition-colors"
                >
                  trang đăng ký trực tiếp
                </a>
                . Hoặc khi đội trưởng gửi link điểm danh lên group, nếu bạn chưa
                có tài khoản, hệ thống sẽ tự động chuyển bạn đến trang đăng ký.
                Bạn chỉ cần nhập tên và số điện thoại (tùy chọn), sau đó chờ đội
                trưởng duyệt.
              </p>

              <OnboardingCarousel
                accentColor="blue"
                slides={[
                  {
                    image: "/onboard/join.png",
                    title: "Nhập tên và số điện thoại để đăng ký",
                    alt: "Trang đăng ký tham gia",
                  },
                  {
                    image: "/onboard/join_request_sent.png",
                    title: "Chờ đội trưởng duyệt yêu cầu",
                    alt: "Yêu cầu đã gửi",
                  },
                  {
                    image: "/onboard/join_request_accepted.png",
                    title: "Sau khi được duyệt, bạn có thể bắt đầu điểm danh",
                    alt: "Yêu cầu đã được duyệt",
                  },
                ]}
              />

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-900 font-medium flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>
                    <strong>LƯU Ý:</strong> Tài khoản được liên kết với thiết bị
                    và trình duyệt. Hãy sử dụng cùng thiết bị và trình duyệt mỗi
                    lần điểm danh.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Attendance */}
          <Card id="diem-danh" className="scroll-mt-4">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 p-6 pb-6">
              <CardTitle className="text-2xl flex items-center gap-3 m-0">
                <span className="flex items-center justify-center min-w-[3rem] h-12 rounded-xl bg-green-600 text-white text-xl font-bold shadow-md">
                  2
                </span>
                <span className="text-green-900">Điểm Danh</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Sau khi được duyệt, bạn sẽ truy cập lại link điểm danh để xác
                nhận tham gia. Tại đây, bạn chọn trạng thái tham gia, thêm bạn
                bè (nếu có), báo đi muộn nếu cần và lưu điểm danh.
              </p>

              <OnboardingCarousel
                accentColor="green"
                slides={[
                  {
                    image: "/onboard/attendance_begin.png",
                    title: "Trang điểm danh với thông tin trận đấu",
                    alt: "Trang điểm danh",
                  },
                  {
                    image: "/onboard/attendance_first_time_success.png",
                    title: "Điểm danh thành công",
                    alt: "Điểm danh thành công",
                  },
                  {
                    image: "/onboard/late_attendance.png",
                    title: "Điểm danh sau giờ quy định sẽ bị đánh dấu muộn",
                    alt: "Điểm danh muộn",
                  },
                  {
                    image: "/onboard/attendance_after_match_start.png",
                    title:
                      "Sau khi trận đấu bắt đầu, không thể cập nhật điểm danh",
                    alt: "Sau khi trận đấu bắt đầu",
                  },
                ]}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900 font-medium flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <span>
                    Bạn có thể cập nhật điểm danh nhiều lần trước khi trận đấu
                    bắt đầu. Hãy điểm danh sớm để tránh bị đánh dấu muộn!
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Payment */}
          <Card id="thanh-toan" className="scroll-mt-4">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 p-6 pb-6">
              <CardTitle className="text-2xl flex items-center gap-3 m-0">
                <span className="flex items-center justify-center min-w-[3rem] h-12 rounded-xl bg-purple-600 text-white text-xl font-bold shadow-md">
                  3
                </span>
                <span className="text-purple-900">Thanh Toán Sau Trận</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-700 leading-relaxed">
                Sau trận đấu, truy cập lại link điểm danh để xem số tiền cần
                đóng.
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-gray-900">
                    Nếu chưa đóng quỹ:
                  </h3>
                  <OnboardingCarousel
                    accentColor="purple"
                    slides={[
                      {
                        image: "/onboard/payment_player_no_fund.png",
                        title: "Xem số tiền cần đóng",
                        alt: "Thanh toán - chưa đóng quỹ",
                      },
                      {
                        image: "/onboard/payment_player_no_fund_confirmed.png",
                        title: 'Nhấn "Tôi đã thanh toán"',
                        alt: "Đã xác nhận thanh toán",
                      },
                    ]}
                  />

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                    <p className="text-green-900 flex items-start gap-2">
                      <span className="text-lg">🤝</span>
                      <span>Tôi tin tưởng vào sự trung thực của bạn!</span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-4 text-gray-900">
                    Nếu đã đóng quỹ:
                  </h3>
                  <OnboardingCarousel
                    accentColor="purple"
                    slides={[
                      {
                        image: "/onboard/payment_player_with_fund.png",
                        title: "Tiền sân được tự động trừ vào quỹ.",
                        alt: "Thanh toán - đã đóng quỹ",
                      },
                    ]}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Final Message */}
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
            <CardContent className="py-6">
              <div className="text-center space-y-4">
                <p className="text-xl font-semibold text-gray-900">
                  🎉 Vậy là xong, thật đơn giản phải không nào!
                </p>
                <p className="text-gray-700">
                  Nếu có đóng góp hoặc thắc mắc, bạn vui lòng gửi trực tiếp đến
                  đội trưởng nhé.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center text-sm text-gray-500">
        <p>© 2025 FC Không Giải Tán - Hệ thống quản lý điểm danh và quỹ</p>
      </footer>
    </div>
  );
}
