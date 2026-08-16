import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";

/**
 * Demo gói cước / giới hạn API AI — không triển khai nghiệp vụ thanh toán thật.
 */
export default function SuperAdminPlansPage() {
  const plans = [
    {
      name: "Basic",
      drivers: "Tối đa 50 tài xế",
      ai: "5.000 lượt API nhận diện khuôn mặt / tháng",
      price: "—",
    },
    {
      name: "Pro",
      drivers: "Tối đa 200 tài xế",
      ai: "25.000 lượt API / tháng",
      price: "—",
    },
  ];

  const history = [
    { agency: "AGENCY_02", action: "Gia hạn Pro (CK)", amount: "15.000.000 ₫", date: "2026-04-01" },
    { agency: "AGENCY_05", action: "Nâng cấp Basic → Pro", amount: "—", date: "2026-03-28" },
    { agency: "AGENCY_01", action: "Phụ phí vượt quota AI", amount: "2.400.000 ₫", date: "2026-03-25" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">
          Gói cước &amp; gia hạn (demo)
        </h1>
        <p className="mt-1 max-w-3xl text-slate-500 dark:text-slate-400">
          Phác thảo cho luận văn: gói giới hạn tài xế, quota API AI, vượt hạn thu thêm, lịch sử chuyển
          khoản / gia hạn. Chưa nối cổng thanh toán hay hóa đơn thật.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.name} className="rounded-3xl border-slate-100 shadow-sm dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black">{p.name}</CardTitle>
                <Badge className="font-bold">Demo</Badge>
              </div>
              <CardDescription>Thông số minh họa — cấu hình DB sau.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-start gap-2">
                <Icons.Users className="mt-0.5 size-4 shrink-0 text-blue-500" />
                <span>{p.drivers}</span>
              </p>
              <p className="flex items-start gap-2">
                <Icons.Fingerprint className="mt-0.5 size-4 shrink-0 text-violet-500" />
                <span>{p.ai}</span>
              </p>
              <p className="flex items-start gap-2">
                <Icons.Banknote className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                <span>Vượt quota: tính thêm theo từng 1.000 call (demo)</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-slate-100 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg font-black">Lịch sử thanh toán / gia hạn (demo)</CardTitle>
          <CardDescription>Coi như đại lý chuyển khoản — đối soát thủ công.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3">Đại lý</th>
                  <th className="px-4 py-3">Nội dung</th>
                  <th className="px-4 py-3">Số tiền</th>
                  <th className="px-4 py-3">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((h) => (
                  <tr key={`${h.agency}-${h.date}`} className="bg-white dark:bg-slate-900">
                    <td className="px-4 py-3 font-mono font-bold">{h.agency}</td>
                    <td className="px-4 py-3">{h.action}</td>
                    <td className="px-4 py-3">{h.amount}</td>
                    <td className="px-4 py-3 text-slate-500">{h.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
